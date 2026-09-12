// Package db gestiona la conexión SQLCipher (WAL), el esquema y el seed inicial.
package db

import (
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
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

// EnsureSchema aplica el DDL (idempotente).
func EnsureSchema(conn *sql.DB) error {
	if _, err := conn.Exec(schemaSQL); err != nil {
		return fmt.Errorf("aplicando esquema: %w", err)
	}
	return nil
}