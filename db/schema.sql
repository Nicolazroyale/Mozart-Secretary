CREATE TABLE IF NOT EXISTS cursos (
  id_curso INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER NOT NULL,
  division INTEGER NOT NULL,
  turno TEXT NOT NULL DEFAULT 'Mañana',
  ciclo TEXT NOT NULL DEFAULT 'Básico',
  orientacion TEXT,
  jornada TEXT NOT NULL DEFAULT 'Simple',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (anio, division, turno, ciclo)
);

CREATE TABLE IF NOT EXISTS alumnos (
  id_alumno INTEGER PRIMARY KEY AUTOINCREMENT,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo_dni TEXT NOT NULL DEFAULT 'DNI Argentino',
  dni TEXT NOT NULL,
  cuil TEXT,
  fecha_nacimiento TEXT NOT NULL,
  lugar_nacimiento TEXT,
  nacionalidad TEXT NOT NULL DEFAULT 'Argentina',
  genero TEXT NOT NULL DEFAULT 'No desea responder',
  genero_especificar TEXT,
  calle TEXT NOT NULL,
  numero TEXT NOT NULL,
  piso TEXT,
  depto TEXT,
  entre_calles TEXT,
  localidad TEXT NOT NULL DEFAULT 'Buenos Aires',
  distrito TEXT,
  provincia TEXT NOT NULL DEFAULT 'Buenos Aires',
  telefono_fijo TEXT,
  telefono_celular TEXT,
  id_curso INTEGER NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_ingreso TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tipo_dni, dni),
  FOREIGN KEY (id_curso) REFERENCES cursos(id_curso)
);

CREATE TABLE IF NOT EXISTS responsables (
  id_responsable INTEGER PRIMARY KEY AUTOINCREMENT,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  vinculo TEXT NOT NULL DEFAULT 'Tutor/a',
  nacionalidad TEXT NOT NULL DEFAULT 'Argentina',
  tipo_dni TEXT NOT NULL DEFAULT 'DNI Argentino',
  dni TEXT NOT NULL,
  profesion TEXT,
  nivel_educativo TEXT,
  condicion_actividad TEXT,
  convive_estudiante INTEGER NOT NULL DEFAULT 0,
  calle TEXT,
  numero TEXT,
  piso TEXT,
  depto TEXT,
  localidad TEXT,
  provincia TEXT,
  telefono_fijo TEXT,
  telefono_celular TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tipo_dni, dni)
);

CREATE TABLE IF NOT EXISTS alumno_responsable (
  id_alumno INTEGER NOT NULL,
  id_responsable INTEGER NOT NULL,
  es_principal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id_alumno, id_responsable),
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
  FOREIGN KEY (id_responsable) REFERENCES responsables(id_responsable) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS salud_alumno (
  id_alumno INTEGER PRIMARY KEY,
  asma INTEGER NOT NULL DEFAULT 0,
  celiaquia INTEGER NOT NULL DEFAULT 0,
  diabetes INTEGER NOT NULL DEFAULT 0,
  obesidad INTEGER NOT NULL DEFAULT 0,
  cardiopatia INTEGER NOT NULL DEFAULT 0,
  otros_checklist TEXT,
  alergias TEXT,
  internaciones TEXT,
  antecedentes_salud TEXT,
  obra_social_nombre TEXT,
  obra_social_nro TEXT,
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS restricciones_judiciales (
  id_alumno INTEGER PRIMARY KEY,
  apellido_nombre TEXT,
  tipo_doc TEXT,
  nro_doc TEXT,
  descripcion TEXT,
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS docentes (
  id_docente INTEGER PRIMARY KEY AUTOINCREMENT,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL,
  fecha_inscripcion TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  situacion_revista TEXT NOT NULL DEFAULT 'Provisional',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (dni)
);

CREATE TABLE IF NOT EXISTS materias (
  id_materia INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS docente_materia_curso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_docente INTEGER NOT NULL,
  id_materia INTEGER NOT NULL,
  id_curso INTEGER NOT NULL,
  cargo TEXT NOT NULL DEFAULT 'Titular',
  horas_catedra INTEGER,
  dia_semana TEXT,
  hora_inicio TEXT,
  hora_fin TEXT,
  ciclo_lectivo INTEGER NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_docente, id_materia, id_curso, ciclo_lectivo),
  FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE RESTRICT,
  FOREIGN KEY (id_docente) REFERENCES docentes(id_docente) ON DELETE RESTRICT,
  FOREIGN KEY (id_materia) REFERENCES materias(id_materia) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS materias_adeudadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_alumno INTEGER NOT NULL,
  id_materia INTEGER NOT NULL,
  ciclo_lectivo INTEGER NOT NULL,
  aprobada INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
  FOREIGN KEY (id_materia) REFERENCES materias(id_materia) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'lectura',
  permisos TEXT NOT NULL DEFAULT '[]',
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabla TEXT NOT NULL,
  registro_id INTEGER NOT NULL,
  accion TEXT NOT NULL,
  usuario_id INTEGER,
  username TEXT,
  datos_anteriores TEXT,
  datos_nuevos TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tabla_registro ON audit_log (tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log (usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_accion ON audit_log (accion);
CREATE INDEX IF NOT EXISTS idx_alumnos_activo ON alumnos (activo);
CREATE INDEX IF NOT EXISTS idx_alumnos_curso ON alumnos (id_curso, activo);
CREATE INDEX IF NOT EXISTS idx_docentes_activo ON docentes (activo);
CREATE INDEX IF NOT EXISTS idx_dmc_activo ON docente_materia_curso (activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol, activo);
CREATE INDEX IF NOT EXISTS idx_materias_adeudadas_ciclo ON materias_adeudadas (ciclo_lectivo, aprobada);
CREATE INDEX IF NOT EXISTS idx_alumnos_apellido_nombre ON alumnos (apellido, nombre);
CREATE INDEX IF NOT EXISTS idx_docentes_apellido_nombre ON docentes (apellido, nombre);
CREATE INDEX IF NOT EXISTS idx_dmc_curso_activo ON docente_materia_curso (id_curso, activo);
CREATE INDEX IF NOT EXISTS idx_alumnos_dni ON alumnos (tipo_dni, dni);