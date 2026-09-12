package main

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

func clampInt(n, lo, hi int) int {
	if n < lo {
		return lo
	}
	if n > hi {
		return hi
	}
	return n
}

// querier abarca *sql.DB y *sql.Tx para reutilizar helpers en transacciones.
type querier interface {
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row
	Exec(query string, args ...interface{}) (sql.Result, error)
}

// queryRows ejecuta la consulta y devuelve las filas como []map[string]any
// con los tipos nativos de SQLite (int64, float64, string, nil, []byte).
func queryRows(q querier, query string, args ...interface{}) ([]map[string]interface{}, error) {
	rows, err := q.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	colsLen := len(cols)
	out := []map[string]interface{}{}
	for rows.Next() {
		vals := make([]interface{}, colsLen)
		ptrs := make([]interface{}, colsLen)
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		m := make(map[string]interface{}, colsLen)
		for i, c := range cols {
			m[c] = vals[i]
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func queryRow(q querier, query string, args ...interface{}) (map[string]interface{}, bool, error) {
	rows, err := queryRows(q, query, args...)
	if err != nil {
		return nil, false, err
	}
	if len(rows) == 0 {
		return nil, false, nil
	}
	return rows[0], true, nil
}

type pageResult struct {
	Data  []map[string]interface{} `json:"data"`
	Total int                      `json:"total"`
	Page  int                      `json:"page"`
	Limit int                      `json:"limit"`
	Pages int                      `json:"pages"`
}

// paginateQuery replica paginate_query() de api_helpers.php.
func paginateQuery(q querier, baseQuery string, args []interface{}, page, limit int) (*pageResult, error) {
	page = clampInt(page, 1, 1<<30)
	limit = clampInt(limit, 1, 100)

	var total int
	if err := q.QueryRow("SELECT COUNT(*) FROM ("+baseQuery+")", args...).Scan(&total); err != nil {
		return nil, err
	}

	pages := max(1, (total+limit-1)/limit)
	if page > pages {
		page = pages
	}
	offset := (page - 1) * limit

	data, err := queryRows(q, baseQuery+" LIMIT ? OFFSET ?", append(args, limit, offset)...)
	if err != nil {
		return nil, err
	}
	return &pageResult{Data: data, Total: total, Page: page, Limit: limit, Pages: pages}, nil
}

func (s *Server) handleApiGet(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	table := q.Get("table")
	id := q.Get("id")
	page := atoiDefault(q.Get("page"), 1)
	limit := atoiDefault(q.Get("limit"), 30)

	sess := s.currentSession(r)
	if sess == nil {
		jsonError(w, http.StatusUnauthorized, "No autorizado o sesión expirada.")
		return
	}

	if format := q.Get("format"); format != "" {
		s.handleExport(w, r, table, id, format)
		return
	}

	switch table {
	case "usuarios":
		s.jsonRows(w, "SELECT id_usuario, username, nombre_completo, rol, activo FROM usuarios ORDER BY username")

	case "audit_log":
		if sess.Role != "admin" {
			jsonError(w, http.StatusForbidden, "Solo los administradores pueden ver el log de auditoría")
			return
		}
		filtro := q.Get("filtro_tabla")
		base := `SELECT al.*, u.nombre_completo as usuario_nombre
		         FROM audit_log al
		         LEFT JOIN usuarios u ON al.usuario_id = u.id_usuario`
		var args []interface{}
		if filtro != "" {
			base += " WHERE al.tabla = ?"
			args = append(args, filtro)
		}
		base += " ORDER BY al.created_at DESC"
		s.jsonPage(w, base, args, page, limit)

	case "nomina":
		if id == "" {
			jsonError(w, http.StatusBadRequest, "ID de curso requerido")
			return
		}
		s.jsonRowsArgs(w,
			`SELECT
				a.id_alumno, a.apellido, a.nombre, a.dni,
				r.nombre as resp_nombre, r.apellido as resp_apellido, r.telefono_celular as resp_tel,
				(SELECT COUNT(*) FROM salud_alumno s
				 WHERE s.id_alumno = a.id_alumno
				 AND (s.asma=1 OR s.celiaquia=1 OR s.diabetes=1 OR s.obesidad=1 OR s.cardiopatia=1
				      OR (s.alergias IS NOT NULL AND TRIM(s.alergias) != '')
				      OR (s.antecedentes_salud IS NOT NULL AND TRIM(s.antecedentes_salud) != '')
				      OR (s.otros_checklist IS NOT NULL AND TRIM(s.otros_checklist) != '')
				      OR (s.internaciones IS NOT NULL AND TRIM(s.internaciones) != ''))) as alerta_salud
			 FROM alumnos a
			 LEFT JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno AND ar.es_principal = 1
			 LEFT JOIN responsables r ON ar.id_responsable = r.id_responsable
			 WHERE a.id_curso = ? AND a.activo = 1
			 ORDER BY a.apellido ASC, a.nombre ASC`, id)

	case "docentes_por_curso":
		if id == "" {
			jsonError(w, http.StatusBadRequest, "ID de curso requerido")
			return
		}
		s.jsonRowsArgs(w,
			`SELECT dmc.id, d.id_docente, d.apellido, d.nombre, d.dni, d.telefono,
			        m.id_materia, m.nombre as materia,
			        dmc.cargo as cargo_curso, dmc.dia_semana, dmc.hora_inicio, dmc.hora_fin
			 FROM docente_materia_curso dmc
			 JOIN docentes d ON dmc.id_docente = d.id_docente
			 JOIN materias m ON dmc.id_materia = m.id_materia
			 WHERE dmc.id_curso = ? AND dmc.activo = 1
			 ORDER BY d.apellido ASC`, id)

	case "search":
		search := q.Get("search")
		rol := q.Get("rol")
		if rol == "" {
			rol = "todos"
		}
		anio := q.Get("anio")
		turno := q.Get("turno")

		var results []map[string]interface{}
		if rol == "todos" || rol == "alumno" {
			sql := `SELECT id_alumno as id, apellido || ', ' || nombre as nombre, dni, 'alumno' as rol, id_curso
			        FROM alumnos WHERE (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)`
			args := []interface{}{"%" + search + "%", "%" + search + "%", "%" + search + "%"}
			if anio != "" || turno != "" {
				sql += " AND id_curso IN (SELECT id_curso FROM cursos WHERE 1=1"
				if anio != "" {
					sql += " AND anio = ?"
					args = append(args, anio)
				}
				if turno != "" {
					sql += " AND turno = ?"
					args = append(args, turno)
				}
				sql += ")"
			}
			rows, err := queryRows(s.dbs, sql, args...)
			if err == nil {
				results = append(results, rows...)
			} else {
				s.serverError(w, err)
				return
			}
		}
		if rol == "todos" || rol == "profesor" {
			sql := `SELECT id_docente as id, apellido || ', ' || nombre as nombre, dni, 'profesor' as rol, NULL as id_curso
			        FROM docentes WHERE (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)`
			args := []interface{}{"%" + search + "%", "%" + search + "%", "%" + search + "%"}
			rows, err := queryRows(s.dbs, sql, args...)
			if err == nil {
				results = append(results, rows...)
			} else {
				s.serverError(w, err)
				return
			}
		}
		s.writeResult(w, results)

	case "lista_cursos":
		s.jsonRows(w,
			`SELECT id_curso, anio, division, turno,
			        anio || '°' || division || '° (' || ciclo || ') - ' || turno as nombre
			 FROM cursos ORDER BY anio, division`)

	case "docente_cursos":
		if id == "" {
			jsonError(w, http.StatusBadRequest, "ID de docente requerido")
			return
		}
		s.jsonRowsArgs(w,
			`SELECT dmc.id, dmc.id_curso, m.nombre as materia,
			        dmc.cargo, dmc.dia_semana, dmc.hora_inicio, dmc.hora_fin
			 FROM docente_materia_curso dmc
			 LEFT JOIN materias m ON dmc.id_materia = m.id_materia
			 WHERE dmc.id_docente = ? AND dmc.activo = 1`, id)

	case "estudiantes":
		if id != "" {
			s.jsonStudentDetail(w, id)
			return
		}
		base := `SELECT a.id_alumno,
		                a.apellido || ', ' || a.nombre as nombre,
		                c.anio || '°' || c.division || '°' as curso,
		                a.dni,
		                r.apellido || ', ' || r.nombre as tutor
		         FROM alumnos a
		         JOIN cursos c ON a.id_curso = c.id_curso
		         LEFT JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno AND ar.es_principal = 1
		         LEFT JOIN responsables r ON ar.id_responsable = r.id_responsable
		         WHERE a.activo = 1
		         ORDER BY a.apellido, a.nombre`
		s.jsonPage(w, base, nil, page, limit)

	case "docentes":
		if id != "" {
			s.jsonRowOrArray(w, "SELECT * FROM docentes WHERE id_docente = ?", id)
			return
		}
		base := `SELECT id_docente, apellido || ', ' || nombre as nombre, dni, situacion_revista as cargo
		         FROM docentes ORDER BY apellido, nombre`
		s.jsonPage(w, base, nil, page, limit)

	case "cursos":
		if id != "" {
			s.jsonRowOrArray(w, "SELECT * FROM cursos WHERE id_curso = ?", id)
			return
		}
		s.jsonRows(w,
			`SELECT id_curso, anio || '°' || division || '°' as nombre, turno as curso FROM cursos`)

	case "materias":
		if id != "" {
			s.jsonRowOrArray(w, "SELECT * FROM materias WHERE id_materia = ?", id)
			return
		}
		s.jsonRows(w, `SELECT id_materia, nombre, 'N/A' as curso FROM materias`)

	case "asignaciones":
		if id != "" {
			s.jsonRowOrArray(w, "SELECT * FROM docente_materia_curso WHERE id = ?", id)
			return
		}
		s.jsonRows(w, `SELECT * FROM docente_materia_curso WHERE activo=1`)

	default:
		jsonError(w, http.StatusBadRequest, "Tabla no válida")
	}
}

// ————— helpers de respuesta (paridad con api.php) —————

func (s *Server) writeResult(w http.ResponseWriter, v interface{}) {
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) serverError(w http.ResponseWriter, err error) {
	log.Printf("api: %v", err)
	jsonError(w, http.StatusInternalServerError, "Error interno del servidor")
}

func (s *Server) jsonRows(w http.ResponseWriter, query string) {
	rows, err := queryRows(s.dbs, query)
	if err != nil {
		s.serverError(w, err)
		return
	}
	s.writeResult(w, rows)
}

func (s *Server) jsonRowsArgs(w http.ResponseWriter, query string, args ...interface{}) {
	rows, err := queryRows(s.dbs, query, args...)
	if err != nil {
		s.serverError(w, err)
		return
	}
	s.writeResult(w, rows)
}

func (s *Server) jsonPage(w http.ResponseWriter, base string, args []interface{}, page, limit int) {
	res, err := paginateQuery(s.dbs, base, args, page, limit)
	if err != nil {
		s.serverError(w, err)
		return
	}
	s.writeResult(w, res)
}

// jsonRowOrArray replica el bloque final de api.php: con id devuelve el objeto
// si existe, si no `[]` (paridad con PDO fetchAll).
func (s *Server) jsonRowOrArray(w http.ResponseWriter, query string, id string) {
	row, ok, err := queryRow(s.dbs, query, id)
	if err != nil {
		s.serverError(w, err)
		return
	}
	if ok {
		s.writeResult(w, row)
	} else {
		s.writeResult(w, []interface{}{})
	}
}

// jsonStudentDetail replica query_student_detail(): fila de alumnos + salud +
// restricciones + responsibly aplanados como resp<N>_<campo>.
func (s *Server) jsonStudentDetail(w http.ResponseWriter, id string) {
	row, ok, err := queryRow(s.dbs,
		`SELECT a.*,
		        s.asma as salud_asma, s.celiaquia as salud_celiaquia, s.diabetes as salud_diabetes,
		        s.obesidad as salud_obesidad, s.cardiopatia as salud_cardiopatia,
		        s.otros_checklist as salud_otros_checklist, s.alergias as salud_alergias,
		        s.internaciones as salud_internaciones, s.antecedentes_salud as salud_antecedentes_salud,
		        s.obra_social_nombre as salud_obra_social_nombre, s.obra_social_nro as salud_obra_social_nro,
		        rj.apellido_nombre as rj_nombre, rj.tipo_doc as rj_tipo_doc,
		        rj.nro_doc as rj_nro_doc, rj.descripcion as rj_descripcion
		 FROM alumnos a
		 LEFT JOIN salud_alumno s ON a.id_alumno = s.id_alumno
		 LEFT JOIN restricciones_judiciales rj ON a.id_alumno = rj.id_alumno
		 WHERE a.id_alumno = ?`, id)
	if err != nil {
		s.serverError(w, err)
		return
	}
	if !ok {
		s.writeResult(w, nil)
		return
	}

	respRows, err := queryRows(s.dbs,
		`SELECT r.*, ar.es_principal
		 FROM responsables r
		 JOIN alumno_responsable ar ON r.id_responsable = ar.id_responsable
		 WHERE ar.id_alumno = ?
		 ORDER BY ar.es_principal DESC`, id)
	if err != nil {
		s.serverError(w, err)
		return
	}
	for i, r := range respRows {
		num := i + 1
		for k, v := range r {
			if k == "es_principal" {
				continue
			}
			row[strings.Join([]string{"resp", itoa(num), "_", k}, "")] = v
		}
	}
	s.writeResult(w, row)
}