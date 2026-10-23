// Package db gestiona la conexión SQLCipher (WAL), el esquema y el seed inicial.
package db

import (
	"database/sql"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"

	_ "github.com/WissCore/go-sqlcipher/v4"
)

//go:embed schema.sql
var schemaSQL string

var hexKeyRe = regexp.MustCompile(`^[0-9a-fA-F]{64}$`)

// Open abre (creando si hace falta) la base SQLCipher con WAL, FKs y tiempo de
// espera para escrituras concurrentes. keyHex debe ser una clave de 32 bytes en
// hexadecimal (64 caracteres); si está vacía se usa SQLite plano.
func Open(path, keyHex string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}
	if keyHex == "" {
		return nil, errors.New("DB_KEY requerido: base de datos SQLCipher sin clave de cifrado")
	}
	if !hexKeyRe.MatchString(keyHex) {
		return nil, fmt.Errorf("DB_KEY inválido: debe ser 32 bytes en hex (64 caracteres) generado con: openssl rand -hex 32")
	}
	dsn := fmt.Sprintf("%s?_pragma_key=x'%s'&_journal_mode=WAL&_foreign_keys=1&_busy_timeout=5000&_synchronous=NORMAL", path, keyHex)
	conn, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(8)
	conn.SetMaxIdleConns(8)
	conn.SetConnMaxLifetime(0)
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

// EnsureSchema aplica el DDL (idempotente) y migraciones sobre bases existentes.
func EnsureSchema(conn *sql.DB) error {
	if _, err := conn.Exec(schemaSQL); err != nil {
		return fmt.Errorf("aplicando esquema: %w", err)
	}
	return migrate(conn)
}

// migrate aplica cambios de esquema idempotentes para bases ya creadas.
func migrate(conn *sql.DB) error {
	if err := ensureColumn(conn, "usuarios", "permisos", "TEXT NOT NULL DEFAULT '[]'"); err != nil {
		return fmt.Errorf("migrando usuarios.permisos: %w", err)
	}
	if err := migratePermisos(conn); err != nil {
		return fmt.Errorf("migrando usuarios.permisos (ver_nomina): %w", err)
	}
	for _, q := range []string{
		"CREATE INDEX IF NOT EXISTS idx_alumnos_apellido_nombre ON alumnos (apellido, nombre)",
		"CREATE INDEX IF NOT EXISTS idx_docentes_apellido_nombre ON docentes (apellido, nombre)",
		"CREATE INDEX IF NOT EXISTS idx_dmc_curso_activo ON docente_materia_curso (id_curso, activo)",
		"CREATE INDEX IF NOT EXISTS idx_alumnos_dni ON alumnos (tipo_dni, dni)",
	} {
		if _, err := conn.Exec(q); err != nil {
			return fmt.Errorf("creando índice: %w", err)
		}
	}
	return nil
}

// migratePermisos unifica ver_nomina en ver_cursos. Se fusionaron las secciones
// "Cursos" y "Listado por Cursos": el acceso a las nóminas lo da ahora
// ver_cursos, y ver_nomina dejó de existir en el catálogo. Idempotente: solo
// toca las filas que aún contengan el token viejo, deduplicando si el usuario
// ya tenía ver_cursos.
func migratePermisos(conn *sql.DB) error {
	rows, err := conn.Query(`SELECT id_usuario, permisos FROM usuarios WHERE permisos LIKE '%ver_nomina%'`)
	if err != nil {
		return err
	}
	type update struct {
		id  int
		raw string
	}
	var pending []update
	for rows.Next() {
		var id int
		var raw string
		if err := rows.Scan(&id, &raw); err != nil {
			rows.Close()
			return err
		}
		var perms []string
		if err := json.Unmarshal([]byte(raw), &perms); err != nil {
			continue // JSON inválido: se deja como está (lo filtra parsePerms al leer).
		}
		out := make([]string, 0, len(perms))
		seen := map[string]bool{}
		for _, p := range perms {
			if p == "ver_nomina" {
				p = "ver_cursos"
			}
			if seen[p] {
				continue
			}
			seen[p] = true
			out = append(out, p)
		}
		b, err := json.Marshal(out)
		if err != nil {
			rows.Close()
			return err
		}
		pending = append(pending, update{id: id, raw: string(b)})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, u := range pending {
		if _, err := conn.Exec(`UPDATE usuarios SET permisos = ? WHERE id_usuario = ?`, u.raw, u.id); err != nil {
			return err
		}
	}
	if len(pending) > 0 {
		log.Printf("permisos: %d usuario(s) migrado(s) de ver_nomina a ver_cursos", len(pending))
	}
	return nil
}

// ensureColumn agrega la columna si la tabla no la tiene todavía.
func ensureColumn(conn *sql.DB, table, column, ddl string) error {
	rows, err := conn.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return err
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		return err
	}
	vals := make([]interface{}, len(cols))
	ptrs := make([]interface{}, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			return err
		}
		for i, c := range cols {
			if c == "name" && fmt.Sprint(vals[i]) == column {
				return nil
			}
		}
	}
	_, err = conn.Exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + ddl)
	return err
}
