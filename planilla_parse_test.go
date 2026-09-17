package main

import "testing"

func TestParsePlanilla(t *testing.T) {
	doc := []string{
		"SOLICITUD DE INSCRIPCIÓN AÑO LECTIVO 2026 EDUCACIÓN SECUNDARIA" +
			" Apellido/s: PEREZ Nombre/s: MARÍA JOSÉ" +
			" Identidad de género: Mujer Mujer trans Varón No desea responder" +
			" ¿Posee DNI argentino? SI, y tiene el DNI físico" +
			" Si respondió SI, indique número de DNI argentino: 38541236" +
			" CUIL: 27 - 38541236 - 4" +
			" Lugar de nacimiento: En Argentina Lomas de Zamora Nacionalidad: Argentina" +
			" Fecha de Nacimiento: 15 / 03 / 2012" +
			" DOMICILIO Calle: RIVADAVIA 1234 N°: 567 Piso: 2 Torre: A Depto: B" +
			" Entre calle: LAPRIDA y calle: ALSINA Otro dato:" +
			" Provincia: Buenos Aires Distrito: Lomas de Zamora Localidad: Banfield" +
			" Teléfono: (cód. área: 011) 4253-6677 Teléfono celular: (cód. área: 011) 15-4455-8899",
		"INFORMACIÓN DE SALUD ¿Posee obra social? SI En caso afirmativo: Obra social: OSDE N° Afiliado: 34567890" +
			" ANTECEDENTES PERSONALES DE SALUD Diabetes SI Celiaquía NO Asma NO",
		"INSCRIPCIÓN Ciclo Básico Turno solicitado: Mañana Jornada: Simple Año: 1",
		"DATOS DE LA PERSONA RESPONSABLE 1 Vínculo con estudiante: Madre" +
			" Apellido/s: GONZALEZ Nombre/s: ANA MARÍA Nacionalidad: Argentina" +
			" ¿Posee DNI argentino? SI, y tiene el DNI físico" +
			" Si respondió SI, indique número de DNI argentino: 20123456" +
			" ¿Asistió a algún establecimiento educativo? SI" +
			" En caso afirmativo: ¿Cuál es el nivel más alto que cursó? Secundario ¿Completó ese nivel? SI" +
			" Profesión u ocupación: Empleada" +
			" DOMICILIO Convive con la o el estudiante: NO" +
			" Calle: CORRIENTES 200 N°: 300 Piso: 1 Depto:" +
			" Provincia: Buenos Aires Distrito: CABA Localidad: Caballito" +
			" Teléfono celular: (cód. área: 011) 15-6677-8899 Correo electrónico: anag@mail.com",
		"DATOS DE LA PERSONA RESPONSABLE 2 Vínculo con estudiante: Padre" +
			" Apellido/s: PEREZ Nombre/s: CARLOS Nacionalidad: Argentina" +
			" ¿Posee DNI argentino? SI, y tiene el DNI físico" +
			" Si respondió SI, indique número de DNI argentino: 30128987" +
			" DOMICILIO Convive con la o el estudiante: SI",
		"RESTRICCIONES POR DECISIONES JUDICIALES" +
			" N° de Legajo: 12 N° de Matriz: 34 N° de Folio: 56" +
			" Apellido/s: JORGE PEREZ Nombre/s: CARLOS PEREZ N°: 99123456 Tipo de doc: DNI" +
			" Describa restricción: No acercarse al establecimiento" +
			" Fecha de inscripción: 20 / 02 / 2026",
	}

	got := parsePlanilla(doc)

	want := map[string]string{
		"apellido":                 "PEREZ",
		"nombre":                   "MARÍA JOSÉ",
		"tipo_dni":                 "DNI Argentino",
		"dni":                      "38541236",
		"cuil":                     "27-38541236-4",
		"fecha_nacimiento":         "2012-03-15",
		"lugar_nacimiento":         "Lomas de Zamora",
		"nacionalidad":             "Argentina",
		"calle":                    "RIVADAVIA 1234",
		"numero":                   "567",
		"piso":                     "2",
		"depto":                    "B",
		"entre_calles":             "LAPRIDA / ALSINA",
		"provincia":                "Buenos Aires",
		"distrito":                 "Lomas de Zamora",
		"localidad":                "Banfield",
		"telefono_fijo":            "01142536677",
		"telefono_celular":         "0111544558899",
		"salud_obra_social_nombre": "OSDE",
		"salud_obra_social_nro":    "34567890",
		"resp1_vinculo":            "Madre",
		"resp1_apellido":           "GONZALEZ",
		"resp1_nombre":             "ANA MARÍA",
		"resp1_dni":                "20123456",
		"resp1_nivel_educativo":    "Secundario",
		"resp1_profesion":          "Empleada",
		"resp1_convive":            "No",
		"resp1_calle":              "CORRIENTES 200",
		"resp1_numero":             "300",
		"resp1_piso":               "1",
		"resp1_localidad":          "Caballito",
		"resp1_distrito":           "CABA",
		"resp1_email":              "anag@mail.com",
		"resp2_vinculo":            "Padre",
		"resp2_dni":                "30128987",
		"resp2_convive":            "Si",
		"rj_nombre":                "JORGE PEREZ CARLOS PEREZ",
		"rj_nro_doc":               "99123456",
		"rj_tipo_doc":              "DNI",
		"rj_descripcion":           "No acercarse al establecimiento",
		"fecha_ingreso":            "2026-02-20",
	}

	for k, v := range want {
		if got[k] != v {
			t.Errorf("parsePlanilla[%q] = %q, want %q (raw: %q)", k, got[k], v, got)
		}
	}
}

func TestParsePlanillaSinDatos(t *testing.T) {
	got := parsePlanilla([]string{"no hay etiquetas reconocibles acá", "otra página"})
	if len(got) != 0 {
		t.Fatalf("se esperaban 0 campos, se obtuvo: %v", got)
	}
}

func TestNormFecha(t *testing.T) {
	cases := map[string]string{
		" 03/07/15 ":     "2015-07-03",
		"20 / 12 / 1999": "1999-12-20",
		"5-1-2010":       "2010-01-05",
		"sin fecha":      "",
		"31/02/1998":     "1998-02-31",
	}
	for in, want := range cases {
		if normFecha(in) != want {
			t.Errorf("normFecha(%q) = %q, want %q", in, normFecha(in), want)
		}
	}
}

func TestNormNombre(t *testing.T) {
	cases := map[string]string{
		"PEREZ":                  "PEREZ",
		"maría josé":             "María José",
"de los santos":            "De los Santos",
		"juan DE la CRUZ y vera": "Juan de la Cruz y Vera",
		"gonzález díaz":          "González Díaz",
	}
	for in, want := range cases {
		if normNombre(in) != want {
			t.Errorf("normNombre(%q) = %q, want %q", in, normNombre(in), want)
		}
	}
}
