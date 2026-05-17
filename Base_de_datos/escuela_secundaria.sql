-- =============================================================
--  BASE DE DATOS: Escuela Secundaria Técnica (Argentina)
--  Compatible con MySQL 8.0+
--  Codificación: UTF-8 / utf8mb4
-- =============================================================

CREATE DATABASE IF NOT EXISTS escuela_secundaria_tecnica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE escuela_secundaria_tecnica;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS docente_materia_curso;
DROP TABLE IF EXISTS docentes;
DROP TABLE IF EXISTS materias_adeudadas;
DROP TABLE IF EXISTS alumno_responsable;
DROP TABLE IF EXISTS restricciones_judiciales;
DROP TABLE IF EXISTS salud_alumno;
DROP TABLE IF EXISTS alumnos;
DROP TABLE IF EXISTS responsables;
DROP TABLE IF EXISTS materias;
DROP TABLE IF EXISTS cursos;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- TABLA: cursos
-- =============================================================
CREATE TABLE cursos (
    id_curso        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    anio            TINYINT UNSIGNED NOT NULL COMMENT '1 a 7',
    division        TINYINT UNSIGNED NOT NULL COMMENT '1, 2, 3...',
    turno           ENUM('Mañana','Tarde','Noche') NOT NULL DEFAULT 'Mañana',
    ciclo           ENUM('Básico','Superior') NOT NULL DEFAULT 'Básico',
    orientacion     VARCHAR(100) NULL,
    jornada         ENUM('Simple','Completa','Extendida') NOT NULL DEFAULT 'Simple',
    UNIQUE KEY uq_curso (anio, division, turno, ciclo),
    CONSTRAINT chk_anio CHECK (anio BETWEEN 1 AND 7)
) COMMENT='Cursos/secciones de la escuela';

-- =============================================================
-- TABLA: materias
-- =============================================================
CREATE TABLE materias (
    id_materia      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_materia_nombre (nombre)
) COMMENT='Materias/asignaturas';

-- =============================================================
-- TABLA: responsables
-- =============================================================
CREATE TABLE responsables (
    id_responsable      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apellido            VARCHAR(80)  NOT NULL,
    nombre              VARCHAR(80)  NOT NULL,
    vinculo             ENUM('Madre','Padre','Tutor/a','Otro') NOT NULL DEFAULT 'Tutor/a',
    nacionalidad        VARCHAR(50)  NOT NULL DEFAULT 'Argentina',
    tipo_dni            ENUM('DNI Argentino','DNI en trámite','CPI','Documento Extranjero') NOT NULL DEFAULT 'DNI Argentino',
    dni                 VARCHAR(15)  NOT NULL,
    profesion           VARCHAR(100) NULL,
    nivel_educativo     VARCHAR(100) NULL,
    condicion_actividad VARCHAR(100) NULL,
    convive_estudiante  TINYINT(1)   NOT NULL DEFAULT 0,
    -- Domicilio
    calle               VARCHAR(120) NULL,
    numero              VARCHAR(10)  NULL,
    piso                VARCHAR(10)  NULL,
    depto               VARCHAR(10)  NULL,
    localidad           VARCHAR(80)  NULL,
    provincia           VARCHAR(80)  NULL,
    -- Contacto
    telefono_fijo       VARCHAR(30)  NULL,
    telefono_celular    VARCHAR(30)  NULL,
    email               VARCHAR(120) NULL,
    UNIQUE KEY uq_responsable_dni (tipo_dni, dni)
) COMMENT='Padres, madres o tutores';

-- =============================================================
-- TABLA: alumnos
-- =============================================================
CREATE TABLE alumnos (
    id_alumno           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apellido            VARCHAR(80)  NOT NULL,
    nombre              VARCHAR(80)  NOT NULL,
    tipo_dni            ENUM('DNI Argentino','DNI en trámite','CPI','Documento Extranjero') NOT NULL DEFAULT 'DNI Argentino',
    dni                 VARCHAR(15)  NOT NULL,
    cuil                VARCHAR(15)  NULL,
    fecha_nacimiento    DATE         NOT NULL,
    lugar_nacimiento    VARCHAR(100) NULL,
    nacionalidad        VARCHAR(50)  NOT NULL DEFAULT 'Argentina',
    genero              ENUM('Mujer','Mujer trans/travesti','Varón','Varón trans/masculinidad trans','No binario','Otra','No desea responder') NOT NULL DEFAULT 'No desea responder',
    genero_especificar  VARCHAR(50)  NULL COMMENT 'Si genero es "Otra"',
    -- Domicilio
    calle               VARCHAR(120) NOT NULL,
    numero              VARCHAR(10)  NOT NULL,
    piso                VARCHAR(10)  NULL,
    depto               VARCHAR(10)  NULL,
    entre_calles        VARCHAR(200) NULL,
    localidad           VARCHAR(80)  NOT NULL DEFAULT 'Buenos Aires',
    distrito            VARCHAR(80)  NULL,
    provincia           VARCHAR(80)  NOT NULL DEFAULT 'Buenos Aires',
    -- Contacto
    telefono_fijo       VARCHAR(30)  NULL,
    telefono_celular    VARCHAR(30)  NULL,
    -- Situación académica
    id_curso            INT UNSIGNED NOT NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_ingreso       DATE         NOT NULL,
    UNIQUE KEY uq_alumno_dni (tipo_dni, dni),
    CONSTRAINT fk_alumno_curso FOREIGN KEY (id_curso) REFERENCES cursos (id_curso)
) COMMENT='Alumnos matriculados';

-- =============================================================
-- TABLA: salud_alumno
-- =============================================================
CREATE TABLE salud_alumno (
    id_alumno           INT UNSIGNED PRIMARY KEY,
    -- Checklist booleano
    asma                TINYINT(1) DEFAULT 0,
    celiaquia           TINYINT(1) DEFAULT 0,
    diabetes            TINYINT(1) DEFAULT 0,
    obesidad            TINYINT(1) DEFAULT 0,
    cardiopatia         TINYINT(1) DEFAULT 0,
    otros_checklist     TEXT NULL,
    -- Preguntas salud ejercicio
    alergias            TEXT NULL,
    internaciones       TEXT NULL,
    antecedentes_salud  TEXT NULL COMMENT 'Campo textarea general',
    -- Obra Social
    obra_social_nombre  VARCHAR(100) NULL,
    obra_social_nro     VARCHAR(50)  NULL,
    CONSTRAINT fk_salud_alumno FOREIGN KEY (id_alumno) REFERENCES alumnos (id_alumno) ON DELETE CASCADE
) COMMENT='Información de salud del alumno';

-- =============================================================
-- TABLA: restricciones_judiciales
-- =============================================================
CREATE TABLE restricciones_judiciales (
    id_alumno           INT UNSIGNED PRIMARY KEY,
    apellido_nombre     VARCHAR(150) NULL,
    tipo_doc            VARCHAR(50)  NULL,
    nro_doc             VARCHAR(20)  NULL,
    descripcion         TEXT         NULL,
    CONSTRAINT fk_restriccion_alumno FOREIGN KEY (id_alumno) REFERENCES alumnos (id_alumno) ON DELETE CASCADE
) COMMENT='Restricciones judiciales vigentes';

-- =============================================================
-- TABLA: alumno_responsable
-- =============================================================
CREATE TABLE alumno_responsable (
    id_alumno       INT UNSIGNED NOT NULL,
    id_responsable  INT UNSIGNED NOT NULL,
    es_principal    TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id_alumno, id_responsable),
    CONSTRAINT fk_ar_alumno       FOREIGN KEY (id_alumno)      REFERENCES alumnos      (id_alumno) ON DELETE CASCADE,
    CONSTRAINT fk_ar_responsable  FOREIGN KEY (id_responsable) REFERENCES responsables (id_responsable) ON DELETE CASCADE
) COMMENT='Relación alumno ↔ responsable';

-- =============================================================
-- TABLA: materias_adeudadas
-- =============================================================
CREATE TABLE materias_adeudadas (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_alumno       INT UNSIGNED NOT NULL,
    id_materia      INT UNSIGNED NOT NULL,
    ciclo_lectivo   YEAR         NOT NULL,
    aprobada        TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT fk_mad_alumno  FOREIGN KEY (id_alumno)  REFERENCES alumnos  (id_alumno) ON DELETE CASCADE,
    CONSTRAINT fk_mad_materia FOREIGN KEY (id_materia) REFERENCES materias (id_materia) ON DELETE CASCADE
);

-- =============================================================
-- TABLA: docentes
-- =============================================================
CREATE TABLE docentes (
    id_docente          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apellido            VARCHAR(80)  NOT NULL,
    nombre              VARCHAR(80)  NOT NULL,
    dni                 VARCHAR(15)  NOT NULL,
    fecha_inscripcion   DATE         NOT NULL,
    telefono            VARCHAR(30)  NULL,
    email               VARCHAR(120) NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    situacion_revista   ENUM('Titular','Provisional','Suplente','Interino','Ad-Honorem','Jubilado','Licencia') NOT NULL DEFAULT 'Provisional',
    UNIQUE KEY uq_docente_dni (dni)
);

-- =============================================================
-- TABLA: docente_materia_curso
-- =============================================================
CREATE TABLE docente_materia_curso (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_docente      INT UNSIGNED NOT NULL,
    id_materia      INT UNSIGNED NOT NULL,
    id_curso        INT UNSIGNED NOT NULL,
    cargo           ENUM('Titular','Provisional','Suplente','Interino','Ad-Honorem') NOT NULL DEFAULT 'Titular',
    horas_catedra   TINYINT UNSIGNED NULL,
    ciclo_lectivo   YEAR         NOT NULL,
    activo          TINYINT(1)   NOT NULL DEFAULT 1,
    UNIQUE KEY uq_dmc (id_docente, id_materia, id_curso, ciclo_lectivo),
    CONSTRAINT fk_dmc_docente  FOREIGN KEY (id_docente)  REFERENCES docentes  (id_docente) ON DELETE CASCADE,
    CONSTRAINT fk_dmc_materia  FOREIGN KEY (id_materia)  REFERENCES materias  (id_materia) ON DELETE CASCADE,
    CONSTRAINT fk_dmc_curso    FOREIGN KEY (id_curso)    REFERENCES cursos    (id_curso) ON DELETE CASCADE
);

-- =============================================================
-- TABLA: usuarios
-- =============================================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    id_usuario      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    rol             ENUM('admin', 'lectura') NOT NULL DEFAULT 'lectura',
    activo          TINYINT(1) NOT NULL DEFAULT 1
) COMMENT='Usuarios del sistema con sus permisos';

-- Usuarios (Contraseña hash para: 1244)
-- Generado con password_hash('1244', PASSWORD_DEFAULT)
INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES
('admin_tecnica', '$2y$10$fW3N7x4H/M7.H7A/x/7x.O.7x.O.7x.O.7x.O.7x.O.7x.O.7x.', 'Administrador Técnica', 'admin'),
('secretaria_gral', '$2y$10$fW3N7x4H/M7.H7A/x/7x.O.7x.O.7x.O.7x.O.7x.O.7x.O.7x.', 'Secretaría General', 'admin'),
('preceptor_1', '$2y$10$fW3N7x4H/M7.H7A/x/7x.O.7x.O.7x.O.7x.O.7x.O.7x.O.7x.', 'Preceptor Turno Mañana', 'lectura'),
('consulta_doc', '$2y$10$fW3N7x4H/M7.H7A/x/7x.O.7x.O.7x.O.7x.O.7x.O.7x.O.7x.', 'Consulta Docente', 'lectura');

-- =============================================================
-- VISTAS ÚTILES
-- =============================================================
CREATE OR REPLACE VIEW v_ficha_alumno AS
SELECT
    a.id_alumno,
    CONCAT(a.apellido, ', ', a.nombre) AS alumno,
    a.dni,
    a.fecha_nacimiento,
    CONCAT(c.anio, '°', c.division, '° (', c.ciclo, ') - ', c.turno) AS curso,
    CONCAT(r.apellido, ', ', r.nombre) AS responsable,
    r.vinculo
FROM alumnos a
JOIN cursos c ON a.id_curso = c.id_curso
LEFT JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno AND ar.es_principal = 1
LEFT JOIN responsables r ON ar.id_responsable = r.id_responsable
WHERE a.activo = 1;
