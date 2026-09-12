package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"mozart/db"
)

func TestBackupFileNameAndDate(t *testing.T) {
	now := time.Date(2026, 9, 14, 10, 0, 0, 0, time.Local)
	name := backupFileName(now)
	want := "mozart_2026-09-14.db"
	if name != want {
		t.Fatalf("backupFileName = %q, want %q", name, want)
	}
	d, ok := backupDate(name)
	if !ok {
		t.Fatalf("backupDate(%q) no parseó", name)
	}
	if d.Year() != 2026 || d.Month() != time.September || d.Day() != 14 {
		t.Errorf("backupDate devolvió %v, want 2026-09-14", d)
	}
	if _, ok := backupDate("mozart.db"); ok {
		t.Error("backupDate(mozart.db) no debería parsear")
	}
	if _, ok := backupDate("mozart_202613xxx.db"); ok {
		t.Error("backupDate con fecha inválida no debería parsear")
	}
}

func TestPruneBackups(t *testing.T) {
	dir := t.TempDir()
	old := backupFileName(time.Now().AddDate(0, 0, -95))
	recent := backupFileName(time.Now().AddDate(0, 0, -10))
	noise := "not_a_backup.txt"
	for _, f := range []string{old, recent, noise} {
		if err := os.WriteFile(filepath.Join(dir, f), []byte("x"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	cfg := Config{BackupDir: dir, BackupRetentionDays: 90}
	if err := pruneBackups(cfg); err != nil {
		t.Fatalf("pruneBackups: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, old)); !os.IsNotExist(err) {
		t.Error("el backup viejo debería haberse borrado")
	}
	if _, err := os.Stat(filepath.Join(dir, recent)); err != nil {
		t.Error("el backup reciente no debería borrarse")
	}
	if _, err := os.Stat(filepath.Join(dir, noise)); err != nil {
		t.Error("el archivo que no es backup no debería borrarse")
	}
}

// TestCreateBackupEncrypted verifica que createBackup genera un backup cifrado
// y consistente (VACUUM INTO) leyendo el archivo resultante con y sin clave.
func TestCreateBackupEncrypted(t *testing.T) {
	dir := t.TempDir()
	key := "0d2d7ace1da12761f2bb17601bbbc2e09076c5176deee8855f80e6800ddc2abe"
	conn, err := db.Open(filepath.Join(dir, "test.db"), key)
	if err != nil {
		t.Fatalf("db.Open: %v", err)
	}
	defer conn.Close()
	if _, err := conn.Exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)`); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := conn.Exec(`INSERT INTO t VALUES (1, 'x')`); err != nil {
		t.Fatalf("insert: %v", err)
	}

	cfg := Config{BackupDir: dir, BackupRetentionDays: 90}
	if err := createBackup(conn, cfg); err != nil {
		t.Fatalf("createBackup: %v", err)
	}

	matches, err := filepath.Glob(filepath.Join(dir, backupPrefix+"*.db"))
	if err != nil || len(matches) != 1 {
		t.Fatalf("se esperaba exactamente 1 backup, got %v (err %v)", matches, err)
	}

	enc, err := db.Open(matches[0], key)
	if err != nil {
		t.Fatalf("no se pudo abrir el backup con la clave: %v", err)
	}
	var n int
	if err := enc.QueryRow("SELECT count(*) FROM t").Scan(&n); err != nil || n != 1 {
		t.Fatalf("backup con clave incorrecto: n=%d err=%v", n, err)
	}
	enc.Close()

	plain, err := sql.Open("sqlite3", matches[0]+"?_busy_timeout=5000")
	if err != nil {
		t.Fatal(err)
	}
	defer plain.Close()
	if err := plain.Ping(); err == nil {
		t.Error("el backup debería ser ilegible sin la clave")
	}
}