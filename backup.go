package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	backupPrefix     = "mozart_"
	backupSuffix     = ".db"
	backupCheckEvery = time.Hour
)

// runBackups programa snapshots diarios de la base (VACUUM INTO, consistente
// aunque haya escrituras concurrentes). Conserva los backups según la retención
// configurada y borra los más viejos. Corre hasta que ctx se cancele.
func runBackups(ctx context.Context, conn *sql.DB, cfg Config) {
	dir := cfg.BackupDir
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Printf("backups: no se pudo crear %s: %v", dir, err)
		return
	}
	log.Printf("backups: diarios en %s, retención de %d días + %d meses (primer día de mes)",
		dir, cfg.BackupRetentionDays, cfg.BackupKeepMonths)

	ticker := time.NewTicker(backupCheckEvery)
	defer ticker.Stop()
	var lastDay int = -1
	for {
		select {
		case <-ctx.Done():
			log.Println("backups: detenido")
			return
		case now := <-ticker.C:
			// Un snapshot por día natural (el horario exacto queda fijado por
			// el primer tick del día).
			if now.Day() == lastDay {
				continue
			}
			lastDay = now.Day()
			if err := createBackup(conn, cfg); err != nil {
				log.Printf("backups: error creando backup: %v", err)
				continue
			}
			if err := pruneBackups(cfg); err != nil {
				log.Printf("backups: error podando backups: %v", err)
			}
		}
	}
}

// createBackup genera un snapshot consistente con VACUUM INTO y un nombre
// mozart_YYYY-MM-DD.db. Si ya existe uno para hoy, lo deja intacto.
func createBackup(conn *sql.DB, cfg Config) error {
	path := filepath.Join(cfg.BackupDir, backupFileName(time.Now()))
	if _, err := os.Stat(path); err == nil {
		log.Printf("backups: ya existe %s, se omite", path)
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	target := strings.ReplaceAll(path, "'", "''")
	if _, err := conn.Exec("VACUUM INTO '" + target + "'"); err != nil {
		return err
	}
	log.Printf("backups: creado %s", path)
	return nil
}

// pruneBackups borra los backups mozart_*.db fuera de retención:
//   - diarios: se conservan los últimos BackupRetentionDays días;
//   - mensuales: el primer día de cada mes se conserva BackupKeepMonths meses;
//   - los archivos mozart_*.db con fecha inválida también se eliminan.
func pruneBackups(cfg Config) error {
	now := time.Now()
	cutoffDaily := now.AddDate(0, 0, -cfg.BackupRetentionDays)
	cutoffMonthly := now.AddDate(0, -cfg.BackupKeepMonths, 0)
	entries, err := os.ReadDir(cfg.BackupDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasPrefix(e.Name(), backupPrefix) || !strings.HasSuffix(e.Name(), backupSuffix) {
			continue
		}
		d, ok := backupDate(e.Name())
		if !ok {
			// "-wal"/"-shm" no matchean el sufijo .db; aquí llegan solo
			// mozart_*.db mal formados: no se tocan, por seguridad.
			continue
		}
		keep := !d.Before(cutoffDaily)
		if d.Day() == 1 && !d.Before(cutoffMonthly) {
			keep = true
		}
		if keep {
			continue
		}
		path := filepath.Join(cfg.BackupDir, e.Name())
		if err := os.Remove(path); err != nil {
			return err
		}
		log.Printf("backups: eliminado %s (fuera de retención %d días / %d meses)", path, cfg.BackupRetentionDays, cfg.BackupKeepMonths)
	}
	return nil
}

// backupFileName devuelve el nombre de archivo para la fecha dada.
func backupFileName(t time.Time) string {
	return backupPrefix + t.Format("2006-01-02") + backupSuffix
}

// backupDate extrae la fecha de un nombre de backup mozart_YYYY-MM-DD.db.
func backupDate(name string) (time.Time, bool) {
	base := strings.TrimSuffix(strings.TrimPrefix(name, backupPrefix), backupSuffix)
	t, err := time.ParseInLocation("2006-01-02", base, time.Local)
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}
