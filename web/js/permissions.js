// Catálogo compartido de permisos granulares (backend: perms.go).
// El rol `admin` implica todos; `lectura` usa la lista `permisos`.

export const PERM = {
  VER: {
    estudiantes: 'ver_estudiantes',
    docentes: 'ver_docentes',
    cursos: 'ver_cursos',
    materias: 'ver_materias',
    nomina: 'ver_nomina',
    usuarios: 'ver_usuarios',
    auditoria: 'ver_auditoria',
    backups: 'ver_backups',
  },
  MOD: {
    estudiantes: 'modificar_estudiantes',
    docentes: 'modificar_docentes',
    cursos: 'modificar_cursos',
    materias: 'modificar_materias',
  },
  GEST: {
    usuarios: 'gestion_usuarios',
    backups: 'gestion_backups',
  },
  EXPORTAR: 'exportar',
};

// Segmentos visuales del formulario de usuario (backend: perms.go).
export const PERM_GROUPS = [
  {
    label: 'Datos · Lectura',
    items: [
      { v: PERM.VER.estudiantes, l: 'Ver estudiantes' },
      { v: PERM.VER.docentes, l: 'Ver docentes' },
      { v: PERM.VER.cursos, l: 'Ver cursos' },
      { v: PERM.VER.materias, l: 'Ver materias' },
      { v: PERM.VER.nomina, l: 'Ver listado por cursos (nóminas)' },
      { v: PERM.EXPORTAR, l: 'Exportar PDF/Excel' },
    ],
  },
  {
    label: 'Datos · Modificar',
    items: [
      { v: PERM.MOD.estudiantes, l: 'Modificar estudiantes (incl. OCR)' },
      { v: PERM.MOD.docentes, l: 'Modificar docentes y asignaciones' },
      { v: PERM.MOD.cursos, l: 'Modificar cursos' },
      { v: PERM.MOD.materias, l: 'Modificar materias' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { v: PERM.VER.usuarios, l: 'Ver usuarios' },
      { v: PERM.GEST.usuarios, l: 'Gestionar usuarios' },
      { v: PERM.VER.auditoria, l: 'Ver registro de auditoría' },
      { v: PERM.VER.backups, l: 'Ver backups' },
      { v: PERM.GEST.backups, l: 'Crear y subir backups' },
    ],
  },
];

export const PERM_ALL = PERM_GROUPS.flatMap((g) => g.items.map((i) => i.v));

// hasPerm(state, p): ¿el usuario "state" tiene el permiso p?
// admin → true; modificar_X / gestion_X implican su vista.
export function hasPerm(state, p) {
  if (!state) return false;
  if (state.esAdmin) return true;
  const set = new Set(state.perms || []);
  if (set.has(p)) return true;
  const imply = {
    [PERM.VER.estudiantes]: PERM.MOD.estudiantes,
    [PERM.VER.docentes]: PERM.MOD.docentes,
    [PERM.VER.cursos]: PERM.MOD.cursos,
    [PERM.VER.materias]: PERM.MOD.materias,
    [PERM.VER.usuarios]: PERM.GEST.usuarios,
    [PERM.VER.backups]: PERM.GEST.backups,
  };
  return Boolean(imply[p] && set.has(imply[p]));
}

// Permiso de lectura requerido para ver cada sección del menú.
export const SECTION_READ = {
  Estudiantes: PERM.VER.estudiantes,
  Docentes: PERM.VER.docentes,
  Cursos: PERM.VER.cursos,
  Materias: PERM.VER.materias,
  'Listado por Cursos': PERM.VER.nomina,
  Usuarios: PERM.VER.usuarios,
  Backups: PERM.VER.backups,
  Auditoría: PERM.VER.auditoria,
};

// Permiso de escritura requerido para dar de alta/editar/eliminar en cada sección.
export const SECTION_WRITE = {
  Estudiantes: PERM.MOD.estudiantes,
  Docentes: PERM.MOD.docentes,
  Cursos: PERM.MOD.cursos,
  Materias: PERM.MOD.materias,
  Usuarios: PERM.GEST.usuarios,
};