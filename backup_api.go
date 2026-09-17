package main

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"mozart/auth"
	"mozart/db"
)

const (
	backupMaxUpload = 256 << 20 // 256 MB por archivo subido
	backupUploadKey = "archivo"
)

var hex64Re = regexp.MustCompile(`^[0-9a-fA-F]{64}$`)

// backupEntry describe un snapshot para el panel web.
type backupEntry struct {
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	ModTime string `json:"modtime"` // fecha del snapshot (YYYY-MM-DD)
	Mensual bool   `json:"mensual"`
}

// backupFilenameValid verifica que name sea un snapshot mozart_YYYY-MM-DD.db
// sin separadores de ruta (bloquea traversal y rutas absolutas).
func backupFilenameValid(name string) bool {
	if name == "" || name != filepath.Base(name) {
		return false
	}
	if !strings.HasPrefix(name, backupPrefix) || !strings.HasSuffix(name, backupSuffix) {
		return false
	}
	_, ok := backupDate(name)
	return ok
}

// listBackups devuelve los snapshots ordenados de más reciente a más antiguo.
func listBackups(dir string) ([]backupEntry, error) {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := make([]backupEntry, 0, len(ents))
	for _, e := range ents {
		if e.IsDir() || !backupFilenameValid(e.Name()) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		d, _ := backupDate(e.Name())
		out = append(out, backupEntry{
			Name:    e.Name(),
			Size:    info.Size(),
			ModTime: d.Format("2006-01-02"),
			Mensual: d.Day() == 1,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ModTime > out[j].ModTime })
	return out, nil
}

// lastBackupDate devuelve la fecha (YYYY-MM-DD) del snapshot más reciente o "".
func (s *Server) lastBackupDate() string {
	entries, err := listBackups(s.cfg.BackupDir)
	if err != nil || len(entries) == 0 {
		return ""
	}
	return entries[0].ModTime
}

func (s *Server) requirePerm(w http.ResponseWriter, r *http.Request, perm string) (*auth.Session, bool) {
	sess := s.currentSession(r)
	if sess == nil {
		jsonError(w, http.StatusUnauthorized, "No autorizado o sesión expirada.")
		return nil, false
	}
	if s.cfg.AutoLogin == "" && !hasPerm(sess.Role, s.userPerms(sess), perm) {
		jsonError(w, http.StatusForbidden, "No tiene permisos para realizar esta acción")
		return nil, false
	}
	return sess, true
}

func (s *Server) handleBackupsList(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePerm(w, r, permVerBackups); !ok {
		return
	}
	entries, err := listBackups(s.cfg.BackupDir)
	if err != nil {
		s.serverError(w, err)
		return
	}
	if entries == nil {
		entries = []backupEntry{}
	}
	s.writeResult(w, entries)
}

func (s *Server) handleBackupCreate(w http.ResponseWriter, r *http.Request) {
	sess, ok := s.requirePerm(w, r, permGestionBackups)
	if !ok {
		return
	}
	name := backupFileName(time.Now())
	if err := createBackup(s.dbs, s.cfg); err != nil {
		s.serverError(w, err)
		return
	}
	auditLog(s.dbs, "backups", name, "CREATE", nil, map[string]interface{}{"archivo": name}, sess, clientIP(r))
	s.writeResult(w, map[string]interface{}{"ok": true, "name": name})
}

func (s *Server) handleBackupDownload(w http.ResponseWriter, r *http.Request) {
	sess, ok := s.requirePerm(w, r, permVerBackups)
	if !ok {
		return
	}
	name := r.URL.Query().Get("file")
	if !backupFilenameValid(name) {
		jsonError(w, http.StatusBadRequest, "Nombre de backup inválido")
		return
	}
	path := filepath.Join(s.cfg.BackupDir, name)
	info, err := os.Stat(path)
	if err != nil || !info.Mode().IsRegular() {
		jsonError(w, http.StatusNotFound, "Backup no encontrado")
		return
	}
	fh, err := os.Open(path)
	if err != nil {
		s.serverError(w, err)
		return
	}
	defer fh.Close()
	auditLog(s.dbs, "backups", name, "DOWNLOAD", nil, nil, sess, clientIP(r))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	w.Header().Set("Cache-Control", "private, no-store")
	http.ServeContent(w, r, name, info.ModTime(), fh)
}

// validateBackupFile comprueba que el archivo sea una base SQLCipher válida con
// la clave dada (abre con la clave + PRAGMA quick_check).
func validateBackupFile(path, key string) error {
	if key == "" {
		return errors.New("clave de cifrado requerida para validar el backup")
	}
	conn, err := db.Open(path, key)
	if err != nil {
		return fmt.Errorf("no se pudo abrir con la clave: %w", err)
	}
	defer conn.Close()
	var check string
	if err := conn.QueryRow("PRAGMA quick_check").Scan(&check); err != nil {
		return fmt.Errorf("consulta de integridad: %w", err)
	}
	if check != "ok" {
		return fmt.Errorf("integrity check: %s", check)
	}
	return nil
}

func (s *Server) handleBackupUpload(w http.ResponseWriter, r *http.Request) {
	sess, ok := s.requirePerm(w, r, permGestionBackups)
	if !ok {
		return
	}
	if err := r.ParseMultipartForm(backupMaxUpload); err != nil {
		jsonError(w, http.StatusBadRequest, "Archivo demasiado grande o multipart inválido (máx. 256 MB)")
		return
	}
	r.MultipartForm.RemoveAll()

	f, hdr, err := r.FormFile(backupUploadKey)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Seleccioná un archivo de backup (.db)")
		return
	}
	defer f.Close()

	if !strings.EqualFold(filepath.Ext(hdr.Filename), ".db") {
		jsonError(w, http.StatusBadRequest, "El archivo debe terminar en .db (snapshot de la base)")
		return
	}

	tmp, err := os.CreateTemp(s.cfg.BackupDir, ".upload-*.db")
	if err != nil {
		s.serverError(w, err)
		return
	}
	defer os.Remove(tmp.Name())
	if err := tmp.Chmod(0o600); err != nil {
		tmp.Close()
		s.serverError(w, err)
		return
	}
	n, err := io.Copy(tmp, io.LimitReader(f, backupMaxUpload+1))
	cerr := tmp.Close()
	if err != nil {
		s.serverError(w, err)
		return
	}
	if cerr != nil {
		s.serverError(w, cerr)
		return
	}
	if n > backupMaxUpload {
		jsonError(w, http.StatusBadRequest, "El archivo supera el máximo de 256 MB")
		return
	}

	name := hdr.Filename
	if !backupFilenameValid(name) {
		name = backupFileName(time.Now())
	}
	final := filepath.Join(s.cfg.BackupDir, name)
	if _, err := os.Stat(final); err == nil {
		jsonError(w, http.StatusConflict, "Ya existe un backup con ese nombre: "+name)
		return
	}

	// Validación con la clave provista o, si no viene, con la clave actual.
	effKey := s.cfg.DBKey
	manualClave := strings.TrimSpace(r.FormValue("clave"))
	if manualClave != "" {
		if !hex64Re.MatchString(manualClave) {
			jsonError(w, http.StatusBadRequest, "Clave inválida: debe ser 32 bytes en hex (openssl rand -hex 32)")
			return
		}
		if manualClave != s.cfg.DBKey {
			effKey = manualClave
		}
	}
	if err := validateBackupFile(tmp.Name(), effKey); err != nil {
		if manualClave == "" {
			// No abrió con la clave actual: pedimos la clave con la que se cifró.
			log.Printf("backups: upload rechazado con clave actual: %v", err)
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{
				"error":  "El archivo no abre con la clave actual. Si este backup se cifró con otra clave, indicá cuál en el campo \"Clave del backup\".",
				"reason": "clave",
			})
			return
		}
		log.Printf("backups: upload rechazado con clave manual: %v", err)
		jsonError(w, http.StatusBadRequest, "Clave incorrecta o archivo de backup inválido")
		return
	}

	if err := os.Rename(tmp.Name(), final); err != nil {
		s.serverError(w, err)
		return
	}
	log.Printf("backups: subido por web %s (%d bytes)", name, n)
	auditLog(s.dbs, "backups", name, "UPLOAD", nil, map[string]interface{}{"archivo": name, "size": n}, sess, clientIP(r))
	s.writeResult(w, map[string]interface{}{"ok": true, "name": name})
}
