# Idea — División del sistema en módulos (Alumnos / Docentes / Común)

**Estado: DESCARTADA por riesgo de latencia** — ver "Razones para no implementar" al final.

---

## Objetivo
Dividir el sitio web en módulos independientes con URL propia, API propia, JS propio y
base de datos física separada en contenedor Docker distinto.

## Estructura propuesta

```
apache2/
├── index.php           → Portal selector de módulos (filtra por columna modulos del usuario)
├── auth_config.php     → sesión + CSRF (compartido)
├── shared/
│   ├── db.php          → conexión PDO vía ENV del módulo actual
│   ├── api_helpers.php → helpers (compartido)
│   └── modulo_helper.php → verifica permiso de módulo (NUEVO)
├── Login/              → sin cambios (redirige al portal)
├── alumnos/  (index.php + api.php + db.php)
├── docentes/ (index.php + api.php + db.php)
├── comun/    (index.php + api.php + db.php)   → cursos, materias, nómina, auditoría, usuarios
└── js/
    ├── core.js     → utils compartidos (fetch, paginación, tema, menú)
    ├── alumnos.js  → CRUD alumno, salud, responsables, restricciones
    ├── docentes.js → CRUD docente, asignaciones, horarios
    ├── comun.js    → cursos, materias, nómina, auditoría, usuarios
    └── ui.js       → mostrarTabla (se mantiene)
```

## Reparto de tablas por base de datos

| alumnos_db (cont. db_alumnos) | docentes_db (cont. db_docentes) | comun_db (cont. db_comun) |
|---|---|---|
| alumnos, responsables, alumno_responsable, salud_alumno, restricciones_judiciales, materias_adeudadas | docentes, docente_materia_curso | cursos, materias, usuarios (+columna `modulos`), audit_log |

## Cambios obligatorios
- Eliminar FK cross-dominio (`alumnos.id_curso`, `docente_materia_curso.id_curso/.id_materia`,
  `materias_adeudadas.id_materia`) → índices simples.
- `materias` y `cursos` quedan solo en `comun_db`.
- La nómina y la búsqueda global cruzan las 3 BDs → `comun` necesita usuario de LECTURA
  (`comun_read`) en las BDs de alumnos y docentes.
- `usuarios` gana columna `modulos` (`VARCHAR`, ej. `'alumnos,docentes,comun'`).

## Docker
- 3 servicios DB (`db_alumnos`, `db_docentes`, `db_comun`), cada uno con sus scripts de init,
  `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` propios (las "KEYs").
- 1 web Apache con ENV por módulo: `DB_HOST/USER/PASS_ALUMNOS`, `..._DOCENTES`, `..._COMUN`
  + credenciales de lectura para comun.

## APIs por módulo
- **alumnos/api.php**: `estudiantes` (CRUD + detalle), `lista_cursos` (lectura), export.
- **docentes/api.php**: `docentes`, `docente_cursos`, `asignaciones`, `lista_cursos`, export.
- **comun/api.php**: `cursos`, `materias`, `nomina`, `docentes_por_curso`, `audit_log`,
  `usuarios`, `search` (cruce de BDs), export de nómina.

## Fases (si algún día se retoma)
1. BD: 3 esquemas, quitar FK cross, columna `modulos`, usuario de lectura.
2. Docker: 3 servicios DB + ENV.
3. Backend: db.php por módulo, modulo_helper, 3 api.php.
4. Frontend: portal, 3 dashboards, dividir app.js (2273 líneas) en 4 archivos.
5. Gestión de usuarios con checkboxes de módulos.
6. Tests: actualizar `tests/js/`, lint.
7. Limpieza: deprecar `sistema/` y `api.php` legacy.

## Razones para NO implementar (decisión actual)
1. **Latencia**: la nómina y la búsqueda global requieren consultas cruzadas entre 3
   contenedores (red Docker) → mayor tiempo de respuesta en la vista más usada.
2. **Complejidad de integridad**: al quitar las FK, la consistencia referencial queda
   a cargo del backend (riesgo de datos huérfanos).
3. **Migración delicada**: repartir INSERTs y reseed entre 3 esquemas es propensa a errores.
4. **Costo de mantenimiento**: 3 BDs, 3 APIs, 3 dashboards y 4 archivos JS en vez de 1+1.
5. **Beneficio aislado**: la separación física no aporta a una escuela de ~1.000 alumnos;
   el valor real (facilidad de desarrollo) se obtiene igual dividiendo JS/API con UNA bd.

## Alternativa de bajo riesgo (recomendada)
Dividir solo la capa de aplicación (JS/API/URLs) y mantener **1 sola BD** con KEYs de
**usuario MySQL distinto por módulo** (GRANT por tabla), sin latencia de red y sin romper FK.