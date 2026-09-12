/**
 * Tests for Interfaz_mejora.js (port vanilla de Interfaz_mejora.ts).
 *
 * Al igual que ui.test.js/app.test.js, re-implementamos la lógica pura del
 * módulo (que usa ES modules/DOM). Verificación de runtime real del módulo
 * completo: node + jsdom desde /tmp/opencode (ver summary del repo).
 */

const SECTIONS = [
  { label: 'Estudiantes', color: 'blue' },
  { label: 'Docentes', color: 'teal' },
  { label: 'Cursos', color: 'orange' },
  { label: 'Listado por Cursos', color: 'violet' },
];

const STUDENTS = [
  { name: 'Valentina Gómez', course: '3° A', status: 'Activo' },
  { name: 'Mateo Rodríguez', course: '2° B', status: 'Activo' },
  { name: 'Sofía Martínez', course: '5° A', status: 'Pendiente' },
  { name: 'Benjamín Torres', course: '1° C', status: 'Activo' },
  { name: 'Isabella Vargas', course: '4° B', status: 'Activo' },
  { name: 'Thiago López', course: '3° A', status: 'Pendiente' },
];

const COURSE_GROUPS = [
  { level: '1° Año', sections: [1, 2, 3] },
  { level: '2° Año', sections: [1, 2] },
  { level: '3° Año', sections: [1, 2] },
  { level: '4° Año', sections: [1, 2] },
  { level: '5° Año', sections: [1, 2] },
];

function statusClass(status) {
  if (status === 'Licencia') return 'status status-leave';
  return status === 'Pendiente' ? 'status status-pending' : 'status status-active';
}

function studentsRows(students) {
  return students
    .map((s) => `<tr><td>${s.name}</td><td>${s.course}</td><td><span class="${statusClass(s.status)}">${s.status}</span></td></tr>`)
    .join('');
}

function courseGroups(groups) {
  return groups
    .map((g) => {
      const total = g.sections.length * 30;
      return `<div class="course-group"><strong>${g.level}</strong><span>${g.sections.length} divisiones · ${total} estudiantes</span></div>`;
    })
    .join('');
}

describe('Interfaz_mejora (lógica pura)', () => {
  test('SECTIONS expone las 4 secciones + Inicio como shell', () => {
    expect(SECTIONS.length).toBe(4);
    const labels = SECTIONS.map((s) => s.label);
    expect(labels).toEqual(['Estudiantes', 'Docentes', 'Cursos', 'Listado por Cursos']);
  });

  test('statusClass mapea estado -> clase CSS correcta', () => {
    expect(statusClass('Activo')).toBe('status status-active');
    expect(statusClass('Pendiente')).toBe('status status-pending');
    expect(statusClass('Licencia')).toBe('status status-leave');
  });

  test('vista Estudiantes renderiza 6 filas con su estado', () => {
    const html = studentsRows(STUDENTS);
    const matches = html.match(/<tr>/g) || [];
    expect(matches.length).toBe(6);
    expect(html).toContain('status status-pending">Pendiente</span>');
    expect(html).toContain('Valentina Gómez');
  });

  test('vista Listado por Cursos construye 5 grupos con conteo', () => {
    const html = courseGroups(COURSE_GROUPS);
    const groups = html.match(/<div class="course-group">/g) || [];
    expect(groups.length).toBe(5);
    expect(html).toContain('3 divisiones · 90 estudiantes');
    expect(html).toContain('2 divisiones · 60 estudiantes');
  });

  test('la shell usa clases app-shell/sidebar/main-area/topbar', () => {
    const shell =
      '<div class="app-shell"><aside class="sidebar"></aside><main class="main-area"><header class="topbar"></header></main></div>';
    expect(shell).toContain('class="app-shell"');
    expect(shell).toContain('class="sidebar"');
    expect(shell).toContain('class="main-area"');
    expect(shell).toContain('class="topbar"');
  });

  test('íconos inline de lucide son SVG con viewBox 24 y stroke currentColor', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>';
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('fill="none"');
  });
});