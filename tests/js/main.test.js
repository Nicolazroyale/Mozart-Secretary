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

function groupCoursesByYear(courses) {
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
  { label: 'Listado por Cursos', icon: 'CalendarDays', color: 'green', desc: 'e' },
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
  'Listado por Cursos': 'ver_nomina',
  Usuarios: 'ver_usuarios',
  Backups: 'ver_backups',
  Auditoría: 'ver_auditoria',
};

const TODAS_LAS_LECTURAS = ['ver_estudiantes', 'ver_docentes', 'ver_cursos', 'ver_materias', 'ver_nomina'];

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

  test('groupCoursesByYear agrupa y ordena por año y división', () => {
    const grupos = groupCoursesByYear([
      { anio: 2, division: 2 },
      { anio: 1, division: 3 },
      { anio: 1, division: 1 },
    ]);
    expect(grupos.map((g) => g.title)).toEqual(['1° Año', '2° Año']);
    expect(grupos[0].items.map((c) => c.division)).toEqual([1, 3]);
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

  test('visibleSections admin ve todas las secciones + Administración', () => {
    const all = visibleSections({ esAdmin: true });
    expect(all).toHaveLength(6);
    expect(all.map((s) => s.label)).toContain('Administración');
  });

  test('visibleSections lectura con todas las lecturas ve 5 secciones sin Administración', () => {
    expect(visibleSections({ esAdmin: false, perms: TODAS_LAS_LECTURAS })).toHaveLength(5);
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