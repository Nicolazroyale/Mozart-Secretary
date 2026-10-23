import {
  ArrowUpDown,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

type Section =
  | 'Inicio'
  | 'Estudiantes'
  | 'Docentes'
  | 'Cursos';

type CourseFilter = 'none' | 'anio' | 'especialidad' | 'turno';
type CourseDir = 'asc' | 'desc';

// Valores de "Filtrar por" de todas las secciones del mockup.
type FilterValue =
  | CourseFilter
  | 'estado'
  | 'curso'
  | 'materia'
  | 'letra';

// Menús "Filtrar por" de cada sección (mismo patrón que la app real; los
// criterios se adaptan a los datos demo de cada vista).
const SECTION_FILTERS: Record<
  'Estudiantes' | 'Docentes' | 'Cursos',
  { v: FilterValue; l: string }[]
> = {
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

// Título de las secciones según el criterio de agrupación activo.
const SECTION_TITLES: Record<string, Record<string, string>> = {
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

type Group<T> = { title: string; items: T[] };
type GroupKey<T> = { id: string | number; title: string; rank: number };
type Student = (typeof students)[number];
type Teacher = (typeof teachers)[number];

const ESTADO_ORDER: Record<string, number> = {
  Activo: 0,
  Pendiente: 1,
  Licencia: 2,
};

const LETRA_RE = /^[A-ZÁÉÍÓÚÜÑ]$/;

function estadoRank(status: string) {
  return ESTADO_ORDER[status] !== undefined
    ? ESTADO_ORDER[status]
    : 9;
}

function letraDe(nombre: string) {
  const c = nombre.trim().charAt(0).toUpperCase();
  return LETRA_RE.test(c) ? c : '#';
}

function courseParts(course: string) {
  const parts = String(course || '').split('°');
  return {
    anio: Number(parts[0]) || 0,
    resto: String(parts[1] || '').trim(),
  };
}

// sortByName: orden natural (A→Z) por nombre; dir='desc' lo invierte.
function sortByName<T extends { name: string }>(
  rows: T[],
  dir: CourseDir
): T[] {
  const out = rows.slice();
  out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (dir === 'desc') out.reverse();
  return out;
}

// groupRows: agrupador genérico ((criterio, fila) → { id, title, rank }),
// paridad con groupRowsBy() de la app real.
function groupRows<T>(
  rows: T[],
  criterio: FilterValue,
  dir: CourseDir,
  extract: (criterio: FilterValue, row: T) => GroupKey<T>
): Group<T>[] {
  const buckets: (GroupKey<T> & { items: T[] })[] = [];
  const index: Record<string, GroupKey<T> & { items: T[] }> = {};
  rows.forEach((r) => {
    const g = extract(criterio, r);
    const id = String(g.id);
    if (!index[id]) {
      index[id] = { ...g, items: [] };
      buckets.push(index[id]);
    }
    index[id].items.push(r);
  });
  buckets.sort((a, b) => {
    const ra = Number(a.rank);
    const rb = Number(b.rank);
    if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
    return a.title.localeCompare(b.title, 'es');
  });
  const ordered =
    dir === 'desc' ? buckets.slice().reverse() : buckets;
  return ordered.map((g) => ({
    title: g.title,
    items: g.items,
  }));
}

function studentGroupKey(
  criterio: FilterValue,
  s: Student
): GroupKey<Student> {
  const p = courseParts(s.course);
  if (criterio === 'curso') {
    const id = s.course || 'Sin curso';
    return {
      id: id,
      title: id,
      rank:
        p.anio * 100 +
        (p.resto ? p.resto.charCodeAt(0) : 0),
    };
  }
  if (criterio === 'anio') {
    return {
      id: p.anio,
      title: p.anio ? `${p.anio}° Año` : 'Sin año',
      rank: p.anio,
    };
  }
  const id = s.status || 'Sin estado';
  return { id: id, title: id, rank: estadoRank(s.status) };
}

function teacherGroupKey(
  criterio: FilterValue,
  t: Teacher
): GroupKey<Teacher> {
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

const COURSE_HEADINGS: Record<CourseFilter, [string, string]> = {
  none: ['Catálogo de cursos', 'Materias y asignaciones del ciclo lectivo 2026'],
  anio: ['Nóminas por curso', 'Agrupadas por año de cursada'],
  especialidad: [
    'Cursos por especialidad',
    'Agrupadas por especialidad (orientación)',
  ],
  turno: ['Cursos por turno', 'Agrupadas por turno de cursada'],
};

// Límite de entradas y paginación (paridad con pageSlice/listFooterHTML de la
// app real): el mockup pagina en memoria sobre sus datos demo.
const PAGE_SIZES = [15, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 15;

function normalizePageSize(value: number) {
  return PAGE_SIZES.includes(value)
    ? value
    : DEFAULT_PAGE_SIZE;
}

type PageSlice<T> = {
  rows: T[];
  size: number;
  total: number;
  pages: number;
  page: number;
  from: number;
  to: number;
};

function pageSlice<T>(
  rows: T[],
  limit: number,
  page: number
): PageSlice<T> {
  const size = normalizePageSize(limit);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(
    Math.max(1, page || 1),
    pages
  );
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    size,
    total,
    pages,
    page: current,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
  };
}

type Pager = {
  limit: number;
  page: number;
  onLimit: (value: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

type SectionMeta = {
  icon: typeof Users;
  label: Section;
  description: string;
  color: string;
};

const sections: SectionMeta[] = [
  {
    icon: Users,
    label: 'Estudiantes',
    description: 'Gestiona matrículas y perfiles',
    color: 'blue',
  },
  {
    icon: GraduationCap,
    label: 'Docentes',
    description: 'Administra el equipo académico',
    color: 'teal',
  },
  {
    icon: BookOpen,
    label: 'Cursos',
    description:
      'Organiza la oferta y consultá nóminas por división',
    color: 'orange',
  },
];

const students = [
  {
    name: 'Valentina Gómez',
    initials: 'VG',
    course: '3° A',
    status: 'Activo',
    tone: 'blue',
    email: 'vgomez@escuela.edu',
    updated: '10 sep, 08:20',
  },
  {
    name: 'Mateo Rodríguez',
    initials: 'MR',
    course: '2° B',
    status: 'Activo',
    tone: 'teal',
    email: 'mrodriguez@escuela.edu',
    updated: '10 sep, 09:32',
  },
  {
    name: 'Sofía Martínez',
    initials: 'SM',
    course: '5° A',
    status: 'Pendiente',
    tone: 'orange',
    email: 'smartinez@escuela.edu',
    updated: '09 sep, 15:47',
  },
  {
    name: 'Benjamín Torres',
    initials: 'BT',
    course: '1° C',
    status: 'Activo',
    tone: 'violet',
    email: 'btorres@escuela.edu',
    updated: '09 sep, 11:05',
  },
  {
    name: 'Isabella Vargas',
    initials: 'IV',
    course: '4° B',
    status: 'Activo',
    tone: 'blue',
    email: 'ivargas@escuela.edu',
    updated: '08 sep, 14:18',
  },
  {
    name: 'Thiago López',
    initials: 'TL',
    course: '3° A',
    status: 'Pendiente',
    tone: 'teal',
    email: 'tlopez@escuela.edu',
    updated: '08 sep, 10:22',
  },
  {
    name: 'Martina Benítez',
    initials: 'MB',
    course: '2° A',
    status: 'Activo',
    tone: 'violet',
    email: 'mbenitez@escuela.edu',
    updated: '08 sep, 09:41',
  },
  {
    name: 'Joaquín Ferreira',
    initials: 'JF',
    course: '4° A',
    status: 'Pendiente',
    tone: 'teal',
    email: 'jferreira@escuela.edu',
    updated: '07 sep, 16:12',
  },
  {
    name: 'Emilia Peralta',
    initials: 'EP',
    course: '1° B',
    status: 'Activo',
    tone: 'blue',
    email: 'eperalta@escuela.edu',
    updated: '07 sep, 14:05',
  },
  {
    name: 'Bautista Cabrera',
    initials: 'BC',
    course: '5° C',
    status: 'Activo',
    tone: 'orange',
    email: 'bcabrera@escuela.edu',
    updated: '07 sep, 11:38',
  },
  {
    name: 'Renata Álvarez',
    initials: 'RA',
    course: '3° B',
    status: 'Activo',
    tone: 'violet',
    email: 'ralvarez@escuela.edu',
    updated: '06 sep, 15:20',
  },
  {
    name: 'Santino Morales',
    initials: 'SM',
    course: '2° C',
    status: 'Activo',
    tone: 'teal',
    email: 'smorales@escuela.edu',
    updated: '06 sep, 12:47',
  },
  {
    name: 'Olivia Giménez',
    initials: 'OG',
    course: '4° C',
    status: 'Pendiente',
    tone: 'blue',
    email: 'ogimenez@escuela.edu',
    updated: '06 sep, 10:09',
  },
  {
    name: 'Felipe Ocampo',
    initials: 'FO',
    course: '1° A',
    status: 'Activo',
    tone: 'orange',
    email: 'focampo@escuela.edu',
    updated: '05 sep, 17:33',
  },
  {
    name: 'Delfina Vega',
    initials: 'DV',
    course: '5° A',
    status: 'Activo',
    tone: 'violet',
    email: 'dvega@escuela.edu',
    updated: '05 sep, 13:54',
  },
  {
    name: 'Bruno Salinas',
    initials: 'BS',
    course: '3° C',
    status: 'Activo',
    tone: 'teal',
    email: 'bsalinas@escuela.edu',
    updated: '05 sep, 09:26',
  },
  {
    name: 'Alma Rosas',
    initials: 'AR',
    course: '2° A',
    status: 'Activo',
    tone: 'blue',
    email: 'arosas@escuela.edu',
    updated: '04 sep, 16:48',
  },
  {
    name: 'Tomás Aguirre',
    initials: 'TA',
    course: '4° B',
    status: 'Activo',
    tone: 'orange',
    email: 'taguirre@escuela.edu',
    updated: '04 sep, 12:15',
  },
  {
    name: 'Josefa Ledesma',
    initials: 'JL',
    course: '1° C',
    status: 'Pendiente',
    tone: 'violet',
    email: 'jledesma@escuela.edu',
    updated: '03 sep, 15:02',
  },
  {
    name: 'Ian Bustos',
    initials: 'IB',
    course: '5° B',
    status: 'Activo',
    tone: 'teal',
    email: 'ibustos@escuela.edu',
    updated: '03 sep, 10:44',
  },
];

const teachers = [
  {
    name: 'Marcos Fernández',
    initials: 'MF',
    subject: 'Física',
    classes: 5,
    status: 'Activo',
    tone: 'teal',
    email: 'mfernandez@escuela.edu',
    phone: '+54 11 5523-8841',
  },
  {
    name: 'Laura Sánchez',
    initials: 'LS',
    subject: 'Lengua y Literatura',
    classes: 7,
    status: 'Activo',
    tone: 'blue',
    email: 'lsanchez@escuela.edu',
    phone: '+54 11 5534-1120',
  },
  {
    name: 'Diego Pereyra',
    initials: 'DP',
    subject: 'Matemática',
    classes: 6,
    status: 'Activo',
    tone: 'orange',
    email: 'dpereyra@escuela.edu',
    phone: '+54 11 5598-3345',
  },
  {
    name: 'Carolina Ríos',
    initials: 'CR',
    subject: 'Historia',
    classes: 4,
    status: 'Licencia',
    tone: 'violet',
    email: 'crios@escuela.edu',
    phone: '+54 11 5567-9087',
  },
  {
    name: 'Andrés Sosa',
    initials: 'AS',
    subject: 'Biología',
    classes: 5,
    status: 'Activo',
    tone: 'teal',
    email: 'asosa@escuela.edu',
    phone: '+54 11 5541-2236',
  },
  {
    name: 'Patricia Núñez',
    initials: 'PN',
    subject: 'Geografía',
    classes: 3,
    status: 'Activo',
    tone: 'blue',
    email: 'pnunez@escuela.edu',
    phone: '+54 11 5512-7765',
  },
  {
    name: 'Ramiro Castillo',
    initials: 'RC',
    subject: 'Química',
    classes: 5,
    status: 'Activo',
    tone: 'orange',
    email: 'rcastillo@escuela.edu',
    phone: '+54 11 5561-4420',
  },
  {
    name: 'Victoria Ferrer',
    initials: 'VF',
    subject: 'Historia',
    classes: 4,
    status: 'Activo',
    tone: 'blue',
    email: 'vferrer@escuela.edu',
    phone: '+54 11 5577-2210',
  },
  {
    name: 'Hugo Bravo',
    initials: 'HB',
    subject: 'Matemática',
    classes: 6,
    status: 'Activo',
    tone: 'teal',
    email: 'hbravo@escuela.edu',
    phone: '+54 11 5548-9013',
  },
  {
    name: 'Sofía Nogueira',
    initials: 'SN',
    subject: 'Biología',
    classes: 3,
    status: 'Licencia',
    tone: 'violet',
    email: 'snogueira@escuela.edu',
    phone: '+54 11 5539-6672',
  },
  {
    name: 'Nicolás Vera',
    initials: 'NV',
    subject: 'Educación Física',
    classes: 5,
    status: 'Activo',
    tone: 'orange',
    email: 'nvera@escuela.edu',
    phone: '+54 11 5584-3391',
  },
  {
    name: 'Trinidad Sosa',
    initials: 'TS',
    subject: 'Lengua y Literatura',
    classes: 4,
    status: 'Activo',
    tone: 'blue',
    email: 'tsosa@escuela.edu',
    phone: '+54 11 5526-1147',
  },
  {
    name: 'Federico Ibarra',
    initials: 'FI',
    subject: 'Física',
    classes: 5,
    status: 'Activo',
    tone: 'teal',
    email: 'fibarra@escuela.edu',
    phone: '+54 11 5593-7758',
  },
  {
    name: 'Abril Quiroga',
    initials: 'AQ',
    subject: 'Geografía',
    classes: 3,
    status: 'Activo',
    tone: 'violet',
    email: 'aquioga@escuela.edu',
    phone: '+54 11 5557-4406',
  },
  {
    name: 'Gonzalo Prieto',
    initials: 'GP',
    subject: 'Informática',
    classes: 6,
    status: 'Activo',
    tone: 'orange',
    email: 'gprieto@escuela.edu',
    phone: '+54 11 5569-8823',
  },
  {
    name: 'Malena Sandoval',
    initials: 'MS',
    subject: 'Música',
    classes: 4,
    status: 'Licencia',
    tone: 'blue',
    email: 'msandoval@escuela.edu',
    phone: '+54 11 5518-2264',
  },
];

type Course = {
  name: string;
  level: string;
  students: number;
  teacher: string;
  schedule: string;
  turno: string;
  especialidad: string;
  tone: string;
  icon: string;
};

// Cursos demo: cada entrada lleva turno y especialidad para que los menús
// "Filtrar por" / "Ordenar" del mockup tengan datos reales que agrupar.
const courses: Course[] = [
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
  { name: 'Economía', level: '2° A', students: 27, teacher: 'Victoria Ferrer', schedule: 'Lun · Mié', turno: 'Tarde', especialidad: '', tone: 'blue', icon: '💰' },
  { name: 'Inglés', level: '1° B', students: 31, teacher: 'Malena Sandoval', schedule: 'Mar · Jue', turno: 'Mañana', especialidad: '', tone: 'violet', icon: '🌐' },
  { name: 'Robótica', level: '4° A', students: 25, teacher: 'Gonzalo Prieto', schedule: 'Mié', turno: 'Tarde', especialidad: 'Técnico en Informática', tone: 'teal', icon: '🤖' },
  { name: 'Música', level: '2° D', students: 29, teacher: 'Malena Sandoval', schedule: 'Jue', turno: 'Mañana', especialidad: '', tone: 'orange', icon: '🎵' },
  { name: 'Taller de Ciudadanía', level: '5° C', students: 26, teacher: 'Abril Quiroga', schedule: 'Vie', turno: 'Tarde', especialidad: '', tone: 'blue', icon: '🧭' },
  { name: 'Historia del Arte', level: '3° C', students: 28, teacher: 'Victoria Ferrer', schedule: 'Lun', turno: 'Mañana', especialidad: '', tone: 'violet', icon: '🎨' },
];

function App() {
  const [activeSection, setActiveSection] =
    useState<Section>('Inicio');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (section: Section) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          sidebarOpen ? 'sidebar-open' : ''
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={22} strokeWidth={2.4} />
          </div>

          <div>
            <strong>ESTN°3</strong>
            <span>Gestión académica</span>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">
          Espacio de trabajo
        </div>

        <nav
          className="main-nav"
          aria-label="Navegación principal"
        >
          <button
            className={
              activeSection === 'Inicio'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() => navigate('Inicio')}
          >
            <LayoutDashboard size={19} />
            <span>Panel principal</span>
          </button>

          {sections.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className={
                activeSection === label
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              <span>{label}</span>

              {label === 'Cursos' && (
                <span className="nav-count">8</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={18} />

            <div>
              <strong>Todo bajo control</strong>
              <span>Tu información está protegida.</span>
            </div>
          </div>

          <button className="nav-item">
            <Settings size={19} />
            <span>Configuración</span>
          </button>

          <div className="profile-mini">
            <div className="avatar avatar-navy">
              AT
            </div>

            <div>
              <strong>Administrador</strong>
              <span>Cuenta institucional</span>
            </div>

            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumbs">
            <span>Establecimiento</span>
            <ChevronRight size={15} />

            <strong>
              {activeSection === 'Inicio'
                ? 'Panel principal'
                : activeSection}
            </strong>
          </div>

          <div className="topbar-actions">
            <div className="top-search">
              <Search size={17} />

              <input
                placeholder="Buscar en el sistema"
                aria-label="Buscar en el sistema"
              />
            </div>

            <button
              className="icon-button notification"
              aria-label="Notificaciones"
            >
              <Bell size={19} />
              <i />
            </button>

            <div className="top-avatar">
              AT
            </div>
          </div>
        </header>

        <div className="content-wrap">
          {activeSection === 'Inicio' ? (
            <Dashboard onNavigate={navigate} />
          ) : (
            <SectionView section={activeSection} />
          )}
        </div>
      </main>
    </div>
  );
}

function Dashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Jueves, 10 de septiembre de 2026
          </div>

          <h1>
            Hola, Administrador <span>•</span>
          </h1>

          <p>
            Este es el resumen de tu establecimiento para hoy.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => onNavigate('Estudiantes')}
        >
          <Plus size={18} />
          Nuevo registro
        </button>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={Users}
          label="Estudiantes"
          value="1.248"
          trend="12,5%"
          detail="vs. mes anterior"
          color="blue"
        />

        <StatCard
          icon={GraduationCap}
          label="Docentes"
          value="86"
          trend="4,2%"
          detail="plantel activo"
          color="teal"
        />

        <StatCard
          icon={BookOpen}
          label="Cursos activos"
          value="42"
          trend="8 nuevos"
          detail="este ciclo lectivo"
          color="orange"
        />

        <StatCard
          icon={CheckCircle2}
          label="Asistencia promedio"
          value="94,8%"
          trend="2,1%"
          detail="últimos 30 días"
          color="violet"
        />
      </section>

      <section className="quick-section">
        <div className="section-heading">
          <div>
            <h2>Accesos rápidos</h2>
            <p>Todo lo que necesitas, a un solo clic.</p>
          </div>

          <Sparkles
            size={22}
            className="heading-spark"
          />
        </div>

        <div className="quick-grid">
          {sections.map((section) => (
            <QuickCard
              key={section.label}
              section={section}
              onClick={onNavigate}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Actividad reciente</h2>
              <p>Movimientos del sistema</p>
            </div>

            <button className="text-button">
              Ver todo
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="activity-list">
            <Activity
              icon={Users}
              title="Nuevo estudiante registrado"
              detail="Valentina Gómez · 3° A"
              time="Hace 12 min"
              color="blue"
            />

            <Activity
              icon={BookOpen}
              title="Curso actualizado"
              detail="Matemática · 5° B"
              time="Hace 46 min"
              color="orange"
            />

            <Activity
              icon={GraduationCap}
              title="Docente asignado"
              detail="Marcos Fernández · Física"
              time="Hace 2 h"
              color="teal"
            />

            <Activity
              icon={ClipboardList}
              title="Listado exportado"
              detail="Cursos · nóminas · 2° ciclo"
              time="Ayer"
              color="violet"
            />
          </div>
        </div>

        <div className="panel students-panel">
          <div className="panel-heading">
            <div>
              <h2>Últimos estudiantes</h2>
              <p>
                Registros incorporados recientemente
              </p>
            </div>

            <button
              className="circle-button"
              onClick={() => onNavigate('Estudiantes')}
              aria-label="Ver estudiantes"
            >
              <ArrowUpRight size={17} />
            </button>
          </div>

          <div className="student-list">
            {students.slice(0, 3).map((student) => (
              <div
                className="student-row"
                key={student.name}
              >
                <div
                  className={`avatar avatar-${student.tone}`}
                >
                  {student.initials}
                </div>

                <div className="student-info">
                  <strong>{student.name}</strong>
                  <span>{student.course}</span>
                </div>

                <span
                  className={`status ${
                    student.status === 'Activo'
                      ? 'status-active'
                      : 'status-pending'
                  }`}
                >
                  {student.status}
                </span>
              </div>
            ))}
          </div>

          <button
            className="outline-button"
            onClick={() => onNavigate('Estudiantes')}
          >
            Ver todos los estudiantes
            <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  detail,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon icon-${color}`}>
        <Icon size={21} />
      </div>

      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>

        <small>
          <b className={`trend-${color}`}>
            {trend}
          </b>{' '}
          {detail}
        </small>
      </div>

      <div className="stat-lines" />
    </div>
  );
}

function QuickCard({
  section,
  onClick,
}: {
  section: SectionMeta;
  onClick: (section: Section) => void;
}) {
  const Icon = section.icon;

  return (
    <button
      className="quick-card"
      onClick={() => onClick(section.label)}
    >
      <div
        className={`quick-icon icon-${section.color}`}
      >
        <Icon size={24} />
      </div>

      <div>
        <strong>{section.label}</strong>
        <span>{section.description}</span>
      </div>

      <ArrowUpRight
        size={18}
        className="quick-arrow"
      />
    </button>
  );
}

function Activity({
  icon: Icon,
  title,
  detail,
  time,
  color,
}: {
  icon: typeof Users;
  title: string;
  detail: string;
  time: string;
  color: string;
}) {
  return (
    <div className="activity-row">
      <div className={`activity-icon icon-${color}`}>
        <Icon size={17} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>

      <time>{time}</time>
    </div>
  );
}

function SectionView({
  section,
}: {
  section: Section;
}) {
  const meta =
    sections.find((item) => item.label === section) ??
    sections[0];

  const Icon = meta.icon;

  // Menús por sección: criterio de agrupación ('none' = vista plana),
  // dirección del orden y menú abierto. En la app real se persiste en
  // localStorage; aquí vive en el estado del componente.
  const [filters, setFilters] = useState<
    Record<string, FilterValue>
  >({
    Estudiantes: 'none',
    Docentes: 'none',
    Cursos: 'none',
  });
  const [sortDirs, setSortDirs] = useState<
    Record<string, CourseDir>
  >({
    Estudiantes: 'asc',
    Docentes: 'asc',
    Cursos: 'asc',
  });
  const [limits, setLimits] = useState<
    Record<string, number>
  >({
    Estudiantes: DEFAULT_PAGE_SIZE,
    Docentes: DEFAULT_PAGE_SIZE,
    Cursos: DEFAULT_PAGE_SIZE,
  });
  const [pages, setPages] = useState<
    Record<string, number>
  >({
    Estudiantes: 1,
    Docentes: 1,
    Cursos: 1,
  });
  const [openMenu, setOpenMenu] = useState<{
    section: Section;
    which: string;
  } | null>(null);

  // Al cambiar de sección se vuelve a su primera página (paridad con la app
  // real, que resetea la página al navegar).
  const [lastSection, setLastSection] =
    useState<Section>(section);
  if (lastSection !== section) {
    setLastSection(section);
    setPages((prev) => ({ ...prev, [section]: 1 }));
  }

  const menuOpen =
    openMenu !== null &&
    openMenu.section === section &&
    openMenu.which === 'filter';
  const filterValue: FilterValue =
    filters[section] ?? 'none';
  const sortDir: CourseDir = sortDirs[section] ?? 'asc';
  const menuItems = SECTION_FILTERS[section];
  const limit = limits[section] ?? DEFAULT_PAGE_SIZE;
  const page = pages[section] ?? 1;

  // Pie de lista: limitar/ordenar/filtrar vuelven a la primera página.
  const pager: Pager = {
    limit,
    page,
    onLimit: (value: number) => {
      setLimits({
        ...limits,
        [section]: value,
      });
      setPages({ ...pages, [section]: 1 });
    },
    onPrev: () =>
      setPages({
        ...pages,
        [section]: Math.max(1, page - 1),
      }),
    onNext: () =>
      setPages({ ...pages, [section]: page + 1 }),
  };

  return (
    <section className="section-view">
      <div className="view-hero">
        <div
          className={`view-hero-icon icon-${meta.color}`}
        >
          <Icon size={28} />
        </div>

        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Gestión académica
          </div>

          <h1>{section}</h1>

          <p>
            {meta.description}. Consulta, organiza y
            mantén la información actualizada.
          </p>
        </div>

        <button className="primary-button">
          <Plus size={18} />

          Agregar{' '}
          {section === 'Estudiantes'
            ? 'estudiante'
            : section === 'Docentes'
            ? 'docente'
            : 'curso'}
        </button>
      </div>

      <div className="view-toolbar">
        {menuItems && (
          <>
            <div className="filter-menu">
              <button
                className={`filter-button${
                  filterValue !== 'none'
                    ? ' active'
                    : ''
                }`}
                aria-expanded={menuOpen}
                onClick={() =>
                  setOpenMenu(
                    menuOpen
                      ? null
                      : {
                          section: section,
                          which: 'filter',
                        }
                  )
                }
              >
                <Filter size={16} />
                {`Filtrar por: ${
                  menuItems.find(
                    (f) => f.v === filterValue
                  )?.l ?? 'Ninguno'
                }`}
                <ChevronDown size={15} />
              </button>

              {menuOpen && (
                <div className="filter-menu-panel">
                  {menuItems.map((f) => (
                    <button
                      key={f.v}
                      className={`filter-menu-item${
                        filterValue === f.v
                          ? ' active'
                          : ''
                      }`}
                      onClick={() => {
                        setFilters({
                          ...filters,
                          [section]: f.v,
                        });
                        setPages({
                          ...pages,
                          [section]: 1,
                        });
                        setOpenMenu(null);
                      }}
                    >
                      <span className="filter-menu-mark">
                        {filterValue === f.v ? '✓' : ''}
                      </span>
                      {f.l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="filter-button"
              aria-pressed={sortDir === 'desc'}
              onClick={() => {
                setSortDirs({
                  ...sortDirs,
                  [section]:
                    sortDir === 'desc' ? 'asc' : 'desc',
                });
                setPages({
                  ...pages,
                  [section]: 1,
                });
              }}
            >
              <ArrowUpDown size={16} />
              {sortDir === 'desc'
                ? 'Ordenar: Descendente ↓'
                : 'Ordenar: Ascendente ↑'}
            </button>
          </>
        )}

        <div className="local-search">
          <Search size={17} />

          <input
            placeholder={`Buscar ${section.toLowerCase()}...`}
            aria-label={`Buscar ${section.toLowerCase()}`}
          />
        </div>

        <button className="filter-button">
          <Filter size={16} />
          Filtros
        </button>

        <button className="filter-button">
          <CalendarDays size={17} />
          Este ciclo lectivo
        </button>

        <button className="filter-button">
          <Download size={16} />
          Exportar
        </button>
      </div>

      {section === 'Estudiantes' && (
        <StudentsView
          filter={filterValue}
          dir={sortDir}
          pager={pager}
        />
      )}

      {section === 'Docentes' && (
        <TeachersView
          filter={filterValue}
          dir={sortDir}
          pager={pager}
        />
      )}

      {section === 'Cursos' && (
        <CoursesView
          filter={filterValue as CourseFilter}
          dir={sortDir}
          pager={pager}
        />
      )}
    </section>
  );
}

function StudentRow({ student }: { student: Student }) {
  return (
    <tr>
      <td>
        <div className="table-person">
          <div
            className={`avatar avatar-${student.tone}`}
          >
            {student.initials}
          </div>

          <strong>{student.name}</strong>
        </div>
      </td>

      <td>{student.course}</td>

      <td>
        <span
          className={`status ${
            student.status === 'Activo'
              ? 'status-active'
              : 'status-pending'
          }`}
        >
          {student.status}
        </span>
      </td>

      <td>
        <span className="cell-muted">
          {student.email}
        </span>
      </td>

      <td>
        <span className="cell-muted">
          {student.updated}
        </span>
      </td>

      <td>
        <button
          className="row-action"
          aria-label={`Abrir ${student.name}`}
        >
          <MoreHorizontal size={18} />
        </button>
      </td>
    </tr>
  );
}

// Fila de encabezado de grupo dentro de una tabla (sin contadores: la
// cantidad de entradas vive en el pie de la lista).
function GroupHeaderRow({
  title,
  colspan,
}: {
  title: string;
  colspan: number;
}) {
  return (
    <tr className="group-row">
      <th colSpan={colspan}>{title}</th>
    </tr>
  );
}

// Pie de lista: selector de límite (15/30/50/100), la cantidad de entradas
// al lado y la navegación de páginas ‹ ›.
function ListFooter({
  section,
  slice,
  pager,
}: {
  section: string;
  slice: PageSlice<unknown>;
  pager: Pager;
}) {
  const cuenta =
    slice.total === 0
      ? 'Sin entradas para mostrar'
      : `Mostrando ${slice.from}–${slice.to} de ${slice.total} entradas`;

  return (
    <div className="list-footer">
      <div className="list-footer-left">
        <label className="limit-label">
          Mostrar{' '}

          <select
            className="limit-select"
            value={slice.size}
            aria-label={`Entradas por página de ${section}`}
            onChange={(event) =>
              pager.onLimit(
                normalizePageSize(
                  Number(event.target.value)
                )
              )
            }
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          entradas
        </label>

        <span className="entry-count">{cuenta}</span>
      </div>

      <div className="list-footer-right">
        <button
          className="page-btn"
          type="button"
          aria-label="Página anterior"
          disabled={slice.page <= 1}
          onClick={pager.onPrev}
        >
          <ChevronLeft size={16} />
        </button>

        <span className="page-info">
          Página {slice.page} de {slice.pages}
        </span>

        <button
          className="page-btn"
          type="button"
          aria-label="Página siguiente"
          disabled={slice.page >= slice.pages}
          onClick={pager.onNext}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StudentsView({
  filter,
  dir,
  pager,
}: {
  filter: FilterValue;
  dir: CourseDir;
  pager: Pager;
}) {
  const ordered = sortByName(students, dir);
  const slice = pageSlice(
    ordered,
    pager.limit,
    pager.page
  );
  // 'none' (default) = filas planas; el resto agrupa con
  // fila de encabezado por valor.
  const rows =
    filter === 'none'
      ? slice.rows.map((student) => (
          <StudentRow
            key={student.name}
            student={student}
          />
        ))
      : groupRows(
          slice.rows,
          filter,
          dir,
          studentGroupKey
        ).reduce(
          (acc: any[], group) =>
            acc.concat(
              <GroupHeaderRow
                key={`g-${group.title}`}
                title={group.title}
                colspan={6}
              />,
              group.items.map((student) => (
                <StudentRow
                  key={student.name}
                  student={student}
                />
              ))
            ),
          []
        );
  const title =
    SECTION_TITLES.Estudiantes[filter] ??
    SECTION_TITLES.Estudiantes.none;

  return (
    <div className="data-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
        </div>

        <button className="text-button">
          Exportar
          <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Curso</th>
              <th>Estado</th>
              <th>Correo</th>
              <th>Última actualización</th>
              <th />
            </tr>
          </thead>

          <tbody>{rows}</tbody>
        </table>
      </div>

      <ListFooter
        section="Estudiantes"
        slice={slice}
        pager={pager}
      />
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  return (
    <div className="teacher-card">
      <div className="teacher-top">
        <div
          className={`teacher-avatar avatar-${teacher.tone}`}
        >
          {teacher.initials}
        </div>

        <span
          className={`status ${
            teacher.status === 'Activo'
              ? 'status-active'
              : 'status-leave'
          }`}
        >
          {teacher.status}
        </span>
      </div>

      <div className="teacher-body">
        <strong>{teacher.name}</strong>
        <span className="teacher-subject">
          {teacher.subject}
        </span>
      </div>

      <div className="teacher-meta">
        <div className="meta-row">
          <BookOpen size={14} />
          <span>{teacher.classes} cursos asignados</span>
        </div>

        <div className="meta-row">
          <Mail size={14} />
          <span className="cell-muted">
            {teacher.email}
          </span>
        </div>

        <div className="meta-row">
          <Phone size={14} />
          <span className="cell-muted">
            {teacher.phone}
          </span>
        </div>
      </div>

      <button className="outline-button teacher-action">
        Ver perfil
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}

function TeachersView({
  filter,
  dir,
  pager,
}: {
  filter: FilterValue;
  dir: CourseDir;
  pager: Pager;
}) {
  const ordered = sortByName(teachers, dir);
  const slice = pageSlice(
    ordered,
    pager.limit,
    pager.page
  );
  // 'none' (default) = grilla; el resto agrupa con
  // encabezado por valor.
  const grid =
    filter === 'none' ? (
      <div className="teacher-grid">
        {slice.rows.map((teacher) => (
          <TeacherCard
            key={teacher.name}
            teacher={teacher}
          />
        ))}
      </div>
    ) : (
      <div className="course-list-wrap">
        {groupRows(
          slice.rows,
          filter,
          dir,
          teacherGroupKey
        ).map((group) => (
          <div className="course-group" key={group.title}>
            <div className="course-group-header">
              <div className="group-icon">
                <GraduationCap size={18} />
              </div>
              <div>
                <strong>{group.title}</strong>
              </div>
            </div>

            <div className="teacher-grid">
              {group.items.map((teacher) => (
                <TeacherCard
                  key={teacher.name}
                  teacher={teacher}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  const title =
    SECTION_TITLES.Docentes[filter] ??
    SECTION_TITLES.Docentes.none;

  return (
    <>
      <div className="card-grid-heading">
        <div>
          <h2>{title}</h2>

          <p>
            Personal académico del establecimiento
          </p>
        </div>
      </div>

      {grid}

      <ListFooter
        section="Docentes"
        slice={slice}
        pager={pager}
      />
    </>
  );
}

function CoursesView({
  filter,
  dir,
  pager,
}: {
  filter: CourseFilter;
  dir: CourseDir;
  pager: Pager;
}) {
  const ordered = sortCourses(courses, dir);
  const slice = pageSlice(
    ordered,
    pager.limit,
    pager.page
  );
  const head = COURSE_HEADINGS[filter] ?? COURSE_HEADINGS.none;
  return (
    <>
      <div className="card-grid-heading">
        <div>
          <h2>{head[0]}</h2>

          <p>{head[1]}</p>
        </div>
      </div>

      {filter === 'none' ? (
      <div className="course-grid">
        {slice.rows.map((course) => (
          <div
            className="course-card"
            key={`${course.name}-${course.level}`}
          >
            <div className="course-top">
              <div
                className={`course-emoji bg-${course.tone}`}
              >
                {course.icon}
              </div>

              <div className="course-top-right">
                <span
                  className={`course-level level-${course.tone}`}
                >
                  {course.level}
                </span>
              </div>
            </div>

            <div className="course-body">
              <strong>{course.name}</strong>

              <span className="course-teacher">
                Dictado por {course.teacher}
              </span>
            </div>

            <div className="course-meta">
              <div className="meta-row">
                <Users size={14} />
                <span>
                  {course.students} estudiantes
                </span>
              </div>

              <div className="meta-row">
                <CalendarDays size={14} />
                <span>{course.schedule}</span>
              </div>
            </div>

            <button className="course-link">
              Ver detalles
              <ChevronRight size={15} />
            </button>
          </div>
        ))}
      </div>
      ) : (
        <CourseGroupedView
          rows={slice.rows}
          filter={filter}
          dir={dir}
        />
      )}

      <ListFooter
        section="Cursos"
        slice={slice}
        pager={pager}
      />
    </>
  );
}

const TURNO_ORDER: Record<string, number> = {
  Mañana: 1,
  Tarde: 2,
  Noche: 3,
};

function courseYear(course: Course) {
  const m = /^(\d+)/.exec(course.level);
  return m ? Number(m[1]) : 0;
}

// Orden siempre por año y división; solo cambia la dirección.
function sortCourses(rows: Course[], dir: CourseDir): Course[] {
  const out = rows.slice();
  out.sort((a, b) => {
    let d = courseYear(a) - courseYear(b);
    if (d === 0) d = a.level.localeCompare(b.level, 'es');
    return d;
  });
  return dir === 'desc' ? out.reverse() : out;
}

type CourseGroup = { title: string; items: Course[] };

function groupCourses(
  rows: Course[],
  filter: CourseFilter,
  dir: CourseDir
): CourseGroup[] {
  const key =
    filter === 'turno' || filter === 'especialidad'
      ? filter
      : 'anio';
  const buckets: CourseGroup[] = [];
  const index: Record<string, CourseGroup> = {};
  rows.forEach((c) => {
    let id: string;
    let title: string;
    if (key === 'turno') {
      id = c.turno || 'Sin turno';
      title = id;
    } else if (key === 'especialidad') {
      id = c.especialidad || 'Sin especialidad';
      title = id;
    } else {
      id = String(courseYear(c));
      title = id + '° Año';
    }
    if (!index[id]) {
      index[id] = { title: title, items: [] };
      buckets.push(index[id]);
    }
    index[id].items.push(c);
  });
  buckets.sort((a, b) => {
    if (key === 'anio')
      return courseYear(a.items[0]) - courseYear(b.items[0]);
    if (key === 'turno')
      return (TURNO_ORDER[a.title] ?? 9) - (TURNO_ORDER[b.title] ?? 9);
    return a.title.localeCompare(b.title, 'es');
  });
  return dir === 'desc' ? buckets.slice().reverse() : buckets;
}

// Vista agrupada de Cursos: un encabezado por el valor del criterio elegido
// (igual que groupCoursesBy() de la app real).
function CourseGroupedView({
  rows,
  filter,
  dir,
}: {
  rows: Course[];
  filter: CourseFilter;
  dir: CourseDir;
}) {
  const groups = groupCourses(rows, filter, dir);
  return (
    <div className="course-list-wrap">
      {groups.map((group) => {
        return (
          <div className="course-group" key={group.title}>
            <div className="course-group-header">
              <div className="group-icon">
                <ClipboardList size={18} />
              </div>
              <div>
                <strong>{group.title}</strong>
              </div>
            </div>
            <div className="course-sections-grid">
              {group.items.map((c) => (
                <div
                  className="course-section-card"
                  key={c.name}
                >
                  <div className="section-card-top">
                    <div className="section-badge">
                      {c.level}
                    </div>
                    <span className="section-count">
                      {c.turno}
                    </span>
                  </div>
                  <div className="section-card-body">
                    <strong>{c.name}</strong>
                    <span className="cell-muted">
                      <Users size={13} />
                      {c.teacher}
                    </span>
                  </div>
                  <button className="section-link">
                    Ver nómina
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default App;
