package main

import (
	"testing"
)

// TestParseRealFlow simula el flujo de texto real de pdftotext sobre una
// planilla COMPLETADA A MANO: todas las opciones impresas siguen presentes
// en el texto (izq→der, arriba→abajo), y entre las etiquetas se insertan los
// valores escritos a mano.
func TestParseRealFlow(t *testing.T) {
	// pág. 1: datos del estudiante + otros datos, tal como las recorre pdftotext
	page1 := "" +
		"SOLICITUD DE INSCRIPCIÓN AÑO LECTIVO 2026 N°  (A completar por el establecimiento) EDUCACIÓN SECUNDARIA DATOS ESTUDIANTE" +
		" Apellido/s: PEREZ Nombre/s: MARÍA JOSÉ" +
		" Fecha de Nacimiento: 15 / 03 / 2012" +
		" ¿Posee DNI argentino? SI, y tiene el DNI físico SI, pero NO tiene el DNI físico y se encuentra en trámite" +
		" SI, pero NO tiene el DNI físico y NO se encuentra en trámite NO posee DNI argentino" +
		" Si respondió SI, indique número de DNI argentino: 38541236 CUIL: 27 - 38541236 - 4" +
		" Si respondió que NO tiene DNI argentino: ¿Posee Certificado de Pre-Identificación (CPI)? SI NO" +
		" ¿Posee documento extranjero? SI, tipo de doc.: N°: NO" +
		" Identidad de género: Mujer Mujer trans / travesti Varón Varón trans / masculinidad trans" +
		" No binario Otra No desea responder" +
		" Lugar de nacimiento: En Argentina Lomas de Zamora En el extranjero Nacionalidad: Argentina" +
		" Solo para quienes marcaron Argentina: Provincia: Buenos Aires Otra (especificar):" +
		" Solo para quienes marcaron Buenos Aires: Distrito: Localidad:" +
		" DOMICILIO Calle: RIVADAVIA 1234 N°: 567 Piso: 2 Torre: A Depto: B" +
		" Entre calle: LAPRIDA y calle: ALSINA Otro dato:" +
		" Provincia: Buenos Aires Distrito: Lomas de Zamora Localidad: Banfield" +
		" Teléfono: (cód. área: 011) 4253-6677 Teléfono celular: (cód. área: 011) 15-4455-8899" +
		" OTROS DATOS" +
		" Hermanas o hermanos: SI Cantidad: 2 Cantidad que asiste a este establecimiento: 1 NO tiene hermanas o hermanos" +
		" ¿Se hablan lenguas distintas al castellano en el hogar? SI NO" +
		" En caso afirmativo: Lengua/s indígena/s: SI NO Otra/s lengua/s: SI NO" +
		" ¿Se reconoce perteneciente o descendiente de Pueblos Originarios? SI NO"

	page2 := "" +
		"INFORMACIÓN DE SALUD" +
		" ¿Posee obra social? SI NO En caso afirmativo: Obra social: OSDE N° Afiliado: 34567890" +
		" ANTECEDENTES PERSONALES DE SALUD ¿Padece o ha padecido alguna o algunas de las siguientes condiciones de salud? (Marcar por SI o por NO)" +
		" Asma / Broncoespasmos a repetición Celiaquía Problemas / Condiciones cardíacas Diabetes" +
		" DATOS DEL ESTABLECIMIENTO EN EL QUE SE INSCRIBE Distrito: Nombre escuela: N°:" +
		" DATOS DEL ESTABLECIMIENTO DE PROCEDENCIA ..." +
		" INSCRIPCIÓN" +
		" Se inscribe en: Ciclo Básico Ciclo Superior Aula de Fortalecimiento Escuela Profesional Secundaria" +
		" Orientación: Año: 1 2 3 4 5 6 7" +
		" Turno solicitado: Mañana Tarde Vespertino Noche" +
		" Jornada: Simple Extendida Completa / Doble escolaridad" +
		" CONDICIÓN EN LA INSCRIPCIÓN ACTUAL (Marcar solo una opción) Ingresante al Nivel Promovida / Promovido Reinscripta / Reinscripto Repitente" +
		" INCLUSIÓN ¿Cursa con proyecto de inclusión? SI NO ¿Cursa con acompañante asistente externo? SI NO" +
		" EDUCACIÓN COMPLEMENTARIA Centro Educativo Complementario (CEC): SI NO Centro de Educación Física (CEF): SI NO Escuela de Educación Estética: SI NO" +
		" SERVICIO ALIMENTARIO ESCOLAR ¿Solicita la incorporación en el Servicio Alimentario Escolar? Comedor Desayuno y Merienda"

	page3 := "" +
		"DATOS DE LA PERSONA RESPONSABLE 1" +
		" Vínculo con estudiante: Madre Padre Tutor Tutora Otro" +
		" Apellido/s: GONZALEZ Nombre/s: ANA MARÍA Nacionalidad: Argentina" +
		" ¿Posee DNI argentino? SI, y tiene el DNI físico SI, pero NO tiene el DNI físico NO posee DNI argentino" +
		" Si respondió SI, indique número de DNI argentino: 20123456" +
		" Si respondió que NO tiene DNI argentino: ¿Posee Certificado de Pre-Identificación (CPI)? SI NO" +
		" ¿Posee documento extranjero? SI, tipo de doc.: N°: NO" +
		" Profesión u ocupación: Empleada ¿Asistió a algún establecimiento educativo? SI NO" +
		" En caso afirmativo: ¿Cuál es el nivel más alto que cursó? Primario Secundario Superior Superior Universitario Posgrado" +
		" ¿Completó ese nivel? SI NO" +
		" CONDICIÓN DE ACTIVIDAD (Marcar todas las opciones que correspondan) Estudia Trabaja Busca trabajo Realiza tareas de cuidado no pagas Recibe jubilación o pensión" +
		" DOMICILIO Convive con la o el estudiante: SI NO (En caso afirmativo no completar los datos referidos al domicilio)" +
		" Calle: CORRIENTES 200 N°: 300 Piso: 1 Torre: A Depto: B" +
		" Entre calle: y calle: Otro dato:" +
		" Provincia: Buenos Aires Distrito: CABA Localidad: Caballito" +
		" Teléfono: (cód. área: 011) 4253-6677 Teléfono celular: (cód. área: 011) 15-6677-8899" +
		" Correo electrónico: anag@mail.com"

	page4 := "" +
		"DATOS DE LA PERSONA RESPONSABLE 2" +
		" Vínculo con estudiante: Madre Padre Tutor Tutora Otro" +
		" Apellido/s: PEREZ Nombre/s: CARLOS Nacionalidad: Argentina" +
		" ¿Posee DNI argentino? SI, y tiene el DNI físico SI, pero NO tiene el DNI físico NO posee DNI argentino" +
		" Si respondió SI, indique número de DNI argentino: 30128987" +
		" Si respondió que NO tiene DNI argentino: ¿Posee Certificado de Pre-Identificación (CPI)? SI NO" +
		" ¿Posee documento extranjero? SI, tipo de doc.: N°: NO" +
		" Profesión u ocupación: Profesor ¿Asistió a algún establecimiento educativo? SI NO" +
		" En caso afirmativo: ¿Cuál es el nivel más alto que cursó? Primario Secundario Superior Superior Universitario Posgrado" +
		" ¿Completó ese nivel? SI NO" +
		" CONDICIÓN DE ACTIVIDAD Estudia Trabaja" +
		" DOMICILIO Convive con la o el estudiante: SI NO (En caso afirmativo no completar los datos referidos al domicilio)" +
		" Calle: N°: Piso: Torre: Depto:" +
		" Entre calle: y calle: Otro dato:" +
		" Provincia: Distrito: Localidad:" +
		" Correo electrónico:"

	page5 := "" +
		"RESTRICCIONES POR DECISIONES JUDICIALES" +
		" Apellido/s: JORGE PEREZ Nombre/s: CARLOS PEREZ" +
		" Tipo de doc: DNI N°: 99123456 Describa restricción: No acercarse al establecimiento" +
		" La restricción solo operará en caso de acompañarse la resolución judicial certificada." +
		" A COMPLETAR POR EL ESTABLECIMIENTO N° de Legajo: 12 N° de Matriz: 34 N° de Folio: 56" +
		" La totalidad de los datos e información suministrada por quien suscribe la presente tiene carácter de Declaración Jurada." +
		" La persona abajo firmante se compromete a comunicar al establecimiento cualquier modificación de los datos suministrados en forma inmediata y de manera fehaciente." +
		" Firma persona responsable: Aclaración:" +
		" Fecha de inscripción: 20 / 02 / 2026 Firma Directora o Director:"

	got := parsePlanilla([]string{page1, page2, page3, page4, page5})

	want := map[string]string{
		"apellido":                 "PEREZ",
		"nombre":                   "MARÍA JOSÉ",
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
		"fecha_ingreso":            "2026-02-20",
		"rj_descripcion":           "No acercarse al establecimiento",
		"rj_nombre":                "JORGE PEREZ CARLOS PEREZ",
		"rj_nro_doc":               "99123456",
		"rj_tipo_doc":              "DNI",
		"resp1_apellido":           "GONZALEZ",
		"resp1_nombre":             "ANA MARÍA",
		"resp1_dni":                "20123456",
		"resp1_nacionalidad":       "Argentina",
		"resp1_calle":              "CORRIENTES 200",
		"resp1_numero":             "300",
		"resp1_piso":               "1",
		"resp1_depto":              "B",
		"resp1_profesion":          "Empleada",
		"resp1_provincia":          "Buenos Aires",
		"resp1_distrito":           "CABA",
		"resp1_localidad":          "Caballito",
		"resp1_telefono_celular":   "0111566778899",
		"resp1_email":              "anag@mail.com",
		"resp2_apellido":           "PEREZ",
		"resp2_nombre":             "CARLOS",
		"resp2_dni":                "30128987",
		"resp2_nacionalidad":       "Argentina",
		"resp2_profesion":          "Profesor",
	}

	for k, v := range want {
		if got[k] != v {
			t.Errorf("got[%s] = %q, want %q", k, got[k], v)
		}
	}
	for k := range got {
		if _, ok := want[k]; !ok {
			t.Errorf("got[%s] = %q (campo inesperado)", k, got[k])
		}
	}
}
