package main

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"mozart/auth"
)

// testOcrServer devuelve un Server mínimo capaz de enrutar /api.php?action=ocr
// (sin DB ni templates: handleOcr no los usa).
func testOcrServer(t *testing.T) *Server {
	t.Helper()
	return &Server{
		limiter: NewRateLimiter(60, 1),
		secret:  []byte("test-secret-ocr"),
	}
}

func ocrMultipart(t *testing.T, sess *auth.Session, secret []byte, fields []struct {
	name string
	body string
}) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for _, f := range fields {
		fw, err := mw.CreateFormFile("planilla", f.name)
		if err != nil {
			t.Fatal(err)
		}
		fw.Write([]byte(f.body))
	}
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/api.php?action=ocr", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if sess != nil {
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: sess.Encode(secret)})
		req.Header.Set("X-CSRF-Token", sess.CSRF)
	}
	return req
}

func TestOcrSinSesion(t *testing.T) {
	s := testOcrServer(t)
	req := ocrMultipart(t, nil, s.secret, nil)
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("sin sesión: status=%d, esperaba 401", rr.Code)
	}
}

func TestOcrNoAdmin(t *testing.T) {
	s := testOcrServer(t)
	sess := auth.NewSession(1, "preceptor_1", "Preceptor", "lectura", "")
	req := ocrMultipart(t, sess, s.secret, nil)
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("rol lectura: status=%d, esperaba 403", rr.Code)
	}
}

func TestOcrCSRFInvalido(t *testing.T) {
	s := testOcrServer(t)
	sess := auth.NewSession(1, "admin", "Admin", "admin", "")
	req := ocrMultipart(t, sess, s.secret, nil)
	req.Header.Set("X-CSRF-Token", "token-incorrecto")
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("CSRF inválido: status=%d, esperaba 403", rr.Code)
	}
}

func TestOcrSinArchivos(t *testing.T) {
	s := testOcrServer(t)
	sess := auth.NewSession(1, "admin", "Admin", "admin", "")
	req := ocrMultipart(t, sess, s.secret, nil)
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("sin archivos: status=%d, esperaba 400", rr.Code)
	}
}

func TestOcrExtensionInvalida(t *testing.T) {
	s := testOcrServer(t)
	sess := auth.NewSession(1, "admin", "Admin", "admin", "")
	req := ocrMultipart(t, sess, s.secret, []struct {
		name string
		body string
	}{{"malware.exe", "MZ..."}})
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("ext inválida: status=%d, esperaba 400", rr.Code)
	}
}

func TestOcrDemasiadosArchivos(t *testing.T) {
	s := testOcrServer(t)
	sess := auth.NewSession(1, "admin", "Admin", "admin", "")
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for i := 0; i < ocrMaxPages+1; i++ {
		fw, err := mw.CreateFormFile("planilla", "f"+itoa(i)+".png")
		if err != nil {
			t.Fatal(err)
		}
		fw.Write([]byte("xxxx"))
	}
	mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/api.php?action=ocr", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: sess.Encode(s.secret)})
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("demasiados archivos: status=%d, esperaba 400", rr.Code)
	}
}

func TestOcrArchivoMuyGrande(t *testing.T) {
	s := testOcrServer(t)
	sess := auth.NewSession(1, "admin", "Admin", "admin", "")
	big := strings.Repeat("A", ocrMaxUpload+1024)
	req := ocrMultipart(t, sess, s.secret, []struct {
		name string
		body string
	}{{"planilla.png", big}})
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("archivo grande: status=%d, esperaba 400", rr.Code)
	}
}

func TestOcrHelpers(t *testing.T) {
	if looksLikePDF([]byte("%PDF-1.7 ...")) != true {
		t.Error("looksLikePDF no detecta %PDF")
	}
	if looksLikePDF([]byte("PNG...")) != false {
		t.Error("looksLikePDF falso positivo")
	}
	if got := sanitizeBase("../a b/píxel.png"); got != ".._a_b_p_xel.png" {
		t.Errorf("sanitizeBase: got %q", got)
	}
	if got := nonEmptyLines("  a  b \n\n c \n"); len(got) != 2 || got[0] != "a b" || got[1] != "c" {
		t.Errorf("nonEmptyLines: %v", got)
	}
}
