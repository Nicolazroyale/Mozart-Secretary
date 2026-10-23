package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"mozart/auth"
)

// ————— tablas y campos —————

var writeTableMap = map[string]string{
	"estudiantes":  "alumnos",
	"docentes":     "docentes",
	"cursos":       "cursos",
	"materias":     "materias",
	"asignaciones": "docente_materia_curso",
}

var alumnoFields = []string{
	"apellido", "nombre", "tipo_dni", "dni", "cuil", "fecha_nacimiento",
	"lugar_nacimiento", "nacionalidad", "genero", "genero_especificar",
	"calle", "numero", "piso", "depto", "entre_calles", "localidad",
	"distrito", "provincia", "telefono_fijo", "telefono_celular",
	"id_curso", "fecha_ingreso",
}

var saludFields = []string{
	"asma", "celiaquia", "diabetes", "obesidad", "cardiopatia",
	"otros_checklist", "alergias", "internaciones", "antecedentes_salud",
	"obra_social_nombre", "obra_social_nro",
}

var respFields = []string{
	"apellido", "nombre", "vinculo", "nacionalidad", "tipo_dni", "dni",
	"profesion", "nivel_educativo", "condicion_actividad", "convive_estudiante",
	"calle", "numero", "piso", "depto", "localidad", "provincia",
	"telefono_fijo", "telefono_celular", "email",
}

var writeAllowedFields = map[string][]string{
	"docentes":              {"apellido", "nombre", "dni", "fecha_inscripcion", "telefono", "email", "activo", "situacion_revista"},
	"cursos":                {"anio", "division", "turno", "ciclo", "jornada", "orientacion"},
	"materias":              {"nombre"},
	"docente_materia_curso": {"id_docente", "id_materia", "id_curso", "cargo", "horas_catedra", "dia_semana", "hora_inicio", "hora_fin", "ciclo_lectivo", "activo"},
}

const alumnoAllowed = "alumnos"

func getIDColumn(realTable string) string {
	switch realTable {
	case "alumnos":
		return "id_alumno"
	case "docentes":
		return "id_docente"
	case "materias":
		return "id_materia"
	case "docente_materia_curso":
		return "id"
	case "usuarios":
		// Mejoras respecto al PHP original (get_id_column devolvía nombres
		// inexistentes: 'id_usuarios', 'id_cursos', 'id_materias', rompiendo
		// update/delete de esas tablas en la app vieja).
		return "id_usuario"
	case "cursos":
		return "id_curso"
	}
	return "id_" + realTable
}

func currentYear() int {
	return time.Now().Year()
}

func asMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

func asSlice(v interface{}) []interface{} {
	if s, ok := v.([]interface{}); ok {
		return s
	}
	return nil
}

func mapVal(m map[string]interface{}, key string) interface{} {
	if m == nil {
		return nil
	}
	return m[key]
}

// filterFields restringe input a los campos permitidos (array_intersect_key).
func filterFields(input map[string]interface{}, allowed []string) map[string]interface{} {
	out := make(map[string]interface{})
	for _, f := range allowed {
		if v, ok := input[f]; ok {
			out[f] = v
		}
	}
	return out
}

func hasKey(input map[string]interface{}, key string) bool {
	_, ok := input[key]
	return ok
}

// ————— auditoría (replica audit_log() de api_helpers.php) —————

func auditSanitize(data map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(data))
	for k, v := range data {
		lk := strings.ToLower(k)
		if lk == "password" || strings.Contains(lk, "password") ||
			strings.Contains(lk, "secret") || strings.Contains(lk, "token") ||
			strings.Contains(lk, "db_key") || lk == "key" {
			out[k] = "[REDACTED]"
		} else {
			out[k] = v
		}
	}
	return out
}

// auditLog es best-effort: nunca rompe la operación principal.
func auditLog(q querier, table, registroID, accion string, antes, despues map[string]interface{}, sess *auth.Session, ip string) {
	var userID, username interface{}
	if sess != nil {
		userID = sess.UID
		username = sess.User
	}
	var antesJSON, despuesJSON interface{}
	if antes != nil {
		antesJSON = mustJSON(auditSanitize(antes))
	}
	if despues != nil {
		despuesJSON = mustJSON(auditSanitize(despues))
	}
	_, _ = q.Exec(
		"INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, username, datos_anteriores, datos_nuevos, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		table, registroID, accion, userID, username, antesJSON, despuesJSON, ip,
	)
}

func mustJSON(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(b)
}

// ————— generic CRUD con auditoría —————

func fetchRow(q querier, realTable, idCol, id string) (map[string]interface{}, bool, error) {
	row, ok, err := queryRow(q, fmt.Sprintf("SELECT * FROM %s WHERE %s = ?", realTable, idCol), id)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return nil, false, nil
		}
		return nil, false, err
	}
	return row, ok, nil
}

func (s *Server) genericInsert(q querier, realTable string, fields map[string]interface{}, sess *auth.Session, ip string) (int64, error) {
	cols := make([]string, 0, len(fields))
	vals := make([]interface{}, 0, len(fields))
	for k, v := range fields {
		cols = append(cols, k)
		vals = append(vals, v)
	}
	res, err := q.Exec(fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		realTable, strings.Join(cols, ","), strings.TrimSuffix(strings.Repeat("?,", len(cols)), ",")), vals...)
	if err != nil {
		return 0, err
	}
	newID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	idCol := getIDColumn(realTable)
	idStr := fmt.Sprintf("%d", newID)
	if row, ok, err := fetchRow(q, realTable, idCol, idStr); err == nil && ok {
		auditLog(q, realTable, idStr, "INSERT", nil, row, sess, ip)
	}
	return newID, nil
}

func (s *Server) genericUpdate(q querier, realTable string, fields map[string]interface{}, id string, sess *auth.Session, ip string) error {
	idCol := getIDColumn(realTable)
	rowBefore, _, _ := fetchRow(q, realTable, idCol, id)

	fields["updated_at"] = time.Now().Format("2006-01-02 15:04:05")
	setParts := make([]string, 0, len(fields))
	vals := make([]interface{}, 0, len(fields))
	for k, v := range fields {
		setParts = append(setParts, k+" = ?")
		vals = append(vals, v)
	}
	vals = append(vals, id)

	if _, err := q.Exec(fmt.Sprintf("UPDATE %s SET %s WHERE %s = ?", realTable, strings.Join(setParts, ","), idCol), vals...); err != nil {
		return err
	}
	if rowAfter, ok, err := fetchRow(q, realTable, idCol, id); err == nil && ok {
		auditLog(q, realTable, id, "UPDATE", rowBefore, rowAfter, sess, ip)
	}
	return nil
}

func (s *Server) genericDelete(q querier, realTable, id string, sess *auth.Session, ip string) error {
	idCol := getIDColumn(realTable)
	rowBefore, _, _ := fetchRow(q, realTable, idCol, id)

	if _, err := q.Exec(fmt.Sprintf("DELETE FROM %s WHERE %s = ?", realTable, idCol), id); err != nil {
		return err
	}
	auditLog(q, realTable, id, "DELETE", rowBefore, nil, sess, ip)
	return nil
}

// ————— helpers de estudiantes —————

func (s *Server) insertAlumno(q querier, input map[string]interface{}) (int64, error) {
	res, err := q.Exec(
		"INSERT INTO alumnos ("+strings.Join(alumnoFields, ",")+") VALUES ("+strings.TrimSuffix(strings.Repeat("?,", len(alumnoFields)), ",")+")",
		alumnoValues(input)...)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Server) updateAlumno(q querier, input map[string]interface{}, id string) error {
	setParts := make([]string, 0, len(alumnoFields))
	vals := make([]interface{}, 0, len(alumnoFields))
	for _, f := range alumnoFields {
		setParts = append(setParts, f+" = ?")
		vals = append(vals, mapVal(input, f))
	}
	vals = append(vals, id)
	_, err := q.Exec("UPDATE alumnos SET "+strings.Join(setParts, ",")+" WHERE id_alumno = ?", vals...)
	return err
}

func alumnoValues(input map[string]interface{}) []interface{} {
	vals := make([]interface{}, 0, len(alumnoFields))
	for _, f := range alumnoFields {
		vals = append(vals, mapVal(input, f))
	}
	return vals
}

func salutValues(input map[string]interface{}, idAlumno string, isInsert bool) []interface{} {
	vals := make([]interface{}, 0, len(saludFields)+1)
	vals = append(vals, idAlumno)
	for _, f := range saludFields {
		if v := mapVal(input, "salud_"+f); v != nil {
			vals = append(vals, v)
		} else {
			vals = append(vals, 0)
		}
	}
	if isInsert {
		return vals
	}
	return vals[1:]
}

// saveSalud replica save_salud() (insert o update de la fila salud_alumno).
func (s *Server) saveSalud(q querier, input map[string]interface{}, idAlumno string, isInsert bool) error {
	if isInsert {
		_, err := q.Exec(
			"INSERT INTO salud_alumno (id_alumno,"+strings.Join(saludFields, ",")+") VALUES ("+strings.TrimSuffix(strings.Repeat("?,", len(saludFields)+1), ",")+")",
			salutValues(input, idAlumno, true)...)
		return err
	}
	setParts := make([]string, 0, len(saludFields))
	for _, f := range saludFields {
		setParts = append(setParts, f+" = ?")
	}
	vals := salutValues(input, idAlumno, false)
	vals = append(vals, idAlumno)
	_, err := q.Exec("UPDATE salud_alumno SET "+strings.Join(setParts, ",")+" WHERE id_alumno = ?", vals...)
	return err
}

// saveRestriccion replica save_restriccion(): upsert si hay rj_nombre, delete si no.
func (s *Server) saveRestriccion(q querier, input map[string]interface{}, idAlumno string) error {
	var count int
	_ = q.QueryRow("SELECT COUNT(*) FROM restricciones_judiciales WHERE id_alumno = ?", idAlumno).Scan(&count)

	rjNombre := mapVal(input, "rj_nombre")
	if rjNombre != nil && asString(rjNombre) != "" {
		if count > 0 {
			_, err := q.Exec(
				"UPDATE restricciones_judiciales SET apellido_nombre = ?, tipo_doc = ?, nro_doc = ?, descripcion = ? WHERE id_alumno = ?",
				mapVal(input, "rj_nombre"), mapVal(input, "rj_tipo_doc"), mapVal(input, "rj_nro_doc"), mapVal(input, "rj_descripcion"), idAlumno)
			return err
		}
		_, err := q.Exec(
			"INSERT INTO restricciones_judiciales (id_alumno, apellido_nombre, tipo_doc, nro_doc, descripcion) VALUES (?, ?, ?, ?, ?)",
			idAlumno, mapVal(input, "rj_nombre"), mapVal(input, "rj_tipo_doc"), mapVal(input, "rj_nro_doc"), mapVal(input, "rj_descripcion"))
		return err
	}
	if count > 0 {
		_, err := q.Exec("DELETE FROM restricciones_judiciales WHERE id_alumno = ?", idAlumno)
		return err
	}
	return nil
}

// buildRespValues replica build_resp_values().
func buildRespValues(input map[string]interface{}, index int) []interface{} {
	prefix := fmt.Sprintf("resp%d_", index)
	vals := make([]interface{}, 0, len(respFields))
	for _, f := range respFields {
		switch f {
		case "convive_estudiante":
			vals = append(vals, mapVal(input, prefix+"convive"))
		case "condicion_actividad":
			vals = append(vals, mapVal(input, prefix+"condicion_actividad"))
		default:
			vals = append(vals, mapVal(input, prefix+f))
		}
	}
	return vals
}

// saveResponsables replica save_responsables(): upsert por UNIQUE(tipo_dni, dni).
func (s *Server) saveResponsables(q querier, input map[string]interface{}, idAlumno string) error {
	cols := strings.Join(respFields, ",")
	for i := 1; i <= 2; i++ {
		prefix := fmt.Sprintf("resp%d_", i)
		dni := mapVal(input, prefix+"dni")
		if dni == nil || asString(dni) == "" {
			continue
		}
		vals := buildRespValues(input, i)

		updateParts := make([]string, 0, len(respFields))
		for _, f := range respFields {
			updateParts = append(updateParts, f+" = excluded."+f)
		}

		var idResp int64
		_, err := q.Exec(
			"INSERT INTO responsables ("+cols+") VALUES ("+strings.TrimSuffix(strings.Repeat("?,", len(respFields)), ",")+")"+
				" ON CONFLICT(tipo_dni, dni) DO UPDATE SET "+strings.Join(updateParts, ","),
			vals...)
		if err != nil {
			return err
		}
		_ = q.QueryRow("SELECT id_responsable FROM responsables WHERE tipo_dni = ? AND dni = ?",
			mapVal(input, prefix+"tipo_dni"), dni).Scan(&idResp)

		esPrincipal := 0
		if i == 1 {
			esPrincipal = 1
		}
		if _, err := q.Exec(
			"INSERT OR IGNORE INTO alumno_responsable (id_alumno, id_responsable, es_principal) VALUES (?, ?, ?)",
			idAlumno, idResp, esPrincipal); err != nil {
			return err
		}
	}
	return nil
}

// findOrCreateMateria replica find_or_create_materia().
func (s *Server) findOrCreateMateria(q querier, name string) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Sin Asignar"
	}
	var id int64
	err := q.QueryRow("SELECT id_materia FROM materias WHERE LOWER(nombre) = LOWER(?) LIMIT 1", name).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err.Error() != "sql: no rows in result set" {
		return 0, err
	}
	res, err := q.Exec("INSERT INTO materias (nombre) VALUES (?)", name)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// upsertDmc replica el INSERT ... ON DUPLICATE KEY de docente_materia_curso.
func (s *Server) upsertDmc(q querier, idDocente, idMateria, idCurso interface{}, cargo, dia, hIni, hFin string) error {
	_, err := q.Exec(
		`INSERT INTO docente_materia_curso (id_docente, id_materia, id_curso, cargo, dia_semana, hora_inicio, hora_fin, activo, ciclo_lectivo)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
		 ON CONFLICT(id_docente, id_materia, id_curso, ciclo_lectivo) DO UPDATE SET
		   activo = 1, id_materia = excluded.id_materia, cargo = excluded.cargo,
		   dia_semana = excluded.dia_semana, hora_inicio = excluded.hora_inicio, hora_fin = excluded.hora_fin`,
		idDocente, idMateria, idCurso, cargo, dia, hIni, hFin, currentYear())
	return err
}

func asString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case bool:
		if t {
			return "1"
		}
		return "0"
	case json.Number:
		return t.String()
	case float64:
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprintf("%v", t)
	case int64:
		return fmt.Sprintf("%d", t)
	}
	return fmt.Sprintf("%v", v)
}