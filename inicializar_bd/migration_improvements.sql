-- =============================================================================
-- MIGRACIÓN: Mejoras de base de datos para Mozart
-- Ejecutar después del init.sql / dump inicial
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FASE 3.1: Completar la vista v_materias_adeudadas (truncada en el dump)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_materias_adeudadas;
CREATE VIEW v_materias_adeudadas AS
SELECT
    ma.id,
    a.id_alumno,
    CONCAT(a.apellido, ', ', a.nombre) AS alumno,
    a.dni,
    m.nombre AS materia,
    ma.ciclo_lectivo,
    ma.aprobada
FROM materias_adeudadas ma
JOIN alumnos a ON ma.id_alumno = a.id_alumno
JOIN materias m ON ma.id_materia = m.id_materia
ORDER BY a.apellido, a.nombre, ma.ciclo_lectivo;

-- ---------------------------------------------------------------------------
-- FASE 3.2: Reemplazar ON DELETE CASCADE peligroso en docente_materia_curso
-- Usar RESTRICT para evitar borrado accidental de asignaciones
-- ---------------------------------------------------------------------------
ALTER TABLE docente_materia_curso
    DROP FOREIGN KEY fk_dmc_curso,
    DROP FOREIGN KEY fk_dmc_docente,
    DROP FOREIGN KEY fk_dmc_materia;

ALTER TABLE docente_materia_curso
    ADD CONSTRAINT fk_dmc_curso FOREIGN KEY (id_curso) REFERENCES cursos (id_curso) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_dmc_docente FOREIGN KEY (id_docente) REFERENCES docentes (id_docente) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_dmc_materia FOREIGN KEY (id_materia) REFERENCES materias (id_materia) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- FASE 3.3: Agregar índices en columnas filtradas frecuentemente
-- ---------------------------------------------------------------------------
CREATE INDEX idx_alumnos_activo ON alumnos (activo);
CREATE INDEX idx_alumnos_curso ON alumnos (id_curso, activo);
CREATE INDEX idx_docentes_activo ON docentes (activo);
CREATE INDEX idx_materias_adeudadas_ciclo ON materias_adeudadas (ciclo_lectivo, aprobada);
CREATE INDEX idx_dmc_activo ON docente_materia_curso (activo);
CREATE INDEX idx_usuarios_rol ON usuarios (rol, activo);

-- ---------------------------------------------------------------------------
-- FASE 3.4: Agregar timestamps de auditoría a todas las tablas principales
-- ---------------------------------------------------------------------------
ALTER TABLE alumnos
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE docentes
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE cursos
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE materias
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE responsables
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE usuarios
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE docente_materia_curso
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- FASE 3.5: Agregar CHECK constraints adicionales
-- ---------------------------------------------------------------------------
ALTER TABLE cursos
    ADD CONSTRAINT chk_division CHECK (division BETWEEN 1 AND 10);

-- ---------------------------------------------------------------------------
-- FASE 3.6: update_usuarios_roles.sql ya fue limpiado (es un no-op eliminado)
-- ---------------------------------------------------------------------------
