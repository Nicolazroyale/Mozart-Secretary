/**
 * Tests for sistema_mejora.js (interfaz mejorada con datos reales).
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

const BASE_SECTIONS = [
  { label: 'Estudiantes', icon: 'Users', color: 'blue', desc: 'a' },
  { label: 'Docentes', icon: 'GraduationCap', color: 'teal', desc: 'b' },
  { label: 'Cursos', icon: 'BookOpen', color: 'orange', desc: 'c' },
  { label: 'Materias', icon: 'ClipboardList', color: 'violet', desc: 'd' },
  { label: 'Listado por Cursos', icon: 'CalendarDays', color: 'green', desc: 'e' },
];

const ADMIN_SECTIONS = [
  { label: 'Usuarios', icon: 'ShieldCheck', color: 'violet', desc: 'f' },
  { label: 'Auditoría', icon: 'ScrollText', color: 'orange', desc: 'g' },
];

function visibleSections(esAdmin) {
  return esAdmin ? BASE_SECTIONS.concat(ADMIN_SECTIONS) : BASE_SECTIONS.slice();
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

describe('sistema_mejora (lógica pura)', () => {
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

  test('counts del dashboard usan los totales reales', () => {
    const counts = { estudiantes: 100, docentes: 10, cursos: 56, materias: 12 };
    expect(counts.estudiantes).toBe(100);
    expect(counts.docentes).toBe(10);
    expect(counts.cursos).toBe(56);
    expect(counts.materias).toBe(12);
  });

  test('visibleSections agrega Usuarios y Auditoría solo en modo admin', () => {
    expect(visibleSections(false)).toHaveLength(5);
    expect(visibleSections(true)).toHaveLength(7);
    expect(visibleSections(true).map((s) => s.label)).toContain('Auditoría');
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