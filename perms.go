package main

import (
	"encoding/json"
	"net/http"

	"mozart/auth"
)

// ————— Catálogo de permisos granulares —————
//
// El rol `admin` implica TODOS los permisos. Un usuario `lectura` solo tiene
// los permisos listados en `usuarios.permisos` (JSON array). Los permisos de
// modificación/gestión implican el permiso de lectura del mismo módulo.

const (
	permVerEstudiantes  = "ver_estudiantes"
	permVerDocentes     = "ver_docentes"
	permVerCursos       = "ver_cursos"
	permVerMaterias     = "ver_materias"
	permVerUsuarios     = "ver_usuarios"
	permVerAuditoria    = "ver_auditoria"
	permVerBackups      = "ver_backups"
	permModEstudiantes  = "modificar_estudiantes"
	permModDocentes     = "modificar_docentes"
	permModCursos       = "modificar_cursos"
	permModMaterias     = "modificar_materias"
	permGestionUsuarios = "gestion_usuarios"
	permGestionBackups  = "gestion_backups"
	permExportar        = "exportar"
)

// permisosDatosLectura: lectura sobre los módulos académicos (acceso por defecto).
var permisosDatosLectura = []string{
	permVerEstudiantes, permVerDocentes, permVerCursos, permVerMaterias, permExportar,
}

// permisosDatosEscritura: alta/edición/baja de los módulos académicos.
var permisosDatosEscritura = []string{
	permModEstudiantes, permModDocentes, permModCursos, permModMaterias,
}

// permisosAdministracion: gestión del sistema (segmento aparte en la UI).
var permisosAdministracion = []string{
	permVerUsuarios, permVerAuditoria, permVerBackups, permGestionUsuarios, permGestionBackups,
}

// allPerms devuelve la lista canónica completa de permisos conocidos.
func allPerms() []string {
	out := make([]string, 0, len(permisosDatosLectura)+len(permisosDatosEscritura)+len(permisosAdministracion))
	out = append(out, permisosDatosLectura...)
	out = append(out, permisosDatosEscritura...)
	out = append(out, permisosAdministracion...)
	return out
}

func knownPerm(p string) bool {
	for _, k := range allPerms() {
		if k == p {
			return true
		}
	}
	return false
}

// parsePerms decodifica el JSON de usuarios.permisos, deduplica y descarta
// permisos desconocidos (allowlist). Un JSON inválido devuelve nil.
func parsePerms(raw string) []string {
	if raw == "" {
		return nil
	}
	var list []string
	if err := json.Unmarshal([]byte(raw), &list); err != nil {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(list))
	for _, p := range list {
		if !knownPerm(p) || seen[p] {
			continue
		}
		seen[p] = true
		out = append(out, p)
	}
	return out
}

// hasPerm decide si un usuario (por rol + lista) tiene el permiso `want`.
// El rol admin lo tiene todo; un permiso de escritura implica su lectura.
func hasPerm(role string, perms []string, want string) bool {
	if role == "admin" {
		return true
	}
	set := map[string]bool{}
	for _, p := range perms {
		set[p] = true
	}
	if set[want] {
		return true
	}
	switch want {
	case permVerEstudiantes:
		return set[permModEstudiantes]
	case permVerDocentes:
		return set[permModDocentes]
	case permVerCursos:
		return set[permModCursos]
	case permVerMaterias:
		return set[permModMaterias]
	case permVerUsuarios:
		return set[permGestionUsuarios]
	case permVerBackups:
		return set[permGestionBackups]
	}
	return false
}

// viewPermForTable: permiso de lectura requerido para cada tabla del API.
func viewPermForTable(table string) string {
	switch table {
	case "estudiantes":
		return permVerEstudiantes
	case "docentes", "docente_cursos", "asignaciones":
		return permVerDocentes
	case "cursos", "lista_cursos":
		return permVerCursos
	case "materias":
		return permVerMaterias
	// Nóminas y docentes por curso: desde la fusión con "Listado por Cursos"
	// viven en la sección Cursos, que se rige por ver_cursos.
	case "nomina", "docentes_por_curso":
		return permVerCursos
	case "usuarios":
		return permVerUsuarios
	case "audit_log":
		return permVerAuditoria
	}
	return ""
}

// writePermForTable: permiso de escritura requerido para cada tabla del API.
func writePermForTable(table string) string {
	switch table {
	case "estudiantes":
		return permModEstudiantes
	case "docentes", "docente_cursos", "asignaciones":
		return permModDocentes
	case "cursos":
		return permModCursos
	case "materias":
		return permModMaterias
	case "usuarios":
		return permGestionUsuarios
	}
	return ""
}

// writePermForReq: permiso de escritura para un request no-GET (por action o table).
func writePermForReq(r *http.Request) string {
	switch r.URL.Query().Get("action") {
	case "ocr":
		return permModEstudiantes
	case "backup_crear", "backup_upload":
		return permGestionBackups
	}
	return writePermForTable(r.URL.Query().Get("table"))
}

// userPerms devuelve los permisos efectivos del usuario de la sesión, leídos
// frescos de la DB en cada request (efecto inmediato al cambiar permisos).
// El rol admin (y el modo de desarrollo AUTOLOGIN) reciben todos los permisos.
func (s *Server) userPerms(sess *auth.Session) []string {
	if sess == nil {
		return nil
	}
	if s == nil || s.dbs == nil {
		return nil
	}
	if s.cfg.AutoLogin != "" || sess.Role == "admin" {
		return allPerms()
	}
	var raw string
	if err := s.dbs.QueryRow("SELECT permisos FROM usuarios WHERE id_usuario = ? AND activo = 1", sess.UID).Scan(&raw); err != nil {
		return nil
	}
	return parsePerms(raw)
}

// permsJSON serializa la lista de permisos como JSON array.
func permsJSON(perms []string) string {
	if perms == nil {
		return "[]"
	}
	b, _ := json.Marshal(perms)
	return string(b)
}

// permValues extrae la lista de permisos válidos (allowlist) de `data["permisos"]`.
func permValues(data map[string]interface{}) []string {
	val := mapVal(data, "permisos")
	var raw []string
	switch v := val.(type) {
	case []interface{}:
		for _, x := range v {
			raw = append(raw, asString(x))
		}
	case []string:
		raw = v
	}
	var out []string
	for _, p := range raw {
		if knownPerm(p) {
			out = append(out, p)
		}
	}
	return out
}
