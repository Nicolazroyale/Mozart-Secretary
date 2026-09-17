package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"mozart/auth"
	"mozart/db"
)

const backupTestKey = "0d2d7ace1da12761f2bb17601bbbc2e09076c5176deee8855f80e6800ddc2abe"

// testBackupServer construye un Server mínimo con una BD real SQLCipher y un
// BackupDir real, suficiente para los endpoints de backups.
func testBackupServer(t *testing.T) (*Server, *sql.DB) {
	t.Helper()
	dir := t.TempDir()
	cfg := Config{
		BackupDir:           dir,
		DBKey:               backupTestKey,
		BackupRetentionDays: 30,
		BackupKeepMonths:    12,
	}
	conn, err := db.Open(filepath.Join(dir, "live.db"), backupTestKey)
	if err != nil {
		t.Fatalf("db.Open: %v", err)
	}
	if _, err := conn.Exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)`); err != nil {
		t.Fatalf("create: %v", err)
	}
	return &Server{
		cfg:     cfg,
		limiter: NewRateLimiter(60, 1),
		secret:  []byte("test-secret-backups"),
		dbs:     conn,
	}, conn
}

// backupAdminReq monta un pedido hacia el endpoint backups con sesión y CSRF.
func backupReq(t *testing.T, sess *auth.Session, s *Server, method, target string, body io.Reader, ct string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, target, body)
	if ct != "" {
		req.Header.Set("Content-Type", ct)
	}
	if sess != nil {
		req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: sess.Encode(s.secret)})
		if method != http.MethodGet && method != http.MethodHead {
			req.Header.Set("X-CSRF-Token", sess.CSRF)
		}
	}
	rr := httptest.NewRecorder()
	s.handleApi(rr, req)
	return rr
}

func TestBackupsList(t *testing.T) {
	s, conn := testBackupServer(t)
	defer conn.Close()
	recent := backupFileName(time.Now())
	old := backupFileName(time.Now().AddDate(0, 0, -40))
	for _, f := range []string{recent, old} {
		if err := os.WriteFile(filepath.Join(s.cfg.BackupDir, f), []byte("x"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	os.WriteFile(filepath.Join(s.cfg.BackupDir, "noise.txt"), []byte("x"), 0o600)

	if rr := backupReq(t, nil, s, http.MethodGet, "/api.php?action=backups", nil, ""); rr.Code != http.StatusUnauthorized {
		t.Fatalf("sin sesión: %d, esperaba 401", rr.Code)
	}
	lect := auth.NewSession(1, "lect", "Lectura", "lectura", "")
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?action=backups", nil, ""); rr.Code != http.StatusForbidden {
		t.Fatalf("rol lectura: %d, esperaba 403", rr.Code)
	}

	admin := auth.NewSession(1, "admin", "Admin", "admin", "")
	rr := backupReq(t, admin, s, http.MethodGet, "/api.php?action=backups", nil, "")
	if rr.Code != http.StatusOK {
		t.Fatalf("list: %d body=%s", rr.Code, rr.Body.String())
	}
	var list []backupEntry
	decodeJSON(t, rr.Body.Bytes(), &list)
	if len(list) != 2 {
		t.Fatalf("se esperaban 2 snapshots, got %d", len(list))
	}
	if list[0].Name != recent {
		t.Errorf("orden: el más reciente debería ir primero, got %s", list[0].Name)
	}
	if list[0].Size == 0 || list[0].ModTime == "" {
		t.Error("backupEntry incompleto")
	}
}

func TestBackupDownload(t *testing.T) {
	s, conn := testBackupServer(t)
	defer conn.Close()
	name := backupFileName(time.Now())
	content := []byte("snapshot-encrypted-bytes")
	if err := os.WriteFile(filepath.Join(s.cfg.BackupDir, name), content, 0o600); err != nil {
		t.Fatal(err)
	}
	admin := auth.NewSession(1, "admin", "Admin", "admin", "")

	if rr := backupReq(t, admin, s, http.MethodGet, "/api.php?action=backup_download&file=../../"+name, nil, ""); rr.Code != http.StatusBadRequest {
		t.Fatalf("traversal: %d, esperaba 400", rr.Code)
	}
	if rr := backupReq(t, admin, s, http.MethodGet, "/api.php?action=backup_download&file="+name, nil, ""); rr.Code != http.StatusOK {
		t.Fatalf("download: %d err=%s", rr.Code, rr.Body.String())
	} else {
		if cd := rr.Header().Get("Content-Disposition"); cd == "" || !bytes.Contains([]byte(cd), []byte("attachment")) {
			t.Errorf("falta Content-Disposition attachment: %q", cd)
		}
		if rr.Body.String() != string(content) {
			t.Error("el cuerpo descargado no coincide")
		}
	}
	if rr := backupReq(t, admin, s, http.MethodGet, "/api.php?action=backup_download&file=mozart_2000-01-01.db", nil, ""); rr.Code != http.StatusNotFound {
		t.Fatalf("inexistente: %d, esperaba 404", rr.Code)
	}
	if rr := backupReq(t, nil, s, http.MethodGet, "/api.php?action=backup_download&file="+name, nil, ""); rr.Code != http.StatusUnauthorized {
		t.Fatalf("download sin sesión: %d, esperaba 401", rr.Code)
	}
}

func TestBackupCreate(t *testing.T) {
	s, conn := testBackupServer(t)
	defer conn.Close()
	admin := auth.NewSession(1, "admin", "Admin", "admin", "")
	rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_crear", bytes.NewReader(nil), "")
	if rr.Code != http.StatusOK {
		t.Fatalf("crear: %d body=%s", rr.Code, rr.Body.String())
	}
	name := backupFileName(time.Now())
	if _, err := os.Stat(filepath.Join(s.cfg.BackupDir, name)); err != nil {
		t.Fatalf("el snapshot no se creó: %v", err)
	}
	// Idempotente: volver a crear no falla.
	rr2 := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_crear", bytes.NewReader(nil), "")
	if rr2.Code != http.StatusOK {
		t.Fatalf("crear repetido: %d body=%s", rr2.Code, rr2.Body.String())
	}
}

// makeCleanDB crea una base SQLCipher cerrada (archivo único) para usar como
// contenido de upload.
func makeCleanDB(t *testing.T, key string, dir string) []byte {
	t.Helper()
	path := filepath.Join(dir, "src.db")
	conn, err := db.Open(path, key)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)`); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`INSERT INTO t VALUES (1,'x')`); err != nil {
		t.Fatal(err)
	}
	conn.Close()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func uploadBody(t *testing.T, filename string, data []byte, clave string) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	if clave != "" {
		mw.WriteField("clave", clave)
	}
	fw, err := mw.CreateFormFile("archivo", filename)
	if err != nil {
		t.Fatal(err)
	}
	fw.Write(data)
	mw.Close()
	return &buf, mw.FormDataContentType()
}

func TestBackupUploadRechazos(t *testing.T) {
	s, conn := testBackupServer(t)
	defer conn.Close()
	admin := auth.NewSession(1, "admin", "Admin", "admin", "")

	body, ct := uploadBody(t, "noesbackup.txt", []byte("xx"), "")
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusBadRequest {
		t.Fatalf("ext inválida: %d, esperaba 400", rr.Code)
	}

	// Sin campo archivo.
	var empty bytes.Buffer
	mw := multipart.NewWriter(&empty)
	mw.Close()
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", &empty, mw.FormDataContentType()); rr.Code != http.StatusBadRequest {
		t.Fatalf("sin archivo: %d, esperaba 400", rr.Code)
	}

	// Archivo no-sqlite con nombre válido: no abre con la clave actual → 422 "clave".
	body, ct = uploadBody(t, backupFileName(time.Now()), []byte("esto no es sqlite"), "")
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("no-sqlite: %d, esperaba 422", rr.Code)
	}

	// Clave manual incorrecta sobre un DB real → 400.
	dir := t.TempDir()
	data := makeCleanDB(t, backupTestKey, dir)
	body, ct = uploadBody(t, backupFileName(time.Now()), data, "0000000000000000000000000000000000000000000000000000000000000000")
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusBadRequest {
		t.Fatalf("clave incorrecta: %d, esperaba 400", rr.Code)
	}

	// Sin sesión → 401.
	body, ct = uploadBody(t, backupFileName(time.Now()), data, "")
	if rr := backupReq(t, nil, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusUnauthorized {
		t.Fatalf("sin sesión: %d, esperaba 401", rr.Code)
	}
}

func TestBackupUploadValido(t *testing.T) {
	s, conn := testBackupServer(t)
	defer conn.Close()
	admin := auth.NewSession(1, "admin", "Admin", "admin", "")

	dir := t.TempDir()
	data := makeCleanDB(t, backupTestKey, dir)
	name := backupFileName(time.Now())
	body, ct := uploadBody(t, name, data, "")
	rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct)
	if rr.Code != http.StatusOK {
		t.Fatalf("upload válido: %d body=%s", rr.Code, rr.Body.String())
	}
	saved := filepath.Join(s.cfg.BackupDir, name)
	if _, err := os.Stat(saved); err != nil {
		t.Fatalf("el snapshot no se guardó: %v", err)
	}
	if err := validateBackupFile(saved, backupTestKey); err != nil {
		t.Fatalf("el snapshot guardado no valida: %v", err)
	}

	// Duplicado → 409.
	body, ct = uploadBody(t, name, data, "")
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusConflict {
		t.Fatalf("duplicado: %d, esperaba 409", rr.Code)
	}
}

func TestBackupUploadClaveManual(t *testing.T) {
	s, conn := testBackupServer(t)
	defer conn.Close()
	admin := auth.NewSession(1, "admin", "Admin", "admin", "")

	dir := t.TempDir()
	otraClave := "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
	data := makeCleanDB(t, otraClave, dir)

	// Sin indicar la clave → 422 pidiendo la clave.
	body, ct := uploadBody(t, backupFileName(time.Now()), data, "")
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("clave distinta sin indicar: %d, esperaba 422", rr.Code)
	}

	// Con la clave manual correcta → se guarda.
	body, ct = uploadBody(t, backupFileName(time.Now()), data, otraClave)
	if rr := backupReq(t, admin, s, http.MethodPost, "/api.php?action=backup_upload", body, ct); rr.Code != http.StatusOK {
		t.Fatalf("upload con clave manual: %d body=%s", rr.Code, rr.Body.String())
	}
}

func decodeJSON(t *testing.T, b []byte, v interface{}) {
	t.Helper()
	if err := json.Unmarshal(b, v); err != nil {
		t.Fatalf("json: %v", err)
	}
}
