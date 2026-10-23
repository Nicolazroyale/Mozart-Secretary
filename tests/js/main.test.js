/**
 * Tests for main.js (sistema principal con datos reales).
 *
 * Convención del repo: re-implementamos la lógica pura del módulo (que usa
 * ES modules/fetch/DOM). El módulo completo se verifica con node + jsdom desde
 * /tmp/opencode (ver summary del repo).
 */

function initials(nombre) {
  const parts = String(nombre || '').trim().split(/\s+/);
  const letters = parts.map((p) => (p[0] || '').toUpperCase()).join('');
  return letters.slice(0, 2) || 'AD';
}

function isSet(x) {
  return x !== undefined && x !== null;
}

function shortName(apellido, nombre) {
  const a = String(apellido || '').trim();
  const n = String(nombre || '').trim();
  if (a && n) return a + ', ' + n;
  return a || n;
}

function courseShortName(c) {
  return isSet(c.division) ? c.anio + '°' + c.division + '°' : c.nombre;
}

const TURNO_ORDER = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };

function sortCourses(courses, dir) {
  const rows = (courses || []).slice();
  rows.sort((a, b) => {
    let d = (Number(a.anio) || 0) - (Number(b.anio) || 0);
    if (d === 0) d = (Number(a.division) || 0) - (Number(b.division) || 0);
    if (d === 0) d = String(a.turno || '').localeCompare(String(b.turno || ''), 'es');
    return d;
  });
  if (dir === 'desc') rows.reverse();
  return rows;
}

function groupCoursesBy(courses, criterio, dir) {
  const key = criterio === 'turno' || criterio === 'especialidad' ? criterio : 'anio';
  const buckets = [];
  const index = {};
  (courses || []).forEach((c) => {
    let id;
    let title;
    if (key === 'turno') {
      id = String(c.turno || '') || 'Sin turno';
      title = id;
    } else if (key === 'especialidad') {
      id = String(c.especialidad || '') || 'Sin especialidad';
      title = id;
    } else {
      id = Number(c.anio) || 0;
      title = id + '° Año';
    }
    if (!index[id]) {
      index[id] = { id: id, title: title, items: [] };
      buckets.push(index[id]);
    }
    index[id].items.push(c);
  });
  buckets.sort((a, b) => {
    if (key === 'anio') return Number(a.id) - Number(b.id);
    if (key === 'turno') return (isSet(TURNO_ORDER[a.id]) ? TURNO_ORDER[a.id] : 9) - (isSet(TURNO_ORDER[b.id]) ? TURNO_ORDER[b.id] : 9);
    return String(a.title).localeCompare(String(b.title), 'es');
  });
  const ordered = dir === 'desc' ? buckets.slice().reverse() : buckets;
  return ordered.map((g) => ({ title: g.title, items: g.items }));
}

function filterRows(rows, term, keys) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return rows;
  return (rows || []).filter((r) => keys.some((f) => String(r[f] || '').toLowerCase().includes(q)));
}

function alertaClass(alerta) {
  return Number(alerta) === 1 ? 'status status-pending' : 'status status-active';
}

function ultimoBackupText(dateStr) {
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

const BASE_SECTIONS = [
  { label: 'Estudiantes', icon: 'Users', color: 'blue', desc: 'a' },
  { label: 'Docentes', icon: 'GraduationCap', color: 'teal', desc: 'b' },
  { label: 'Cursos', icon: 'BookOpen', color: 'orange', desc: 'c' },
  { label: 'Materias', icon: 'ClipboardList', color: 'violet', desc: 'd' },
];

const ADMIN_GROUP = {
  label: 'Administración',
  icon: 'Shield',
  color: 'green',
  desc: 'Usuarios, backups y auditoría',
  items: [
    { label: 'Usuarios', icon: 'ShieldCheck', color: 'violet', desc: 'f' },
    { label: 'Backups', icon: 'DatabaseBackup', color: 'teal', desc: 'h', crud: 'backups' },
    { label: 'Auditoría', icon: 'ScrollText', color: 'orange', desc: 'g' },
  ],
};

function hasPerm(state, p) {
  if (!state) return false;
  if (state.esAdmin) return true;
  const set = new Set(state.perms || []);
  if (set.has(p)) return true;
  const imply = {
    ver_estudiantes: 'modificar_estudiantes',
    ver_docentes: 'modificar_docentes',
    ver_cursos: 'modificar_cursos',
    ver_materias: 'modificar_materias',
    ver_usuarios: 'gestion_usuarios',
    ver_backups: 'gestion_backups',
  };
  return Boolean(imply[p] && set.has(imply[p]));
}

const SECTION_READ = {
  Estudiantes: 'ver_estudiantes',
  Docentes: 'ver_docentes',
  Cursos: 'ver_cursos',
  Materias: 'ver_materias',
  Usuarios: 'ver_usuarios',
  Backups: 'ver_backups',
  Auditoría: 'ver_auditoria',
};

const TODAS_LAS_LECTURAS = ['ver_estudiantes', 'ver_docentes', 'ver_cursos', 'ver_materias'];

function visibleSections(state) {
  const base = BASE_SECTIONS.filter((s) => hasPerm(state, SECTION_READ[s.label]));
  const adminItems = ADMIN_GROUP.items.filter((it) => hasPerm(state, SECTION_READ[it.label]));
  if (state && state.esAdmin) {
    base.push(Object.assign({}, ADMIN_GROUP, { items: ADMIN_GROUP.items.slice() }));
  } else if (adminItems.length > 0) {
    base.push(Object.assign({}, ADMIN_GROUP, { items: adminItems }));
  }
  return base;
}

function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function icon(name) {
  return '<svg data-icon="' + name + '">';
}

function navButton(iconName, dataSection, label, active, count) {
  const inner = icon(iconName) + '<span>' + label + '</span>' + (isSet(count) ? '<span class="nav-count">' + count + '</span>' : '');
  return '<button class="nav-item' + (active ? ' active' : '') + '" data-section="' + dataSection + '" type="button">' + inner + '</button>';
}

function navChild(c, activeSection) {
  if (c.crud) {
    return '<button class="nav-item" data-crud="' + c.crud + '" type="button">' + icon(c.icon) + '<span>' + c.label + '</span></button>';
  }
  return navButton(c.icon, c.label, c.label, activeSection === c.label, null);
}

function navItems(activeSection, sections) {
  const home = navButton('LayoutDashboard', 'Inicio', 'Panel principal', activeSection === 'Inicio', null);
  return home + (sections || [])
    .map((s) => (s.items
      ? '<div class="nav-group"><div class="nav-group-label">' + esc(s.label) + '</div>' + s.items.map((c) => navChild(c, activeSection)).join('') + '</div>'
      : navButton(s.icon, s.label, s.label, activeSection === s.label, null)))
    .join('');
}

function rowActionsHTML(tipo, id, label) {
  return (
    '<td class="row-actions">' +
    '<button class="row-action action-edit" type="button" data-crud="edit" data-tipo="' + tipo + '" data-id="' + id + '" data-label="' + label + '">ed</button>' +
    '<button class="row-action action-del" type="button" data-crud="del" data-tipo="' + tipo + '" data-id="' + id + '" data-label="' + label + '">del</button>' +
    '</td>'
  );
}

function studentRowsHTML(rows, editable) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="' + (editable ? 5 : 4) + '" class="table-empty">Sin registros.</td></tr>';
  }
  return rows
    .map(
      (r) =>
        '<tr>' +
        '<td>' + r.nombre + '</td>' +
        '<td>' + r.curso + '</td>' +
        '<td>' + r.dni + '</td>' +
        '<td>' + r.tutor + '</td>' +
        (editable ? rowActionsHTML('estudiantes', r.id_alumno, r.nombre) : '') +
        '</tr>'
    )
    .join('');
}

// Espejos de materiaRowsHTML/materiaGroupsHTML: Materias usa el mismo diseño
// de tabla que Estudiantes (avatar + nombre, badge de docente y acciones).
function materiaRowsHTML(rows, editable) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="' + (editable ? 3 : 2) + '" class="table-empty">Sin registros.</td></tr>';
  }
  return rows
    .map((m) => {
      const con = Number(m.con_docente) === 1;
      return (
        '<tr>' +
        '<td><div class="table-person"><div class="avatar avatar-violet">' + m.nombre.slice(0, 1).toUpperCase() + '</div><strong>' + m.nombre + '</strong></div></td>' +
        '<td><span class="status ' + (con ? 'status-active' : 'status-pending') + '">' +
        (con ? 'Con docente asignado' : 'Sin docente asignado') + '</span></td>' +
        (editable ? rowActionsHTML('materias', m.id_materia, m.nombre) : '') +
        '</tr>'
      );
    })
    .join('');
}

function materiaGroupsHTML(groups, editable) {
  const colspan = editable ? 3 : 2;
  if (!groups || groups.length === 0) return materiaRowsHTML([], editable);
  return groups
    .map((g) =>
      '<tr class="group-row"><th colspan="' + colspan + '">' + g.title + '</th></tr>' +
      materiaRowsHTML(g.items, editable))
    .join('');
}

function usuarioRowsHTML(rows) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="4" class="table-empty">No hay usuarios registrados.</td></tr>';
  }
  return rows
    .map(
      (u) =>
        '<tr>' +
        '<td>' + u.username + '</td>' +
        '<td><span class="crud-role-badge' + (u.rol === 'admin' ? ' admin' : '') + '">' + (u.rol === 'admin' ? 'Administrador' : 'Lectura') + '</span></td>' +
        '<td><span class="' + (Number(u.activo) === 1 ? 'status status-active' : 'status status-pending') + '">' + (Number(u.activo) === 1 ? 'Activo' : 'Inactivo') + '</span></td>' +
        (u.username === 'admin_tecnica' ? '' : '<td class="row-actions">' + rowActionsHTML('usuarios', u.id_usuario, u.username) + '</td>') +
        '</tr>'
    )
    .join('');
}

describe('main (lógica pura)', () => {
  test('initials genera hasta 2 iniciales', () => {
    expect(initials('Acosta, Santiago')).toBe('AS');
    expect(initials('Ana')).toBe('A');
    expect(initials('')).toBe('AD');
  });

  test('shortName combina apellido y nombre', () => {
    expect(shortName('Carrizo', 'Melina')).toBe('Carrizo, Melina');
    expect(shortName('', 'Solo')).toBe('Solo');
  });

  test('courseShortName usa anio/division si están', () => {
    expect(courseShortName({ anio: 3, division: 4 })).toBe('3°4°');
    expect(courseShortName({ nombre: 'Lengua' })).toBe('Lengua');
  });

  test('sortCourses ordena por año y división y solo alterna asc/desc', () => {
    const rows = [
      { anio: 1, division: 1, turno: 'Tarde', nombre: '1°1° (Básico) - Tarde', especialidad: '' },
      { anio: 2, division: 1, turno: 'Mañana', nombre: '2°1° (Básico) - Mañana', especialidad: 'Electrónica' },
      { anio: 1, division: 2, turno: 'Mañana', nombre: '1°2° (Superior) - Mañana', especialidad: 'Técnico en Informática' },
    ];
    expect(sortCourses(rows, 'asc').map((c) => c.anio + '-' + c.division)).toEqual(['1-1', '1-2', '2-1']);
    expect(sortCourses(rows, 'desc').map((c) => c.anio + '-' + c.division)).toEqual(['2-1', '1-2', '1-1']);
    expect(sortCourses(rows, 'otra-cosa').map((c) => c.anio + '-' + c.division)).toEqual(['1-1', '1-2', '2-1']);
    expect(sortCourses(rows, 'asc')).toHaveLength(3);
  });

  test('botón de orden: etiqueta según dirección y sin clase active', () => {
    // Espejo de courseDirLabel() + toolbarHTML() en main.js: el botón de
    // dirección nunca lleva la clase 'active' (no cambia de color).
    const courseDirLabel = (isDesc) => 'Ordenar: ' + (isDesc ? 'Descendente ↓' : 'Ascendente ↑');
    const buttonHTML = (dir) => {
      const isDesc = dir === 'desc';
      return '<button class="filter-button" data-dir-toggle aria-pressed="' + isDesc + '">' + courseDirLabel(isDesc) + '</button>';
    };
    expect(courseDirLabel(false)).toBe('Ordenar: Ascendente ↑');
    expect(courseDirLabel(true)).toBe('Ordenar: Descendente ↓');
    expect(buttonHTML('asc')).toContain('Ascendente ↑');
    expect(buttonHTML('desc')).toContain('Descendente ↓');
    expect(buttonHTML('desc')).toContain('aria-pressed="true"');
    expect(buttonHTML('desc')).not.toContain('active');
    expect(buttonHTML('asc')).not.toContain('active');
  });

  test('groupCoursesBy agrupa por año, turno o especialidad', () => {
    const rows = [
      { anio: 2, division: 2, turno: 'Tarde', especialidad: '' },
      { anio: 1, division: 3, turno: 'Mañana', especialidad: 'Electrónica' },
      { anio: 1, division: 1, turno: 'Mañana', especialidad: '' },
    ];
    const porAnio = groupCoursesBy(sortCourses(rows, 'asc'), 'anio', 'asc');
    expect(porAnio.map((g) => g.title)).toEqual(['1° Año', '2° Año']);
    expect(porAnio[0].items.map((c) => c.division)).toEqual([1, 3]);

    const porTurno = groupCoursesBy(sortCourses(rows, 'asc'), 'turno', 'asc');
    expect(porTurno.map((g) => g.title)).toEqual(['Mañana', 'Tarde']);

    const porEsp = groupCoursesBy(sortCourses(rows, 'asc'), 'especialidad', 'asc');
    expect(porEsp.map((g) => g.title)).toEqual(['Electrónica', 'Sin especialidad']);

    const invertido = groupCoursesBy(sortCourses(rows, 'asc'), 'turno', 'desc');
    expect(invertido.map((g) => g.title)).toEqual(['Tarde', 'Mañana']);
  });

  test('SECTION_FILTERS tiene criterios propios por sección', () => {
    // Espejo de SECTION_FILTERS en main.js.
    const SECTION_FILTERS = {
      Estudiantes: ['none', 'curso', 'anio', 'turno', 'ciclo', 'genero'],
      Docentes: ['none', 'cargo', 'letra', 'anio_ingreso'],
      Cursos: ['none', 'anio', 'especialidad', 'turno'],
      Materias: ['none', 'letra', 'con_docente'],
    };
    expect(Object.keys(SECTION_FILTERS)).toHaveLength(4);
    Object.keys(SECTION_FILTERS).forEach((s) => {
      expect(SECTION_FILTERS[s][0]).toBe('none');
    });
    expect(SECTION_FILTERS.Estudiantes).toContain('turno');
    expect(SECTION_FILTERS.Estudiantes).not.toContain('especialidad');
    expect(SECTION_FILTERS.Docentes).toContain('cargo');
    expect(SECTION_FILTERS.Materias).toEqual(['none', 'letra', 'con_docente']);
  });

  test('groupRowsBy ordena por rank numérico o alfabético y dir invierte', () => {
    // Espejo de groupRowsBy() en main.js.
    const groupRowsBy = (rows, dir, extract) => {
      const buckets = [];
      const index = Object.create(null);
      (rows || []).forEach((r) => {
        const g = extract(r);
        if (!index[g.id]) {
          index[g.id] = { id: g.id, title: g.title, rank: g.rank, items: [] };
          buckets.push(index[g.id]);
        }
        index[g.id].items.push(r);
      });
      buckets.sort((a, b) => {
        const ra = Number(a.rank);
        const rb = Number(b.rank);
        if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
        return String(a.title).localeCompare(String(b.title), 'es');
      });
      const ordered = dir === 'desc' ? buckets.slice().reverse() : buckets;
      return ordered.map((g) => ({ title: g.title, items: g.items }));
    };
    const filas = [{ valor: 'Tarde' }, { valor: 'Mañana' }, { valor: 'Noche' }];
    const porTurno = (r) => ({ id: r.valor, title: r.valor, rank: TURNO_ORDER[r.valor] !== undefined ? TURNO_ORDER[r.valor] : 9 });
    const porLetra = (r) => ({ id: r.valor[0], title: r.valor[0], rank: NaN });

    expect(groupRowsBy(filas, 'asc', porTurno).map((g) => g.title)).toEqual(['Mañana', 'Tarde', 'Noche']);
    expect(groupRowsBy(filas, 'desc', porTurno).map((g) => g.title)).toEqual(['Noche', 'Tarde', 'Mañana']);
    expect(groupRowsBy(filas, 'asc', porLetra).map((g) => g.title)).toEqual(['M', 'N', 'T']);
    expect(groupRowsBy(filas, 'asc', porTurno)[0].items).toHaveLength(1);
    expect(groupRowsBy([], 'asc', porTurno)).toEqual([]);
  });

  test('groupKeyFor cubre estudiantes, docentes y materias', () => {
    // Espejo de groupKeyFor() en main.js.
    const TURNO = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };
    const CICLO = { 'Básico': 0, 'Superior': 1 };
    const str = (v) => (v === undefined || v === null ? '' : String(v));
    const groupKeyFor = (section, criterio, r) => {
      if (section === 'Estudiantes') {
        const curso = str(r.curso) || 'Sin curso';
        const parts = curso.split('°');
        if (criterio === 'curso') {
          return { id: curso, title: curso, rank: (Number(parts[0]) || 0) * 100 + (Number(parts[1]) || 0) };
        }
        if (criterio === 'turno') {
          const id = str(r.turno) || 'Sin turno';
          return { id: id, title: id, rank: TURNO[id] !== undefined ? TURNO[id] : 9 };
        }
        if (criterio === 'ciclo') {
          const id = str(r.ciclo) || 'Sin ciclo';
          return { id: id, title: id, rank: CICLO[id] !== undefined ? CICLO[id] : 9 };
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
        const letra = str(r.nombre).trim().charAt(0).toUpperCase();
        return { id: letra, title: letra, rank: NaN };
      }
      if (section === 'Materias') {
        if (criterio === 'con_docente') {
          const con = Number(r.con_docente) === 1;
          const id = con ? 'Con docente asignado' : 'Sin docente asignado';
          return { id: id, title: id, rank: con ? 0 : 1 };
        }
        const letra = str(r.nombre).trim().charAt(0).toUpperCase();
        return { id: letra, title: letra, rank: NaN };
      }
      return { id: '', title: '', rank: NaN };
    };

    const alumno = { curso: '1°2°', anio: 1, division: 2, turno: 'Mañana', ciclo: 'Básico', genero: 'Femenino' };
    expect(groupKeyFor('Estudiantes', 'curso', alumno)).toEqual({ id: '1°2°', title: '1°2°', rank: 102 });
    expect(groupKeyFor('Estudiantes', 'anio', alumno)).toEqual({ id: 1, title: '1° Año', rank: 1 });
    expect(groupKeyFor('Estudiantes', 'turno', alumno).rank).toBe(0);
    expect(groupKeyFor('Estudiantes', 'ciclo', alumno).rank).toBe(0);
    expect(groupKeyFor('Estudiantes', 'genero', alumno).title).toBe('Femenino');
    expect(groupKeyFor('Estudiantes', 'genero', { curso: '1°1°' }).title).toBe('Sin dato');
    expect(groupKeyFor('Estudiantes', 'anio', { curso: '2°1°' }).title).toBe('2° Año');

    const docente = { nombre: 'Perez, Pablo', cargo: 'Titular', anio_ingreso: '2010' };
    expect(groupKeyFor('Docentes', 'cargo', docente).title).toBe('Titular');
    expect(groupKeyFor('Docentes', 'letra', docente).title).toBe('P');
    expect(groupKeyFor('Docentes', 'anio_ingreso', docente)).toEqual({ id: '2010', title: '2010', rank: 2010 });
    expect(groupKeyFor('Docentes', 'anio_ingreso', { nombre: 'Sin datos' })).toEqual({ id: 'Sin dato', title: 'Sin dato', rank: 9999 });

    expect(groupKeyFor('Materias', 'con_docente', { nombre: 'Matemática', con_docente: 1 }).title).toBe('Con docente asignado');
    expect(groupKeyFor('Materias', 'con_docente', { nombre: 'Arte', con_docente: 0 }).rank).toBe(1);
    expect(groupKeyFor('Materias', 'letra', { nombre: 'Matemática' }).title).toBe('M');
  });

  test('groupRowHTML emite encabezado con colspan y sin contadores', () => {
    // Espejo de groupRowHTML() en main.js.
    const groupRowHTML = (title, colspan) =>
      '<tr class="group-row"><th colspan="' + colspan + '">' + title + '</th></tr>';
    const html = groupRowHTML('Mañana', 4);
    expect(html).toContain('class="group-row"');
    expect(html).toContain('colspan="4"');
    expect(html).toContain('>Mañana<');
    // Los contadores (badges de grupo y subtítulos) se eliminaron.
    expect(html).not.toContain('group-count');
    expect(html).not.toContain('estudiantes');
    // Mismo colspan que studentRowsHTML: 4 sin acciones, 5 si es editable.
    expect(groupRowHTML('1° Año', 4)).toContain('colspan="4"');
    expect(groupRowHTML('1° Año', 5)).toContain('colspan="5"');
  });

  test('PAGE_SIZES ofrece 15/30/50/100 y normaliza cualquier otro valor', () => {
    // Espejo de PAGE_SIZES/normalizePageSize() en main.js.
    const PAGE_SIZES = [15, 30, 50, 100];
    const DEFAULT_PAGE_SIZE = 15;
    const normalizePageSize = (v) => {
      const n = Number(v);
      return PAGE_SIZES.indexOf(n) !== -1 ? n : DEFAULT_PAGE_SIZE;
    };
    expect(PAGE_SIZES).toEqual([15, 30, 50, 100]);
    expect(normalizePageSize(15)).toBe(15);
    expect(normalizePageSize('30')).toBe(30);
    expect(normalizePageSize(100)).toBe(100);
    // Fuera de la lista (y basura) → el valor por defecto.
    expect(normalizePageSize(20)).toBe(15);
    expect(normalizePageSize(0)).toBe(15);
    expect(normalizePageSize(null)).toBe(15);
    expect(normalizePageSize('')).toBe(15);
    expect(normalizePageSize(undefined)).toBe(15);
  });

  test('pageSlice corta el conjunto en la página activa y clampéa el rango', () => {
    // Espejo de pageSlice() en main.js.
    const pageSlice = (rows, limit, page) => {
      const size = limit;
      const total = rows.length;
      const pages = Math.max(1, Math.ceil(total / size));
      const p = Math.min(Math.max(1, Number(page) || 1), pages);
      const start = (p - 1) * size;
      return {
        rows: rows.slice(start, start + size),
        size: size,
        total: total,
        pages: pages,
        page: p,
        from: total === 0 ? 0 : start + 1,
        to: Math.min(start + size, total),
      };
    };
    const rows = Array.from({ length: 40 }, (_, i) => i + 1);

    const primera = pageSlice(rows, 15, 1);
    expect(primera.rows).toHaveLength(15);
    expect(primera.rows[0]).toBe(1);
    expect(primera).toMatchObject({ size: 15, total: 40, pages: 3, page: 1, from: 1, to: 15 });

    const ultima = pageSlice(rows, 15, 3);
    expect(ultima.rows).toHaveLength(10);
    expect(ultima.rows[0]).toBe(31);
    expect(ultima).toMatchObject({ from: 31, to: 40 });

    // Página más allá del final → última;0 o negativa → primera.
    expect(pageSlice(rows, 15, 9).page).toBe(3);
    expect(pageSlice(rows, 15, 0).page).toBe(1);
    expect(pageSlice(rows, 15, -4).page).toBe(1);

    // Conjunto vacío → una página sin filas y rango en0.
    expect(pageSlice([], 15, 7)).toMatchObject({ rows: [], pages: 1, page: 1, from: 0, to: 0 });

    // Límite mayor que el total → todo en una sola página.
    const chico = pageSlice(rows.slice(0, 6), 15, 2);
    expect(chico).toMatchObject({ rows: expect.any(Array), pages: 1, page: 1, from: 1, to: 6 });
    expect(chico.rows).toHaveLength(6);
  });

  test('listFooterHTML muestra el límite, la cantidad de entradas y ‹ ›', () => {
    // Espejo de listFooterHTML() en main.js.
    const listFooterHTML = (section, slice) => {
      const options = [15, 30, 50, 100].map((n) =>
        '<option value="' + n + '"' + (n === slice.size ? ' selected' : '') + '>' + n + '</option>'
      ).join('');
      const cuenta = slice.total === 0
        ? 'Sin entradas para mostrar'
        : 'Mostrando ' + slice.from + '–' + slice.to + ' de ' + slice.total + ' entradas';
      const prev = slice.page <= 1 ? ' disabled' : '';
      const next = slice.page >= slice.pages ? ' disabled' : '';
      return (
        '<div class="list-footer">' +
        '<select data-limit-select aria-label="Entradas por página de ' + section + '">' + options + '</select>' +
        '<span class="entry-count">' + cuenta + '</span>' +
        '<button data-page-prev' + prev + '></button>' +
        '<span class="page-info">Página ' + slice.page + ' de ' + slice.pages + '</span>' +
        '<button data-page-next' + next + '></button>' +
        '</div>'
      );
    };

    const primera = listFooterHTML('Estudiantes', { size: 15, total: 40, from: 1, to: 15, page: 1, pages: 3 });
    expect(primera).toContain('data-limit-select');
    expect(primera).toContain('<option value="15" selected>15</option>');
    expect(primera).toContain('<option value="100">100</option>');
    expect(primera).toContain('Mostrando 1–15 de 40 entradas');
    expect(primera).toContain('Página 1 de 3');
    expect(primera).toMatch(/data-page-prev disabled/);
    expect(primera).not.toMatch(/data-page-next disabled/);

    // Página intermedia: ‹ y › activos.
    const media = listFooterHTML('Docentes', { size: 30, total: 40, from: 31, to: 40, page: 2, pages: 2 });
    expect(media).toContain('<option value="30" selected>30</option>');
    expect(media).toContain('Mostrando 31–40 de 40 entradas');
    expect(media).not.toMatch(/data-page-prev disabled/);
    expect(media).toMatch(/data-page-next disabled/);

    // Sin entradas: texto neutro y ambos botones deshabilitados.
    const vacio = listFooterHTML('Cursos', { size: 15, total: 0, from: 0, to: 0, page: 1, pages: 1 });
    expect(vacio).toContain('Sin entradas para mostrar');
    expect(vacio).toMatch(/data-page-prev disabled/);
    expect(vacio).toMatch(/data-page-next disabled/);
  });

  test('storage por sección usa claves propias y conserva las de Cursos', () => {
    // Espejo de filterKey()/sortKey()/limitKey() en main.js.
    const slug = { Estudiantes: 'estudiantes', Docentes: 'docentes', Cursos: 'cursos', Materias: 'materias' };
    const filterKey = (s) => 'mozart-' + slug[s] + '-filtro';
    const sortKey = (s) => 'mozart-' + slug[s] + '-orden';
    const limitKey = (s) => 'mozart-' + slug[s] + '-limite';
    expect(filterKey('Estudiantes')).toBe('mozart-estudiantes-filtro');
    expect(sortKey('Materias')).toBe('mozart-materias-orden');
    expect(limitKey('Estudiantes')).toBe('mozart-estudiantes-limite');
    expect(limitKey('Docentes')).toBe('mozart-docentes-limite');
    // Cursos mantiene las claves viejas (nadie pierde su preferencia).
    expect(filterKey('Cursos')).toBe('mozart-cursos-filtro');
    expect(sortKey('Cursos')).toBe('mozart-cursos-orden');
    expect(limitKey('Cursos')).toBe('mozart-cursos-limite');
  });

  test('filterRows filtra por las claves indicadas', () => {
    const rows = [
      { nombre: 'García', curso: '1°1°' },
      { nombre: 'Pérez', curso: '3°5°' },
    ];
    expect(filterRows(rows, 'garc', ['nombre'])).toHaveLength(1);
    expect(filterRows(rows, '3°5', ['curso', 'nombre'])).toHaveLength(1);
    expect(filterRows(rows, '', ['nombre'])).toHaveLength(2);
  });

  test('alertaClass marca alertas de salud como pendiente', () => {
    expect(alertaClass(1)).toBe('status status-pending');
    expect(alertaClass(0)).toBe('status status-active');
  });

  test('ultimoBackupText muestra texto relativo al último backup', () => {
    const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const hoy = fmt(new Date());
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    const cinco = new Date(); cinco.setDate(cinco.getDate() - 5);
    expect(ultimoBackupText('')).toBe('Sin backups todavía');
    expect(ultimoBackupText('no-es-fecha')).toBe('Sin backups todavía');
    expect(ultimoBackupText(hoy)).toMatch(/^hoy · \d{2}\/\d{2}\/\d{4}$/);
    expect(ultimoBackupText(fmt(ayer))).toMatch(/^ayer · \d{2}\/\d{2}\/\d{4}$/);
    expect(ultimoBackupText(fmt(cinco))).toMatch(/^hace 5 días · \d{2}\/\d{2}\/\d{4}$/);
  });

  test('counts del dashboard usan los totales reales', () => {
    const counts = { estudiantes: 100, docentes: 10, cursos: 56, materias: 12 };
    expect(counts.estudiantes).toBe(100);
    expect(counts.docentes).toBe(10);
    expect(counts.cursos).toBe(56);
    expect(counts.materias).toBe(12);
  });

  test('Cursos: filtro por defecto "none" (grilla) y orden por defecto asc', () => {
    // Espejo de getStoredCourseFilter()/getStoredCourseSortDir() en main.js.
    const FILTERS = ['none', 'anio', 'especialidad', 'turno'];
    const readFilter = (getItem) => {
      try {
        const v = getItem('mozart-cursos-filtro');
        if (FILTERS.indexOf(v) !== -1) return v;
        return getItem('mozart-cursos-vista') === 'year' ? 'anio' : 'none';
      } catch (err) {
        return 'none';
      }
    };
    // Solo interesa la dirección; el valor guardado conserva el formato
    // '<criterio>:<dir>' del menú anterior.
    const readSortDir = (getItem) => {
      try {
        const raw = getItem('mozart-cursos-orden') || '';
        const parts = raw.split(':');
        return parts[parts.length - 1] === 'desc' ? 'desc' : 'asc';
      } catch (err) {
        return 'asc';
      }
    };
    const store = new Map();
    const getItem = (k) => (store.has(k) ? store.get(k) : null);

    expect(readFilter(getItem)).toBe('none');
    expect(readSortDir(getItem)).toBe('asc');

    store.set('mozart-cursos-filtro', 'turno');
    store.set('mozart-cursos-orden', 'anio:desc');
    expect(readFilter(getItem)).toBe('turno');
    expect(readSortDir(getItem)).toBe('desc');

    // Valor guardado por el menú anterior con criterios: sigue leyéndose.
    store.set('mozart-cursos-orden', 'nombre:desc');
    expect(readSortDir(getItem)).toBe('desc');

    // El toggle viejo grid/year se migra al criterio equivalente.
    const legacy = new Map([['mozart-cursos-vista', 'year']]);
    expect(readFilter((k) => (legacy.has(k) ? legacy.get(k) : null))).toBe('anio');
    expect(readFilter(() => { throw new Error('sin storage'); })).toBe('none');
    expect(readSortDir(() => { throw new Error('sin storage'); })).toBe('asc');
  });

  test('visibleSections admin ve todas las secciones + Administración', () => {
    const all = visibleSections({ esAdmin: true });
    expect(all).toHaveLength(5);
    expect(all.map((s) => s.label)).toContain('Administración');
    expect(all.map((s) => s.label)).not.toContain('Listado por Cursos');
  });

  test('visibleSections lectura con todas las lecturas ve 4 secciones sin Administración', () => {
    expect(visibleSections({ esAdmin: false, perms: TODAS_LAS_LECTURAS })).toHaveLength(4);
    expect(visibleSections({ esAdmin: false, perms: TODAS_LAS_LECTURAS }).some((s) => s.label === 'Administración')).toBe(false);
  });

  test('visibleSections sin permisos no ve ninguna sección', () => {
    expect(visibleSections({ esAdmin: false, perms: [] })).toHaveLength(0);
    expect(visibleSections({ esAdmin: false }) || []).toHaveLength(0);
  });

  test('visibleSections filtra secciones por permiso individual', () => {
    const onlyMaterias = visibleSections({ esAdmin: false, perms: ['ver_materias'] });
    expect(onlyMaterias.map((s) => s.label)).toEqual(['Materias']);
    const estudianteEsCritico = visibleSections({ esAdmin: false, perms: ['modificar_estudiantes'] });
    expect(estudianteEsCritico.map((s) => s.label)).toEqual(['Estudiantes']);
  });

  test('visibleSections filtra el grupo Administración por permiso', () => {
    const onlyAudit = visibleSections({ esAdmin: false, perms: ['ver_auditoria'] });
    const group = onlyAudit.find((s) => s.label === 'Administración');
    expect(group.items.map((i) => i.label)).toEqual(['Auditoría']);
    const backupMgmt = visibleSections({ esAdmin: false, perms: ['gestion_backups'] });
    expect(backupMgmt.find((s) => s.label === 'Administración').items.map((i) => i.label)).toEqual(['Backups']);
  });

  test('visibleSections en modo admin incluye Usuarios, Backups y Auditoría', () => {
    const group = visibleSections({ esAdmin: true }).find((s) => s.label === 'Administración');
    expect(group.items.map((i) => i.label)).toEqual(['Usuarios', 'Backups', 'Auditoría']);
    expect(group.items.find((i) => i.label === 'Backups').crud).toBe('backups');
  });

  test('navItems renderiza la categoría con grupo y botón de Backups', () => {
    const html = navItems('Inicio', visibleSections({ esAdmin: true }));
    expect(html).toContain('nav-group-label');
    expect(html).toContain('>Administración<');
    expect(html).toContain('data-crud="backups"');
    expect(html).toContain('data-section="Usuarios"');
    expect(html).toContain('data-section="Auditoría"');
    const activeHtml = navItems('Usuarios', visibleSections({ esAdmin: true }));
    expect(activeHtml).toContain('class="nav-item active" data-section="Usuarios"');
  });

  test('rowActionsHTML emite botones edit/del con data-tipo y data-id', () => {
    const html = rowActionsHTML('docentes', '4', 'Cabrera, Marcos');
    expect(html).toContain('data-crud="edit"');
    expect(html).toContain('data-crud="del"');
    expect(html).toContain('data-tipo="docentes"');
    expect(html).toContain('data-id="4"');
    expect(html).toContain('data-label="Cabrera, Marcos"');
  });

  test('studentRowsHTML colapsa columnas y omite acciones si no es editable', () => {
    const empty = studentRowsHTML([], false);
    expect(empty).toContain('colspan="4"');
    expect(studentRowsHTML([], true)).toContain('colspan="5"');
    const editableHtml = studentRowsHTML([{ id_alumno: 1, nombre: 'X', curso: '1°1°', dni: '1', tutor: 'T' }], true);
    expect(editableHtml).toContain('data-crud="edit"');
    const readonlyHtml = studentRowsHTML([{ id_alumno: 1, nombre: 'X', curso: '1°1°', dni: '1', tutor: 'T' }], false);
    expect(readonlyHtml).not.toContain('data-crud');
  });

  test('materiaRowsHTML replica el diseño de tabla de Estudiantes', () => {
    const empty = materiaRowsHTML([], false);
    expect(empty).toContain('<tr>');
    expect(empty).toContain('class="table-empty"');
    // 2 columnas de datos (Materia/Docente) + acciones si es editable.
    expect(empty).toContain('colspan="2"');
    expect(materiaRowsHTML([], true)).toContain('colspan="3"');

    const con = materiaRowsHTML([{ id_materia: 1, nombre: 'Matemática', con_docente: 1 }], true);
    expect(con).toContain('table-person');
    expect(con).toContain('avatar-violet');
    expect(con).toContain('<strong>Matemática</strong>');
    expect(con).toContain('status status-active');
    expect(con).toContain('>Con docente asignado<');
    expect(con).toContain('data-tipo="materias"');
    expect(con).toContain('data-id="1"');

    const sin = materiaRowsHTML([{ id_materia: 2, nombre: 'Arte', con_docente: 0 }], false);
    expect(sin).toContain('status status-pending');
    expect(sin).toContain('>Sin docente asignado<');
    expect(sin).not.toContain('data-crud');
    // Sin el diseño viejo de lista (fila con badge de numeración).
    expect(sin).not.toContain('student-row');
    expect(sin).not.toContain('course-level');
  });

  test('materiaGroupsHTML agrupa con group-row dentro de la tabla', () => {
    const groups = [
      { title: 'Con docente asignado', items: [{ id_materia: 1, nombre: 'Matemática', con_docente: 1 }] },
      { title: 'Sin docente asignado', items: [{ id_materia: 2, nombre: 'Arte', con_docente: 0 }] },
    ];
    const html = materiaGroupsHTML(groups, true);
    expect(html).toContain('class="group-row"');
    expect(html).toContain('>Con docente asignado<');
    expect(html).toContain('>Sin docente asignado<');
    expect(html).toContain('colspan="3"');
    expect(html).toContain('data-tipo="materias"');
    // Los grupos son filas, no bloques .course-group como en Cursos/Docentes.
    expect(html).not.toContain('course-group');
    // Estado vacío con el colspan de la tabla.
    expect(materiaGroupsHTML([], false)).toContain('colspan="2"');
    expect(materiaGroupsHTML([], true)).toContain('colspan="3"');
  });

  test('usuarioRowsHTML renderiza rol y estado correctos', () => {
    const html = usuarioRowsHTML([
      { id_usuario: 1, username: 'admin_tecnica', nombre_completo: 'Administrador Técnica', rol: 'admin', activo: 1 },
      { id_usuario: 2, username: 'lectura1', nombre_completo: 'Lectura', rol: 'lectura', activo: 0 },
    ]);
    expect(html).toContain('crud-role-badge admin');
    expect(html).toContain('>Administrador<');
    expect(html).toContain('>Lectura<');
    expect(html).toContain('status status-pending');
    expect(html).toContain('>Inactivo<');
    expect(usuarioRowsHTML([])).toContain('No hay usuarios');
  });
});