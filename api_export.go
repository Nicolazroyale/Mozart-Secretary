package main

import (
	_ "embed"
	"fmt"
	"mime"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-pdf/fpdf"
	"github.com/xuri/excelize/v2"
)

//go:embed assets/fonts/DejaVuSans.ttf
var dejavuSans []byte

//go:embed assets/fonts/DejaVuSans-Bold.ttf
var dejavuSansBold []byte

type exportData struct {
	title   string
	headers []string
	data    [][]string
	profH   []string
	profD   [][]string
	horH    []string
	horD    [][]string
}

// handleExport replica export_data() del PHP (api.php líneas 488-646).
func (s *Server) handleExport(w http.ResponseWriter, r *http.Request, table, id, format string) {
	q := r.URL.Query()
	inc := func(name string) bool { return q.Get(name) != "0" }
	includeProfesores := inc("include_profesores")
	includeHorarios := inc("include_horarios")
	includeDNI := inc("include_dni")
	includeResponsables := inc("include_responsables")
	includeTelefonos := inc("include_telefonos")
	includeSalud := inc("include_salud")

	x := exportData{}

	switch table {
	case "estudiantes":
		// El PHP usa la vista v_ficha_alumno (una vista rota); aquí se usa la
		// query real equivalente (reemplaza el placeholder, como el resto).
		x.title = "Listado de Estudiantes"
		x.headers = []string{"Nombre", "Curso", "DNI", "Tutor"}
		rows, err := queryRows(s.dbs,
			`SELECT a.apellido || ', ' || a.nombre as nombre,
			        c.anio || '°' || c.division || '°' as curso,
			        a.dni,
			        r.apellido || ', ' || r.nombre as tutor
			 FROM alumnos a
			 JOIN cursos c ON a.id_curso = c.id_curso
			 LEFT JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno AND ar.es_principal = 1
			 LEFT JOIN responsables r ON ar.id_responsable = r.id_responsable
			 WHERE a.activo = 1
			 ORDER BY a.apellido, a.nombre`)
		if err != nil {
			s.serverError(w, err)
			return
		}
		for _, row := range rows {
			x.data = append(x.data, []string{
				asString(row["nombre"]), asString(row["curso"]),
				asString(row["dni"]), asString(row["tutor"]),
			})
		}

	case "docentes":
		x.title = "Listado de Docentes"
		x.headers = []string{"Nombre", "DNI", "Cargo"}
		rows, err := queryRows(s.dbs,
			`SELECT apellido || ', ' || nombre as nombre, dni, situacion_revista as cargo
			 FROM docentes ORDER BY apellido, nombre`)
		if err != nil {
			s.serverError(w, err)
			return
		}
		for _, row := range rows {
			x.data = append(x.data, []string{
				asString(row["nombre"]), asString(row["dni"]), asString(row["cargo"]),
			})
		}

	case "cursos":
		x.title = "Listado de Cursos"
		x.headers = []string{"Nombre", "Turno", "Profesores (Cargo/Materia)"}
		rows, err := queryRows(s.dbs,
			`SELECT id_curso, anio || '°' || division || '°' as nombre, turno FROM cursos ORDER BY anio, division`)
		if err != nil {
			s.serverError(w, err)
			return
		}
		for _, row := range rows {
			docentes, err := queryRows(s.dbs,
				`SELECT d.apellido, d.nombre, dmc.cargo as cargo_curso, m.nombre as materia
				 FROM docente_materia_curso dmc
				 JOIN docentes d ON dmc.id_docente = d.id_docente
				 JOIN materias m ON dmc.id_materia = m.id_materia
				 WHERE dmc.id_curso = ? AND dmc.activo = 1
				 ORDER BY d.apellido`, row["id_curso"])
			if err != nil {
				s.serverError(w, err)
				return
			}
			var profs []string
			for _, d := range docentes {
				profs = append(profs, fmt.Sprintf("%s, %s (%s: %s)",
					asString(d["apellido"]), asString(d["nombre"]),
					asString(d["cargo_curso"]), asString(d["materia"])))
			}
			profesoresStr := strings.Join(profs, "\n")
			if profesoresStr == "" {
				profesoresStr = "---"
			}
			x.data = append(x.data, []string{asString(row["nombre"]), asString(row["turno"]), profesoresStr})
		}

	case "materias":
		x.title = "Listado de Materias"
		x.headers = []string{"Nombre"}
		rows, err := queryRows(s.dbs, `SELECT nombre FROM materias ORDER BY nombre`)
		if err != nil {
			s.serverError(w, err)
			return
		}
		for _, row := range rows {
			x.data = append(x.data, []string{asString(row["nombre"])})
		}

	case "nomina":
		if id == "" {
			jsonError(w, http.StatusBadRequest, "ID de curso requerido")
			return
		}
		curso, ok, err := queryRow(s.dbs,
			`SELECT anio || '°' || division || '° (' || turno || ')' as nombre FROM cursos WHERE id_curso = ?`, id)
		if err != nil {
			s.serverError(w, err)
			return
		}
		_ = ok
		x.title = "Nómina del Curso: " + asString(curso["nombre"])

		docentes, err := s.docentesPorCurso(id)
		if err != nil {
			s.serverError(w, err)
			return
		}

		if includeProfesores {
			x.profH = []string{"Apellido", "Nombre", "Materia", "Cargo", "Día", "Horario", "Teléfono"}
			for _, d := range docentes {
				horario := "---"
				if t := asString(d["hora_inicio"]); t != "" {
					horario = t[:5] + " - "
					if tf := asString(d["hora_fin"]); tf != "" {
						horario += tf[:5]
					} else {
						horario += "---"
					}
				}
				x.profD = append(x.profD, []string{
					asString(d["apellido"]), asString(d["nombre"]), asString(d["materia"]),
					asString(d["cargo_curso"]), orDash(d["dia_semana"]), horario, orDash(d["telefono"]),
				})
			}
		}

		if includeHorarios {
			x.horH = []string{"Día", "Materia", "Profesor", "Horario"}
			diasOrden := []string{"Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"}
			porDia := map[string][]map[string]interface{}{}
			for _, d := range docentes {
				dia := asString(d["dia_semana"])
				if dia != "" {
					porDia[dia] = append(porDia[dia], d)
				}
			}
			for _, entries := range porDia {
				sort.Slice(entries, func(a, b int) bool {
					return asString(entries[a]["hora_inicio"]) < asString(entries[b]["hora_inicio"])
				})
			}
			for _, dia := range diasOrden {
				for _, e := range porDia[dia] {
					horario := "---"
					if t := asString(e["hora_inicio"]); t != "" {
						horario = t[:5] + " - "
						if tf := asString(e["hora_fin"]); tf != "" {
							horario += tf[:5]
						} else {
							horario += "---"
						}
					}
					x.horD = append(x.horD, []string{
						dia, asString(e["materia"]),
						asString(e["apellido"]) + ", " + asString(e["nombre"]),
						horario,
					})
				}
			}
		}

		x.headers = []string{"Apellido", "Nombre"}
		if includeDNI {
			x.headers = append(x.headers, "DNI")
		}
		if includeResponsables {
			x.headers = append(x.headers, "Responsable")
		}
		if includeTelefonos {
			x.headers = append(x.headers, "Teléfono Resp.")
		}
		if includeSalud {
			x.headers = append(x.headers, "Alerta Salud")
		}

		alumnos, err := queryRows(s.dbs,
			`SELECT a.apellido, a.nombre, a.dni,
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
			 ORDER BY a.apellido, a.nombre`, id)
		if err != nil {
			s.serverError(w, err)
			return
		}
		for _, row := range alumnos {
			rd := []string{asString(row["apellido"]), asString(row["nombre"])}
			if includeDNI {
				rd = append(rd, asString(row["dni"]))
			}
			if includeResponsables {
				rd = append(rd, asString(row["resp_nombre"])+" "+asString(row["resp_apellido"]))
			}
			if includeTelefonos {
				rd = append(rd, asString(row["resp_tel"]))
			}
			if includeSalud {
				if n, _ := row["alerta_salud"].(int64); n > 0 {
					rd = append(rd, "Sí")
				} else {
					rd = append(rd, "No")
				}
			}
			x.data = append(x.data, rd)
		}

	default:
		jsonError(w, http.StatusBadRequest, "Tabla no válida para exportación")
		return
	}

	switch format {
	case "excel":
		exportExcel(w, x)
	case "pdf":
		exportPDF(w, x)
	default:
		jsonError(w, http.StatusBadRequest, "Formato no válido")
	}
}

// docentesPorCurso devuelve los docentes asignados a un curso con su horario
// (paridad con query_docentes_por_curso() del PHP).
func (s *Server) docentesPorCurso(id string) ([]map[string]interface{}, error) {
	return queryRows(s.dbs,
		`SELECT d.apellido, d.nombre, d.telefono, m.nombre as materia,
		        dmc.cargo as cargo_curso, dmc.dia_semana, dmc.hora_inicio, dmc.hora_fin
		 FROM docente_materia_curso dmc
		 JOIN docentes d ON dmc.id_docente = d.id_docente
		 JOIN materias m ON dmc.id_materia = m.id_materia
		 WHERE dmc.id_curso = ? AND dmc.activo = 1
		 ORDER BY d.apellido`, id)
}

func orDash(v interface{}) string {
	if s := asString(v); s != "" {
		return s
	}
	return "---"
}

// exportExcel replica export_excel() del PHP (api.php líneas 648-800).
func exportExcel(w http.ResponseWriter, x exportData) {
	f := excelize.NewFile()
	defer f.Close()
	sheet := "Sheet1"

	now := time.Now().Format("02/01/2006 15:04:05")
	cursor := 1
	maxCols := len(x.headers)
	if len(x.profH) > maxCols {
		maxCols = len(x.profH)
	}
	if len(x.horH) > maxCols {
		maxCols = len(x.horH)
	}

	// Título (fila 1, merge)
	f.SetCellValue(sheet, cellName(1, cursor), x.title)
	if maxCols > 0 {
		f.MergeCell(sheet, cellName(1, cursor), cellName(maxCols, cursor))
	}
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, cellName(1, cursor), cellName(maxCols, cursor), titleStyle)
	cursor++

	// Fecha (fila 2, merge)
	f.SetCellValue(sheet, cellName(1, cursor), "Fecha de generación: "+now)
	if maxCols > 0 {
		f.MergeCell(sheet, cellName(1, cursor), cellName(maxCols, cursor))
	}
	dateStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, cellName(1, cursor), cellName(maxCols, cursor), dateStyle)
	cursor += 2

	tableStyle := func(fill string) *excelize.Style {
		return &excelize.Style{
			Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
			Fill:      excelize.Fill{Type: "pattern", Color: []string{fill}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center"},
		}
	}

	// Horarios del curso
	if len(x.horH) > 0 && len(x.horD) > 0 {
		cursor = writeSection(f, sheet, cursor, "Horarios del Curso", x.horH, x.horD, tableStyle("70AD47"))
	}

	// Profesores del curso
	if len(x.profH) > 0 && len(x.profD) > 0 {
		cursor = writeSection(f, sheet, cursor, "Profesores del Curso", x.profH, x.profD, tableStyle("4472C4"))
	}

	// Datos principales
	cursor = writeSection(f, sheet, cursor, "", x.headers, x.data, tableStyle("4472C4"))

	// Auto-size de columnas
	for c := 1; c <= maxCols; c++ {
		width := 12.0
		for _, row := range [][][]string{x.horD, x.profD, x.data} {
			for _, r := range row {
				if c-1 < len(r) {
					if w := displayWidth(r[c-1]) + 2; w > width {
						width = w
					}
				}
			}
		}
		colName, _ := excelize.ColumnNumberToName(c)
		f.SetColWidth(sheet, colName, colName, width)
	}

	filename := exportFileName(x.title, "xlsx")
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", disposition("attachment", filename))
	w.Header().Set("Cache-Control", "max-age=0")
	if err := f.Write(w); err != nil {
		jsonError(w, http.StatusInternalServerError, "Error al generar el Excel")
	}
}

// writeSection escribe un subtítulo (opcional), headers y filas, y devuelve la
// próxima fila libre.
func writeSection(f *excelize.File, sheet string, cursor int, subtitle string, headers []string, data [][]string, headerStyle *excelize.Style) int {
	if subtitle != "" {
		f.SetCellValue(sheet, cellName(1, cursor), subtitle)
		if len(headers) > 0 {
			f.MergeCell(sheet, cellName(1, cursor), cellName(len(headers), cursor))
		}
		subStyle, _ := f.NewStyle(&excelize.Style{
			Font:      &excelize.Font{Bold: true, Size: 12},
			Alignment: &excelize.Alignment{Horizontal: "left"},
		})
		f.SetCellStyle(sheet, cellName(1, cursor), cellName(len(headers), cursor), subStyle)
		cursor++
	}

	hs, _ := f.NewStyle(headerStyle)
	for c, h := range headers {
		f.SetCellValue(sheet, cellName(c+1, cursor), h)
		f.SetCellStyle(sheet, cellName(c+1, cursor), cellName(c+1, cursor), hs)
	}
	cursor++

	for _, row := range data {
		for c, v := range row {
			f.SetCellValue(sheet, cellName(c+1, cursor), v)
		}
		cursor++
	}
	return cursor + 2
}

func cellName(col, row int) string {
	name, _ := excelize.CoordinatesToCellName(col, row)
	return name
}

func displayWidth(s string) float64 {
	w := 0
	for _, r := range s {
		if utf8.RuneLen(r) > 1 {
			w += 2
		} else {
			w++
		}
	}
	return float64(w)
}

func slug(title string) string {
	var b strings.Builder
	for _, r := range title {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	return b.String()
}

// exportFileName genera un nombre de archivo legible. Separa el título en
// tokens (los caracteres _, °, :, ., /, \ y espacios actúan como separadores),
// une los tokens por espacios y usa "-" para unir números separados por el signo
// de grado. Ej: "Nómina del Curso: 1°8° (Tarde)" -> "Nómina del Curso 1-8 (Tarde)".
func exportFileName(title, ext string) string {
	isSep := func(r rune) bool {
		switch r {
		case ' ', '\t', '\n', '_', '-', '.', ':', '/', '\\', '°':
			return true
		}
		return false
	}
	isNum := func(s string) bool {
		if s == "" {
			return false
		}
		for _, r := range s {
			if r < '0' || r > '9' {
				return false
			}
		}
		return true
	}

	var tokens []string
	var sepLast bool
	var cur []rune
	for _, r := range " " + title + " " {
		if isSep(r) {
			if len(cur) > 0 {
				tokens = append(tokens, string(cur))
				cur = nil
			}
			if r == '°' && len(tokens) > 0 && !sepLast {
				tokens = append(tokens, "\x00") // marca de grado
			}
			sepLast = true
			continue
		}
		sepLast = false
		cur = append(cur, r)
	}
	var b strings.Builder
	for i, t := range tokens {
		if t == "\x00" {
			if i > 0 && i < len(tokens)-1 && isNum(tokens[i-1]) && isNum(tokens[i+1]) {
				b.WriteByte('-')
			} else {
				b.WriteByte(' ')
			}
			continue
		}
		if i > 0 && tokens[i-1] != "\x00" {
			b.WriteByte(' ')
		}
		b.WriteString(t)
	}
	name := strings.Join(strings.Fields(b.String()), " ")
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Exportación"
	}
	return name + " " + time.Now().Format("2006-01-02") + "." + ext
}

// exportPDF replica export_pdf() del PHP (api.php líneas 802-895).
func exportPDF(w http.ResponseWriter, x exportData) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddUTF8FontFromBytes("DejaVu", "", dejavuSans)
	pdf.AddUTF8FontFromBytes("DejaVu", "B", dejavuSansBold)
	pdf.SetCreator("Sistema de Gestión Escolar", true)
	pdf.SetAuthor("Sistema de Gestión Escolar", true)
	pdf.SetTitle(x.title, true)
	pdf.SetSubject(x.title, true)
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()
	pdf.SetAutoPageBreak(true, 20)

	now := time.Now().Format("02/01/2006 15:04:05")

	// Título
	pdf.SetFont("DejaVu", "B", 16)
	pdf.CellFormat(0, 10, x.title, "", 1, "C", false, 0, "")
	pdf.Ln(5)
	// Fecha
	pdf.SetFont("DejaVu", "", 10)
	pdf.CellFormat(0, 5, "Fecha de generación: "+now, "", 1, "C", false, 0, "")
	pdf.Ln(10)

	const pageWidth = 180.0

	// Horarios del curso
	if len(x.horH) > 0 && len(x.horD) > 0 {
		pdf.SetFont("DejaVu", "B", 12)
		pdf.CellFormat(0, 10, "Horarios del Curso", "", 1, "L", false, 0, "")
		pdf.Ln(5)
		pdfTable(pdf, "DejaVu", x.horH, x.horD, pageWidth/float64(len(x.horH)))
		pdf.Ln(15)
	}

	// Profesores del curso
	if len(x.profH) > 0 && len(x.profD) > 0 {
		pdf.SetFont("DejaVu", "B", 12)
		pdf.CellFormat(0, 10, "Profesores del Curso", "", 1, "L", false, 0, "")
		pdf.Ln(5)
		pdfTable(pdf, "DejaVu", x.profH, x.profD, pageWidth/float64(len(x.profH)))
		pdf.Ln(15)
	}

	// Datos principales
	pdf.SetFont("DejaVu", "B", 12)
	pdf.CellFormat(0, 10, "Alumnos del Curso", "", 1, "L", false, 0, "")
	pdf.Ln(5)
	pdfTable(pdf, "DejaVu", x.headers, x.data, pageWidth/float64(len(x.headers)))

	filename := exportFileName(x.title, "pdf")
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", disposition("attachment", filename))
	w.Header().Set("Cache-Control", "max-age=0")
	if err := pdf.Output(w); err != nil {
		jsonError(w, http.StatusInternalServerError, "Error al generar el PDF")
	}
}

// disposition construye la cabecera Content-Disposition; mime.FormatMediaType
// emite el parámetro filename (ASCII) y, si hace falta, filename* en RFC 5987
// para acentos y espacios.
func disposition(kind, filename string) string {
	return mime.FormatMediaType(kind, map[string]string{"filename": filename})
}

func pdfTable(pdf *fpdf.Fpdf, font string, headers []string, data [][]string, colWidth float64) {
	pdf.SetFont(font, "B", 10)
	for _, h := range headers {
		pdf.CellFormat(colWidth, 8, h, "1", 0, "C", false, 0, "")
	}
	pdf.Ln(-1)
	pdf.SetFont(font, "", 9)
	for _, row := range data {
		for _, v := range row {
			pdf.CellFormat(colWidth, 7, v, "1", 0, "C", false, 0, "")
		}
		pdf.Ln(-1)
	}
}