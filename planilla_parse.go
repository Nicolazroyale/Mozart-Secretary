package main

import (
	"regexp"
	"strings"
	"unicode"
)

// planilla_parse.go — Parser de la ficha de inscripción (Educación Secundaria).
// Extrae campos por anclas de etiquetas en el texto reconocido (pdftotext o
// tesseract). Las claves del mapa de salida son los nombres exactos de los
// inputs del formulario nuevo (crud_mejora.js).

// rxMarker convierte una etiqueta de texto en una regex tolerante a
// mayúsculas y acentos (útil cuando el OCR pierde los acentos impresos).
func rxMarker(s string) string {
	var b strings.Builder
	b.WriteString("(?i)")
	for _, r := range s {
		switch unicode.ToLower(r) {
		case 'a':
			b.WriteString("[aáAÁ]")
		case 'e':
			b.WriteString("[eéEÉ]")
		case 'i':
			b.WriteString("[iíIÍ]")
		case 'o':
			b.WriteString("[oóOÓ]")
		case 'u':
			b.WriteString("[uúUÚ]")
		case 'n':
			b.WriteString("[nñNÑ]")
		case '°':
			b.WriteString("[°º]")
		default:
			b.WriteString(string(r))
		}
	}
	return b.String()
}

type anchorSet struct {
	from  string
	until []string
}

// valueBetween extrae el texto entre la primera aparición de `from` y la
// primera etiqueta de `until` que le siga. Devuelve "" si no hay valor.
func valueBetween(text string, from string, until []string) string {
	re := regexp.MustCompile(rxMarker(from))
	loc := re.FindStringIndex(text)
	if loc == nil {
		return ""
	}
	rest := text[loc[1]:]
	minPos := len(rest)
	for _, u := range until {
		reU := regexp.MustCompile(rxMarker(u))
		if p := reU.FindStringIndex(rest); p != nil && p[0] < minPos {
			minPos = p[0]
		}
	}
	v := rest[:minPos]
	v = strings.Trim(v, " \t\n.:;,–—?¿•·")
	v = strings.Join(strings.Fields(v), " ")
	if len(v) > 80 {
		v = v[:80]
	}
	return v
}

// blockBetween es como valueBetween pero sin recortar a 80 caracteres y
// manteniendo la etiqueta ancla al inicio, para poder volver a usar grab()
// sobre el bloque completo (p. ej. el DOMICILIO).
func blockBetween(text string, from string, until []string) string {
	re := regexp.MustCompile(rxMarker(from))
	loc := re.FindStringIndex(text)
	if loc == nil {
		return ""
	}
	rest := text[loc[0]:]
	minPos := len(rest)
	for _, u := range until {
		reU := regexp.MustCompile(rxMarker(u))
		if p := reU.FindStringIndex(rest); p != nil && p[0] < minPos {
			minPos = p[0]
		}
	}
	return strings.TrimSpace(strings.Join(strings.Fields(rest[:minPos]), " "))
}

// afterLabel devuelve el texto que sigue a la última aparición de `label`
// (sin acentos ni mayúsculas) dentro de `v`. Si no aparece, devuelve `v`.
// lastBetween es como valueBetween pero usa la ÚLTIMA aparición de `from`.
func lastBetween(text string, from string, until []string) string {
	re := regexp.MustCompile(rxMarker(from))
	all := re.FindAllStringIndex(text, -1)
	if len(all) == 0 {
		return ""
	}
	loc := all[len(all)-1]
	rest := text[loc[1]:]
	minPos := len(rest)
	for _, u := range until {
		reU := regexp.MustCompile(rxMarker(u))
		if p := reU.FindStringIndex(rest); p != nil && p[0] < minPos {
			minPos = p[0]
		}
	}
	v := strings.Trim(rest[:minPos], " \t\n.:;,–—?¿•·")
	v = strings.Join(strings.Fields(v), " ")
	if len(v) > 80 {
		v = v[:80]
	}
	return v
}

// particles son partículas de apellidos españoles que no llevan mayúscula en
// medio del nombre (p. ej. "De los Santos" → "delos Santos" no, sino "de los Santos").
var nameParticles = map[string]bool{
	"de": true, "del": true, "la": true, "las": true, "los": true,
	"y": true, "el": true, "a": true, "da": true, "di": true, "van": true, "von": true,
}

// normNombre unifica la tipografía de nombres/apellidos: si ya está en
// mayúsculas (impresión de la planilla) no lo toca; si viene en minúsculas o
// mezclado, pasa a capitalización típica conservando partículas.
func normNombre(v string) string {
	s := strings.Join(strings.Fields(v), " ")
	if s == "" || s == strings.ToUpper(s) {
		return s
	}
	words := strings.Fields(s)
	for i, w := range words {
		lw := strings.ToLower(w)
		if i > 0 && nameParticles[lw] {
			words[i] = lw
			continue
		}
		words[i] = upperFirst(lw)
	}
	return strings.Join(words, " ")
}

func upperFirst(s string) string {
	r := []rune(s)
	if len(r) == 0 {
		return s
	}
	r[0] = unicode.ToUpper(r[0])
	return string(r)
}

func afterLabel(v, label string) string {
	idx := strings.LastIndex(strings.ToLower(v), strings.ToLower(label))
	if idx < 0 {
		return v
	}
	rest := strings.TrimSpace(v[idx+len(label):])
	return strings.Trim(rest, " \t\n.:;,–—?¿•·")
}

func grab(text string, a anchorSet) string {
	return valueBetween(text, a.from, a.until)
}

func digitsOnly(v string) string {
	var b strings.Builder
	for _, r := range v {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func firstDigits(v string, minLen int) string {
	re := regexp.MustCompile(`\d{` + itoa(minLen) + `,}`)
	if m := re.FindString(v); m != "" {
		return m
	}
	return ""
}

// normFecha convierte DD/MM/YYYY o DD-MM-AA a YYYY-MM-DD.
func normFecha(v string) string {
	re := regexp.MustCompile(`\s*(\d{1,2})\s*[/\-. ]\s*(\d{1,2})\s*[/\-. ]\s*(\d{2,4})\s*`)
	m := re.FindStringSubmatch(v)
	if m == nil {
		return ""
	}
	dd, mm := m[1], m[2]
	yy := m[3]
	if len(yy) == 2 {
		if yy[0] >= '2' {
			yy = "19" + yy
		} else {
			yy = "20" + yy
		}
	}
	return yy + "-" + pad2(mm) + "-" + pad2(dd)
}

func pad2(s string) string {
	if len(s) == 1 {
		return "0" + s
	}
	return s
}

func matchVinculo(v string) string {
	l := strings.ToLower(v)
	switch {
	case strings.Contains(l, "madre"):
		return "Madre"
	case strings.Contains(l, "padre"):
		return "Padre"
	case strings.Contains(l, "tutor"):
		return "Tutor/a"
	case strings.Contains(l, "hermana"):
		return "Hermana"
	case strings.Contains(l, "hermano"):
		return "Hermano"
	case strings.Contains(l, "otro"):
		return "Otro"
	}
	return ""
}

// tipoDNI detecta el tipo de documento según las opciones de la planilla.
func tipoDNI(v string) string {
	l := strings.ToLower(v)
	if strings.Contains(l, "no tiene") {
		return ""
	}
	switch {
	case strings.Contains(l, "en tr") && strings.Contains(l, "tramite"):
		return "DNI en trámite"
	case strings.Contains(l, "cpi") || strings.Contains(l, "pre-identificacion"):
		return "CPI"
	case strings.Contains(l, "extranjero"):
		return "Documento Extranjero"
	case strings.Contains(l, "no posee") && strings.Contains(l, "documento"):
		return "Documento Extranjero"
	case strings.Contains(l, "tiene"):
		return "DNI Argentino"
	}
	return ""
}

func nivelEducativo(v string) string {
	l := strings.ToLower(v)
	switch {
	case strings.Contains(l, "posgrado"):
		return "Posgrado"
	case strings.Contains(l, "superior universitario"):
		return "Superior Universitario"
	case strings.Contains(l, "superior"):
		return "Superior"
	case strings.Contains(l, "secundario"):
		return "Secundario"
	case strings.Contains(l, "primario"):
		return "Primario"
	}
	return ""
}

func conviveSi(v string) bool {
	l := strings.ToLower(v)
	return strings.Contains(l, "si") && !strings.HasPrefix(l, "no")
}

// conviveValue interpreta la respuesta "Convive con la o el estudiante":
// "SI" o "NO". Si el texto muestra ambas opciones (planilla en blanco) o es
// demasiado largo, devuelve "" para no arrastrar respuestas ambiguas.
func conviveValue(v string) string {
	l := strings.ToLower(strings.TrimSpace(v))
	l = strings.Trim(l, " \t\n.:;,?¿")
	hasSi := strings.Contains(l, "si")
	hasNo := strings.Contains(l, "no")
	if hasSi && hasNo {
		return ""
	}
	if len(l) > 4 {
		return ""
	}
	if hasSi {
		return "Si"
	}
	if hasNo || l == "no" {
		return "No"
	}
	return ""
}

// shortish indica si un valor reconocido es "corto"; los valores largos suelen
// ser listados de opciones impresas en la planilla (no la opción marcada).
func shortish(v string, n int) bool {
	return len(strings.Join(strings.Fields(v), " ")) <= n
}

// tipoDocRJ reduce el "Tipo de doc." de la restricción judicial a un valor
// conocido; devuelve "" si no coincide (p. ej. "N°" o el texto de la plantilla).
func tipoDocRJ(v string) string {
	l := strings.ToLower(v)
	switch {
	case strings.Contains(l, "dni"):
		return "DNI"
	case strings.Contains(l, "extranjero"):
		return "Documento Extranjero"
	case strings.Contains(l, "pasaporte"):
		return "Pasaporte"
	}
	return ""
}

func parsePlanilla(texts []string) map[string]string {
	out := map[string]string{}
	doc := strings.Join(texts, " ")
	doc = strings.Join(strings.Fields(doc), " ")

	sep := func(marker string) int {
		if i := strings.Index(strings.ToLower(doc), strings.ToLower(marker)); i >= 0 {
			return i
		}
		return -1
	}

	resp1 := sep("datos de la persona responsable 1")
	resp2 := sep("datos de la persona responsable 2")
	rj := sep("restricciones por decisiones judiciales")
	studentEnd := len(doc)
	if resp1 >= 0 && resp1 < studentEnd {
		studentEnd = resp1
	}
	student := doc[:studentEnd]

	// ---- Sección estudiante (pág. 1) ----
	grabStudent := func(a anchorSet) string {
		return grab(student, a)
	}

	dniQ := grabStudent(anchorSet{from: "indique numero de dni argentino", until: []string{"lugar de nacimiento", "cuil", "solicitud de"}})
	if d := firstDigits(dniQ, 7); d != "" {
		out["dni"] = d
	} else if d := firstDigits(grabStudent(anchorSet{from: "cuil", until: []string{"fecha de nacimiento"}}), 7); d != "" {
		out["dni"] = d
	}

	if cuil := digitsOnly(grabStudent(anchorSet{from: "cuil", until: []string{"fecha de nacimiento", "lugar de nacimiento"}})); len(cuil) >= 8 {
		if len(cuil) == 11 {
			out["cuil"] = cuil[:2] + "-" + cuil[2:10] + "-" + cuil[10:]
		} else {
			out["cuil"] = cuil
		}
	}

	if td := tipoDNI(grabStudent(anchorSet{from: "posee dni argentino", until: []string{"lugar de nacimiento"}})); td != "" {
		out["tipo_dni"] = td
	}

	if fn := grabStudent(anchorSet{from: "fecha de nacimiento", until: []string{"solicitud de", "lugar de nacimiento"}}); normFecha(fn) != "" {
		out["fecha_nacimiento"] = normFecha(fn)
	}

	if ln := grabStudent(anchorSet{from: "lugar de nacimiento", until: []string{"nacionalidad"}}); strings.TrimSpace(ln) != "" {
		v := strings.ReplaceAll(strings.ReplaceAll(ln, "En el extranjero", ""), "En Argentina", "")
		v = strings.Join(strings.Fields(v), " ")
		if v != "" && !strings.HasPrefix(strings.ToLower(v), "solicitud") {
			out["lugar_nacimiento"] = trunc80(v)
		}
	}
	if nat := grabStudent(anchorSet{from: "nacionalidad", until: []string{"solo para quienes", "fecha de nacimiento"}}); nat != "" {
		out["nacionalidad"] = nat
	}

	out["apellido"] = normNombre(grabStudent(anchorSet{from: "apellido/s", until: []string{"nombre/s"}}))
	out["nombre"] = normNombre(grabStudent(anchorSet{from: "nombre/s", until: []string{"fecha de nacimiento", "identidad de genero", "posee dni", "cuil"}}))

	// Domicilio del estudiante (bloque desde "Calle:" hasta "Teléfono celular:")
	domBlock := blockBetween(student, "calle", []string{"telefono celular"})
	grabDom := func(a anchorSet) string { return grab(domBlock, a) }

	out["calle"] = grabDom(anchorSet{from: "calle", until: []string{"n°"}})
	out["numero"] = grabDom(anchorSet{from: "n°", until: []string{"piso"}})
	out["piso"] = grabDom(anchorSet{from: "piso", until: []string{"torre", "depto"}})
	out["depto"] = grabDom(anchorSet{from: "depto", until: []string{"entre calle", "provincia", "telefono"}})
	entre := grabDom(anchorSet{from: "entre calle", until: []string{"y calle"}}) + " / " + grabDom(anchorSet{from: "y calle", until: []string{"otro dato", "telefono", "provincia"}})
	if strings.TrimSpace(strings.ReplaceAll(entre, " / ", "")) != "" {
		out["entre_calles"] = strings.Trim(strings.Join(strings.Fields(entre), " "), " /")
	}
	out["provincia"] = grabDom(anchorSet{from: "provincia", until: []string{"distrito"}})
	out["distrito"] = grabDom(anchorSet{from: "distrito", until: []string{"localidad"}})
	out["localidad"] = grabDom(anchorSet{from: "localidad", until: []string{"telefono"}})
	out["telefono_fijo"] = phoneFrom(grabDom(anchorSet{from: "telefono", until: []string{"telefono celular"}}))
	out["telefono_celular"] = phoneFrom(grabStudent(anchorSet{from: "telefono celular", until: []string{"otros datos", "correo", "domicilio"}}))

	// Salud: obra social (nos quedamos con la ÚLTIMA mención a "obra social",
	// que es la etiqueta que precede al nombre de la obra; la primera es la pregunta).
	out["salud_obra_social_nombre"] = lastBetween(student, "obra social", []string{"n° afiliado", "antecedentes personales", "otra/s lengua/s"})
	if nro := grabStudent(anchorSet{from: "n° afiliado", until: []string{"antecedentes personales", "padece"}}); firstDigits(nro, 1) != "" {
		out["salud_obra_social_nro"] = firstDigits(nro, 1)
	}

	// ---- Responsable 1 ----
	parseResponsable(doc, resp1, resp2, "resp1_", out)

	// ---- Responsable 2 ----
	parseResponsable(doc, resp2, rj, "resp2_", out)

	// ---- Restricciones judiciales y fecha de inscripción ----
	if rj >= 0 {
		rjDoc := doc[rj:]
		rjAp := grab(rjDoc, anchorSet{from: "apellido/s", until: []string{"nombre/s"}})
		// El bloque de restricción es: Nombre/s: X N°: Y Tipo de doc: ...
		rjMid := grab(rjDoc, anchorSet{from: "nombre/s", until: []string{"tipo de doc"}})
		rjNro := firstDigits(rjMid, 7)
		if rjNro == "" {
			// en la planilla real, "N°:" aparece DESPUÉS de "Tipo de doc:"
			rjNro = firstDigits(grab(rjDoc, anchorSet{from: "tipo de doc", until: []string{"describa restriccion"}}), 7)
		}
		rjName := strings.TrimSpace(rjMid)
		rjName = rxReplace(rjName, `(?i)n°\s*[:.]?\s*\d+`, "")
		rjName = strings.Join(strings.Fields(rjName), " ")
		if n := rjName; n != "" && strings.HasPrefix(strings.ToLower(n), "numero") {
			rjName = ""
		}
		if rjAp != "" || rjName != "" {
			out["rj_nombre"] = normNombre(strings.TrimSpace(rjAp + " " + rjName))
		}
		if rjNro != "" {
			out["rj_nro_doc"] = rjNro
		}
		if tj := tipoDocRJ(grab(rjDoc, anchorSet{from: "tipo de doc", until: []string{"describa restriccion"}})); tj != "" {
			out["rj_tipo_doc"] = tj
		}
		out["rj_descripcion"] = grab(rjDoc, anchorSet{from: "describa restriccion", until: []string{"fecha de inscripcion", "la restriccion solo"}})
		if fi := grab(rjDoc, anchorSet{from: "fecha de inscripcion", until: []string{"n° de legajo"}}); normFecha(fi) != "" {
			out["fecha_ingreso"] = normFecha(fi)
		}
	}

	for k := range out {
		if out[k] == "" {
			delete(out, k)
		}
	}
	return out
}

// phoneFrom normaliza teléfonos: combina código de área "(" con el número y
// conserva todos los dígitos (sin espacios ni guiones).
func phoneFrom(v string) string {
	re := regexp.MustCompile(`\([^0-9]*(\d{2,5})\)(.*)`)
	if m := re.FindStringSubmatch(v); m != nil {
		return m[1] + digitsOnly(m[2])
	}
	d := digitsOnly(v)
	if len(d) >= 6 {
		return d
	}
	return ""
}

func rxReplace(s, pattern, repl string) string {
	return regexp.MustCompile(pattern).ReplaceAllString(s, repl)
}

func trunc80(v string) string {
	if len(v) > 80 {
		return v[:80]
	}
	return v
}

// parseResponsable extrae los campos de un bloque "Datos de la persona
// responsable N" contenido en doc[from:to].
func parseResponsable(doc string, from, to int, prefix string, out map[string]string) {
	if from < 0 || to < from {
		return
	}
	sec := doc[from:to]

	p := func(a anchorSet) string { return grab(sec, a) }

	prefixKey := func(name string) string { return prefix + name }

	if raw := p(anchorSet{from: "vinculo con estudiante", until: []string{"apellido/s"}}); shortish(raw, 12) {
		if vin := matchVinculo(raw); vin != "" {
			out[prefixKey("vinculo")] = vin
		}
	}
	out[prefixKey("apellido")] = normNombre(p(anchorSet{from: "apellido/s", until: []string{"nombre/s"}}))
	out[prefixKey("nombre")] = normNombre(p(anchorSet{from: "nombre/s", until: []string{"fecha de nacimiento", "nacionalidad", "posee dni"}}))
	out[prefixKey("nacionalidad")] = p(anchorSet{from: "nacionalidad", until: []string{"en caso afirmativo", "asistio", "posee dni"}})

	if d := firstDigits(p(anchorSet{from: "indique numero de dni argentino", until: []string{"asistio", "posee dni", "condicion de actividad"}}), 7); d != "" {
		out[prefixKey("dni")] = d
	}
	if td := tipoDNI(p(anchorSet{from: "posee dni argentino", until: []string{"condicion de actividad", "domicilio", "asistio"}})); td != "" {
		out[prefixKey("tipo_dni")] = td
	}

	if raw := p(anchorSet{from: "nivel mas alto que curso", until: []string{"completo ese nivel"}}); shortish(raw, 30) {
		if niv := nivelEducativo(raw); niv != "" {
			out[prefixKey("nivel_educativo")] = niv
		}
	}
	if raw := p(anchorSet{from: "profesion u ocupacion", until: []string{"asistio a algun establecimiento", "en caso afirmativo", "posee dni", "condicion de actividad", "domicilio", "correo electronico"}}); shortish(raw, 30) {
		out[prefixKey("profesion")] = raw
	}

	// Convivencia y domicilio del responsable (bloque desde "Calle:" hasta el correo)
	if cv := conviveValue(p(anchorSet{from: "convive con la o el estudiante", until: []string{"calle", "telefono"}})); cv != "" {
		out[prefixKey("convive")] = cv
	}

	domi := blockBetween(sec, "calle", []string{"correo electronico"})
	if domi == "" {
		return
	}
	domGrab := func(a anchorSet) string { return grab(domi, a) }

	if conviveValue(p(anchorSet{from: "convive con la o el estudiante", until: []string{"calle", "telefono"}})) == "Si" {
		// si convive, la planilla no completa el domicilio propio
		for _, k := range []string{"calle", "numero", "piso", "depto", "localidad", "distrito", "provincia", "telefono_celular", "email"} {
			delete(out, prefixKey(k))
		}
	}

	out[prefixKey("calle")] = domGrab(anchorSet{from: "calle", until: []string{"n°"}})
	out[prefixKey("numero")] = domGrab(anchorSet{from: "n°", until: []string{"piso"}})
	out[prefixKey("piso")] = domGrab(anchorSet{from: "piso", until: []string{"torre", "depto"}})
	out[prefixKey("depto")] = domGrab(anchorSet{from: "depto", until: []string{"entre calle", "provincia", "telefono"}})
	out[prefixKey("provincia")] = domGrab(anchorSet{from: "provincia", until: []string{"distrito"}})
	out[prefixKey("distrito")] = domGrab(anchorSet{from: "distrito", until: []string{"localidad"}})
	out[prefixKey("localidad")] = domGrab(anchorSet{from: "localidad", until: []string{"telefono celular", "telefono"}})
	out[prefixKey("telefono_celular")] = phoneFrom(domGrab(anchorSet{from: "telefono celular", until: []string{"correo electronico"}}))
	if mail := grab(sec, anchorSet{from: "correo electronico", until: []string{"datos de la persona responsable", "restricciones por decisiones"}}); strings.Contains(mail, "@") {
		out[prefixKey("email")] = strings.Join(strings.Fields(mail), "")
	}
}
