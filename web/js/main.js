/**
 * main.js
 * Sistema principal (diseño de app.css) conectada a los datos REALES de la
 * API (/api.php). Reemplaza el diseño del sistema en / y /sistema.
 *
 * Incluye alta/edición/eliminación integradas (según permisos) vía crud.js.
 *
 * Uso:
 *   import { initMain } from '/js/main.js';
 *   initMain(document.getElementById('app'), opts);
 */

import { icon, esc, apiGet } from './interfaz.js?v=22';
import { createCrud } from './crud.js?v=23';
import { hasPerm, PERM, SECTION_READ, SECTION_WRITE } from './permissions.js?v=9';

// ---------------------------------------------------------------------------
// Configuración de secciones
// ---------------------------------------------------------------------------

export const SECTIONS = [
  { label: 'Estudiantes', icon: 'Users', color: 'blue', desc: 'Gestiona matrículas y perfiles' },
  { label: 'Docentes', icon: 'GraduationCap', color: 'teal', desc: 'Administra el equipo académico' },
  { label: 'Cursos', icon: 'BookOpen', color: 'orange', desc: 'Organiza la oferta educativa y consultá nóminas' },
  { label: 'Materias', icon: 'BookMarked', color: 'violet', desc: 'Catálogo de materias del ciclo lectivo' },
];

const TABLE_FOR = {
  Estudiantes: 'estudiantes',
  Docentes: 'docentes',
  Cursos: 'lista_cursos',
  Materias: 'materias',
};

const EXPORT_FOR = {
  Estudiantes: 'estudiantes',
  Docentes: 'docentes',
  Cursos: 'cursos',
  Materias: 'materias',
};

const ADMIN_GROUP = {
  label: 'Administración',
  icon: 'Shield',
  color: 'green',
  desc: 'Usuarios, backups y auditoría',
  items: [
    { label: 'Usuarios', icon: 'ShieldCheck', color: 'violet', desc: 'Administra las cuentas del sistema' },
    { label: 'Backups', icon: 'DatabaseBackup', color: 'teal', desc: 'Respaldo de la base de datos', crud: 'backups' },
    { label: 'Auditoría', icon: 'ScrollText', color: 'orange', desc: 'Traza de operaciones sobre la base' },
  ],
};

export function visibleSections(state) {
  const base = SECTIONS.filter((s) => hasPerm(state, SECTION_READ[s.label]));
  const adminItems = ADMIN_GROUP.items.filter((it) => hasPerm(state, SECTION_READ[it.label]));
  if (state && state.esAdmin) {
    base.push(Object.assign({}, ADMIN_GROUP, { items: ADMIN_GROUP.items.slice() }));
  } else if (adminItems.length > 0) {
    base.push(Object.assign({}, ADMIN_GROUP, { items: adminItems }));
  }
  return base;
}

// ---------------------------------------------------------------------------
// Helpers puros (exportados para tests)
// ---------------------------------------------------------------------------

export function initials(nombre) {
  const parts = String(nombre || '').trim().split(/\s+/);
  const letters = parts.map((p) => (p[0] || '').toUpperCase()).join('');
  return letters.slice(0, 2) || 'AD';
}

function isSet(x) {
  return x !== undefined && x !== null;
}

export function alertaClass(alerta) {
  return Number(alerta) === 1 ? 'status status-pending' : 'status status-active';
}

export function alertaText(alerta) {
  return Number(alerta) === 1 ? 'Alerta de salud' : 'Sin alertas';
}

export function ultimoBackupText(dateStr) {
  if (!dateStr) return 'Sin backups todavía';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
  if (!m) return 'Sin backups todavía';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const diff = Math.round((hoy - d) / 86400000);
  const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (diff <= 0) return 'hoy · ' + fecha;
  if (diff === 1) return 'ayer · ' + fecha;
  return 'hace ' + diff + ' días · ' + fecha;
}

function getStoredTheme() {
  try {
    return localStorage.getItem('mozart-theme') === 'dark' ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

const LEGACY_VIEW_KEY = 'mozart-cursos-vista';

// Cursos conserva siempre las claves viejas ('mozart-cursos-filtro' y
// 'mozart-cursos-orden') para no perder lo ya elegido; el resto de las
// secciones usa el mismo patrón con su propio slug.
const SLUG_FOR = {
  Estudiantes: 'estudiantes',
  Docentes: 'docentes',
  Cursos: 'cursos',
  Materias: 'materias',
};

// Criterio por defecto del orden de cada sección: el botón solo alterna
// ascendente/descendente y el valor se guarda como '<criterio>:<dir>' (formato
// del menú anterior).
const DEFAULT_SORT_CRITERION = {
  Estudiantes: 'apellido',
  Docentes: 'apellido',
  Cursos: 'anio',
  Materias: 'nombre',
};

function filterKey(section) {
  return 'mozart-' + SLUG_FOR[section] + '-filtro';
}

function sortKey(section) {
  return 'mozart-' + SLUG_FOR[section] + '-orden';
}

function limitKey(section) {
  return 'mozart-' + SLUG_FOR[section] + '-limite';
}

// Opciones del selector de límite de entradas y su valor por defecto.
export const PAGE_SIZES = [15, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 15;

// normalizePageSize: cualquier valor fuera de la lista cae en el default.
export function normalizePageSize(v) {
  const n = Number(v);
  return PAGE_SIZES.indexOf(n) !== -1 ? n : DEFAULT_PAGE_SIZE;
}

// Criterios del menú "Filtrar por" de cada sección: 'none' (default) muestra
// la vista plana; el resto agrupa con un encabezado por valor.
export const SECTION_FILTERS = {
  Estudiantes: [
    { v: 'none', l: 'Ninguno' },
    { v: 'curso', l: 'Curso' },
    { v: 'anio', l: 'Año' },
    { v: 'turno', l: 'Turno' },
    { v: 'ciclo', l: 'Ciclo' },
    { v: 'genero', l: 'Género' },
  ],
  Docentes: [
    { v: 'none', l: 'Ninguno' },
    { v: 'cargo', l: 'Cargo' },
    { v: 'letra', l: 'Letra' },
    { v: 'anio_ingreso', l: 'Año de ingreso' },
  ],
  Cursos: [
    { v: 'none', l: 'Ninguno' },
    { v: 'anio', l: 'Año' },
    { v: 'especialidad', l: 'Especialidad' },
    { v: 'turno', l: 'Turno' },
  ],
  Materias: [
    { v: 'none', l: 'Ninguno' },
    { v: 'letra', l: 'Letra' },
    { v: 'con_docente', l: 'Con docente asignado' },
  ],
};

// Compatibilidad con el nombre anterior (criterios de Cursos).
export const COURSE_FILTERS = SECTION_FILTERS.Cursos;

// Encabezado de Cursos según el criterio de agrupación activo.
const COURSE_HEADINGS = {
  none: ['Catálogo de cursos', 'Hacé clic en "Ver nómina" para abrir la nómina'],
  anio: ['Nóminas por curso', 'Seleccioná un curso para ver su nómina'],
  especialidad: ['Cursos por especialidad', 'Agrupados por especialidad (orientación)'],
  turno: ['Cursos por turno', 'Agrupados por turno de cursada'],
};

// Título de las secciones tabulares/listadas según el criterio activo (la
// cantidad de registros se agrega aparte, en cada panel-heading).
const SECTION_TITLES = {
  Estudiantes: {
    none: 'Registro de estudiantes',
    curso: 'Estudiantes por curso',
    anio: 'Estudiantes por año',
    turno: 'Estudiantes por turno',
    ciclo: 'Estudiantes por ciclo',
    genero: 'Estudiantes por género',
  },
  Docentes: {
    none: 'Equipo docente',
    cargo: 'Docentes por cargo',
    letra: 'Docentes por apellido',
    anio_ingreso: 'Docentes por año de ingreso',
  },
  Materias: {
    none: 'Materias del establecimiento',
    letra: 'Materias por letra',
    con_docente: 'Materias con y sin docente',
  },
};

// isSectionFilter: el valor existe en el menú de esa sección.
export function isSectionFilter(section, v) {
  return (SECTION_FILTERS[section] || []).some((f) => f.v === v);
}

// getStoredFilter: criterio de agrupación de la sección, 'none' por defecto.
// En Cursos se migra el toggle viejo grid/year para no dejar a nadie colgado
// en la vista "por año".
export function getStoredFilter(section) {
  try {
    const v = localStorage.getItem(filterKey(section));
    if (isSectionFilter(section, v)) return v;
    if (section === 'Cursos' && localStorage.getItem(LEGACY_VIEW_KEY) === 'year') return 'anio';
    return 'none';
  } catch (err) {
    return 'none';
  }
}

// getStoredSortDir: dirección del orden, 'asc' por defecto. El valor se guarda
// como '<criterio>:<dir>' (formato del menú anterior) y solo interesa la
// dirección.
export function getStoredSortDir(section) {
  try {
    const raw = localStorage.getItem(sortKey(section)) || '';
    const parts = raw.split(':');
    const dir = parts[parts.length - 1];
    return dir === 'desc' ? 'desc' : 'asc';
  } catch (err) {
    return 'asc';
  }
}

// getStoredFilters / getStoredSortDirs: estado por sección al arrancar.
export function getStoredFilters() {
  const out = {};
  Object.keys(SECTION_FILTERS).forEach((s) => { out[s] = getStoredFilter(s); });
  return out;
}

export function getStoredSortDirs() {
  const out = {};
  Object.keys(SECTION_FILTERS).forEach((s) => { out[s] = getStoredSortDir(s); });
  return out;
}

// Compatibilidad con los nombres anteriores (solo Cursos).
export function getStoredCourseFilter() {
  return getStoredFilter('Cursos');
}

export function getStoredCourseSortDir() {
  return getStoredSortDir('Cursos');
}

function storeFilter(section, v) {
  try {
    localStorage.setItem(filterKey(section), v);
  } catch (err) { /* sin almacenamiento */ }
}

function storeSortDir(section, dir) {
  try {
    localStorage.setItem(sortKey(section), (DEFAULT_SORT_CRITERION[section] || 'orden') + ':' + dir);
  } catch (err) { /* sin almacenamiento */ }
}

// getStoredLimit / getStoredLimits: límite de entradas visibles por sección
// (15/30/50/100, 15 por defecto).
export function getStoredLimit(section) {
  try {
    return normalizePageSize(localStorage.getItem(limitKey(section)));
  } catch (err) {
    return DEFAULT_PAGE_SIZE;
  }
}

export function getStoredLimits() {
  const out = {};
  Object.keys(SLUG_FOR).forEach((s) => { out[s] = getStoredLimit(s); });
  return out;
}

function storeLimit(section, v) {
  try {
    localStorage.setItem(limitKey(section), String(normalizePageSize(v)));
  } catch (err) { /* sin almacenamiento */ }
}

// activeFilter / activeSortDir: valores de la sección activa (o de la indicada).
export function activeFilter(state, section) {
  const s = section || state.section;
  return (state.filters && state.filters[s]) || 'none';
}

export function activeSortDir(state, section) {
  const s = section || state.section;
  return (state.sortDirs && state.sortDirs[s]) || 'asc';
}

const TURNO_ORDER = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };

function str(v) {
  return v === undefined || v === null ? '' : String(v);
}

// sortCourses: ordena por año y división (desempate natural por turno).
// dir='desc' invierte el resultado.
export function sortCourses(courses, dir) {
  const rows = (courses || []).slice();
  rows.sort((a, b) => {
    let d = (Number(a.anio) || 0) - (Number(b.anio) || 0);
    if (d === 0) d = (Number(a.division) || 0) - (Number(b.division) || 0);
    if (d === 0) d = str(a.turno).localeCompare(str(b.turno), 'es');
    return d;
  });
  if (dir === 'desc') rows.reverse();
  return rows;
}

// groupRowsBy: agrupa filas por criterio con un extractor que devuelve
// { id, title, rank }. Los grupos se ordenan por rank (numérico) o, si el rank
// no es un número, por título (alfabético); dir='desc' invierte el orden final.
export function groupRowsBy(rows, criterio, dir, extract) {
  const buckets = [];
  const index = Object.create(null);
  (rows || []).forEach((r) => {
    const g = extract(criterio, r) || {};
    const id = g.id;
    if (!index[id]) {
      index[id] = { id: id, title: g.title, rank: g.rank, items: [] };
      buckets.push(index[id]);
    }
    index[id].items.push(r);
  });
  buckets.sort((a, b) => {
    const ra = Number(a.rank);
    const rb = Number(b.rank);
    if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
    return String(a.title).localeCompare(String(b.title), 'es');
  });
  const ordered = dir === 'desc' ? buckets.slice().reverse() : buckets;
  return ordered.map((g) => ({ title: g.title, items: g.items }));
}

// sortRowsByName: orden natural (A→Z) por nombre; dir='desc' lo invierte.
export function sortRowsByName(rows, dir) {
  const out = (rows || []).slice();
  out.sort((a, b) => str(a.nombre).localeCompare(str(b.nombre), 'es'));
  if (dir === 'desc') out.reverse();
  return out;
}

// activeLimit / activePage: límite y página activos de una sección.
export function activeLimit(state, section) {
  return normalizePageSize((state.limits && state.limits[section]) || DEFAULT_PAGE_SIZE);
}

export function activePage(state, section) {
  return (state.pages && state.pages[section]) || 1;
}

// pageSlice: corta el conjunto ya filtrado y ordenado en la página activa.
// Clampéa la página contra la cantidad total y devuelve el rango para el pie.
export function pageSlice(rows, limit, page) {
  const size = normalizePageSize(limit);
  const total = (rows || []).length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Number(page) || 1), pages);
  const start = (p - 1) * size;
  return {
    rows: (rows || []).slice(start, start + size),
    size: size,
    total: total,
    pages: pages,
    page: p,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
  };
}

// listFooterHTML: pie de la lista con el selector de límite (15/30/50/100), la
// cantidad de entradas al lado y la navegación ‹ ›. Siempre visible: con 0
// entradas queda en "Sin entradas" y los botones deshabilitados.
export function listFooterHTML(section, slice) {
  const options = PAGE_SIZES.map((n) =>
    '<option value="' + n + '"' + (n === slice.size ? ' selected' : '') + '>' + n + '</option>'
  ).join('');
  const cuenta = slice.total === 0
    ? 'Sin entradas para mostrar'
    : 'Mostrando ' + slice.from + '–' + slice.to + ' de ' + slice.total + ' entradas';
  const prev = slice.page <= 1 ? ' disabled' : '';
  const next = slice.page >= slice.pages ? ' disabled' : '';
  return (
    '<div class="list-footer">' +
    '<div class="list-footer-left">' +
    '<label class="limit-label">Mostrar ' +
    '<select class="limit-select" data-limit-select aria-label="Entradas por página de ' + esc(section) + '">' + options + '</select>' +
    ' entradas</label>' +
    '<span class="entry-count">' + esc(cuenta) + '</span>' +
    '</div>' +
    '<div class="list-footer-right">' +
    '<button class="page-btn" data-page-prev type="button" aria-label="Página anterior"' + prev + '>' + icon('ChevronLeft', 16) + '</button>' +
    '<span class="page-info">Página ' + slice.page + ' de ' + slice.pages + '</span>' +
    '<button class="page-btn" data-page-next type="button" aria-label="Página siguiente"' + next + '>' + icon('ChevronRight', 16) + '</button>' +
    '</div>' +
    '</div>'
  );
}

// letraDe: inicial del nombre (las filas de personas vienen como
// "Apellido, Nombre"); lo que no sea letra cae en '#'.
export function letraDe(nombre) {
  const c = str(nombre).trim().charAt(0).toUpperCase();
  return LETRA_RE.test(c) ? c : '#';
}

const LETRA_RE = /^[A-ZÁÉÍÓÚÜÑ]$/;
const CICLO_ORDER = { 'Básico': 0, 'Superior': 1 };
const CON_DOCENTE_ORDER = { 'Con docente asignado': 0, 'Sin docente asignado': 1 };

// courseGroupKey: extractor de grupos de Cursos ((criterio, fila), igual que
// el resto de los extractores). Mismo comportamiento que el agrupador
// original: año numérico, turno por orden Mañana/Tarde/Noche y especialidad
// alfabética.
export function courseGroupKey(criterio, c) {
  const key = criterio === 'turno' || criterio === 'especialidad' ? criterio : 'anio';
  if (key === 'turno') {
    const id = str(c.turno) || 'Sin turno';
    return { id: id, title: id, rank: isSet(TURNO_ORDER[id]) ? TURNO_ORDER[id] : 9 };
  }
  if (key === 'especialidad') {
    const id = str(c.especialidad) || 'Sin especialidad';
    return { id: id, title: id, rank: NaN };
  }
  const id = Number(c.anio) || 0;
  return { id: id, title: id + '° Año', rank: id };
}

// groupKeyFor: extractor de grupos por sección.
export function groupKeyFor(section, criterio, r) {
  if (section === 'Cursos') return courseGroupKey(criterio, r);
  if (section === 'Estudiantes') {
    const curso = str(r.curso) || 'Sin curso';
    const parts = curso.split('°');
    if (criterio === 'curso') {
      const rank = (Number(parts[0]) || 0) * 100 + (Number(parts[1]) || 0);
      return { id: curso, title: curso, rank: rank };
    }
    if (criterio === 'turno') {
      const id = str(r.turno) || 'Sin turno';
      return { id: id, title: id, rank: isSet(TURNO_ORDER[id]) ? TURNO_ORDER[id] : 9 };
    }
    if (criterio === 'ciclo') {
      const id = str(r.ciclo) || 'Sin ciclo';
      return { id: id, title: id, rank: isSet(CICLO_ORDER[id]) ? CICLO_ORDER[id] : 9 };
    }
    if (criterio === 'genero') {
      const id = str(r.genero) || 'Sin dato';
      return { id: id, title: id, rank: NaN };
    }
    const anio = Number(r.anio) || Number(parts[0]) || 0;
    return { id: anio, title: anio ? anio + '° Año' : 'Sin año', rank: anio };
  }
  if (section === 'Docentes') {
    if (criterio === 'cargo') {
      const id = str(r.cargo) || 'Sin cargo';
      return { id: id, title: id, rank: NaN };
    }
    if (criterio === 'anio_ingreso') {
      const id = str(r.anio_ingreso) || 'Sin dato';
      const n = Number(r.anio_ingreso);
      return { id: id, title: id, rank: isNaN(n) ? 9999 : n };
    }
    const letra = letraDe(r.nombre);
    return { id: letra, title: letra, rank: NaN };
  }
  if (section === 'Materias') {
    if (criterio === 'con_docente') {
      const con = Number(r.con_docente) === 1;
      const id = con ? 'Con docente asignado' : 'Sin docente asignado';
      return { id: id, title: id, rank: CON_DOCENTE_ORDER[id] };
    }
    const letra = letraDe(r.nombre);
    return { id: letra, title: letra, rank: NaN };
  }
  return { id: '', title: '', rank: NaN };
}

// groupCoursesBy: agrupa por el criterio elegido. Los cursos deben llegar ya
// ordenados (sortCourses) porque el orden relativo se respeta dentro de cada
// grupo. Con dir='desc' se invierte también el orden de los grupos.
export function groupCoursesBy(courses, criterio, dir) {
  return groupRowsBy(courses, criterio, dir, courseGroupKey);
}

export function courseShortName(c) {
  return isSet(c.division) ? c.anio + '°' + c.division + '°' : esc(c.nombre);
}

export function shortName(apellido, nombre) {
  const a = String(apellido || '').trim();
  const n = String(nombre || '').trim();
  if (a && n) return a + ', ' + n;
  return a || n;
}

export function filterRows(rows, term, keys) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return rows;
  const fields = keys || [];
  return (rows || []).filter((r) => fields.some((f) => String(r[f] || '').toLowerCase().includes(q)));
}

export function rowActionsHTML(tipo, id, label) {
  return (
    '<td class="row-actions">' +
    '<button class="row-action action-edit" type="button" data-crud="edit" data-tipo="' + esc(tipo) + '" data-id="' + esc(id) + '" aria-label="Editar">' + icon('Pencil', 14) + '</button>' +
    '<button class="row-action action-del" type="button" data-crud="del" data-tipo="' + esc(tipo) + '" data-id="' + esc(id) + '" data-label="' + esc(label) + '" aria-label="Eliminar">' + icon('Trash2', 14) + '</button>' +
    '</td>'
  );
}

export function studentRowsHTML(rows, editable) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="' + (editable ? 5 : 4) + '" class="table-empty">No hay estudiantes para mostrar.</td></tr>';
  }
  return rows
    .map(
      (s) =>
        '<tr>' +
        '<td><div class="table-person"><div class="avatar avatar-blue">' + esc(initials(shortName(s.apellido, s.nombre))) + '</div><strong>' + esc(s.nombre || shortName(s.apellido, s.nombre)) + '</strong></div></td>' +
        '<td>' + esc(s.curso || (s.carrera ? s.carrera : '')) + '</td>' +
        '<td><span class="cell-muted">' + esc(s.dni || '—') + '</span></td>' +
        '<td><span class="cell-muted">' + esc(s.tutor || '—') + '</span></td>' +
        (isSet(s.alerta_salud)
          ? '<td><span class="' + alertaClass(s.alerta_salud) + '">' + esc(alertaText(s.alerta_salud)) + '</span></td>'
          : '') +
        (editable && s.id_alumno ? rowActionsHTML('estudiantes', s.id_alumno, s.nombre) : '') +
        '</tr>'
    )
    .join('');
}

// sectionTitle: título de la sección tabular/listada según el criterio activo.
function sectionTitle(section, filter) {
  const titles = SECTION_TITLES[section] || {};
  return titles[filter] || titles.none || '';
}

// groupRowHTML: fila de encabezado de un grupo dentro de una tabla.
export function groupRowHTML(title, colspan) {
  return (
    '<tr class="group-row">' +
    '<th colspan="' + colspan + '">' + esc(title) +
    '</th></tr>'
  );
}

// studentGroupsHTML: filas de estudiantes agrupadas con su encabezado.
export function studentGroupsHTML(groups, editable) {
  const colspan = editable ? 5 : 4;
  if (!groups || groups.length === 0) return studentRowsHTML([], editable);
  return groups
    .map((g) => groupRowHTML(g.title, colspan) + studentRowsHTML(g.items, editable))
    .join('');
}

// teacherGroupsHTML: tarjetas de docentes agrupadas con su encabezado.
export function teacherGroupsHTML(groups, editable) {
  if (!groups || groups.length === 0) return '<div class="table-empty">No hay docentes para mostrar.</div>';
  return (
    '<div class="course-list-wrap">' +
    groups
      .map(
        (g) =>
          '<div class="course-group">' +
          '<div class="course-group-header">' +
          '<div class="group-icon">' + icon('GraduationCap', 18) + '</div>' +
          '<div><strong>' + esc(g.title) + '</strong></div>' +
          '</div>' +
          '<div class="teacher-grid">' + teacherCardsHTML(g.items, null, editable) + '</div>' +
          '</div>'
      )
      .join('') +
    '</div>'
  );
}

// materiaGroupsHTML: filas de materias agrupadas con su encabezado, igual que
// Estudiantes (el grupo es una fila más de la tabla, no un bloque aparte).
export function materiaGroupsHTML(groups, editable) {
  const colspan = editable ? 3 : 2;
  if (!groups || groups.length === 0) return materiaRowsHTML([], editable);
  return groups
    .map((g) => groupRowHTML(g.title, colspan) + materiaRowsHTML(g.items, editable))
    .join('');
}

export function teacherCardsHTML(rows, extra, editable) {
  if (!rows || rows.length === 0) {
    return '<div class="table-empty">No hay docentes para mostrar.</div>';
  }
  return rows
    .map(
      (t) =>
        '<div class="teacher-card">' +
        '<div class="teacher-top">' +
        '<div class="teacher-avatar avatar-teal">' + esc(initials(t.nombre)) + '</div>' +
        '<span class="status status-active">' + esc(t.cargo || (extra ? extra.cargo : '')) + '</span>' +
        '</div>' +
        '<div class="teacher-body"><strong>' + esc(t.nombre) + '</strong><span class="teacher-subject">' + esc(t.cargo || 'Cargo asignado') + '</span></div>' +
        '<div class="teacher-meta">' +
        '<div class="meta-row">' + icon('Phone', 14) + '<span class="cell-muted">' + esc(t.telefono || t.dni || '—') + '</span></div>' +
        (t.dni ? '<div class="meta-row">' + icon('ClipboardList', 14) + '<span class="cell-muted">DNI ' + esc(t.dni) + '</span></div>' : '') +
        '</div>' +
        (editable && t.id_docente
          ? '<div class="row-actions" style="padding:10px 14px 0; justify-content:flex-end;">' +
            '<button class="row-action action-edit" type="button" data-crud="edit" data-tipo="docentes" data-id="' + esc(t.id_docente) + '" aria-label="Editar">' + icon('Pencil', 14) + '</button>' +
            '<button class="row-action action-del" type="button" data-crud="del" data-tipo="docentes" data-id="' + esc(t.id_docente) + '" data-label="' + esc(t.nombre) + '" aria-label="Eliminar">' + icon('Trash2', 14) + '</button>' +
            '</div>'
          : '<button class="outline-button teacher-action" type="button" disabled>Sin acciones</button>') +
        '</div>'
    )
    .join('');
}

export function courseCardsHTML(courses, editable) {
  if (!courses || courses.length === 0) {
    return '<div class="table-empty">No hay cursos para mostrar.</div>';
  }
  const tones = ['blue', 'teal', 'orange', 'violet'];
  return courses
    .map((c, i) => {
      const tone = tones[i % tones.length];
      return (
        '<div class="course-card">' +
        '<div class="course-top">' +
        '<div class="course-emoji bg-' + tone + '">' + icon('BookOpen', 22) + '</div>' +
        '<div class="course-top-right"><span class="course-level level-' + tone + '">' + esc(c.ciclo || c.turno || '') + '</span>' +
        (editable && c.id_curso
          ? '<button class="row-action action-edit" type="button" data-crud="edit" data-tipo="cursos" data-id="' + esc(c.id_curso) + '" aria-label="Editar curso">' + icon('Pencil', 14) + '</button>'
          : '') +
        '</div>' +
        '</div>' +
        '<div class="course-body"><strong>' + esc(courseShortName(c)) + '</strong>' +
        '<span class="course-teacher">Turno ' + esc(c.turno || '—') + '</span></div>' +
        '<div class="course-meta">' +
        '<div class="meta-row">' + icon('CalendarDays', 14) + '<span>' + esc(c.nombre) + '</span></div>' +
        (c.especialidad
          ? '<div class="meta-row">' + icon('BookMarked', 14) + '<span>' + esc(c.especialidad) + '</span></div>'
          : '') +
        '</div>' +
        '<button class="course-link" data-nomina="' + esc(c.id_curso) + '" data-nombre="' + esc(courseShortName(c)) + '" type="button">Ver nómina ' + icon('ChevronRight', 15) + '</button>' +
        '</div>'
      );
    })
    .join('');
}

// materiaRowsHTML: filas de materias con el mismo diseño de tabla que
// Estudiantes: persona con avatar, celda con el estado del docente y acciones.
export function materiaRowsHTML(rows, editable) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="' + (editable ? 3 : 2) + '" class="table-empty">No hay materias para mostrar.</td></tr>';
  }
  return rows
    .map((m) => {
      const con = Number(m.con_docente) === 1;
      return (
        '<tr>' +
        '<td><div class="table-person"><div class="avatar avatar-violet">' + esc(initials(m.nombre)) + '</div><strong>' + esc(m.nombre) + '</strong></div></td>' +
        '<td><span class="status ' + (con ? 'status-active' : 'status-pending') + '">' +
        (con ? 'Con docente asignado' : 'Sin docente asignado') + '</span></td>' +
        (editable && m.id_materia ? rowActionsHTML('materias', m.id_materia, m.nombre) : '') +
        '</tr>'
      );
    })
    .join('');
}

export function courseSectionCards(group, editable) {
  if (!group || !group.items || group.items.length === 0) return '';
  return group.items
    .map(
      (c) =>
        '<div class="course-section-card">' +
        '<div class="section-card-top"><div class="section-badge">' + esc(courseShortName(c)) + '</div>' +
        '<span class="section-count">' + esc(c.turno || '') + '</span>' +
        (editable && c.id_curso
          ? '<button class="row-action action-edit" type="button" data-crud="edit" data-tipo="cursos" data-id="' + esc(c.id_curso) + '" aria-label="Editar curso">' + icon('Pencil', 14) + '</button>'
          : '') +
        '</div>' +
        '<div class="section-card-body"><strong>' + esc(c.especialidad || c.ciclo || 'Curso') + '</strong>' +
        '<span class="cell-muted">' + icon('Users', 13) + ' ' + esc(c.nombre) + '</span></div>' +
        '<button class="section-link" data-nomina="' + esc(c.id_curso) + '" data-nombre="' + esc(courseShortName(c)) + '" type="button">Ver nómina ' + icon('ArrowUpRight', 14) + '</button>' +
        '</div>'
    )
    .join('');
}

export function courseGroupsHTML(groups, editable) {
  if (!groups || groups.length === 0) {
    return '<div class="table-empty">No hay cursos para mostrar.</div>';
  }
  return groups
    .map(
      (g) =>
        '<div class="course-group">' +
        '<div class="course-group-header">' +
        '<div class="group-icon">' + icon('ClipboardList', 18) + '</div>' +
        '<div><strong>' + esc(g.title) + '</strong></div>' +
        '</div>' +
        '<div class="course-sections-grid">' + courseSectionCards(g, editable) + '</div>' +
        '</div>'
    )
    .join('');
}

export function nominaHTML(curso, alumnos, docentes, editable) {
  const rows = (alumnos || []).length
    ? alumnos
        .map(
          (a) =>
            '<tr>' +
            '<td><div class="table-person"><div class="avatar avatar-blue">' + esc(initials(shortName(a.apellido, a.nombre))) + '</div><strong>' + esc(shortName(a.apellido, a.nombre)) + '</strong></div></td>' +
            '<td><span class="cell-muted">' + esc(a.dni || '—') + '</span></td>' +
            '<td>' + esc(shortName(a.resp_apellido, a.resp_nombre) || '—') + '</td>' +
            '<td><span class="cell-muted">' + esc(a.resp_tel || '—') + '</span></td>' +
            '<td><span class="' + alertaClass(a.alerta_salud) + '">' + esc(alertaText(a.alerta_salud)) + '</span></td>' +
            (editable && a.id_alumno ? rowActionsHTML('estudiantes', a.id_alumno, shortName(a.apellido, a.nombre)) : '') +
            '</tr>'
        )
        .join('')
    : '<tr><td colspan="' + (editable ? 6 : 5) + '" class="table-empty">La nómina está vacía.</td></tr>';

  const profs = (docentes || []).length
    ? docentes
        .map(
          (d) =>
            '<div class="student-row">' +
            '<div class="avatar avatar-teal">' + esc(initials(shortName(d.apellido, d.nombre))) + '</div>' +
            '<div class="student-info"><strong>' + esc(shortName(d.apellido, d.nombre)) + '</strong><span>' + esc(d.materia || '') + (d.cargo_curso ? ' · ' + esc(d.cargo_curso) : '') + ' · ' + esc(d.dia_semana || '') + (d.hora_inicio ? ' ' + esc(String(d.hora_inicio).slice(0, 5)) : '') + '</span></div>' +
            (editable && d.id
              ? '<div class="row-actions">' +
                '<button class="row-action action-del" type="button" data-crud="asig-del" data-id="' + esc(d.id) + '" data-label="' + esc(shortName(d.apellido, d.nombre)) + '" aria-label="Quitar asignación">' + icon('Trash2', 14) + '</button>' +
                '</div>'
              : '') +
            '</div>'
        )
        .join('')
    : '<div class="table-empty">Sin docentes asignados.</div>';

  return (
    '<button class="filter-button" data-back type="button">' + icon('ChevronRight', 15) + ' Volver a cursos</button>' +
    '<div class="data-panel">' +
    '<div class="panel-heading">' +
    '<div><h2>Nómina de ' + esc(curso && curso.nombre ? curso.nombre : (curso || '')) + '</h2><p>' + (alumnos ? alumnos.length : 0) + ' estudiantes</p></div>' +
    '<div class="topbar-actions" style="flex:0;">' +
    (editable ? '<button class="filter-button" data-crud="asignar" data-id="' + esc(isSet(curso.id) ? curso.id : '') + '" type="button">' + icon('UserPlus', 16) + ' Asignar docente</button>' : '') +
    '<button class="filter-button" data-export="nomina" data-id="' + esc(isSet(curso.id) ? curso.id : '') + '" type="button">' + icon('Download', 16) + ' PDF</button>' +
    '<button class="filter-button" data-export="nomina" data-id="' + esc(isSet(curso.id) ? curso.id : '') + '" data-format="excel" type="button">' + icon('Download', 16) + ' Excel</button>' +
    '</div>' +
    '</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>DNI</th><th>Responsable</th><th>Teléfono</th><th>Salud</th>' + (editable ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>' +
    '<div class="panel course-list-wrap">' +
    '<div class="panel-heading"><div><h2>Docentes del curso</h2><p>Asignaciones vigentes</p></div></div>' +
    '<div class="student-list">' + profs + '</div>' +
    '</div>'
  );
}

export function searchRowsHTML(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="table-empty">Sin resultados. Probá con otro nombre, apellido o DNI.</div>';
  }
  return rows
    .map((r) => {
      const rol = r.rol === 'alumno' ? 'Estudiante' : 'Docente';
      return (
        '<div class="student-row">' +
        '<div class="avatar ' + (r.rol === 'alumno' ? 'avatar-blue' : 'avatar-teal') + '">' + esc(initials(r.nombre)) + '</div>' +
        '<div class="student-info"><strong>' + esc(r.nombre) + '</strong><span>' + esc(r.dni || '') + (r.id_curso ? ' · curso ' + esc(r.id_curso) : '') + '</span></div>' +
        '<span class="course-level level-blue">' + esc(rol) + '</span>' +
        '</div>'
      );
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Capa de datos
// ---------------------------------------------------------------------------

async function apiRows(url) {
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Error HTTP ' + res.status);
  const d = await res.json();
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  if (d && typeof d === 'object') return [d];
  return [];
}

function downloadExport(table, id, format) {
  const p = new URLSearchParams({ table: table, format: format || 'pdf' });
  if (isSet(id) && id !== '') p.set('id', id);
  window.location = 'api.php?' + p.toString();
}

// ---------------------------------------------------------------------------
// Render del shell (paridad de markup con app.css)
// ---------------------------------------------------------------------------

function sectionMeta(state, label) {
  const sections = visibleSections(state);
  let m = sections.find((s) => s.label === label);
  if (!m) {
    for (const s of sections) {
      if (s.items) {
        m = s.items.find((it) => it.label === label);
        if (m) break;
      }
    }
  }
  if (!m && label === 'Backups') {
    m = ADMIN_GROUP.items.find((it) => it.label === 'Backups');
  }
  return m || SECTIONS[0];
}

function statCard(iconName, label, value, detail, color) {
  return (
    '<div class="stat-card">' +
    '<div class="stat-icon icon-' + color + '">' + icon(iconName, 21) + '</div>' +
    '<div class="stat-copy">' +
    '<span>' + esc(label) + '</span>' +
    '<strong>' + esc(value) + '</strong>' +
    '<small><b class="trend-' + color + '">' + esc(detail) + '</b></small>' +
    '</div>' +
    '<div class="stat-lines"></div>' +
    '</div>'
  );
}

function navButton(iconName, dataSection, label, active, count) {
  const inner =
    icon(iconName, 19) +
    '<span>' + esc(label) + '</span>' +
    (isSet(count) ? '<span class="nav-count">' + count + '</span>' : '');
  return '<button class="nav-item' + (active ? ' active' : '') + '" data-section="' + esc(dataSection) + '" type="button">' + inner + '</button>';
}

function navChild(c, activeSection) {
  if (c.crud) {
    return '<button class="nav-item" data-crud="' + esc(c.crud) + '" type="button">' + icon(c.icon, 19) + '<span>' + esc(c.label) + '</span></button>';
  }
  return navButton(c.icon, c.label, c.label, activeSection === c.label, null);
}

function navGroupHTML(activeSection, group) {
  const children = group.items.map((c) => navChild(c, activeSection)).join('');
  return '<div class="nav-group"><div class="nav-group-label">' + esc(group.label) + '</div>' + children + '</div>';
}

function navItems(activeSection, counts, sections) {
  const home = navButton('LayoutDashboard', 'Inicio', 'Panel principal', activeSection === 'Inicio', null);
  const items = (sections || SECTIONS)
    .map((s) =>
      s.items
        ? navGroupHTML(activeSection, s)
        : navButton(s.icon, s.label, s.label, activeSection === s.label, isSet(counts[s.label]) ? counts[s.label] : null)
    )
    .join('');
  return home + items;
}

export function buildShellHTML(opts, section, counts) {
  const user = opts.user || {};
  const nombre = user.nombre || 'Administrador';
  const rol = user.rol || '';
  const breadcrumb = section === 'Inicio' ? 'Panel principal' : section;
  const iniciales = initials(nombre);
  const sections = visibleSections(opts);

  return (
    '<div class="app-shell">' +
    '<aside class="sidebar" id="sidebar-sistema">' +
    '<div class="brand">' +
    '<div class="brand-mark">' + icon('ShieldCheck', 22, 2.4) + '</div>' +
    '<div><strong>ESTN°3</strong><span>Gestión académica</span></div>' +
    '<button class="close-sidebar" aria-label="Cerrar menú" type="button">' + icon('X', 20) + '</button>' +
    '</div>' +
    '<div class="sidebar-label">Espacio de trabajo</div>' +
    '<nav class="main-nav" aria-label="Navegación principal">' + navItems(section, counts, sections) + '</nav>' +
    '<div class="sidebar-bottom">' +
    '<div class="help-card">' + icon('DatabaseBackup', 18) + '<div><strong>Último backup</strong><span>' + esc(ultimoBackupText(opts.ultimoBackup)) + '</span></div></div>' +
    '<div class="profile-mini">' +
    '<div class="avatar avatar-navy">' + esc(iniciales) + '</div>' +
    '<div><strong>' + esc(nombre) + '</strong><span>' + esc(rol) + '</span></div>' +
    '</div>' +
    '</div>' +
    '</aside>' +
    '<main class="main-area">' +
    '<header class="topbar">' +
    '<button class="mobile-menu" aria-label="Abrir menú" type="button">' + icon('Menu', 22) + '</button>' +
    '<div class="breadcrumbs"><span>Establecimiento</span>' + icon('ChevronRight', 15) + '<strong data-breadcrumb>' + esc(breadcrumb) + '</strong></div>' +
    '<div class="topbar-actions">' +
    '<button class="icon-button theme-toggle" aria-label="Cambiar tema claro u oscuro" title="Cambiar apariencia" type="button">' + icon(opts.theme === 'dark' ? 'Moon' : 'Sun', 19) + '</button>' +
    '<a class="icon-button" href="/logout" aria-label="Salir de la sesión" title="Salir">' + icon('LogOut', 19) + '</a>' +
    '<div class="top-avatar">' + esc(iniciales) + '</div>' +
    '<div class="top-search">' + icon('Search', 17) + '<input id="global-search" placeholder="Buscar en el sistema" aria-label="Buscar en el sistema" autocomplete="off" /></div>' +
    '</div>' +
    '</header>' +
    '<div class="content-wrap" data-content></div>' +
    '</main>' +
    '</div>'
  );
}

function viewHero(meta, agregarLabel, state, editableTipo) {
  const action = editableTipo
    ? '<button class="primary-button" type="button" data-crud="create" data-tipo="' + esc(editableTipo) + '">' + icon('Plus', 18) + ' ' + esc(agregarLabel) + '</button>'
    : '';
  return (
    '<section class="view-hero">' +
    '<div class="view-hero-icon icon-' + meta.color + '">' + icon(meta.icon, 28) + '</div>' +
    '<div>' +
    '<div class="eyebrow"><span class="eyebrow-dot"></span>Gestión académica</div>' +
    '<h1>' + esc(meta.label) + '</h1>' +
    '<p>' + esc(meta.desc) + '.</p>' +
    '</div>' +
    action +
    '</section>'
  );
}

function toolbarHTML(state, section) {
  const exports = (EXPORT_FOR[section] && hasPerm(state, PERM.EXPORTAR))
    ? '<button class="filter-button" data-export="' + esc(EXPORT_FOR[section]) + '" type="button">' + icon('Download', 16) + ' PDF</button>' +
      '<button class="filter-button" data-export="' + esc(EXPORT_FOR[section]) + '" data-format="excel" type="button">' + icon('Download', 16) + ' Excel</button>'
    : '';
  // Menú de filtro + botón de dirección (en las secciones con criterios); el
  // orden solo se alterna entre ↑ y ↓ (sin criterios de orden).
  let controls = '';
  if (SECTION_FILTERS[section]) {
    const isDesc = activeSortDir(state, section) === 'desc';
    // El botón de orden no lleva 'active': se ve igual en ↑ y ↓.
    controls =
      '<div class="filter-menu">' +
      '<button class="filter-button' + (activeFilter(state, section) !== 'none' ? ' active' : '') + '" data-menu="filter" type="button" aria-haspopup="true" aria-expanded="' + (state.openMenu === 'filter') + '">' +
      icon('Filter', 16) + ' ' + esc(sectionFilterLabel(state, section)) + icon('ChevronDown', 15) + '</button>' +
      (state.openMenu === 'filter' ? filterMenuPanel(state, section) : '') +
      '</div>' +
      '<button class="filter-button" data-dir-toggle type="button" aria-pressed="' + isDesc + '">' +
      icon('ArrowUpDown', 16) + ' ' + courseDirLabel(isDesc) + '</button>';
  }
  return (
    '<div class="view-toolbar">' +
    controls +
    exports +
    '</div>'
  );
}

function menuItemHTML(set, val, label, active) {
  return (
    '<button class="filter-menu-item' + (active ? ' active' : '') + '" data-set="' + set + '" data-val="' + esc(val) + '" type="button" role="menuitem">' +
    '<span class="filter-menu-mark">' + (active ? '✓' : '') + '</span>' +
    esc(label) +
    '</button>'
  );
}

function filterMenuPanel(state, section) {
  const list = SECTION_FILTERS[section] || SECTION_FILTERS.Cursos;
  const active = activeFilter(state, section);
  return (
    '<div class="filter-menu-panel" role="menu">' +
    list.map((f) => menuItemHTML('filter', f.v, f.l, active === f.v)).join('') +
    '</div>'
  );
}

// ---------------------------------------------------------------------------
// Refresco parcial de la sección activa: actualiza solo el cuerpo y los
// rótulos del toolbar en el lugar, para no reconstruir toda la sección ni
// re-disparar su animación de entrada (rise .35s).
// ---------------------------------------------------------------------------

// courseDirLabel: rótulo del botón de orden según la dirección activa.
export function courseDirLabel(isDesc) {
  return 'Ordenar: ' + (isDesc ? 'Descendente ↓' : 'Ascendente ↑');
}

// sectionFilterLabel: rótulo del botón de filtro según la sección y criterio
// activos.
export function sectionFilterLabel(state, section) {
  const list = SECTION_FILTERS[section] || SECTION_FILTERS.Cursos;
  const active = activeFilter(state, section);
  const filter = list.find((f) => f.v === active) || list[0];
  return 'Filtrar por: ' + filter.l;
}

// Compatibilidad con el nombre anterior (sección Cursos).
export function courseFilterLabel(state) {
  return sectionFilterLabel(state, 'Cursos');
}

// sectionDom: nodos del toolbar y del cuerpo de la sección activa. Devuelve
// null si no hay vista parcial (sección sin menú, drill de nómina o carga).
function sectionDom(state) {
  if (state.drill) return null;
  if (!SECTION_FILTERS[state.section]) return null;
  const content = state.root.querySelector('[data-content]');
  if (!content) return null;
  const body = content.querySelector('[data-view-body]');
  const dirBtn = content.querySelector('[data-dir-toggle]');
  const filterBtn = content.querySelector('[data-menu="filter"]');
  if (!body || !dirBtn || !filterBtn) return null;
  return { body: body, dirBtn: dirBtn, filterBtn: filterBtn };
}

// syncSectionToolbar: escribe rótulos y atributos del toolbar sin tocar el resto.
function syncSectionToolbar(state, dom) {
  const d = dom || sectionDom(state);
  if (!d) return false;
  const isDesc = activeSortDir(state) === 'desc';
  d.dirBtn.innerHTML = icon('ArrowUpDown', 16) + ' ' + courseDirLabel(isDesc);
  d.dirBtn.setAttribute('aria-pressed', String(isDesc));
  d.filterBtn.innerHTML = icon('Filter', 16) + ' ' + esc(sectionFilterLabel(state, state.section)) + icon('ChevronDown', 15);
  d.filterBtn.classList.toggle('active', activeFilter(state) !== 'none');
  d.filterBtn.setAttribute('aria-expanded', String(state.openMenu === 'filter'));
  return true;
}

// refreshSection: repinta solo el cuerpo (el encabezado va dentro) + rótulos.
// Devuelve false si hace falta un render completo de la sección.
function refreshSection(state) {
  const dom = sectionDom(state);
  const rows = state.cache && state.cache[state.section];
  if (!dom || !rows) return false;
  dom.body.innerHTML = bodyFor(state, state.section, rows, '');
  return syncSectionToolbar(state, dom);
}

// setSectionMenu: abre o cierra el menú de filtro insertando/quitando solo el
// panel, sin re-render de la sección.
function setSectionMenu(state, open) {
  const dom = sectionDom(state);
  if (!dom) return false;
  const wrap = dom.filterBtn.parentNode;
  if (!wrap || !wrap.classList.contains('filter-menu')) return false;
  const panel = wrap.querySelector('.filter-menu-panel');
  if (open && !panel) {
    wrap.insertAdjacentHTML('beforeend', filterMenuPanel(state, state.section));
  } else if (!open && panel) {
    panel.remove();
  }
  state.openMenu = open ? 'filter' : null;
  syncSectionToolbar(state, dom);
  return true;
}

// ---------------------------------------------------------------------------
// Render de contenido
// ---------------------------------------------------------------------------

export function usuarioRowsHTML(rows) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="4" class="table-empty">No hay usuarios registrados.</td></tr>';
  }
  return rows
    .map(
      (u) =>
        '<tr>' +
        '<td><div class="table-person"><div class="crud-user-avatar">' + esc(initials(u.nombre_completo || u.username)) + '</div>' +
        '<div><strong>' + esc(u.username) + '</strong><span class="cell-muted">' + esc(u.nombre_completo || '') + '</span></div></div></td>' +
        '<td><span class="crud-role-badge' + (u.rol === 'admin' ? ' admin' : '') + '">' + esc(u.rol === 'admin' ? 'Administrador' : 'Lectura') + '</span></td>' +
        '<td><span class="' + (Number(u.activo) === 1 ? 'status status-active' : 'status status-pending') + '">' + (Number(u.activo) === 1 ? 'Activo' : 'Inactivo') + '</span></td>' +
        '<td class="row-actions">' +
        '<button class="row-action action-edit" type="button" data-crud="usuario" data-mode="edit" data-id="' + esc(u.id_usuario) + '" aria-label="Editar usuario">' + icon('Pencil', 14) + '</button>' +
        '<button class="row-action action-del" type="button" data-crud="usuario-del" data-id="' + esc(u.id_usuario) + '" data-label="' + esc(u.username) + '" aria-label="Eliminar usuario">' + icon('Trash2', 14) + '</button>' +
        '</td>' +
        '</tr>'
    )
    .join('');
}

function bodyFor(state, section, rows, query) {
  const q = String(query || '').trim().toLowerCase();
  const editable = hasPerm(state, SECTION_WRITE[section]);
  if (section === 'Estudiantes') {
    const dir = activeSortDir(state, section);
    const filter = activeFilter(state, section);
    const filtered = filterRows(rows, q, ['nombre', 'curso', 'dni', 'tutor', 'turno', 'ciclo', 'genero']);
    const ordered = sortRowsByName(filtered, dir);
    const slice = pageSlice(ordered, activeLimit(state, section), activePage(state, section));
    if (state.pages) state.pages[section] = slice.page;
    const body = filter === 'none'
      ? studentRowsHTML(slice.rows, editable)
      : studentGroupsHTML(groupRowsBy(slice.rows, filter, dir, (crit, r) => groupKeyFor('Estudiantes', crit, r)), editable);
    return (
      '<div class="data-panel">' +
      '<div class="panel-heading"><div><h2>' + esc(sectionTitle('Estudiantes', filter)) + '</h2></div>' +
      '<button class="text-button" type="button" disabled>Actualizado desde la base</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Curso</th><th>DNI</th><th>Tutor</th>' + (editable ? '<th></th>' : '') + '</tr></thead><tbody>' +
      body + '</tbody></table></div>' +
      listFooterHTML(section, slice) +
      '</div>'
    );
  }
  if (section === 'Docentes') {
    const dir = activeSortDir(state, section);
    const filter = activeFilter(state, section);
    const filtered = filterRows(rows, q, ['nombre', 'dni', 'cargo', 'anio_ingreso']);
    const ordered = sortRowsByName(filtered, dir);
    const slice = pageSlice(ordered, activeLimit(state, section), activePage(state, section));
    if (state.pages) state.pages[section] = slice.page;
    const body = filter === 'none'
      ? '<div class="teacher-grid">' + teacherCardsHTML(slice.rows, null, editable) + '</div>'
      : teacherGroupsHTML(groupRowsBy(slice.rows, filter, dir, (crit, r) => groupKeyFor('Docentes', crit, r)), editable);
    return (
      '<div class="card-grid-heading"><div><h2>' + esc(sectionTitle('Docentes', filter)) + '</h2></div></div>' +
      body +
      listFooterHTML(section, slice)
    );
  }
  if (section === 'Cursos') {
    const dir = activeSortDir(state, section);
    const filter = activeFilter(state, section);
    const filtered = filterRows(rows, q, ['nombre', 'turno', 'ciclo', 'especialidad']);
    const ordered = sortCourses(filtered, dir);
    const slice = pageSlice(ordered, activeLimit(state, section), activePage(state, section));
    if (state.pages) state.pages[section] = slice.page;
    const head = COURSE_HEADINGS[filter] || COURSE_HEADINGS.none;
    const heading = '<div class="card-grid-heading"><div><h2>' + esc(head[0]) + '</h2><p>' + esc(head[1]) + '</p></div></div>';
    const body = filter === 'none'
      ? '<div class="course-grid">' + courseCardsHTML(slice.rows, editable) + '</div>'
      : '<div class="course-list-wrap">' + courseGroupsHTML(groupCoursesBy(slice.rows, filter, dir), editable) + '</div>';
    return (
      heading +
      body +
      listFooterHTML(section, slice)
    );
  }
  if (section === 'Materias') {
    const dir = activeSortDir(state, section);
    const filter = activeFilter(state, section);
    const filtered = filterRows(rows, q, ['nombre']);
    const ordered = sortRowsByName(filtered, dir);
    const slice = pageSlice(ordered, activeLimit(state, section), activePage(state, section));
    if (state.pages) state.pages[section] = slice.page;
    const body = filter === 'none'
      ? materiaRowsHTML(slice.rows, editable)
      : materiaGroupsHTML(groupRowsBy(slice.rows, filter, dir, (crit, r) => groupKeyFor('Materias', crit, r)), editable);
    return (
      '<div class="data-panel">' +
      '<div class="panel-heading"><div><h2>' + esc(sectionTitle('Materias', filter)) + '</h2></div>' +
      '<button class="text-button" type="button" disabled>Actualizado desde la base</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Materia</th><th>Docente</th>' + (editable ? '<th></th>' : '') + '</tr></thead><tbody>' +
      body + '</tbody></table></div>' +
      listFooterHTML(section, slice) +
      '</div>'
    );
  }
  if (section === 'Usuarios') {
    const filtered = filterRows(rows, q, ['username', 'nombre_completo', 'rol']);
    return (
      '<div class="data-panel">' +
      '<div class="panel-heading"><div><h2>Cuentas del sistema</h2><p>' + filtered.length + ' usuarios</p></div>' +
      '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>' +
      usuarioRowsHTML(filtered) + '</tbody></table></div>' +
      '</div>'
    );
  }
  return '';
}

function dashboardHTML(state) {
  const counts = state.counts || {};
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const quick = visibleSections(state).map((s) =>
    '<button class="quick-card" data-section="' + esc(s.items ? 'Auditoría' : s.label) + '" type="button">' +
    '<div class="quick-icon icon-' + s.color + '">' + icon(s.icon, 24) + '</div>' +
    '<div><strong>' + esc(s.label) + '</strong><span>' + esc(s.desc) + '</span></div>' +
    '<span class="quick-arrow">' + icon('ArrowUpRight', 18) + '</span>' +
    '</button>'
  ).join('');

  const activity = [
    ['Users', 'Estudiantes registrados', counts.estudiantes + ' alumnos activos', 'blue'],
    ['GraduationCap', 'Docentes', counts.docentes + ' en plantel', 'teal'],
    ['BookOpen', 'Cursos', counts.cursos + ' divisiones', 'orange'],
    ['BookMarked', 'Materias', counts.materias + ' en el catálogo', 'violet'],
  ].map((a) =>
    '<div class="activity-row">' +
    '<div class="activity-icon icon-' + a[3] + '">' + icon(a[0], 17) + '</div>' +
    '<div><strong>' + esc(a[1]) + '</strong><span>Base de datos actualizada</span></div>' +
    '<time>' + esc(a[2]) + '</time>' +
    '</div>'
  ).join('');

  const ultimos = (state.cache.Estudiantes || []).slice(0, 5).map((s) =>
    '<div class="student-row">' +
    '<div class="avatar avatar-blue">' + esc(initials(s.nombre)) + '</div>' +
    '<div class="student-info"><strong>' + esc(s.nombre) + '</strong><span>' + esc(s.curso || '') + '</span></div>' +
    '<span class="status status-active">Activo</span>' +
    '</div>'
  ).join('');

  return (
    '<section class="welcome-row">' +
    '<div>' +
    '<div class="eyebrow"><span class="eyebrow-dot"></span>' + esc(hoy.charAt(0).toUpperCase() + hoy.slice(1)) + '</div>' +
    '<h1>Hola, ' + esc(state.user.nombre || 'Administrador') + ' <span>•</span></h1>' +
    '<p>Este es el resumen de tu establecimiento para hoy.</p>' +
    '</div>' +
    (hasPerm(state, PERM.MOD.estudiantes)
      ? '<button class="primary-button" type="button" data-crud="create" data-tipo="estudiantes">' + icon('Plus', 18) + ' Nuevo registro</button>'
      : '') +
    '</section>' +
    '<section class="stats-grid">' +
    statCard('Users', 'Estudiantes', counts.estudiantes, 'registrados activos', 'blue') +
    statCard('GraduationCap', 'Docentes', counts.docentes, 'en plantel', 'teal') +
    statCard('BookOpen', 'Cursos', counts.cursos, 'divisiones', 'orange') +
    statCard('BookMarked', 'Materias', counts.materias, 'en catálogo', 'violet') +
    '</section>' +
    '<section class="quick-section">' +
    '<div class="section-heading"><div><h2>Accesos rápidos</h2><p>Todo lo que necesitas, a un solo clic.</p></div>' +
    '<span class="heading-spark">' + icon('Sparkles', 22) + '</span></div>' +
    '<div class="quick-grid">' + quick + '</div>' +
    '</section>' +
    '<section class="dashboard-columns">' +
    '<div class="panel activity-panel">' +
    '<div class="panel-heading"><div><h2>Resumen</h2><p>Totales de la base</p></div></div>' +
    '<div class="activity-list">' + activity + '</div>' +
    '</div>' +
    '<div class="panel students-panel">' +
    '<div class="panel-heading"><div><h2>Estudiantes</h2><p>Primeros registros</p></div>' +
    '<button class="circle-button" data-section="Estudiantes" aria-label="Ver estudiantes" type="button">' + icon('ArrowUpRight', 17) + '</button></div>' +
    '<div class="student-list">' + ultimos + '</div>' +
    '<button class="outline-button" data-section="Estudiantes" type="button">Ver todos los estudiantes ' + icon('ArrowUpRight', 15) + '</button>' +
    '</div>' +
    '</section>'
  );
}

function resultsHTML(state) {
  const rows = state.results || [];
  return (
    '<section class="section-view">' +
    '<div class="view-hero">' +
    '<div class="view-hero-icon icon-blue">' + icon('Search', 28) + '</div>' +
    '<div>' +
    '<div class="eyebrow"><span class="eyebrow-dot"></span>Búsqueda global</div>' +
    '<h1>Resultados de búsqueda</h1>' +
    '<p>' + rows.length + ' coincidencia(s) para "' + esc(state.searchQuery || '') + '".</p>' +
    '</div>' +
    '</div>' +
    '<div class="data-panel">' +
    '<div class="panel-heading"><div><h2>Coincidencias</h2><p>Estudiantes y docentes</p></div></div>' +
    '<div class="student-list">' + searchRowsHTML(rows) + '</div>' +
    '</div>' +
    '</section>'
  );
}

// ---------------------------------------------------------------------------
// Estado e interacción
// ---------------------------------------------------------------------------

function loadingHTML() {
  return '<div class="panel" style="padding:48px 24px; text-align:center; color:#8a94a6;">Cargando…</div>';
}

function errorHTML(msg) {
  return '<div class="panel" style="padding:48px 24px; text-align:center; color:#e5484d;">No se pudo cargar: ' + esc(msg) + '</div>';
}

function setBreadcrumb(state, text) {
  const el = state.root.querySelector('[data-breadcrumb]');
  if (el) el.textContent = text;
}

function updateNavActive(state, section) {
  state.root.querySelectorAll('.nav-item[data-section]').forEach((b) => {
    const isActive = b.getAttribute('data-section') === section;
    b.classList.toggle('active', isActive);
  });
}

function showSection(state, section) {
  state.section = section;
  state.drill = null;
  state.results = null;
  state.openMenu = null;
  if (state.pages) state.pages[section] = 1;
  updateNavActive(state, section);
  setBreadcrumb(state, section === 'Inicio' ? 'Panel principal' : section);
  renderCurrent(state);
}

async function renderCurrent(state) {
  const content = state.root.querySelector('[data-content]');
  if (!content) return;

  if (state.results) {
    content.innerHTML = resultsHTML(state);
    return;
  }

  if (state.section === 'Inicio') {
    content.innerHTML = dashboardHTML(state);
    return;
  }

  const meta = sectionMeta(state, state.section);

  if (SECTION_READ[state.section] && !hasPerm(state, SECTION_READ[state.section])) {
    const contentG = state.root.querySelector('[data-content]');
    if (contentG) contentG.innerHTML = errorHTML('No tiene permisos para ver esta sección');
    return;
  }

  if (state.section === 'Auditoría') {
    content.innerHTML = '<section class="section-view">' + viewHero(meta, '', state, '') + loadingHTML() + '</section>';
    try {
      const body = await state.crud.auditorsBody(1, '');
      content.innerHTML = '<section class="section-view">' + viewHero(meta, '', state, '') + body + '</section>';
    } catch (err) {
      content.innerHTML = '<section class="section-view">' + errorHTML(err && err.message ? err.message : 'error') + '</section>';
    }
    return;
  }

  const editableTipo = hasPerm(state, SECTION_WRITE[state.section]) && state.section === 'Usuarios'
    ? 'usuarios'
    : hasPerm(state, SECTION_WRITE[state.section]) && state.section === 'Estudiantes' ? 'estudiantes'
      : hasPerm(state, SECTION_WRITE[state.section]) && state.section === 'Docentes' ? 'docentes'
        : hasPerm(state, SECTION_WRITE[state.section]) && state.section === 'Cursos' ? 'cursos'
          : hasPerm(state, SECTION_WRITE[state.section]) && state.section === 'Materias' ? 'materias'
            : '';
  const agLabel = state.section === 'Usuarios' ? 'Nuevo usuario' : 'Agregar ' + (state.section === 'Estudiantes' ? 'estudiante' : state.section === 'Docentes' ? 'docente' : state.section.toLowerCase());
  const xm = '<section class="section-view">' + viewHero(meta, agLabel, state, editableTipo) +
    toolbarHTML(state, state.section) + '<div data-view-body>' + loadingHTML() + '</div></section>';
  content.innerHTML = xm;

  try {
    if (state.section === 'Usuarios') {
      if (!state.cache.Usuarios) state.cache.Usuarios = await apiRows('api.php?table=usuarios');
      const body = content.querySelector('[data-view-body]');
      if (body) body.innerHTML = bodyFor(state, 'Usuarios', state.cache.Usuarios, '');
      return;
    }
    const table = TABLE_FOR[state.section];
    if (!state.cache[state.section]) {
      const rows = await apiRows('api.php?table=' + encodeURIComponent(table) + '&limit=100');
      state.cache[state.section] = rows;
    }
    state.drill = null;
    const body = content.querySelector('[data-view-body]');
    if (body) body.innerHTML = bodyFor(state, state.section, state.cache[state.section], '');
  } catch (err) {
    const body = content.querySelector('[data-view-body]');
    if (body) body.innerHTML = errorHTML(err && err.message ? err.message : 'error');
  }
}

async function openNomina(state, id, nombre) {
  state.section = 'Cursos';
  state.drill = { id: id, nombre: nombre };
  state.results = null;
  state.openMenu = null;
  setBreadcrumb(state, 'Nómina · ' + nombre);
  const content = state.root.querySelector('[data-content]');
  content.innerHTML = '<div class="panel" style="padding:48px 24px; text-align:center; color:#8a94a6;">Cargando nómina…</div>';
  try {
    const [alumnos, docentes] = await Promise.all([
      apiRows('api.php?table=nomina&id=' + encodeURIComponent(id)),
      apiRows('api.php?table=docentes_por_curso&id=' + encodeURIComponent(id)),
    ]);
    const curso = { id: id, nombre: nombre };
    content.innerHTML = '<div data-view-body>' + nominaHTML(curso, alumnos, docentes, hasPerm(state, PERM.MOD.estudiantes)) + '</div>';
  } catch (err) {
    content.innerHTML = errorHTML(err && err.message ? err.message : 'error');
  }
}

async function doSearch(state, term) {
  if (!hasPerm(state, PERM.VER.estudiantes) && !hasPerm(state, PERM.VER.docentes)) {
    return;
  }
  const q = String(term || '').trim();
  if (!q) return;
  state.section = 'search';
  state.results = null;
  state.drill = null;
  state.searchQuery = q;
  updateNavActive(state, '');
  setBreadcrumb(state, 'Búsqueda');
  const content = state.root.querySelector('[data-content]');
  content.innerHTML = loadingHTML();
  try {
    state.results = await apiRows('api.php?table=search&search=' + encodeURIComponent(q));
  } catch (err) {
    state.results = [];
  }
  renderCurrent(state);
}

function applyLocalFilter(state) {
  const content = state.root.querySelector('[data-content]');
  const input = content && content.querySelector('.local-search input');
  const term = input ? input.value : '';
  const body = state.root.querySelector('[data-view-body]');
  const rows = (state.cache && state.cache[state.section]) || [];
  // La búsqueda rehace el conjunto: vuelve a la primera página.
  if (state.pages) state.pages[state.section] = 1;
  if (body && state.section && (TABLE_FOR[state.section] || state.section === 'Usuarios')) {
    body.innerHTML = bodyFor(state, state.section, rows, term);
  }
}

function openSidebar(state) {
  const aside = state.root.querySelector('#sidebar-sistema');
  if (aside && !aside.classList.contains('sidebar-open')) aside.classList.add('sidebar-open');
  if (!state.root.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('button');
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-label', 'Cerrar menú');
    overlay.setAttribute('type', 'button');
    state.root.insertBefore(overlay, state.root.querySelector('.app-shell'));
  }
}

function closeSidebar(state) {
  const aside = state.root.querySelector('#sidebar-sistema');
  if (aside) aside.classList.remove('sidebar-open');
  const overlay = state.root.querySelector('.sidebar-overlay');
  if (overlay) overlay.remove();
}

function wireEvents(state) {
  state.root.addEventListener('click', (e) => {
    if (state.crud && state.crud.handleClick(e)) {
      return;
    }
    const nav = e.target.closest('.nav-item[data-section]');
    if (nav) {
      showSection(state, nav.getAttribute('data-section'));
      return;
    }
    const qc = e.target.closest('.quick-card[data-section]');
    if (qc) {
      showSection(state, qc.getAttribute('data-section'));
      return;
    }
    // Cerrar el menú de filtro si se hace clic fuera de él (sin re-render).
    if (state.openMenu && !e.target.closest('.filter-menu') && !setSectionMenu(state, false)) {
      state.openMenu = null;
      renderCurrent(state);
    }
    // Orden: solo alterna la dirección (asc ↔ desc), sin criterios.
    const dirToggle = e.target.closest('[data-dir-toggle]');
    if (dirToggle) {
      const sortSection = state.section;
      state.sortDirs[sortSection] = activeSortDir(state, sortSection) === 'desc' ? 'asc' : 'desc';
      storeSortDir(sortSection, state.sortDirs[sortSection]);
      // El orden cambia el conjunto: vuelve a la primera página.
      if (state.pages) state.pages[sortSection] = 1;
      if (!refreshSection(state)) renderCurrent(state);
      return;
    }
    const menuBtn = e.target.closest('[data-menu]');
    if (menuBtn) {
      const which = menuBtn.getAttribute('data-menu');
      const open = state.openMenu !== which;
      if (!setSectionMenu(state, open)) {
        state.openMenu = open ? which : null;
        renderCurrent(state);
      }
      return;
    }
    const set = e.target.closest('[data-set]');
    if (set) {
      const val = set.getAttribute('data-val');
      const filterSection = state.section;
      if (set.getAttribute('data-set') === 'filter' && isSectionFilter(filterSection, val)) {
        state.filters[filterSection] = val;
        storeFilter(filterSection, val);
        // El filtro rehace el conjunto: vuelve a la primera página.
        if (state.pages) state.pages[filterSection] = 1;
      }
      setSectionMenu(state, false);
      if (!refreshSection(state)) renderCurrent(state);
      return;
    }
    // Paginación del pie: ‹ › cambian de página sin re-render de la sección.
    const pageBtn = e.target.closest('[data-page-prev], [data-page-next]');
    if (pageBtn) {
      const pageSection = state.section;
      const current = activePage(state, pageSection);
      if (state.pages) {
        state.pages[pageSection] = pageBtn.hasAttribute('data-page-prev') ? current - 1 : current + 1;
      }
      if (!refreshSection(state)) renderCurrent(state);
      return;
    }
    const tt = e.target.closest('.theme-toggle');
    if (tt) {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = next;
      const doc = document.documentElement;
      doc.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('mozart-theme', next);
      } catch (err) { /* sin almacenamiento */ }
      tt.innerHTML = icon(next === 'dark' ? 'Moon' : 'Sun', 19);
      return;
    }
    const circle = e.target.closest('.circle-button[data-section], .outline-button[data-section]');
    if (circle) {
      showSection(state, circle.getAttribute('data-section'));
      return;
    }
    const nomina = e.target.closest('[data-nomina]');
    if (nomina) {
      openNomina(state, nomina.getAttribute('data-nomina'), nomina.getAttribute('data-nombre') || 'Curso');
      return;
    }
    if (e.target.closest('[data-back]')) {
      showSection(state, 'Cursos');
      return;
    }
    const exp = e.target.closest('[data-export]');
    if (exp) {
      downloadExport(exp.getAttribute('data-export'), exp.getAttribute('data-id'), exp.getAttribute('data-format'));
      return;
    }
    if (e.target.closest('.mobile-menu')) {
      openSidebar(state);
      return;
    }
    if (e.target.closest('.close-sidebar') || e.target.closest('.sidebar-overlay')) {
      closeSidebar(state);
      return;
    }
  });

  state.root.addEventListener('input', (e) => {
    const local = e.target.closest('.local-search input');
    if (local && state.section && (TABLE_FOR[state.section] || state.section === 'Usuarios')) {
      applyLocalFilter(state);
    }
    if (state.crud && state.crud.handleInput) {
      state.crud.handleInput(e);
    }
  });

  // Selector de límite de entradas del pie (15/30/50/100): rehace el cuerpo
  // de la sección sin re-render de la vista.
  state.root.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-limit-select]');
    if (!sel) return;
    const section = state.section;
    if (state.limits) state.limits[section] = normalizePageSize(sel.value);
    storeLimit(section, sel.value);
    if (state.pages) state.pages[section] = 1;
    if (!refreshSection(state)) renderCurrent(state);
  });

  state.root.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-crud-form]');
    if (form && state.crud) {
      e.preventDefault();
      state.crud.handleSubmit(form);
    }
  });

  state.root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('#global-search')) {
      doSearch(state, e.target.value);
    }
  });
}

async function loadAll(state) {
  const want = {
    Estudiantes: hasPerm(state, SECTION_READ.Estudiantes),
    Docentes: hasPerm(state, SECTION_READ.Docentes),
    Cursos: hasPerm(state, SECTION_READ.Cursos),
    Materias: hasPerm(state, SECTION_READ.Materias),
  };
  const tutors = {};
  const jobs = [];
  ['Estudiantes', 'Docentes', 'Cursos', 'Materias'].forEach((sec) => {
    if (!want[sec]) return;
    const table = TABLE_FOR[sec];
    jobs.push(
      apiRows('api.php?table=' + encodeURIComponent(table) + '&limit=100').then((rows) => {
        tutors[sec] = rows;
      })
    );
  });
  await Promise.all(jobs);

  const cache = {
    Estudiantes: tutors.Estudiantes || [],
    Docentes: tutors.Docentes || [],
    Cursos: tutors.Cursos || [],
    Materias: tutors.Materias || [],
  };
  for (const sec of ['Estudiantes', 'Docentes', 'Cursos', 'Materias']) {
    if (tutors[sec] === undefined) {
      delete cache[sec];
    }
  }
  state.cache = cache;
  return {
    Estudiantes: tutors.Estudiantes === undefined ? undefined : tutors.Estudiantes.length,
    Docentes: tutors.Docentes === undefined ? undefined : tutors.Docentes.length,
    Cursos: tutors.Cursos === undefined ? undefined : tutors.Cursos.length,
    Materias: tutors.Materias === undefined ? undefined : tutors.Materias.length,
  };
}

function updateNavCounts(state, navCounts) {
  state.root.querySelectorAll('.nav-item[data-section]').forEach((b) => {
    const sec = b.getAttribute('data-section');
    let n = b.querySelector('.nav-count');
    const val = isSet(navCounts[sec]) ? navCounts[sec] : null;
    if (isSet(val)) {
      if (!n) {
        n = document.createElement('span');
        n.className = 'nav-count';
        b.appendChild(n);
      }
      n.textContent = val;
    } else if (n) {
      n.remove();
    }
  });
}

export async function refreshData(state, section) {
  const navCounts = await loadAll(state);
  updateNavCounts(state, navCounts);
  state.cache.Usuarios = null;
  if (section === 'Cursos' && state.drill) {
    await openNomina(state, state.drill.id, state.drill.nombre);
  } else {
    await renderCurrent(state);
  }
}

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

export async function initMain(root, opts) {
  const state = {
    root: root,
    user: (opts && opts.user) || { nombre: 'Administrador', rol: '' },
    csrf: (opts && opts.csrf) || '',
    esAdmin: !!(opts && opts.esAdmin),
    perms: (opts && Array.isArray(opts.permisos)) ? opts.permisos : [],
    ultimoBackup: (opts && opts.ultimoBackup) || '',
    theme: getStoredTheme(),
    filters: getStoredFilters(),
    sortDirs: getStoredSortDirs(),
    limits: getStoredLimits(),
    pages: {},
    openMenu: null,
    section: 'Inicio',
    drill: null,
    results: null,
    searchQuery: '',
    cache: {},
    counts: {},
  };
  if (!root) return state;
  state.crud = createCrud(state);
  state.crudRefresh = (section) => refreshData(state, section);
  state.counts = { estudiantes: '—', docentes: '—', cursos: '—', materias: '—' };
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  root.innerHTML = buildShellHTML(state, 'Inicio', {});
  wireEvents(state);

  const content = root.querySelector('[data-content]');
  if (content) content.innerHTML = loadingHTML();

  try {
    const navCounts = await loadAll(state);
    state.counts = {
      estudiantes: navCounts.Estudiantes === undefined ? '—' : navCounts.Estudiantes,
      docentes: navCounts.Docentes === undefined ? '—' : navCounts.Docentes,
      cursos: navCounts.Cursos === undefined ? '—' : navCounts.Cursos,
      materias: navCounts.Materias === undefined ? '—' : navCounts.Materias,
    };
    const shell = root.querySelector('.app-shell');
    if (shell) shell.outerHTML = buildShellHTML(state, 'Inicio', navCounts);
    renderCurrent(state);
  } catch (err) {
    const content2 = root.querySelector('[data-content]');
    if (content2) content2.innerHTML = errorHTML(err && err.message ? err.message : 'error al cargar datos');
  }

  return state;
}

export { showSection, downloadExport };

if (typeof window !== 'undefined') {
  window.initMain = initMain;
}