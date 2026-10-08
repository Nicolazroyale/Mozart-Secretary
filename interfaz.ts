import {
  ArrowUpDown,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
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
  const [openMenu, setOpenMenu] = useState<{
    section: Section;
    which: string;
  } | null>(null);

  const menuOpen =
    openMenu !== null &&
    openMenu.section === section &&
    openMenu.which === 'filter';
  const filterValue: FilterValue =
    filters[section] ?? 'none';
  const sortDir: CourseDir = sortDirs[section] ?? 'asc';
  const menuItems = SECTION_FILTERS[section];

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
              onClick={() =>
                setSortDirs({
                  ...sortDirs,
                  [section]:
                    sortDir === 'desc' ? 'asc' : 'desc',
                })
              }
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
        />
      )}

      {section === 'Docentes' && (
        <TeachersView
          filter={filterValue}
          dir={sortDir}
        />
      )}

      {section === 'Cursos' && (
        <CoursesView
          filter={filterValue as CourseFilter}
          dir={sortDir}
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

// Fila de encabezado de grupo dentro de una tabla.
function GroupHeaderRow({
  title,
  count,
  unidad,
  colspan,
}: {
  title: string;
  count: number;
  unidad: string;
  colspan: number;
}) {
  return (
    <tr className="group-row">
      <th colSpan={colspan}>
        {title}
        <span className="group-count">
          {count} {unidad}
        </span>
      </th>
    </tr>
  );
}

function StudentsView({
  filter,
  dir,
}: {
  filter: FilterValue;
  dir: CourseDir;
}) {
  const ordered = sortByName(students, dir);
  // 'none' (default) = filas planas; el resto agrupa con
  // fila de encabezado por valor.
  const rows =
    filter === 'none'
      ? ordered.map((student) => (
          <StudentRow
            key={student.name}
            student={student}
          />
        ))
      : groupRows(
          ordered,
          filter,
          dir,
          studentGroupKey
        ).reduce(
          (acc: any[], group) =>
            acc.concat(
              <GroupHeaderRow
                key={`g-${group.title}`}
                title={group.title}
                count={group.items.length}
                unidad="estudiantes"
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
          <p>
            {students.length} registros encontrados
          </p>
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
}: {
  filter: FilterValue;
  dir: CourseDir;
}) {
  const ordered = sortByName(teachers, dir);
  // 'none' (default) = grilla; el resto agrupa con
  // encabezado por valor.
  const grid =
    filter === 'none' ? (
      <div className="teacher-grid">
        {ordered.map((teacher) => (
          <TeacherCard
            key={teacher.name}
            teacher={teacher}
          />
        ))}
      </div>
    ) : (
      <div className="course-list-wrap">
        {groupRows(
          ordered,
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
                <span>{group.items.length} docentes</span>
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
      <div className="stats-grid">
        <StatCard
          icon={GraduationCap}
          label="Total docentes"
          value="86"
          trend="4,2%"
          detail="plantel activo"
          color="teal"
        />

        <StatCard
          icon={BookOpen}
          label="Materias asignadas"
          value="112"
          trend="6 nuevas"
          detail="este ciclo"
          color="blue"
        />

        <StatCard
          icon={Clock}
          label="En licencia"
          value="4"
          trend="2,3%"
          detail="ausencias temporales"
          color="orange"
        />

        <StatCard
          icon={CheckCircle2}
          label="Disponibilidad"
          value="95,3%"
          trend="1,8%"
          detail="este mes"
          color="violet"
        />
      </div>

      <div className="card-grid-heading">
        <div>
          <h2>{title}</h2>

          <p>
            Personal académico del establecimiento
          </p>
        </div>
      </div>

      {grid}
    </>
  );
}

function CoursesView({
  filter,
  dir,
}: {
  filter: CourseFilter;
  dir: CourseDir;
}) {
  const ordered = sortCourses(courses, dir);
  const head = COURSE_HEADINGS[filter] ?? COURSE_HEADINGS.none;
  return (
    <>
      <div className="stats-grid">
        <StatCard
          icon={BookOpen}
          label="Cursos activos"
          value="42"
          trend="8 nuevos"
          detail="este ciclo lectivo"
          color="orange"
        />

        <StatCard
          icon={Users}
          label="Inscriptos totales"
          value="1.248"
          trend="12,5%"
          detail="estudiantes"
          color="blue"
        />

        <StatCard
          icon={GraduationCap}
          label="Docentes asignados"
          value="86"
          trend="100%"
          detail="cobertura"
          color="teal"
        />

        <StatCard
          icon={CalendarDays}
          label="Promedio por curso"
          value="29,7"
          trend="2,1"
          detail="estudiantes/curso"
          color="violet"
        />
      </div>

      <div className="card-grid-heading">
        <div>
          <h2>{head[0]}</h2>

          <p>{head[1]}</p>
        </div>
      </div>

      {filter === 'none' ? (
      <div className="course-grid">
        {ordered.map((course) => (
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
          rows={ordered}
          filter={filter}
          dir={dir}
        />
      )}
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
        const total = group.items.reduce(
          (acc, c) => acc + c.students,
          0
        );
        return (
          <div className="course-group" key={group.title}>
            <div className="course-group-header">
              <div className="group-icon">
                <ClipboardList size={18} />
              </div>
              <div>
                <strong>{group.title}</strong>
                <span>
                  {group.items.length} divisiones · {total}{' '}
                  estudiantes
                </span>
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
