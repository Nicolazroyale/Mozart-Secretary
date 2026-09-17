package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"testing"
)

func TestCalibracionPDF(t *testing.T) {
	raw, err := os.ReadFile("/tmp/opencode/pdftotext_text.json")
	if err != nil {
		t.Skip("sin extracción de pdf: " + err.Error())
	}
	var pages []string
	if err := json.Unmarshal(raw, &pages); err != nil {
		t.Skip("json inválido: " + err.Error())
	}
	got := parsePlanilla(pages)
	keys := make([]string, 0, len(got))
	for k := range got {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Printf("%s = %q\n", k, got[k])
	}
	fmt.Printf("TOTAL %d campos\n", len(got))
}