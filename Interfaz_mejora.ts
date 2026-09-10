import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
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
  | 'Cursos'
  | 'Listado por Cursos';

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
    description: 'Organiza la oferta educativa',
    color: 'orange',
  },
  {
    icon: ClipboardList,
    label: 'Listado por Cursos',
    description: 'Consulta grupos y asignaciones',
    color: 'violet',
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

const courses = [
  {
    name: 'Matemática',
    level: '5° B',
    students: 28,
    teacher: 'Diego Pereyra',
    schedule: 'Lun · Mié · Vie',
    tone: 'orange',
    icon: '📐',
  },
  {
    name: 'Lengua y Literatura',
    level: '3° A',
    students: 31,
    teacher: 'Laura Sánchez',
    schedule: 'Mar · Jue',
    tone: 'blue',
    icon: '📖',
  },
  {
    name: 'Física',
    level: '5° A',
    students: 24,
    teacher: 'Marcos Fernández',
    schedule: 'Lun · Vie',
    tone: 'teal',
    icon: '🔬',
  },
  {
    name: 'Historia',
    level: '2° B',
    students: 33,
    teacher: 'Carolina Ríos',
    schedule: 'Mié · Jue',
    tone: 'violet',
    icon: '🏛️',
  },
  {
    name: 'Biología',
    level: '4° A',
    students: 27,
    teacher: 'Andrés Sosa',
    schedule: 'Mar · Vie',
    tone: 'teal',
    icon: '🧬',
  },
  {
    name: 'Geografía',
    level: '1° C',
    students: 30,
    teacher: 'Patricia Núñez',
    schedule: 'Lun · Mié',
    tone: 'blue',
    icon: '🌍',
  },
];

const courseGroups = [
  {
    level: '1° Año',
    sections: [
      {
        name: '1° A',
        students: 32,
        teacher: 'Laura Sánchez',
      },
      {
        name: '1° B',
        students: 30,
        teacher: 'Diego Pereyra',
      },
      {
        name: '1° C',
        students: 28,
        teacher: 'Patricia Núñez',
      },
    ],
  },
  {
    level: '2° Año',
    sections: [
      {
        name: '2° A',
        students: 29,
        teacher: 'Marcos Fernández',
      },
      {
        name: '2° B',
        students: 33,
        teacher: 'Carolina Ríos',
      },
    ],
  },
  {
    level: '3° Año',
    sections: [
      {
        name: '3° A',
        students: 31,
        teacher: 'Laura Sánchez',
      },
      {
        name: '3° B',
        students: 27,
        teacher: 'Andrés Sosa',
      },
    ],
  },
  {
    level: '4° Año',
    sections: [
      {
        name: '4° A',
        students: 26,
        teacher: 'Andrés Sosa',
      },
      {
        name: '4° B',
        students: 30,
        teacher: 'Diego Pereyra',
      },
    ],
  },
  {
    level: '5° Año',
    sections: [
      {
        name: '5° A',
        students: 24,
        teacher: 'Marcos Fernández',
      },
      {
        name: '5° B',
        students: 28,
        teacher: 'Diego Pereyra',
      },
    ],
  },
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

              {label === 'Listado por Cursos' && (
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
              detail="Listado por Cursos · 2° ciclo"
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
          {section === 'Listado por Cursos'
            ? 'listado'
            : section === 'Estudiantes'
            ? 'estudiante'
            : section === 'Docentes'
            ? 'docente'
            : 'curso'}
        </button>
      </div>

      <div className="view-toolbar">
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

      {section === 'Estudiantes' && <StudentsView />}

      {section === 'Docentes' && <TeachersView />}

      {section === 'Cursos' && <CoursesView />}

      {section === 'Listado por Cursos' && (
        <CourseListView />
      )}
    </section>
  );
}

function StudentsView() {
  return (
    <div className="data-panel">
      <div className="panel-heading">
        <div>
          <h2>Registro de estudiantes</h2>
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

          <tbody>
            {students.map((student) => (
              <tr key={student.name}>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeachersView() {
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
          <h2>Equipo docente</h2>
          <p>
            Personal académico del establecimiento
          </p>
        </div>
      </div>

      <div className="teacher-grid">
        {teachers.map((teacher) => (
          <div
            className="teacher-card"
            key={teacher.name}
          >
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
                <span>
                  {teacher.classes} cursos asignados
                </span>
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
        ))}
      </div>
    </>
  );
}

function CoursesView() {
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
          <h2>Catálogo de cursos</h2>
          <p>
            Materias y asignaciones del ciclo lectivo 2026
          </p>
        </div>
      </div>

      <div className="course-grid">
        {courses.map((course) => (
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
    </>
  );
}

function CourseListView() {
  return (
    <div className="course-list-wrap">
      {courseGroups.map((group) => (
        <div
          className="course-group"
          key={group.level}
        >
          <div className="course-group-header">
            <div className="group-icon">
              <ClipboardList size={18} />
            </div>

            <div>
              <strong>{group.level}</strong>

              <span>
                {group.sections.length} divisiones ·{' '}
                {group.sections.reduce(
                  (acc, s) => acc + s.students,
                  0
                )}{' '}
                estudiantes
              </span>
            </div>
          </div>

          <div className="course-sections-grid">
            {group.sections.map((sec) => (
              <div
                className="course-section-card"
                key={sec.name}
              >
                <div className="section-card-top">
                  <div className="section-badge">
                    {sec.name}
                  </div>

                  <span className="section-count">
                    {sec.students}
                  </span>
                </div>

                <div className="section-card-body">
                  <strong>
                    {sec.students} estudiantes
                  </strong>

                  <span className="cell-muted">
                    <Users size={13} />
                    {sec.teacher}
                  </span>
                </div>

                <button className="section-link">
                  Ver listado
                  <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
