/**
 * sistema_mejora.js
 * Interfaz mejorada (diseño de mejoras.css) conectada a los datos REALES de la
 * API (/api.php). Reemplaza el diseño del sistema en / y /sistema.
 *
 * Incluye alta/edición/eliminación integradas (rol admin) vía crud_mejora.js.
 *
 * Uso:
 *   import { initSistemaMejora } from '/js/sistema_mejora.js';
 *   initSistemaMejora(document.getElementById('app-sistema'), opts);
 */

import { icon, esc } from './Interfaz_mejora.js';
import { createCrud } from './crud_mejora.js';

// ---------------------------------------------------------------------------
// Configuración de secciones
// ---------------------------------------------------------------------------

export const SECTIONS = [
  { label: 'Estudiantes', icon: 'Users', color: 'blue', desc: 'Gestiona matrículas y perfiles' },
  { label: 'Docentes', icon: 'GraduationCap', color: 'teal', desc: 'Administra el equipo académico' },
  { label: 'Cursos', icon: 'BookOpen', color: 'orange', desc: 'Organiza la oferta educativa' },
  { label: 'Materias', icon: 'BookMarked', color: 'violet', desc: 'Catálogo de materias del ciclo lectivo' },
  { label: 'Listado por Cursos', icon: 'ClipboardList', color: 'blue', desc: 'Consulta nóminas por curso y división' },
];

const TABLE_FOR = {
  Estudiantes: 'estudiantes',
  Docentes: 'docentes',
  Cursos: 'lista_cursos',
  Materias: 'materias',
  'Listado por Cursos': 'lista_cursos',
};

const EXPORT_FOR = {
  Estudiantes: 'estudiantes',
  Docentes: 'docentes',
  Cursos: 'cursos',
  Materias: 'materias',
  'Listado por Cursos': 'cursos',
};

const ADMIN_SECTIONS = [
  { label: 'Usuarios', icon: 'ShieldCheck', color: 'violet', desc: 'Administra las cuentas del sistema' },
  { label: 'Auditoría', icon: 'ScrollText', color: 'orange', desc: 'Traza de operaciones sobre la base' },
];

export function visibleSections(state) {
  const base = SECTIONS.slice();
  if (state && state.esAdmin) base.push(...ADMIN_SECTIONS);
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

export function groupCoursesByYear(courses) {
  const map = {};
  (courses || []).forEach((c) => {
    const anio = Number(c.anio);
    if (!map[anio]) map[anio] = [];
    map[anio].push(c);
  });
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((anio) => ({
      anio,
      title: anio + '° Año',
      items: map[anio].slice().sort((a, b) => (Number(a.division) || 0) - (Number(b.division) || 0)),
    }));
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
        '</div>' +
        '<button class="course-link" data-nomina="' + esc(c.id_curso) + '" data-nombre="' + esc(courseShortName(c)) + '" type="button">Ver nómina ' + icon('ChevronRight', 15) + '</button>' +
        '</div>'
      );
    })
    .join('');
}

export function materiaRowsHTML(rows, editable) {
  if (!rows || rows.length === 0) {
    return '<div class="table-empty">No hay materias para mostrar.</div>';
  }
  return rows
    .map(
      (m, i) =>
        '<div class="student-row">' +
        '<div class="avatar avatar-violet">' + esc((String(m.nombre || 'M')[0]).toUpperCase()) + '</div>' +
        '<div class="student-info"><strong>' + esc(m.nombre) + '</strong><span>Materia del ciclo lectivo</span></div>' +
        '<span class="course-level level-violet">' + (i + 1) + '</span>' +
        (editable && m.id_materia
          ? '<div class="row-actions">' +
            '<button class="row-action action-edit" type="button" data-crud="edit" data-tipo="materias" data-id="' + esc(m.id_materia) + '" aria-label="Editar">' + icon('Pencil', 14) + '</button>' +
            '<button class="row-action action-del" type="button" data-crud="del" data-tipo="materias" data-id="' + esc(m.id_materia) + '" data-label="' + esc(m.nombre) + '" aria-label="Eliminar">' + icon('Trash2', 14) + '</button>' +
            '</div>'
          : '') +
        '</div>'
    )
    .join('');
}

export function courseSectionCards(group) {
  if (!group || !group.items || group.items.length === 0) return '';
  return group.items
    .map(
      (c) =>
        '<div class="course-section-card">' +
        '<div class="section-card-top"><div class="section-badge">' + esc(courseShortName(c)) + '</div>' +
        '<span class="section-count">' + esc(c.turno || '') + '</span></div>' +
        '<div class="section-card-body"><strong>' + esc(c.ciclo || 'Curso') + '</strong>' +
        '<span class="cell-muted">' + icon('Users', 13) + ' ' + esc(c.nombre) + '</span></div>' +
        '<button class="section-link" data-nomina="' + esc(c.id_curso) + '" data-nombre="' + esc(courseShortName(c)) + '" type="button">Ver nómina ' + icon('ArrowUpRight', 14) + '</button>' +
        '</div>'
    )
    .join('');
}

export function courseGroupsHTML(groups) {
  if (!groups || groups.length === 0) {
    return '<div class="table-empty">No hay cursos para mostrar.</div>';
  }
  return groups
    .map(
      (g) =>
        '<div class="course-group">' +
        '<div class="course-group-header">' +
        '<div class="group-icon">' + icon('ClipboardList', 18) + '</div>' +
        '<div><strong>' + esc(g.title) + '</strong><span>' + g.items.length + ' divisiones</span></div>' +
        '</div>' +
        '<div class="course-sections-grid">' + courseSectionCards(g) + '</div>' +
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
  const res = await fetch(url);
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
// Render del shell (paridad de markup con mejoras.css)
// ---------------------------------------------------------------------------

function sectionMeta(state, label) {
  const sections = visibleSections(state);
  const m = sections.find((s) => s.label === label);
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

function navItems(activeSection, counts, sections) {
  const home = navButton('LayoutDashboard', 'Inicio', 'Panel principal', activeSection === 'Inicio', null);
  const items = (sections || SECTIONS)
    .map((s) => navButton(s.icon, s.label, s.label, activeSection === s.label, isSet(counts[s.label]) ? counts[s.label] : null))
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
    '<div class="help-card">' + icon('Database', 18) + '<div><strong>Base de datos local</strong><span>Datos sincronizados y protegidos.</span></div></div>' +
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
    '<div class="top-search">' + icon('Search', 17) + '<input id="global-search" placeholder="Buscar en el sistema" aria-label="Buscar en el sistema" /></div>' +
    '<button class="icon-button notification" aria-label="Notificaciones" type="button">' + icon('Bell', 19) + '<i></i></button>' +
    '<a class="icon-button" href="../logout.php" aria-label="Salir de la sesión" title="Salir">' + icon('LogOut', 19) + '</a>' +
    '<div class="top-avatar">' + esc(iniciales) + '</div>' +
    '</div>' +
    '</header>' +
    '<div class="content-wrap" data-content></div>' +
    '</main>' +
    '</div>'
  );
}

function viewHero(meta, agregarLabel, state, editableTipo) {
  const can = state.esAdmin && editableTipo;
  const action = can
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

function toolbarHTML(section) {
  const exports = EXPORT_FOR[section]
    ? '<button class="filter-button" data-export="' + esc(EXPORT_FOR[section]) + '" type="button">' + icon('Download', 16) + ' PDF</button>' +
      '<button class="filter-button" data-export="' + esc(EXPORT_FOR[section]) + '" data-format="excel" type="button">' + icon('Download', 16) + ' Excel</button>'
    : '';
  return (
    '<div class="view-toolbar">' +
    '<div class="local-search">' + icon('Search', 17) + '<input id="local-search-' + esc(section) + '" placeholder="Buscar ' + esc(section.toLowerCase()) + '..." aria-label="Buscar ' + esc(section.toLowerCase()) + '" /></div>' +
    exports +
    '</div>'
  );
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
  const editable = state.esAdmin;
  if (section === 'Estudiantes') {
    const filtered = filterRows(rows, q, ['nombre', 'curso', 'dni', 'tutor']);
    return (
      '<div class="data-panel">' +
      '<div class="panel-heading"><div><h2>Registro de estudiantes</h2><p>' + filtered.length + ' registros</p></div>' +
      '<button class="text-button" type="button" disabled>Actualizado desde la base</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Curso</th><th>DNI</th><th>Tutor</th>' + (editable ? '<th></th>' : '') + '</tr></thead><tbody>' +
      studentRowsHTML(filtered, editable) + '</tbody></table></div>' +
      '</div>'
    );
  }
  if (section === 'Docentes') {
    const filtered = filterRows(rows, q, ['nombre', 'dni', 'cargo']);
    return (
      '<div class="stats-grid">' +
      statCard('GraduationCap', 'Docentes', rows.length, 'en plantel', 'teal') +
      statCard('Users', 'Estudiantes', '', '', 'blue').replace(/<strong><\/strong>/, '<strong>—</strong>') +
      '</div>' +
      '<div class="card-grid-heading"><div><h2>Equipo docente</h2><p>' + filtered.length + ' docentes</p></div></div>' +
      '<div class="teacher-grid">' + teacherCardsHTML(filtered, null, editable) + '</div>'
    );
  }
  if (section === 'Cursos') {
    const filtered = filterRows(rows, q, ['nombre', 'turno', 'ciclo']);
    return (
      '<div class="stats-grid">' +
      statCard('BookOpen', 'Cursos', rows.length, 'en el establecimiento', 'orange') +
      statCard('Users', 'Divisiones', '', '', 'blue').replace(/<strong><\/strong>/, '<strong>—</strong>') +
      '</div>' +
      '<div class="card-grid-heading"><div><h2>Catálogo de cursos</h2><p>Hacé clic para abrir la nómina</p></div></div>' +
      '<div class="course-grid">' + courseCardsHTML(filtered, editable) + '</div>'
    );
  }
  if (section === 'Materias') {
    const filtered = filterRows(rows, q, ['nombre']);
    return (
      '<div class="data-panel">' +
      '<div class="panel-heading"><div><h2>Materias del establecimiento</h2><p>' + filtered.length + ' materias</p></div></div>' +
      '<div class="student-list">' + materiaRowsHTML(filtered, editable) + '</div>' +
      '</div>'
    );
  }
  if (section === 'Listado por Cursos') {
    const groups = groupCoursesByYear(rows);
    return (
      '<div class="card-grid-heading"><div><h2>Nóminas por curso</h2><p>Seleccioná un curso para ver su nómina</p></div></div>' +
      '<div class="course-list-wrap">' + courseGroupsHTML(groups) + '</div>'
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
    '<button class="quick-card" data-section="' + esc(s.label) + '" type="button">' +
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
    (state.esAdmin
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

  const editableTipo = state.esAdmin
    ? state.section === 'Usuarios' ? 'usuarios'
      : state.section === 'Estudiantes' ? 'estudiantes'
        : state.section === 'Docentes' ? 'docentes'
          : state.section === 'Cursos' ? 'cursos'
            : state.section === 'Materias' ? 'materias'
              : ''
    : '';
  const agLabel = state.section === 'Usuarios' ? 'Nuevo usuario' : 'Agregar ' + (state.section === 'Estudiantes' ? 'estudiante' : state.section === 'Docentes' ? 'docente' : state.section.toLowerCase());
  const xm = '<section class="section-view">' + viewHero(meta, agLabel, state, editableTipo) +
    toolbarHTML(state.section) + '<div data-view-body>' + loadingHTML() + '</div></section>';
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
  state.section = 'Listado por Cursos';
  state.drill = { id: id, nombre: nombre };
  state.results = null;
  setBreadcrumb(state, 'Nómina · ' + nombre);
  const content = state.root.querySelector('[data-content]');
  content.innerHTML = '<div class="panel" style="padding:48px 24px; text-align:center; color:#8a94a6;">Cargando nómina…</div>';
  try {
    const [alumnos, docentes] = await Promise.all([
      apiRows('api.php?table=nomina&id=' + encodeURIComponent(id)),
      apiRows('api.php?table=docentes_por_curso&id=' + encodeURIComponent(id)),
    ]);
    const curso = { id: id, nombre: nombre };
    content.innerHTML = '<div data-view-body>' + nominaHTML(curso, alumnos, docentes, state.esAdmin) + '</div>';
  } catch (err) {
    content.innerHTML = errorHTML(err && err.message ? err.message : 'error');
  }
}

async function doSearch(state, term) {
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
      showSection(state, 'Listado por Cursos');
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
  const [estudiantes, docentes, cursos, materias] = await Promise.all([
    apiRows('api.php?table=estudiantes&limit=100'),
    apiRows('api.php?table=docentes&limit=100'),
    apiRows('api.php?table=lista_cursos&limit=100'),
    apiRows('api.php?table=materias&limit=100'),
  ]);
  state.cache = {
    Estudiantes: estudiantes,
    Docentes: docentes,
    Cursos: cursos,
    'Listado por Cursos': cursos,
    Materias: materias,
  };
  return {
    Estudiantes: estudiantes.length,
    Docentes: docentes.length,
    Cursos: cursos.length,
    Materias: materias.length,
    'Listado por Cursos': cursos.length,
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
  if (section === 'Listado por Cursos' && state.drill) {
    await openNomina(state, state.drill.id, state.drill.nombre);
  } else {
    await renderCurrent(state);
  }
}

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

export async function initSistemaMejora(root, opts) {
  const state = {
    root: root,
    user: (opts && opts.user) || { nombre: 'Administrador', rol: '' },
    csrf: (opts && opts.csrf) || '',
    esAdmin: !!(opts && opts.esAdmin),
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
  root.innerHTML = buildShellHTML(state, 'Inicio', {});
  wireEvents(state);

  const content = root.querySelector('[data-content]');
  if (content) content.innerHTML = loadingHTML();

  try {
    const navCounts = await loadAll(state);
    state.counts = {
      estudiantes: navCounts.Estudiantes,
      docentes: navCounts.Docentes,
      cursos: navCounts.Cursos,
      materias: navCounts.Materias,
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
  window.initSistemaMejora = initSistemaMejora;
}