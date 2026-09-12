package main

import (
	"strings"
	"testing"
)

func TestExportFileName(t *testing.T) {
	cases := []struct{ in, want string }{
		{"Nómina del Curso: 1°8° (Tarde)", "Nómina del Curso 1-8 (Tarde)"},
		{"Listado de Estudiantes", "Listado de Estudiantes"},
		{"Listado de Docentes", "Listado de Docentes"},
		{"Listado de Materias", "Listado de Materias"},
		{"Curso: 1___8(Basico)", "Curso 1 8(Basico)"},
		{"  ", "Exportación"},
	}
	for _, c := range cases {
		got := exportFileName(c.in, "pdf")
		if !strings.HasPrefix(got, c.want) {
			t.Errorf("exportFileName(%q) = %q, want prefix %q", c.in, got, c.want)
		}
		if !strings.HasSuffix(got, ".pdf") {
			t.Errorf("exportFileName(%q) = %q, want suffix .pdf", c.in, got)
		}
	}
}