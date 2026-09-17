package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	ocrMaxUpload = 16 << 20 // 16 MB por archivo
	ocrTimeout   = 120 * time.Second
	ocrMaxPages  = 12
)

var ocrAllowedExt = map[string]bool{
	".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".bmp": true,
}

func sanitizeBase(name string) string {
	return strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == '.':
			return r
		}
		return '_'
	}, name)
}

func looksLikePDF(data []byte) bool {
	return len(data) >= 5 && string(data[0:4]) == "%PDF"
}

func cmdOut(ctx context.Context, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	var out strings.Builder
	cmd.Stdout = &out
	cmd.Stderr = io.Discard
	err := cmd.Run()
	return out.String(), err
}

// tesseractText corre tesseract sobre una imagen y devuelve el texto reconocido.
func tesseractText(ctx context.Context, img string) (string, error) {
	return cmdOut(ctx, "tesseract", img, "stdout", "-l", "spa+eng", "--psm", "6")
}

// ocrFile procesa un archivo (PDF o imagen) y devuelve el texto por página.
// Para PDF vectorial usa pdftotext (texto embebido); si el PDF es un escaneo,
// renderiza las páginas con pdftoppm y las pasa por tesseract.
func (s *Server) ocrFile(ctx context.Context, path string, data []byte) ([]string, error) {
	if looksLikePDF(data) {
		if txt, err := cmdOut(ctx, "pdftotext", "-layout", path, "-"); err == nil {
			joined := strings.Join(nonEmptyLines(txt), "\n")
			if len(joined) >= 60 {
				return []string{joined}, nil
			}
		}
		if _, err := exec.LookPath("pdftoppm"); err != nil {
			return nil, fmt.Errorf("pdftoppm no disponible para escanear el PDF")
		}
		base := strings.TrimSuffix(path, filepath.Ext(path))
		if _, err := cmdOut(ctx, "pdftoppm", "-png", "-r", "200", path, base); err != nil {
			return nil, err
		}
		matches, _ := filepath.Glob(base + "-*.png")
		sort.Strings(matches)
		var pages []string
		for _, pg := range matches {
			select {
			case <-ctx.Done():
				return pages, ctx.Err()
			default:
			}
			txt, err := tesseractText(ctx, pg)
			if err != nil {
				return pages, err
			}
			if t := strings.Join(nonEmptyLines(txt), "\n"); t != "" {
				pages = append(pages, t)
			}
		}
		if len(pages) == 0 {
			return nil, fmt.Errorf("no se pudo extraer texto del PDF")
		}
		return pages, nil
	}
	txt, err := tesseractText(ctx, path)
	if err != nil {
		return nil, err
	}
	if t := strings.Join(nonEmptyLines(txt), "\n"); t != "" {
		return []string{t}, nil
	}
	return nil, fmt.Errorf("no se reconoció texto en la imagen")
}

func nonEmptyLines(s string) []string {
	var out []string
	for _, ln := range strings.Split(s, "\n") {
		ln = strings.Join(strings.Fields(ln), " ")
		if ln != "" {
			out = append(out, ln)
		}
	}
	return out
}

// handleOcr escribe el endpoint POST /api.php?action=ocr.
// Acepta multipart con el campo "planilla" (uno o varios archivos) y responde
// con { ok, pages, text[], fields } donde fields son los campos de la planilla.
func (s *Server) handleOcr(w http.ResponseWriter, r *http.Request) {
	if _, err := exec.LookPath("tesseract"); err != nil {
		jsonError(w, http.StatusInternalServerError, "El servicio de OCR no está disponible en el servidor.")
		return
	}
	if err := r.ParseMultipartForm(ocrMaxUpload); err != nil {
		jsonError(w, http.StatusBadRequest, "Planilla inválida o demasiado grande (máx. 16 MB por archivo).")
		return
	}
	files := r.MultipartForm.File["planilla"]
	if len(files) == 0 {
		jsonError(w, http.StatusBadRequest, "Enviá al menos un archivo en el campo 'planilla'.")
		return
	}
	if len(files) > ocrMaxPages {
		jsonError(w, http.StatusBadRequest, "Demasiados archivos (máx. "+itoa(ocrMaxPages)+").")
		return
	}

	tmp, err := os.MkdirTemp("", "ocr_")
	if err != nil {
		s.serverError(w, err)
		return
	}
	defer os.RemoveAll(tmp)

	ctx, cancel := context.WithTimeout(r.Context(), ocrTimeout)
	defer cancel()

	var texts []string
	for i, fh := range files {
		select {
		case <-ctx.Done():
			jsonError(w, http.StatusInternalServerError, "La lectura de la planilla tardó demasiado.")
			return
		default:
		}
		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if !ocrAllowedExt[ext] {
			jsonError(w, http.StatusBadRequest, "Formato no soportado: "+ext+" (usá PDF, PNG, JPG, JPEG, WEBP o BMP).")
			return
		}
		f, err := fh.Open()
		if err != nil {
			s.serverError(w, err)
			return
		}
		buf, err := io.ReadAll(io.LimitReader(f, ocrMaxUpload+1))
		f.Close()
		if err != nil {
			s.serverError(w, err)
			return
		}
		if len(buf) > ocrMaxUpload {
			jsonError(w, http.StatusBadRequest, "Archivo muy grande (máx. 16 MB).")
			return
		}
		src := filepath.Join(tmp, fmt.Sprintf("f%d_%s", i, sanitizeBase(fh.Filename)))
		if err := os.WriteFile(src, buf, 0o600); err != nil {
			s.serverError(w, err)
			return
		}
		pages, err := s.ocrFile(ctx, src, buf)
		if err != nil {
			msg := "No se pudo leer la planilla: " + err.Error()
			if ctx.Err() != nil {
				msg = "La lectura de la planilla tardó demasiado."
			}
			jsonError(w, http.StatusInternalServerError, msg)
			return
		}
		texts = append(texts, pages...)
		if len(texts) > ocrMaxPages {
			break
		}
	}

	fields := parsePlanilla(texts)

	// NOTA: no enviamos "reinscripto". La opción "Reinscripta/Reinscripto" está
	// impresa en todas las planillas, así que detectarla por palabra es un falso
	// positivo constante. La decisión de reinscripción la hace el frontend
	// comparando el DNI extraído contra los alumnos existentes.
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":     true,
		"pages":  len(texts),
		"text":   texts,
		"fields": fields,
	})
}
