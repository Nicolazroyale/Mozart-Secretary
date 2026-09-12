package db

import (
	"database/sql"
	"log"

	"mozart/auth"
)

// Seed carga datos mínimos de inicio: dos cursos de ejemplo y el usuario
// administrador. El usuario administrador se crea solo si la base está vacía;
// si ADMIN_PASSWORD viene seteado de forma explícita (desde .env), se aplica
// como contraseña de ese usuario en cada arranque (fuente de verdad).
func Seed(conn *sql.DB, adminUser, adminPassword, masterPassword string) error {
	if err := seedCourses(conn); err != nil {
		return err
	}
	return seedAdmin(conn, adminUser, adminPassword, masterPassword)
}

func seedCourses(conn *sql.DB) error {
	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM cursos`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	_, err := conn.Exec(`
		INSERT INTO cursos (anio, division, turno, ciclo, jornada) VALUES
		(1, 1, 'Mañana', 'Básico', 'Simple'),
		(5, 1, 'Tarde', 'Superior', 'Completa')
	`)
	return err
}

func seedAdmin(conn *sql.DB, adminUser, adminPassword, masterPassword string) error {
	if adminUser == "" {
		adminUser = "admin_tecnica"
	}
	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM usuarios`).Scan(&count); err != nil {
		return err
	}

	switch {
	case count == 0:
		// Primera instalación: el usuario administrador se crea con la
		// contraseña definida en ADMIN_PASSWORD o, si no, la del master o la
		// default admin123.
		password := adminPassword
		if password == "" {
			password = masterPassword
		}
		if password == "" {
			password = "admin123"
		}
		hash, err := auth.HashPassword(password)
		if err != nil {
			return err
		}
		if _, err := conn.Exec(
			`INSERT INTO usuarios (username, password, nombre_completo, rol, activo) VALUES (?, ?, 'Administrador Técnica', 'admin', 1)`,
			adminUser, hash,
		); err != nil {
			return err
		}
		log.Printf("Usuario %s creado. Contraseña definida en ADMIN_PASSWORD/MASTER_PASSWORD (default: admin123).", adminUser)

	case adminPassword != "":
		// ADMIN_PASSWORD explícito: es la fuente de verdad de la contraseña
		// del usuario administrador; se actualiza en cada arranque.
		var exists int
		if err := conn.QueryRow(
			`SELECT COUNT(*) FROM usuarios WHERE username = ?`, adminUser,
		).Scan(&exists); err != nil {
			return err
		}
		hash, err := auth.HashPassword(adminPassword)
		if err != nil {
			return err
		}
		if exists == 0 {
			if _, err := conn.Exec(
				`INSERT INTO usuarios (username, password, nombre_completo, rol, activo) VALUES (?, ?, 'Administrador Técnica', 'admin', 1)`,
				adminUser, hash,
			); err != nil {
				return err
			}
			log.Printf("Usuario %s creado desde .env.", adminUser)
		} else {
			if _, err := conn.Exec(
				`UPDATE usuarios SET password = ?, activo = 1 WHERE username = ?`,
				hash, adminUser,
			); err != nil {
				return err
			}
			log.Printf("Contraseña de %s actualizada desde .env.", adminUser)
		}
	}
	return nil
}