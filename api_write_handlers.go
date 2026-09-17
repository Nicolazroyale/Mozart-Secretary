package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"mozart/auth"
)

// handleApiWrite: solo admin (paridad con init_api) + CSRF ya validado en handleApi.
func (s *Server) handleApiWrite(w http.ResponseWriter, r *http.Request) {
	sess := s.currentSession(r)
	if sess == nil {
		jsonError(w, http.StatusUnauthorized, "No autorizado o sesión expirada.")
		return
	}

	var input map[string]interface{}
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&input)
	}

	table := r.URL.Query().Get("table")
	if table == "" && input != nil {
		// El frontend (app.js/addUser y los botones de usuarios) envía `table`
		// en el body; el PHP original solo leía $_GET['table'] y esa parte del
		// panel quedó rota. Aquí se soporta el body para que funcione.
		if t := mapVal(input, "table"); t != nil {
			table = asString(t)
		}
	}
	id := r.URL.Query().Get("id")
	ip := clientIP(r)

	realTable := table
	if rt, ok := writeTableMap[table]; ok {
		realTable = rt
	}

	// Re-chequeo del permiso de escritura (defensa en profundidad).
	if s.cfg.AutoLogin == "" {
		p := writePermForTable(realTable)
		if p != "" && !hasPerm(sess.Role, s.userPerms(sess), p) {
			jsonError(w, http.StatusForbidden, "No tiene permisos para realizar esta acción")
			return
		}
	}

	switch r.Method {
	case http.MethodPost:
		s.apiPost(w, table, realTable, id, input, sess, ip)
	case http.MethodPut:
		s.apiPut(w, table, realTable, id, input, sess, ip)
	case http.MethodDelete:
		s.apiDelete(w, realTable, id, sess, ip)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) txError(w http.ResponseWriter, prefix string, err error) {
	s.logw("api tx: %v", err)
	jsonError(w, http.StatusInternalServerError, prefix+" "+err.Error())
}

func (s *Server) logw(format string, args ...interface{}) {
	log.Printf(format, args...)
}

// ————— POST —————

func (s *Server) apiPost(w http.ResponseWriter, table, realTable, id string, input map[string]interface{}, sess *auth.Session, ip string) {
	if input == nil {
		jsonError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if table == "usuarios" {
		s.postUsuarios(w, input, id, sess, ip)
		return
	}

	switch table {
	case "docente_cursos":
		s.postDocenteCursos(w, input)
	case "estudiantes":
		s.postEstudiantes(w, input)
	case "asignaciones":
		s.postAsignaciones(w, input, sess, ip)
	default:
		s.postGeneric(w, realTable, input, sess, ip)
	}
}

func (s *Server) postUsuarios(w http.ResponseWriter, input map[string]interface{}, id string, sess *auth.Session, ip string) {
	action := input["action"]
	data := asMap(input["data"])
	if bodyID := mapVal(input, "id"); bodyID != nil && asString(bodyID) != "" {
		id = asString(bodyID)
	}
	actorAdmin := sess.Role == "admin"
	switch action {
	case "create":
		pw := mapVal(data, "password")
		if !hasKey(data, "password") || pw == nil || asString(pw) == "" {
			jsonError(w, http.StatusBadRequest, "Contraseña requerida")
			return
		}
		if !actorAdmin && asString(data["rol"]) == "admin" {
			jsonError(w, http.StatusForbidden, "Solo un administrador puede crear administradores")
			return
		}
		hash, err := auth.HashPassword(asString(pw))
		if err != nil {
			s.logw("api usuarios create: %v", err)
			jsonError(w, http.StatusInternalServerError, "Error interno del servidor")
			return
		}
		valid := filterFields(data, []string{"username", "password", "nombre_completo", "rol", "permisos"})
		valid["password"] = hash
		if asString(data["rol"]) == "admin" {
			valid["permisos"] = "[]"
		} else {
			valid["permisos"] = permsJSON(permValues(data))
		}
		if len(valid) == 0 || !hasKey(valid, "username") || !hasKey(valid, "nombre_completo") {
			jsonError(w, http.StatusBadRequest, "Datos inválidos")
			return
		}
		nid, err := s.genericInsert(s.dbs, "usuarios", valid, sess, ip)
		if err != nil {
			s.logw("api usuarios insert: %v", err)
			jsonError(w, http.StatusBadRequest, "Datos inválidos")
			return
		}
		s.writeResult(w, map[string]interface{}{"success": true, "id": nid})

	case "update":
		if id == "" {
			jsonError(w, http.StatusBadRequest, "ID requerido")
			return
		}

		var currentRol string
		_ = s.dbs.QueryRow("SELECT rol FROM usuarios WHERE id_usuario = ?", id).Scan(&currentRol)
		targetAdmin := currentRol == "admin"
		if !actorAdmin && targetAdmin {
			jsonError(w, http.StatusForbidden, "No puede modificar a un administrador")
			return
		}
		newRol := currentRol
		if mapVal(data, "rol") != nil {
			newRol = asString(data["rol"])
		}
		if !actorAdmin && newRol == "admin" {
			jsonError(w, http.StatusForbidden, "Solo un administrador puede otorgar el rol administrador")
			return
		}

		valid := filterFields(data, []string{"nombre_completo", "rol", "activo", "permisos"})
		if newRol == "admin" {
			valid["permisos"] = "[]"
		} else if hasKey(data, "permisos") {
			valid["permisos"] = permsJSON(permValues(data))
		}
		if hasKey(data, "password") {
			pw := mapVal(data, "password")
			if pw != nil && asString(pw) != "" {
				hash, err := auth.HashPassword(asString(pw))
				if err != nil {
					s.logw("api usuarios update hash: %v", err)
					jsonError(w, http.StatusInternalServerError, "Error interno del servidor")
					return
				}
				valid["password"] = hash
			}
		}
		if len(valid) == 0 {
			jsonError(w, http.StatusBadRequest, "No hay campos para actualizar")
			return
		}
		if err := s.genericUpdate(s.dbs, "usuarios", valid, id, sess, ip); err != nil {
			s.logw("api usuarios update: %v", err)
			jsonError(w, http.StatusBadRequest, "Datos inválidos")
			return
		}
		s.writeResult(w, map[string]interface{}{"success": true})

	case "delete":
		if id == "" {
			jsonError(w, http.StatusBadRequest, "ID requerido")
			return
		}
		if !actorAdmin {
			var targetRol string
			_ = s.dbs.QueryRow("SELECT rol FROM usuarios WHERE id_usuario = ?", id).Scan(&targetRol)
			if targetRol == "admin" {
				jsonError(w, http.StatusForbidden, "No puede eliminar a un administrador")
				return
			}
		}
		var adminCount int
		_ = s.dbs.QueryRow("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id_usuario != ?", id).Scan(&adminCount)
		if adminCount == 0 {
			jsonError(w, http.StatusBadRequest, "No se puede eliminar el último administrador")
			return
		}
		if err := s.genericDelete(s.dbs, "usuarios", id, sess, ip); err != nil {
			s.logw("api usuarios delete: %v", err)
			jsonError(w, http.StatusBadRequest, "Datos inválidos")
			return
		}
		s.writeResult(w, map[string]interface{}{"success": true})

	default:
		jsonError(w, http.StatusBadRequest, "Acción inválida")
	}
}

func (s *Server) postDocenteCursos(w http.ResponseWriter, input map[string]interface{}) {
	if !hasKey(input, "id_docente") || !hasKey(input, "id_curso") {
		jsonError(w, http.StatusBadRequest, "ID de docente y curso requeridos")
		return
	}
	idMateria, err := s.findOrCreateMateria(s.dbs, asString(input["materia"]))
	if err != nil {
		s.logw("api docente_cursos materias: %v", err)
		jsonError(w, http.StatusInternalServerError, "Error interno del servidor")
		return
	}
	if err := s.upsertDmc(s.dbs, input["id_docente"], idMateria, input["id_curso"], "Titular", "", "", ""); err != nil {
		s.logw("api docente_cursos insert: %v", err)
		jsonError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true})
}

func (s *Server) postEstudiantes(w http.ResponseWriter, input map[string]interface{}) {
	tx, err := s.dbs.Begin()
	if err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	defer tx.Rollback()

	idAlumno, err := s.insertAlumno(tx, input)
	if err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	idStr := fmt.Sprintf("%d", idAlumno)
	if err := s.saveSalud(tx, input, idStr, true); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	if err := s.saveRestriccion(tx, input, idStr); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	if err := s.saveResponsables(tx, input, idStr); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true, "id": idAlumno})
}

func (s *Server) postAsignaciones(w http.ResponseWriter, input map[string]interface{}, sess *auth.Session, ip string) {
	tx, err := s.dbs.Begin()
	if err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	defer tx.Rollback()

	if hasKey(input, "materia") && !hasKey(input, "id_materia") {
		idMateria, err := s.findOrCreateMateria(tx, asString(input["materia"]))
		if err != nil {
			s.txError(w, "Error en transacción:", err)
			return
		}
		input["id_materia"] = idMateria
		delete(input, "materia")
	}

	valid := filterFields(input, writeAllowedFields["docente_materia_curso"])
	if len(valid) == 0 {
		jsonError(w, http.StatusInternalServerError, "Error en transacción: No se proporcionaron campos válidos")
		return
	}
	nid, err := s.genericInsert(tx, "docente_materia_curso", valid, sess, ip)
	if err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true, "id": nid})
}

func (s *Server) postGeneric(w http.ResponseWriter, realTable string, input map[string]interface{}, sess *auth.Session, ip string) {
	allowed := writeAllowedFields[realTable]
	if len(allowed) == 0 {
		s.writeResult(w, map[string]interface{}{"error": "Operación no permitida para esta tabla"})
		return
	}
	valid := filterFields(input, allowed)
	if len(valid) == 0 {
		s.writeResult(w, map[string]interface{}{"error": "No se proporcionaron campos válidos"})
		return
	}
	nid, err := s.genericInsert(s.dbs, realTable, valid, sess, ip)
	if err != nil {
		s.logw("api generic insert: %v", err)
		jsonError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true, "id": nid})
}

// ————— PUT —————

func (s *Server) apiPut(w http.ResponseWriter, table, realTable, id string, input map[string]interface{}, sess *auth.Session, ip string) {
	if id == "" {
		jsonError(w, http.StatusBadRequest, "ID requerido para actualizar")
		return
	}
	if input == nil {
		jsonError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	switch table {
	case "docente_cursos":
		s.putDocenteCursos(w, input, id)
	case "estudiantes":
		s.putEstudiantes(w, input, id)
	case "asignaciones":
		s.putAsignaciones(w, input, id, sess, ip)
	default:
		s.putGeneric(w, realTable, input, id, sess, ip)
	}
}

func (s *Server) putDocenteCursos(w http.ResponseWriter, input map[string]interface{}, id string) {
	tx, err := s.dbs.Begin()
	if err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE docente_materia_curso SET activo = 0 WHERE id_docente = ?", id); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}

	for _, a := range asSlice(input["asignaciones"]) {
		asig := asMap(a)
		if asig == nil {
			continue
		}
		idCurso := mapVal(asig, "id_curso")
		if idCurso == nil {
			continue
		}
		cargo := asString(mapVal(asig, "cargo"))
		if cargo == "" {
			cargo = "Titular"
		}
		idMateria, err := s.findOrCreateMateria(tx, asString(mapVal(asig, "materia")))
		if err != nil {
			s.txError(w, "Error en transacción:", err)
			return
		}
		if err := s.upsertDmc(tx, id, idMateria, idCurso,
			cargo,
			asString(mapVal(asig, "dia_semana")),
			asString(mapVal(asig, "hora_inicio")),
			asString(mapVal(asig, "hora_fin"))); err != nil {
			s.txError(w, "Error en transacción:", err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true})
}

func (s *Server) putEstudiantes(w http.ResponseWriter, input map[string]interface{}, id string) {
	tx, err := s.dbs.Begin()
	if err != nil {
		s.txError(w, "Error en actualización:", err)
		return
	}
	defer tx.Rollback()

	if err := s.updateAlumno(tx, input, id); err != nil {
		s.txError(w, "Error en actualización:", err)
		return
	}
	if err := s.saveSalud(tx, input, id, false); err != nil {
		s.txError(w, "Error en actualización:", err)
		return
	}
	if err := s.saveRestriccion(tx, input, id); err != nil {
		s.txError(w, "Error en actualización:", err)
		return
	}
	if err := s.saveResponsables(tx, input, id); err != nil {
		s.txError(w, "Error en actualización:", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.txError(w, "Error en actualización:", err)
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true})
}

func (s *Server) putAsignaciones(w http.ResponseWriter, input map[string]interface{}, id string, sess *auth.Session, ip string) {
	tx, err := s.dbs.Begin()
	if err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	defer tx.Rollback()

	if hasKey(input, "materia") {
		idMateria, err := s.findOrCreateMateria(tx, asString(input["materia"]))
		if err != nil {
			s.txError(w, "Error en transacción:", err)
			return
		}
		input["id_materia"] = idMateria
		delete(input, "materia")
	}

	valid := filterFields(input, writeAllowedFields["docente_materia_curso"])
	if len(valid) == 0 {
		jsonError(w, http.StatusInternalServerError, "Error en transacción: No se proporcionaron campos válidos")
		return
	}
	if err := s.genericUpdate(tx, "docente_materia_curso", valid, id, sess, ip); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.txError(w, "Error en transacción:", err)
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true})
}

func (s *Server) putGeneric(w http.ResponseWriter, realTable string, input map[string]interface{}, id string, sess *auth.Session, ip string) {
	allowed := writeAllowedFields[realTable]
	if len(allowed) == 0 {
		s.writeResult(w, map[string]interface{}{"error": "Operación no permitida para esta tabla"})
		return
	}
	valid := filterFields(input, allowed)
	if len(valid) == 0 {
		s.writeResult(w, map[string]interface{}{"error": "No se proporcionaron campos válidos"})
		return
	}
	if err := s.genericUpdate(s.dbs, realTable, valid, id, sess, ip); err != nil {
		s.logw("api generic update: %v", err)
		jsonError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true})
}

// ————— DELETE —————

func (s *Server) apiDelete(w http.ResponseWriter, realTable, id string, sess *auth.Session, ip string) {
	if id == "" {
		jsonError(w, http.StatusBadRequest, "ID requerido para eliminar")
		return
	}
	if err := s.genericDelete(s.dbs, realTable, id, sess, ip); err != nil {
		s.logw("api delete: %v", err)
		jsonError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}
	s.writeResult(w, map[string]interface{}{"success": true})
}