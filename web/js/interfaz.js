/**
 * interfaz.js
 * Port vanilla JS de "interfaz.ts" (demo con datos estáticos) pensado
 * para renderizarse con "app.css". Mantiene EXACTO el mismo HTML/clases
 * que el componente React original (lucide-react + useState), usando SVG
 * inline de lucide para los íconos. No requiere build ni React.
 *
 * Uso:
 *   import { initInterfaz } from './interfaz.js';
 *   initInterfaz(document.getElementById('app'), opts);
 */

// ---------------------------------------------------------------------------
// Datos (paridad con interfaz.ts)
// ---------------------------------------------------------------------------

export const SECTIONS = [
  {
    label: 'Estudiantes',
    description: 'Gestiona matrículas y perfiles',
    color: 'blue',
    icon: 'Users',
  },
  {
    label: 'Docentes',
    description: 'Administra el equipo académico',
    color: 'teal',
    icon: 'GraduationCap',
  },
  {
    label: 'Cursos',
    description: 'Organiza la oferta y consultá nóminas por división',
    color: 'orange',
    icon: 'BookOpen',
  },
];

const STUDENTS = [
  { name: 'Valentina Gómez', initials: 'VG', course: '3° A', status: 'Activo', tone: 'blue', email: 'vgomez@escuela.edu', updated: '10 sep, 08:20' },
  { name: 'Mateo Rodríguez', initials: 'MR', course: '2° B', status: 'Activo', tone: 'teal', email: 'mrodriguez@escuela.edu', updated: '10 sep, 09:32' },
  { name: 'Sofía Martínez', initials: 'SM', course: '5° A', status: 'Pendiente', tone: 'orange', email: 'smartinez@escuela.edu', updated: '09 sep, 15:47' },
  { name: 'Benjamín Torres', initials: 'BT', course: '1° C', status: 'Activo', tone: 'violet', email: 'btorres@escuela.edu', updated: '09 sep, 11:05' },
  { name: 'Isabella Vargas', initials: 'IV', course: '4° B', status: 'Activo', tone: 'blue', email: 'ivargas@escuela.edu', updated: '08 sep, 14:18' },
  { name: 'Thiago López', initials: 'TL', course: '3° A', status: 'Pendiente', tone: 'teal', email: 'tlopez@escuela.edu', updated: '08 sep, 10:22' },
];

const TEACHERS = [
  { name: 'Marcos Fernández', initials: 'MF', subject: 'Física', classes: 5, status: 'Activo', tone: 'teal', email: 'mfernandez@escuela.edu', phone: '+54 11 5523-8841' },
  { name: 'Laura Sánchez', initials: 'LS', subject: 'Lengua y Literatura', classes: 7, status: 'Activo', tone: 'blue', email: 'lsanchez@escuela.edu', phone: '+54 11 5534-1120' },
  { name: 'Diego Pereyra', initials: 'DP', subject: 'Matemática', classes: 6, status: 'Activo', tone: 'orange', email: 'dpereyra@escuela.edu', phone: '+54 11 5598-3345' },
  { name: 'Carolina Ríos', initials: 'CR', subject: 'Historia', classes: 4, status: 'Licencia', tone: 'violet', email: 'crios@escuela.edu', phone: '+54 11 5567-9087' },
  { name: 'Andrés Sosa', initials: 'AS', subject: 'Biología', classes: 5, status: 'Activo', tone: 'teal', email: 'asosa@escuela.edu', phone: '+54 11 5541-2236' },
  { name: 'Patricia Núñez', initials: 'PN', subject: 'Geografía', classes: 3, status: 'Activo', tone: 'blue', email: 'pnunez@escuela.edu', phone: '+54 11 5512-7765' },
];

// Cursos demo: cada entrada lleva turno y especialidad para que los menús
// "Filtrar por" / "Ordenar" del mockup tengan datos reales que agrupar.
const COURSES = [
  { name: 'Matemática', level: '5° B', students: 28, teacher: 'Diego Pereyra', schedule: 'Lun · Mié · Vie', turno: 'Mañana', especialidad: 'Técnico en Informática', tone: 'orange', icon: '📐' },
  { name: 'Lengua y Literatura', level: '3° A', students: 31, teacher: 'Laura Sánchez', schedule: 'Mar · Jue', turno: 'Mañana', especialidad: '', tone: 'blue', icon: '📖' },
  { name: 'Física', level: '5° A', students: 24, teacher: 'Marcos Fernández', schedule: 'Lun · Vie', turno: 'Tarde', especialidad: 'Electrónica', tone: 'teal', icon: '🔬' },
  { name: 'Historia', level: '2° B', students: 33, teacher: 'Carolina Ríos', schedule: 'Mié · Jue', turno: 'Mañana', especialidad: 'Electrónica', tone: 'violet', icon: '🏛️' },
  { name: 'Biología', level: '4° A', students: 27, teacher: 'Andrés Sosa', schedule: 'Mar · Vie', turno: 'Tarde', especialidad: 'Técnico en Informática', tone: 'teal', icon: '🧬' },
  { name: 'Geografía', level: '1° C', students: 30, teacher: 'Patricia Núñez', schedule: 'Lun · Mié', turno: 'Mañana', especialidad: '', tone: 'blue', icon: '🌍' },
  { name: 'Química', level: '3° B', students: 26, teacher: 'Marcos Fernández', schedule: 'Mar · Vie', turno: 'Tarde', especialidad: 'Electrónica', tone: 'violet', icon: '⚗️' },
  { name: 'Programación', level: '5° A', students: 24, teacher: 'Diego Pereyra', schedule: 'Lun · Mié', turno: 'Mañana', especialidad: 'Técnico en Informática', tone: 'orange', icon: '💻' },
  { name: 'Dibujo Técnico', level: '1° A', students: 32, teacher: 'Laura Sánchez', schedule: 'Jue', turno: 'Mañana', especialidad: '', tone: 'blue', icon: '📐' },
  { name: 'Educación Física', level: '4° B', students: 29, teacher: 'Andrés Sosa', schedule: 'Vie', turno: 'Tarde', especialidad: '', tone: 'teal', icon: '⚽' },
];

// Menús "Filtrar por" de cada sección del mockup (mismo patrón que la app
// real; los criterios se adaptan a los datos demo de cada vista).
const SECTION_FILTERS = {
  Estudiantes: [
    { v: 'none', l: 'Ninguno' },
    { v: 'estado', l: 'Estado' },
    { v: 'curso', l: 'Curso' },
    { v: 'anio', l: 'Año' },
  ],
  Docentes: [
    { v: 'none', l: 'Ninguno' },
    { v: 'estado', l: 'Estado' },
    { v: 'materia', l: 'Materia' },
    { v: 'letra', l: 'Letra' },
  ],
  Cursos: [
    { v: 'none', l: 'Ninguno' },
    { v: 'anio', l: 'Año' },
    { v: 'especialidad', l: 'Especialidad' },
    { v: 'turno', l: 'Turno' },
  ],
};

// Título de las secciones del mockup según el criterio de agrupación activo.
const SECTION_TITLES = {
  Estudiantes: {
    none: 'Registro de estudiantes',
    estado: 'Estudiantes por estado',
    curso: 'Estudiantes por curso',
    anio: 'Estudiantes por año',
  },
  Docentes: {
    none: 'Equipo docente',
    estado: 'Docentes por estado',
    materia: 'Docentes por materia',
    letra: 'Docentes por apellido',
  },
};

const TURNO_ORDER = { Mañana: 1, Tarde: 2, Noche: 3 };

function courseYear(c) {
  const m = /^(\d+)/.exec(String(c.level || ''));
  return m ? Number(m[1]) : 0;
}

// Orden siempre por año y división; solo cambia la dirección.
function demoSortCourses(rows, dir) {
  const out = rows.slice();
  out.sort((a, b) => {
    let d = courseYear(a) - courseYear(b);
    if (d === 0) d = a.level.localeCompare(b.level, 'es');
    return d;
  });
  if (dir === 'desc') out.reverse();
  return out;
}

function demoGroupCourses(rows, criterio, dir) {
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
      index[id] = { id: id, title: title, items: [] };
      buckets.push(index[id]);
    }
    index[id].items.push(c);
  });
  buckets.sort((a, b) => {
    if (key === 'anio') return Number(a.id) - Number(b.id);
    if (key === 'turno') return (TURNO_ORDER[a.id] || 9) - (TURNO_ORDER[b.id] || 9);
    return String(a.title).localeCompare(String(b.title), 'es');
  });
  const ordered = dir === 'desc' ? buckets.slice().reverse() : buckets;
  return ordered.map((g) => ({ title: g.title, items: g.items }));
}

// demoGroupRows: agrupador genérico del mockup. El extractor recibe
// (criterio, fila) y devuelve { id, title, rank } (paridad con groupRowsBy()
// de la app real): los grupos se ordenan por rank o, si no es numérico, por
// título; dir='desc' invierte el orden final.
function demoGroupRows(rows, criterio, dir, extract) {
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

const ESTADO_ORDER = { 'Activo': 0, 'Pendiente': 1, 'Licencia': 2 };
const LETRA_RE = /^[A-ZÁÉÍÓÚÜÑ]$/;

function courseParts(course) {
  const parts = String(course || '').split('°');
  return { anio: Number(parts[0]) || 0, resto: String(parts[1] || '').trim() };
}

function estadoRank(status) {
  return ESTADO_ORDER[status] !== undefined ? ESTADO_ORDER[status] : 9;
}

function letraDe(nombre) {
  const c = String(nombre || '').trim().charAt(0).toUpperCase();
  return LETRA_RE.test(c) ? c : '#';
}

// studentGroupKey: grupos de la vista Estudiantes (estado, curso o año).
function studentGroupKey(criterio, s) {
  const p = courseParts(s.course);
  if (criterio === 'curso') {
    const id = s.course || 'Sin curso';
    return { id: id, title: id, rank: p.anio * 100 + (p.resto ? p.resto.charCodeAt(0) : 0) };
  }
  if (criterio === 'anio') {
    return { id: p.anio, title: p.anio ? p.anio + '° Año' : 'Sin año', rank: p.anio };
  }
  const id = s.status || 'Sin estado';
  return { id: id, title: id, rank: estadoRank(s.status) };
}

// teacherGroupKey: grupos de la vista Docentes (estado, materia o letra).
function teacherGroupKey(criterio, t) {
  if (criterio === 'materia') {
    const id = t.subject || 'Sin materia';
    return { id: id, title: id, rank: NaN };
  }
  if (criterio === 'letra') {
    const letra = letraDe(t.name);
    return { id: letra, title: letra, rank: NaN };
  }
  const id = t.status || 'Sin estado';
  return { id: id, title: id, rank: estadoRank(t.status) };
}

// demoSortByName: orden natural (A→Z) por nombre; dir='desc' lo invierte.
function demoSortByName(rows, dir) {
  const out = rows.slice();
  out.sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
  if (dir === 'desc') out.reverse();
  return out;
}

// demoGroupRowHTML: fila de encabezado de grupo dentro de una tabla.
function demoGroupRowHTML(title, count, colspan, unidad) {
  return (
    '<tr class="group-row">' +
    '<th colspan="' + colspan + '">' + esc(title) +
    '<span class="group-count">' + count + ' ' + esc(unidad) + '</span>' +
    '</th></tr>'
  );
}

// demoGroupBlock: bloque con encabezado + contenido (tarjetas o listas).
function demoGroupBlock(title, count, unidad, iconName, inner) {
  return (
    '<div class="course-group">' +
    '<div class="course-group-header">' +
    '<div class="group-icon">' + icon(iconName, 18) + '</div>' +
    '<div><strong>' + esc(title) + '</strong><span>' + count + ' ' + esc(unidad) + '</span></div>' +
    '</div>' + inner +
    '</div>'
  );
}

// ---------------------------------------------------------------------------
// Íconos lucide (SVG inline; mismos glifos que lucide-react)
// ---------------------------------------------------------------------------

const ICON_SVG = {
  AlertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />',
  ArrowUpRight: '<path d="M7 7h10v10" /><path d="M7 17 17 7" />',
  Bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />',
  Moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />',
  Sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  BookMarked: '<path d="M10 2v8l3-3 3 3V2" /><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />',
  BookOpen: '<path d="M12 5v16" /><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />',
  CalendarDays: '<path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M8 13h.01" /><path d="M12 13h.01" /><path d="M16 13h.01" /><path d="M8 17h.01" /><path d="M12 17h.01" /><path d="M16 17h.01" />',
  CheckCircle2: '<circle cx="12" cy="12" r="10" /><path d="m16 9-5.5 5.5L8 12" />',
  ChevronRight: '<path d="m9 18 6-6-6-6" />',
  ChevronDown: '<path d="m6 9 6 6 6-6" />',
  ArrowUpDown: '<path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" />',
  ClipboardList: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />',
  Clock: '<circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />',
  Download: '<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />',
  Database: '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />',
  Filter: '<path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />',
  GraduationCap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />',
  LayoutDashboard: '<rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />',
  LayoutGrid: '<rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />',
  LogOut: '<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  Mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />',
  Menu: '<path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" />',
  MoreHorizontal: '<circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />',
  Phone: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />',
  Pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />',
  Plus: '<path d="M5 12h14" /><path d="M12 5v14" />',
  Search: '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />',
  Settings: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" />',
  ScrollText: '<path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />',
  ShieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" />',
  Shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  Sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />',
  Trash2: '<path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  UserPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />',
  Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" />',
  X: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
BadgeCheck: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" />',
  RotateCw: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />',
  ScanText: '<path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 8h8" /><path d="M7 12h10" /><path d="M7 16h6" />',
  Upload: '<path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />',
  DatabaseBackup: '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v8a9 3 0 0 0 5 2.7" /><path d="M3 13a9 3 0 0 0 5 2.7" /><path d="M16 13a9 3 0 0 0 5-2.7" /><path d="M12 15v7" /><path d="m9 21 3 3 3-3" />',
};

function icon(name, size, strokeWidth) {
  const sw = strokeWidth || 2;
  const s = size || 19;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICON_SVG[name] || '') +
    '</svg>'
  );
}
export { ICON_SVG, icon };

export async function apiGet(url, init) {
  const res = await fetch(url, init);
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
  }
  return res;
}

function getStoredTheme() {
  try {
    return localStorage.getItem('mozart-theme') === 'dark' ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

// ---------------------------------------------------------------------------
// Helpers de render (HTML) — paridad exacta con interfaz.ts
// ---------------------------------------------------------------------------

export function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sectionMeta(label) {
  const meta = SECTIONS.find((s) => s.label === label);
  return meta || SECTIONS[0];
}

export function statusClass(status) {
  if (status === 'Licencia') return 'status status-leave';
  return status === 'Pendiente' ? 'status status-pending' : 'status status-active';
}

function statCard(iconName, label, value, trend, detail, color) {
  return (
    '<div class="stat-card">' +
    '<div class="stat-icon icon-' + color + '">' + icon(iconName, 21) + '</div>' +
    '<div class="stat-copy">' +
    '<span>' + esc(label) + '</span>' +
    '<strong>' + esc(value) + '</strong>' +
    '<small><b class="trend-' + color + '">' + esc(trend) + '</b> ' + esc(detail) + '</small>' +
    '</div>' +
    '<div class="stat-lines"></div>' +
    '</div>'
  );
}

function quickCard(section) {
  return (
    '<button class="quick-card" data-section="' + esc(section.label) + '" type="button">' +
    '<div class="quick-icon icon-' + section.color + '">' + icon(section.icon, 24) + '</div>' +
    '<div><strong>' + esc(section.label) + '</strong><span>' + esc(section.description) + '</span></div>' +
    '<span class="quick-arrow">' + icon('ArrowUpRight', 18) + '</span>' +
    '</button>'
  );
}

function activity(iconName, title, detail, time, color) {
  return (
    '<div class="activity-row">' +
    '<div class="activity-icon icon-' + color + '">' + icon(iconName, 17) + '</div>' +
    '<div><strong>' + esc(title) + '</strong><span>' + esc(detail) + '</span></div>' +
    '<time>' + esc(time) + '</time>' +
    '</div>'
  );
}

function studentRowHome(student) {
  return (
    '<div class="student-row">' +
    '<div class="avatar avatar-' + student.tone + '">' + esc(student.initials) + '</div>' +
    '<div class="student-info"><strong>' + esc(student.name) + '</strong><span>' + esc(student.course) + '</span></div>' +
    '<span class="' + statusClass(student.status) + '">' + esc(student.status) + '</span>' +
    '</div>'
  );
}

function dashboardHTML() {
  const quick = SECTIONS.map(quickCard).join('');
  const recent = [
    activity('Users', 'Nuevo estudiante registrado', 'Valentina Gómez · 3° A', 'Hace 12 min', 'blue'),
    activity('BookOpen', 'Curso actualizado', 'Matemática · 5° B', 'Hace 46 min', 'orange'),
    activity('GraduationCap', 'Docente asignado', 'Marcos Fernández · Física', 'Hace 2 h', 'teal'),
    activity('ClipboardList', 'Listado exportado', 'Cursos · nóminas · 2° ciclo', 'Ayer', 'violet'),
  ].join('');
  const homeStudents = STUDENTS.slice(0, 3).map(studentRowHome).join('');

  return (
    '<section class="welcome-row">' +
    '<div>' +
    '<div class="eyebrow"><span class="eyebrow-dot"></span>Jueves, 10 de septiembre de 2026</div>' +
    '<h1>Hola, Administrador <span>•</span></h1>' +
    '<p>Este es el resumen de tu establecimiento para hoy.</p>' +
    '</div>' +
    '<button class="primary-button" data-section="Estudiantes" type="button">' + icon('Plus', 18) + ' Nuevo registro</button>' +
    '</section>' +

    '<section class="stats-grid">' +
    statCard('Users', 'Estudiantes', '1.248', '12,5%', 'vs. mes anterior', 'blue') +
    statCard('GraduationCap', 'Docentes', '86', '4,2%', 'plantel activo', 'teal') +
    statCard('BookOpen', 'Cursos activos', '42', '8 nuevos', 'este ciclo lectivo', 'orange') +
    statCard('CheckCircle2', 'Asistencia promedio', '94,8%', '2,1%', 'últimos 30 días', 'violet') +
    '</section>' +

    '<section class="quick-section">' +
    '<div class="section-heading">' +
    '<div><h2>Accesos rápidos</h2><p>Todo lo que necesitas, a un solo clic.</p></div>' +
    '<span class="heading-spark">' + icon('Sparkles', 22) + '</span>' +
    '</div>' +
    '<div class="quick-grid">' + quick + '</div>' +
    '</section>' +

    '<section class="dashboard-columns">' +
    '<div class="panel activity-panel">' +
    '<div class="panel-heading">' +
    '<div><h2>Actividad reciente</h2><p>Movimientos del sistema</p></div>' +
    '<button class="text-button" type="button">Ver todo ' + icon('ArrowUpRight', 15) + '</button>' +
    '</div>' +
    '<div class="activity-list">' + recent + '</div>' +
    '</div>' +

    '<div class="panel students-panel">' +
    '<div class="panel-heading">' +
    '<div><h2>Últimos estudiantes</h2><p>Registros incorporados recientemente</p></div>' +
    '<button class="circle-button" data-section="Estudiantes" aria-label="Ver estudiantes" type="button">' + icon('ArrowUpRight', 17) + '</button>' +
    '</div>' +
    '<div class="student-list">' + homeStudents + '</div>' +
    '<button class="outline-button" data-section="Estudiantes" type="button">Ver todos los estudiantes ' + icon('ArrowUpRight', 15) + '</button>' +
    '</div>' +
    '</section>'
  );
}

function studentRowHTML(s) {
  return (
    '<tr>' +
    '<td><div class="table-person"><div class="avatar avatar-' + s.tone + '">' + esc(s.initials) + '</div><strong>' + esc(s.name) + '</strong></div></td>' +
    '<td>' + esc(s.course) + '</td>' +
    '<td><span class="' + statusClass(s.status) + '">' + esc(s.status) + '</span></td>' +
    '<td><span class="cell-muted">' + esc(s.email) + '</span></td>' +
    '<td><span class="cell-muted">' + esc(s.updated) + '</span></td>' +
    '<td><button class="row-action" aria-label="Abrir ' + esc(s.name) + '" type="button">' + icon('MoreHorizontal', 18) + '</button></td>' +
    '</tr>'
  );
}

function studentsViewHTML() {
  const filter = sectionFilters.Estudiantes;
  const dir = sectionSortDirs.Estudiantes;
  const ordered = demoSortByName(STUDENTS, dir);
  // 'none' (default) = filas planas; el resto agrupa con fila de encabezado.
  const rows = filter === 'none'
    ? ordered.map(studentRowHTML).join('')
    : demoGroupRows(ordered, filter, dir, studentGroupKey)
        .map((g) => demoGroupRowHTML(g.title, g.items.length, 6, 'estudiantes') + g.items.map(studentRowHTML).join(''))
        .join('');
  const title = SECTION_TITLES.Estudiantes[filter] || SECTION_TITLES.Estudiantes.none;

  return (
    '<div class="data-panel">' +
    '<div class="panel-heading">' +
    '<div><h2>' + esc(title) + '</h2><p>' + STUDENTS.length + ' registros encontrados</p></div>' +
    '<button class="text-button" type="button">Exportar ' + icon('ArrowUpRight', 15) + '</button>' +
    '</div>' +
    '<div class="table-wrap"><table><thead><tr>' +
    '<th>Estudiante</th><th>Curso</th><th>Estado</th><th>Correo</th><th>Última actualización</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>'
  );
}

function teacherCardHTML(t) {
  return (
    '<div class="teacher-card">' +
    '<div class="teacher-top">' +
    '<div class="teacher-avatar avatar-' + t.tone + '">' + esc(t.initials) + '</div>' +
    '<span class="' + statusClass(t.status) + '">' + esc(t.status) + '</span>' +
    '</div>' +
    '<div class="teacher-body"><strong>' + esc(t.name) + '</strong><span class="teacher-subject">' + esc(t.subject) + '</span></div>' +
    '<div class="teacher-meta">' +
    '<div class="meta-row">' + icon('BookOpen', 14) + '<span>' + t.classes + ' cursos asignados</span></div>' +
    '<div class="meta-row">' + icon('Mail', 14) + '<span class="cell-muted">' + esc(t.email) + '</span></div>' +
    '<div class="meta-row">' + icon('Phone', 14) + '<span class="cell-muted">' + esc(t.phone) + '</span></div>' +
    '</div>' +
    '<button class="outline-button teacher-action" type="button">Ver perfil ' + icon('ArrowUpRight', 15) + '</button>' +
    '</div>'
  );
}

function teachersViewHTML() {
  const filter = sectionFilters.Docentes;
  const dir = sectionSortDirs.Docentes;
  const ordered = demoSortByName(TEACHERS, dir);
  // 'none' (default) = grilla; el resto agrupa con encabezado por valor.
  const grid = filter === 'none'
    ? '<div class="teacher-grid">' + ordered.map(teacherCardHTML).join('') + '</div>'
    : '<div class="course-list-wrap">' +
      demoGroupRows(ordered, filter, dir, teacherGroupKey)
        .map((g) =>
          demoGroupBlock(g.title, g.items.length, 'docentes', 'GraduationCap',
            '<div class="teacher-grid">' + g.items.map(teacherCardHTML).join('') + '</div>'))
        .join('') +
      '</div>';
  const title = SECTION_TITLES.Docentes[filter] || SECTION_TITLES.Docentes.none;

  return (
    '<div class="stats-grid">' +
    statCard('GraduationCap', 'Total docentes', '86', '4,2%', 'plantel activo', 'teal') +
    statCard('BookOpen', 'Materias asignadas', '112', '6 nuevas', 'este ciclo', 'blue') +
    statCard('Clock', 'En licencia', '4', '2,3%', 'ausencias temporales', 'orange') +
    statCard('CheckCircle2', 'Disponibilidad', '95,3%', '1,8%', 'este mes', 'violet') +
    '</div>' +
    '<div class="card-grid-heading"><div><h2>' + esc(title) + '</h2><p>Personal académico del establecimiento</p></div></div>' +
    grid
  );
}

function coursesViewHTML() {
  const filter = sectionFilters.Cursos;
  const dir = sectionSortDirs.Cursos;
  const ordered = demoSortCourses(COURSES, dir);

  const cards = ordered
    .map(
      (c) =>
        '<div class="course-card">' +
        '<div class="course-top">' +
        '<div class="course-emoji bg-' + c.tone + '">' + c.icon + '</div>' +
        '<div class="course-top-right"><span class="course-level level-' + c.tone + '">' + esc(c.level) + '</span></div>' +
        '</div>' +
        '<div class="course-body"><strong>' + esc(c.name) + '</strong><span class="course-teacher">Dictado por ' + esc(c.teacher) + '</span></div>' +
        '<div class="course-meta">' +
        '<div class="meta-row">' + icon('Users', 14) + '<span>' + c.students + ' estudiantes</span></div>' +
        '<div class="meta-row">' + icon('CalendarDays', 14) + '<span>' + esc(c.schedule) + '</span></div>' +
        (c.especialidad
          ? '<div class="meta-row">' + icon('BookMarked', 14) + '<span>' + esc(c.especialidad) + '</span></div>'
          : '') +
        '</div>' +
        '<button class="course-link" type="button">Ver detalles ' + icon('ChevronRight', 15) + '</button>' +
        '</div>'
    )
    .join('');

  const stats =
    '<div class="stats-grid">' +
    statCard('BookOpen', 'Cursos activos', '42', '8 nuevos', 'este ciclo lectivo', 'orange') +
    statCard('Users', 'Inscriptos totales', '1.248', '12,5%', 'estudiantes', 'blue') +
    statCard('GraduationCap', 'Docentes asignados', '86', '100%', 'cobertura', 'teal') +
    statCard('CalendarDays', 'Promedio por curso', '29,7', '2,1', 'estudiantes/curso', 'violet') +
    '</div>';

  // 'none' (default) = grilla; el resto agrupa con un encabezado por valor,
  // igual que la app real.
  const head = COURSE_HEADINGS[filter] || COURSE_HEADINGS.none;
  const heading =
    '<div class="card-grid-heading"><div><h2>' + esc(head[0]) + '</h2><p>' + esc(head[1]) + '</p></div></div>';
  const body = filter === 'none'
    ? '<div class="course-grid">' + cards + '</div>'
    : courseGroupedHTML(ordered);

  return stats + heading + body;
}

const COURSE_HEADINGS = {
  none: ['Catálogo de cursos', 'Materias y asignaciones del ciclo lectivo 2026'],
  anio: ['Nóminas por curso', 'Agrupadas por año de cursada'],
  especialidad: ['Cursos por especialidad', 'Agrupadas por especialidad (orientación)'],
  turno: ['Cursos por turno', 'Agrupadas por turno de cursada'],
};

function courseGroupedHTML(ordered) {
  const groups = demoGroupCourses(ordered, sectionFilters.Cursos, sectionSortDirs.Cursos)
    .map((g) => {
      const total = g.items.reduce((acc, c) => acc + c.students, 0);
      const cards = g.items
        .map(
          (c) =>
            '<div class="course-section-card">' +
            '<div class="section-card-top"><div class="section-badge">' + esc(c.level) + '</div><span class="section-count">' + esc(c.turno || '') + '</span></div>' +
            '<div class="section-card-body"><strong>' + esc(c.name) + '</strong>' +
            '<span class="cell-muted">' + icon('Users', 13) + ' ' + esc(c.teacher) + '</span></div>' +
            '<button class="section-link" type="button">Ver nómina ' + icon('ArrowUpRight', 14) + '</button>' +
            '</div>'
        )
        .join('');
      return (
        '<div class="course-group">' +
        '<div class="course-group-header">' +
        '<div class="group-icon">' + icon('ClipboardList', 18) + '</div>' +
        '<div><strong>' + esc(g.title) + '</strong><span>' + g.items.length + ' divisiones · ' + total + ' estudiantes</span></div>' +
        '</div>' +
        '<div class="course-sections-grid">' + cards + '</div>' +
        '</div>'
      );
    })
    .join('');

  return '<div class="course-list-wrap">' + groups + '</div>';
}

function demoMenuItem(val, label, active) {
  return (
    '<button class="filter-menu-item' + (active ? ' active' : '') + '" data-set="filter" data-val="' + esc(val) + '" type="button" role="menuitem">' +
    '<span class="filter-menu-mark">' + (active ? '✓' : '') + '</span>' +
    esc(label) +
    '</button>'
  );
}

function menuPanel(section) {
  const list = SECTION_FILTERS[section] || SECTION_FILTERS.Cursos;
  const active = sectionFilters[section] || 'none';
  return (
    '<div class="filter-menu-panel" role="menu">' +
    list.map((f) => demoMenuItem(f.v, f.l, active === f.v)).join('') +
    '</div>'
  );
}

// courseDirLabel / sectionFilterLabel: rótulos del toolbar (paridad con
// main.js).
function courseDirLabel(isDesc) {
  return 'Ordenar: ' + (isDesc ? 'Descendente ↓' : 'Ascendente ↑');
}

function sectionFilterLabel(section) {
  const list = SECTION_FILTERS[section] || SECTION_FILTERS.Cursos;
  const active = sectionFilters[section] || 'none';
  const filter = list.find((f) => f.v === active) || list[0];
  return 'Filtrar por: ' + filter.l;
}

// Menú de filtro + botón que solo alterna la dirección del orden (↑/↓), por
// sección. El botón de orden no lleva 'active': se ve igual en ↑ y ↓.
function sectionToolbarHTML(section) {
  const isDesc = sectionSortDirs[section] === 'desc';
  const isActive = (sectionFilters[section] || 'none') !== 'none';
  return (
    '<div class="filter-menu">' +
    '<button class="filter-button' + (isActive ? ' active' : '') + '" data-menu="filter" type="button" aria-haspopup="true" aria-expanded="' + (openMenu === 'filter') + '">' +
    icon('Filter', 16) + ' ' + esc(sectionFilterLabel(section)) + icon('ChevronDown', 15) + '</button>' +
    (openMenu === 'filter' ? menuPanel(section) : '') +
    '</div>' +
    '<button class="filter-button" data-dir-toggle type="button" aria-pressed="' + isDesc + '">' +
    icon('ArrowUpDown', 16) + ' ' + courseDirLabel(isDesc) + '</button>'
  );
}

// ---------------------------------------------------------------------------
// Refresco parcial de la sección activa: actualiza solo el cuerpo y los
// rótulos del toolbar para no reconstruir toda la sección (evita re-disparar
// su animación).
// ---------------------------------------------------------------------------

function sectionDom(state) {
  if (!SECTION_FILTERS[state.section]) return null;
  const content = state.root.querySelector('[data-content]');
  if (!content) return null;
  const body = content.querySelector('[data-view-body]');
  const dirBtn = content.querySelector('[data-dir-toggle]');
  const filterBtn = content.querySelector('[data-menu="filter"]');
  if (!body || !dirBtn || !filterBtn) return null;
  return { body: body, dirBtn: dirBtn, filterBtn: filterBtn };
}

function syncSectionToolbar(state, dom) {
  const d = dom || sectionDom(state);
  if (!d) return false;
  const section = state.section;
  const isDesc = sectionSortDirs[section] === 'desc';
  d.dirBtn.innerHTML = icon('ArrowUpDown', 16) + ' ' + courseDirLabel(isDesc);
  d.dirBtn.setAttribute('aria-pressed', String(isDesc));
  d.filterBtn.innerHTML = icon('Filter', 16) + ' ' + esc(sectionFilterLabel(section)) + icon('ChevronDown', 15);
  d.filterBtn.classList.toggle('active', (sectionFilters[section] || 'none') !== 'none');
  d.filterBtn.setAttribute('aria-expanded', String(openMenu === 'filter'));
  return true;
}

function refreshSection(state) {
  const dom = sectionDom(state);
  if (!dom) return false;
  dom.body.innerHTML = sectionBodyHTML(state.section);
  return syncSectionToolbar(state, dom);
}

function setSectionMenu(state, open) {
  const dom = sectionDom(state);
  if (!dom) return false;
  const wrap = dom.filterBtn.parentNode;
  if (!wrap || !wrap.classList.contains('filter-menu')) return false;
  const panel = wrap.querySelector('.filter-menu-panel');
  if (open && !panel) {
    wrap.insertAdjacentHTML('beforeend', menuPanel(state.section));
  } else if (!open && panel) {
    panel.remove();
  }
  openMenu = open ? 'filter' : null;
  syncSectionToolbar(state, dom);
  return true;
}

function sectionBodyHTML(section) {
  if (section === 'Estudiantes') return studentsViewHTML();
  if (section === 'Docentes') return teachersViewHTML();
  if (section === 'Cursos') return coursesViewHTML();
  return '';
}

function sectionViewHTML(section) {
  const meta = sectionMeta(section);
  const body = sectionBodyHTML(section);

  const agregar =
    section === 'Estudiantes'
      ? 'estudiante'
      : section === 'Docentes'
      ? 'docente'
      : 'curso';

  // Menús de filtro y orden en las secciones con criterios.
  const controls = SECTION_FILTERS[section] ? sectionToolbarHTML(section) : '';

  return (
    '<section class="section-view">' +
    '<div class="view-hero">' +
    '<div class="view-hero-icon icon-' + meta.color + '">' + icon(meta.icon, 28) + '</div>' +
    '<div>' +
    '<div class="eyebrow"><span class="eyebrow-dot"></span>Gestión académica</div>' +
    '<h1>' + esc(section) + '</h1>' +
    '<p>' + esc(meta.description) + '. Consulta, organiza y mantén la información actualizada.</p>' +
    '</div>' +
    '<button class="primary-button" type="button">' + icon('Plus', 18) + ' Agregar ' + esc(agregar) + '</button>' +
    '</div>' +
    '<div class="view-toolbar">' +
    controls +
    '<button class="filter-button" type="button">' + icon('Filter', 16) + ' Filtros</button>' +
    '<button class="filter-button" type="button">' + icon('CalendarDays', 17) + ' Este ciclo lectivo</button>' +
    '<button class="filter-button" type="button">' + icon('Download', 16) + ' Exportar' + '</button>' +
    '</div>' +
    '<div data-view-body>' + body + '</div>' +
    '</section>'
  );
}

// ---------------------------------------------------------------------------
// Shell (sidebar + topbar) — paridad con interfaz.ts
// ---------------------------------------------------------------------------

function navItems(activeSection) {
  const home = navButton('layout-dashboard', 'Inicio', 'Panel principal', activeSection === 'Inicio', null);
  const items = SECTIONS.map((s) =>
    navButton(s.icon, s.label, s.label, activeSection === s.label, s.label === 'Cursos' ? 8 : null)
  ).join('');
  return home + items;
}

function navButton(iconName, dataSection, label, active, count) {
  return (
    '<button class="nav-item' + (active ? ' active' : '') + '" data-section="' + esc(dataSection) + '" type="button">' +
    icon(iconName, 19) +
    '<span>' + esc(label) + '</span>' +
    (count !== undefined && count !== null ? '<span class="nav-count">' + count + '</span>' : '') +
    '</button>'
  );
}

function buildShellHTML(opts, activeSection) {
  const user = opts.user || {};
  const nombre = user.nombre || 'Administrador';
  const iniciales = (nombre.trim().split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2) || 'AD').toUpperCase();
  const breadcrumb = activeSection === 'Inicio' ? 'Panel principal' : activeSection;

  return (
    '<div class="app-shell">' +
    '<aside class="sidebar">' +
    '<div class="brand">' +
    '<div class="brand-mark">' + icon('ShieldCheck', 22, 2.4) + '</div>' +
    '<div><strong>ESTN°3</strong><span>Gestión académica</span></div>' +
    '<button class="close-sidebar" aria-label="Cerrar menú" type="button">' + icon('X', 20) + '</button>' +
    '</div>' +
    '<div class="sidebar-label">Espacio de trabajo</div>' +
    '<nav class="main-nav" aria-label="Navegación principal">' + navItems(activeSection) + '</nav>' +
    '<div class="sidebar-bottom">' +
    '<div class="help-card">' + icon('Sparkles', 18) + '<div><strong>Todo bajo control</strong><span>Tu información está protegida.</span></div></div>' +
    '<button class="nav-item" type="button">' + icon('Settings', 19) + '<span>Configuración</span></button>' +
    '<div class="profile-mini">' +
    '<div class="avatar avatar-navy">' + esc(iniciales) + '</div>' +
    '<div><strong>' + esc(nombre) + '</strong><span>Cuenta institucional</span></div>' +
    icon('MoreHorizontal', 18) +
    '</div>' +
    '</div>' +
    '</aside>' +
    '<main class="main-area">' +
    '<header class="topbar">' +
    '<button class="mobile-menu" aria-label="Abrir menú" type="button">' + icon('Menu', 22) + '</button>' +
    '<div class="breadcrumbs"><span>Establecimiento</span>' + icon('ChevronRight', 15) + '<strong>' + esc(breadcrumb) + '</strong></div>' +
    '<div class="topbar-actions">' +
    '<button class="icon-button theme-toggle" aria-label="Cambiar tema claro u oscuro" title="Cambiar apariencia" type="button">' + icon(opts.theme === 'dark' ? 'Moon' : 'Sun', 19) + '</button>' +
    '<div class="top-avatar">' + esc(iniciales) + '</div>' +
    '<div class="top-search">' + icon('Search', 17) + '<input placeholder="Buscar en el sistema" aria-label="Buscar en el sistema" autocomplete="off" /></div>' +
    '</div>' +
    '</header>' +
    '<div class="content-wrap" data-content>' + buildContentHTML(activeSection) + '</div>' +
    '</main>' +
    '</div>'
  );
}

function buildContentHTML(section) {
  return section === 'Inicio' ? dashboardHTML() : sectionViewHTML(section);
}

// ---------------------------------------------------------------------------
// Interacción (equivalente al estado de interfaz.ts)
// ---------------------------------------------------------------------------

// Estado de los menús del mockup por sección: criterio de agrupación ('none'
// = vista plana), dirección del orden y menú abierto. En la app real esto vive
// en main.js con persistencia en localStorage.
const sectionFilters = { Estudiantes: 'none', Docentes: 'none', Cursos: 'none' };
const sectionSortDirs = { Estudiantes: 'asc', Docentes: 'asc', Cursos: 'asc' };
let openMenu = null;

// renderSection: repinta solo el contenido (toolbar + cuerpo) de la sección
// actual, usado al abrir/uso de los menús de filtro y orden.
function renderSection(state) {
  const content = state.root.querySelector('[data-content]');
  if (content) content.innerHTML = buildContentHTML(state.section);
}

function navigate(api, section) {
  if (!section || api.section === section) return;
  api.section = section;
  openMenu = null;

  const navButtons = api.root.querySelectorAll('.nav-item[data-section]');
  navButtons.forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-section') === section);
  });

  const crumb = api.root.querySelector('.breadcrumbs strong');
  if (crumb) crumb.textContent = section === 'Inicio' ? 'Panel principal' : section;

  const content = api.root.querySelector('[data-content]');
  if (content) content.innerHTML = buildContentHTML(section);

  closeSidebar(api);
}

function openSidebar(api) {
  const aside = api.root.querySelector('.sidebar');
  if (!aside.classList.contains('sidebar-open')) aside.classList.add('sidebar-open');
  if (!api.root.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('button');
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-label', 'Cerrar menú');
    overlay.setAttribute('type', 'button');
    api.root.insertBefore(overlay, api.root.querySelector('.app-shell'));
  }
}

function closeSidebar(api) {
  const aside = api.root.querySelector('.sidebar');
  if (aside) aside.classList.remove('sidebar-open');
  const overlay = api.root.querySelector('.sidebar-overlay');
  if (overlay) overlay.remove();
}

/**
 * initInterfaz(root, opts) monta la interfaz mejorada dentro de `root`
 * y devuelve un control { root, section, setSection }.
 * opts: { user: { nombre, rol } }
 */
export function initInterfaz(root, opts) {
  const state = { root: root, section: 'Inicio', setSection: null };
  if (!root) return state;

  const currentTheme = getStoredTheme();
  document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  root.innerHTML = buildShellHTML(Object.assign({}, opts, { theme: currentTheme }), 'Inicio');

  state.setSection = function (section) {
    navigate(state, section);
  };

  root.addEventListener('click', (e) => {
    // Cerrar el menú de filtro si se hace clic fuera de él (sin re-render).
    if (openMenu && !e.target.closest('.filter-menu') && !setSectionMenu(state, false)) {
      openMenu = null;
      renderSection(state);
    }
    // Orden: solo alterna la dirección (asc ↔ desc), sin criterios.
    const dirToggle = e.target.closest('[data-dir-toggle]');
    if (dirToggle) {
      const sortSection = state.section;
      sectionSortDirs[sortSection] = sectionSortDirs[sortSection] === 'desc' ? 'asc' : 'desc';
      if (!refreshSection(state)) renderSection(state);
      return;
    }
    // Menú de filtro de la sección activa.
    const menuBtn = e.target.closest('[data-menu]');
    if (menuBtn) {
      const which = menuBtn.getAttribute('data-menu');
      const open = openMenu !== which;
      if (!setSectionMenu(state, open)) {
        openMenu = open ? which : null;
        renderSection(state);
      }
      return;
    }
    const set = e.target.closest('[data-set]');
    if (set) {
      const val = set.getAttribute('data-val');
      const filterSection = state.section;
      const list = SECTION_FILTERS[filterSection] || [];
      if (list.some((f) => f.v === val)) sectionFilters[filterSection] = val;
      setSectionMenu(state, false);
      if (!refreshSection(state)) renderSection(state);
      return;
    }
    const target = e.target.closest('[data-section]');
    if (target) {
      navigate(state, target.getAttribute('data-section'));
      return;
    }
    if (e.target.closest('.theme-toggle')) {
      const btn = e.target.closest('.theme-toggle');
      const next = currentTheme === 'dark' ? 'light' : 'dark';
      currentTheme = next;
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('mozart-theme', next);
      } catch (err) { /* sin almacenamiento */ }
      btn.innerHTML = icon(next === 'dark' ? 'Moon' : 'Sun', 19);
      return;
    }
    if (e.target.closest('.mobile-menu')) {
      openSidebar(state);
      return;
    }
    if (e.target.closest('.close-sidebar') || e.target.closest('.sidebar-overlay')) {
      closeSidebar(state);
    }
  });

  return state;
}

if (typeof window !== 'undefined') {
  window.initInterfaz = initInterfaz;
}