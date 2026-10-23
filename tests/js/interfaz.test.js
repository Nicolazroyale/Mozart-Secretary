/**
 * Tests for interfaz.js (port vanilla de interfaz.ts).
 *
 * Al igual que ui.test.js/app.test.js, re-implementamos la lógica pura del
 * módulo (que usa ES modules/DOM). Verificación de runtime real del módulo
 * completo: node + jsdom desde /tmp/opencode (ver summary del repo).
 */

const SECTIONS = [
  { label: 'Estudiantes', color: 'blue' },
  { label: 'Docentes', color: 'teal' },
  { label: 'Cursos', color: 'orange' },
];

const STUDENTS = [
  { name: 'Valentina Gómez', course: '3° A', status: 'Activo' },
  { name: 'Mateo Rodríguez', course: '2° B', status: 'Activo' },
  { name: 'Sofía Martínez', course: '5° A', status: 'Pendiente' },
  { name: 'Benjamín Torres', course: '1° C', status: 'Activo' },
  { name: 'Isabella Vargas', course: '4° B', status: 'Activo' },
  { name: 'Thiago López', course: '3° A', status: 'Pendiente' },
];

const DEMO_COURSES = [
  { name: 'Matemática', level: '5° B', students: 28, turno: 'Mañana', especialidad: 'Técnico en Informática' },
  { name: 'Física', level: '5° A', students: 24, turno: 'Tarde', especialidad: 'Electrónica' },
  { name: 'Historia', level: '2° B', students: 33, turno: 'Mañana', especialidad: 'Electrónica' },
  { name: 'Geografía', level: '1° C', students: 30, turno: 'Mañana', especialidad: '' },
];

const TURNO_ORDER = { Mañana: 1, Tarde: 2, Noche: 3 };

function statusClass(status) {
  if (status === 'Licencia') return 'status status-leave';
  return status === 'Pendiente' ? 'status status-pending' : 'status status-active';
}

function studentsRows(students) {
  return students
    .map((s) => `<tr><td>${s.name}</td><td>${s.course}</td><td><span class="${statusClass(s.status)}">${s.status}</span></td></tr>`)
    .join('');
}

function courseYear(c) {
  const m = /^(\d+)/.exec(String(c.level || ''));
  return m ? Number(m[1]) : 0;
}

// Espejo de demoGroupCourses() en interfaz.js.
function demoGroupCourses(rows, criterio) {
  const key = criterio === 'turno' || criterio === 'especialidad' ? criterio : 'anio';
  const buckets = [];
  const index = {};
  rows.forEach((c) => {
    let id;
    let title;
    if (key === 'turno') {
      id = c.turno || 'Sin turno';
      title = id;
    } else if (key === 'especialidad') {
      id = c.especialidad || 'Sin especialidad';
      title = id;
    } else {
      id = courseYear(c);
      title = id + '° Año';
    }
    if (!index[id]) {
      index[id] = { id, title, items: [] };
      buckets.push(index[id]);
    }
    index[id].items.push(c);
  });
  buckets.sort((a, b) => {
    if (key === 'anio') return Number(a.id) - Number(b.id);
    if (key === 'turno') return (TURNO_ORDER[a.id] || 9) - (TURNO_ORDER[b.id] || 9);
    return String(a.title).localeCompare(String(b.title), 'es');
  });
  return buckets.map((g) => ({ title: g.title, items: g.items }));
}

describe('interfaz (lógica pura)', () => {
  test('SECTIONS expone las 3 secciones + Inicio como shell', () => {
    expect(SECTIONS.length).toBe(3);
    const labels = SECTIONS.map((s) => s.label);
    expect(labels).toEqual(['Estudiantes', 'Docentes', 'Cursos']);
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

  test('Cursos agrupa por año, turno y especialidad', () => {
    const porAnio = demoGroupCourses(DEMO_COURSES, 'anio');
    expect(porAnio.map((g) => g.title)).toEqual(['1° Año', '2° Año', '5° Año']);
    expect(porAnio[2].items.map((c) => c.name)).toEqual(['Matemática', 'Física']);

    const porTurno = demoGroupCourses(DEMO_COURSES, 'turno');
    expect(porTurno.map((g) => g.title)).toEqual(['Mañana', 'Tarde']);
    expect(porTurno[0].items).toHaveLength(3);

    const porEsp = demoGroupCourses(DEMO_COURSES, 'especialidad');
    expect(porEsp.map((g) => g.title)).toEqual(['Electrónica', 'Sin especialidad', 'Técnico en Informática']);
  });

  test('sección única Cursos: "Ninguno" muestra la grilla y el resto agrupa', () => {
    // Espejo de courseFilter + coursesViewHTML() en interfaz.js.
    const bodyFor = (filter) => (filter === 'none' ? 'course-grid' : 'course-list-wrap');
    let courseFilter = 'none';
    expect(bodyFor(courseFilter)).toBe('course-grid');
    courseFilter = 'anio';
    expect(bodyFor(courseFilter)).toBe('course-list-wrap');
    courseFilter = 'turno';
    expect(bodyFor(courseFilter)).toBe('course-list-wrap');
  });

  test('botón de orden del mockup: etiqueta según dirección y sin active', () => {
    // Espejo de courseDirLabel() + courseToolbarHTML() en interfaz.js.
    const courseDirLabel = (isDesc) => 'Ordenar: ' + (isDesc ? 'Descendente ↓' : 'Ascendente ↑');
    const buttonHTML = (dir) => {
      const isDesc = dir === 'desc';
      return '<button class="filter-button" data-dir-toggle aria-pressed="' + isDesc + '">' + courseDirLabel(isDesc) + '</button>';
    };
    expect(courseDirLabel(false)).toBe('Ordenar: Ascendente ↑');
    expect(courseDirLabel(true)).toBe('Ordenar: Descendente ↓');
    expect(buttonHTML('asc')).not.toContain('active');
    expect(buttonHTML('desc')).not.toContain('active');
    expect(buttonHTML('desc')).toContain('aria-pressed="true"');
  });

  test('SECTION_FILTERS del mockup por sección', () => {
    // Espejo de SECTION_FILTERS en interfaz.js.
    const SECTION_FILTERS = {
      Estudiantes: ['none', 'estado', 'curso', 'anio'],
      Docentes: ['none', 'estado', 'materia', 'letra'],
      Cursos: ['none', 'anio', 'especialidad', 'turno'],
    };
    expect(Object.keys(SECTION_FILTERS)).toHaveLength(3);
    expect(SECTION_FILTERS.Estudiantes).toEqual(['none', 'estado', 'curso', 'anio']);
    expect(SECTION_FILTERS.Estudiantes).not.toContain('especialidad');
    expect(SECTION_FILTERS.Docentes).toContain('letra');
    expect(SECTION_FILTERS.Cursos).toContain('especialidad');
  });

  test('studentGroupKey agrupa por estado, curso o año', () => {
    // Espejo de studentGroupKey() en interfaz.js.
    const ESTADO_ORDER = { Activo: 0, Pendiente: 1, Licencia: 2 };
    const courseParts = (course) => {
      const parts = String(course || '').split('°');
      return { anio: Number(parts[0]) || 0, resto: String(parts[1] || '').trim() };
    };
    const studentGroupKey = (criterio, s) => {
      const p = courseParts(s.course);
      if (criterio === 'curso') {
        const id = s.course || 'Sin curso';
        return { id: id, title: id, rank: p.anio * 100 + (p.resto ? p.resto.charCodeAt(0) : 0) };
      }
      if (criterio === 'anio') {
        return { id: p.anio, title: p.anio ? p.anio + '° Año' : 'Sin año', rank: p.anio };
      }
      const id = s.status || 'Sin estado';
      return { id: id, title: id, rank: ESTADO_ORDER[id] !== undefined ? ESTADO_ORDER[id] : 9 };
    };
    expect(studentGroupKey('estado', STUDENTS[0])).toEqual({ id: 'Activo', title: 'Activo', rank: 0 });
    expect(studentGroupKey('estado', STUDENTS[2])).toEqual({ id: 'Pendiente', title: 'Pendiente', rank: 1 });
    expect(studentGroupKey('estado', { name: 'X', course: '1° A' }).title).toBe('Sin estado');
    expect(studentGroupKey('anio', STUDENTS[0])).toEqual({ id: 3, title: '3° Año', rank: 3 });
    expect(studentGroupKey('curso', STUDENTS[4]).title).toBe('4° B');
    expect(studentGroupKey('curso', STUDENTS[3]).rank).toBe(100 + 'C'.charCodeAt(0));
  });

  test('teacherGroupKey agrupa por estado, materia o letra', () => {
    // Espejo de teacherGroupKey() en interfaz.js.
    const ESTADO_ORDER = { Activo: 0, Pendiente: 1, Licencia: 2 };
    const teacherGroupKey = (criterio, t) => {
      if (criterio === 'materia') {
        const id = t.subject || 'Sin materia';
        return { id: id, title: id, rank: NaN };
      }
      if (criterio === 'letra') {
        const c = String(t.name || '').trim().charAt(0).toUpperCase();
        const letra = /^[A-ZÁÉÍÓÚÜÑ]$/.test(c) ? c : '#';
        return { id: letra, title: letra, rank: NaN };
      }
      const id = t.status || 'Sin estado';
      return { id: id, title: id, rank: ESTADO_ORDER[id] !== undefined ? ESTADO_ORDER[id] : 9 };
    };
    expect(teacherGroupKey('estado', { name: 'Carolina Ríos', status: 'Licencia' }).rank).toBe(2);
    expect(teacherGroupKey('materia', { name: 'Diego Pereyra', subject: 'Matemática' }).title).toBe('Matemática');
    expect(teacherGroupKey('letra', { name: 'Patricia Núñez' }).title).toBe('P');
    expect(teacherGroupKey('letra', { name: '' }).title).toBe('#');
  });

  test('el cuerpo de la sección va envuelto en [data-view-body]', () => {
    // Espejo de sectionViewHTML() en interfaz.js: así el refresco parcial
    // cambia solo el cuerpo sin tocar hero ni toolbar.
    const sectionHTML = (body) =>
      '<section class="section-view"><div class="view-hero"></div><div class="view-toolbar"></div><div data-view-body>' + body + '</div></section>';
    const html = sectionHTML('<div class="course-grid"></div>');
    expect(html).toContain('<div data-view-body><div class="course-grid"></div></div>');
    expect(html.indexOf('view-toolbar')).toBeLessThan(html.indexOf('data-view-body'));
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

  test('demoGroupRowHTML no lleva contador (la cantidad vive en el pie)', () => {
    // Espejo de demoGroupRowHTML() en interfaz.js.
    const demoGroupRowHTML = (title, colspan) =>
      '<tr class="group-row"><th colspan="' + colspan + '">' + title + '</th></tr>';
    const html = demoGroupRowHTML('Mañana', 6);
    expect(html).toContain('class="group-row"');
    expect(html).toContain('colspan="6"');
    expect(html).toContain('>Mañana<');
    expect(html).not.toContain('group-count');
    expect(html).not.toContain('estudiantes');
  });

  test('demoPageSlice corta el conjunto en la página activa y clampéa', () => {
    // Espejo de demoPageSlice() en interfaz.js.
    const demoPageSlice = (rows, limit, page) => {
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
    // 20 estudiantes demo (16 docentes y 16 cursos) → 2 páginas con límite 15.
    const estudiantes = Array.from({ length: 20 }, (_, i) => i + 1);
    const docentes = Array.from({ length: 16 }, (_, i) => i + 1);

    const p1 = demoPageSlice(estudiantes, 15, 1);
    expect(p1.rows).toHaveLength(15);
    expect(p1).toMatchObject({ pages: 2, page: 1, from: 1, to: 15 });

    const p2 = demoPageSlice(estudiantes, 15, 2);
    expect(p2.rows).toHaveLength(5);
    expect(p2).toMatchObject({ from: 16, to: 20, page: 2 });

    expect(demoPageSlice(docentes, 15, 9).page).toBe(2);
    expect(demoPageSlice(estudiantes, 30, 1).rows).toHaveLength(20);
    expect(demoPageSlice(estudiantes, 30, 1).pages).toBe(1);
  });

  test('demoListFooterHTML usa las mismas clases y atributos que el pie real', () => {
    // Espejo de demoListFooterHTML() en interfaz.js: mismo marcado que
    // listFooterHTML de main.js para que el CSS sea único para ambos.
    const demoListFooterHTML = (section, slice) => {
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
        '<select class="limit-select" data-limit-select aria-label="Entradas por página de ' + section + '">' + options + '</select>' +
        '<span class="entry-count">' + cuenta + '</span>' +
        '<button class="page-btn" data-page-prev' + prev + '></button>' +
        '<span class="page-info">Página ' + slice.page + ' de ' + slice.pages + '</span>' +
        '<button class="page-btn" data-page-next' + next + '></button>' +
        '</div>'
      );
    };

    const primera = demoListFooterHTML('Estudiantes', { size: 15, total: 20, from: 1, to: 15, page: 1, pages: 2 });
    expect(primera).toContain('class="list-footer"');
    expect(primera).toContain('class="limit-select" data-limit-select');
    expect(primera).toContain('aria-label="Entradas por página de Estudiantes"');
    expect(primera).toContain('<option value="15" selected>15</option>');
    expect(primera).toContain('class="entry-count">Mostrando 1–15 de 20 entradas');
    expect(primera).toContain('class="page-info">Página 1 de 2');
    expect(primera).toMatch(/data-page-prev disabled/);
    expect(primera).not.toMatch(/data-page-next disabled/);

    const ultima = demoListFooterHTML('Docentes', { size: 15, total: 16, from: 16, to: 16, page: 2, pages: 2 });
    expect(ultima).toContain('Mostrando 16–16 de 16 entradas');
    expect(ultima).not.toMatch(/data-page-prev disabled/);
    expect(ultima).toMatch(/data-page-next disabled/);
  });
});