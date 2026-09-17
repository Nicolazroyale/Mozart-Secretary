/**
 * crud_mejora.js
 * Alta / edición / eliminación dentro de la interfaz mejorada del sistema,
 * contra /api.php (paridad con la app legacy). Requiere rol admin y envía el
 * header X-CSRF-Token.
 *
 * Exports para tests: helpers puros (buildFormHTML, gatherForm, usuarioPayload),
 * constantes de configuración y `createCrud`, que arma los manejadores DOM
 * atados a un state del sistema.
 */

import { icon, esc } from './Interfaz_mejora.js';

function isSet(x) {
  return x !== undefined && x !== null;
}

// ---------------------------------------------------------------------------
// Configuración de tipos
// ---------------------------------------------------------------------------

export const TIPOS = {
  estudiantes: { title: 'Ficha de Inscripción de Alumno', newTitle: 'Nuevo estudiante', singular: 'estudiante', section: 'Estudiantes', table: 'estudiantes', icon: 'Users', color: 'blue' },
  docentes: { title: 'Cargar Docente', newTitle: 'Nuevo docente', singular: 'docente', section: 'Docentes', table: 'docentes', icon: 'GraduationCap', color: 'teal' },
  cursos: { title: 'Cargar Nuevo Curso', newTitle: 'Nuevo curso', singular: 'curso', section: 'Cursos', table: 'cursos', icon: 'BookOpen', color: 'orange' },
  materias: { title: 'Cargar Nueva Materia', newTitle: 'Nueva materia', singular: 'materia', section: 'Materias', table: 'materias', icon: 'BookMarked', color: 'violet' },
};

export const TIPOS_DNI = ['DNI Argentino', 'DNI en trámite', 'CPI', 'Documento Extranjero'];
export const GENEROS = [
  'No desea responder', 'Mujer', 'Mujer trans/travesti', 'Varón', 'Varón trans/masculinidad trans',
  'No binario', 'Femenino', 'Masculino', 'Otra', 'No desea responder',
];
export const VINCULOS = ['Madre', 'Padre', 'Tutor/a', 'Hermano', 'Hermana', 'Otro'];
export const CONDICION_ACTIVIDAD = ['Empleado/a privado', 'Empleado/a público', 'Trabajador/a independiente', 'Jubilado/a', 'Desocupado/a', 'Estudiante'];
export const CARGOS = ['Titular', 'Provisional', 'Suplente', 'Interino', 'Ad-Honorem', 'Jubilado', 'Licencia'];
export const CARGOS_ASIG = ['Titular', 'Provisional', 'Suplente', 'Interino', 'Ad-Honorem'];
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const TURNOS = ['Mañana', 'Tarde', 'Noche'];
export const CICLOS = ['Básico', 'Superior'];
export const JORNADAS = ['Simple', 'Completa'];
export const ROLES = ['admin', 'lectura'];

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

function selectOptions(opts, selected) {
  return opts.map((o) => {
    const val = isSet(o && o.value) ? o.value : o;
    const label = o && o.label !== undefined ? o.label : o;
    return '<option value="' + esc(val) + '"' + (String(val) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
  }).join('');
}

function cursoOptions(cursos, selected) {
  return (cursos || []).map((c) => '<option value="' + esc(c.id_curso) + '"' + (String(c.id_curso) === String(selected) ? ' selected' : '') + '>' + esc(c.nombre) + '</option>').join('');
}

function docenteOptions(docentes, selected) {
  return (docentes || []).map((d) => '<option value="' + esc(d.id_docente) + '"' + (String(d.id_docente) === String(selected) ? ' selected' : '') + '>' + esc(d.apellido + ', ' + d.nombre) + ' (DNI ' + esc(d.dni || '') + ')</option>').join('');
}

// ---------------------------------------------------------------------------
// Definición de formularios (campos por tipo)
// ---------------------------------------------------------------------------

const BASE_EST = [
  { n: 'apellido', l: 'Apellido', t: 'text', req: 1 },
  { n: 'nombre', l: 'Nombre', t: 'text', req: 1 },
  { n: 'tipo_dni', l: 'Tipo de Documento', t: 'select', opts: TIPOS_DNI, req: 1 },
  { n: 'dni', l: 'Número de Documento', t: 'text', req: 1, hint: 'Solo números' },
  { n: 'cuil', l: 'CUIL', t: 'text', hint: 'XX-XXXXXXXX-X' },
  { n: 'fecha_nacimiento', l: 'Fecha de Nacimiento', t: 'date', req: 1 },
  { n: 'lugar_nacimiento', l: 'Lugar de Nacimiento', t: 'text' },
  { n: 'nacionalidad', l: 'Nacionalidad', t: 'text', def: 'Argentina' },
  { n: 'genero', l: 'Identidad de Género', t: 'select', opts: GENEROS, req: 1 },
  { n: 'genero_especificar', l: 'Especificar Género', t: 'text', g: 2, for: 'genero', vis: 'Otra' },
];

const DOMICILIO = [
  { n: 'calle', l: 'Calle', t: 'text', req: 1 },
  { n: 'numero', l: 'N°', t: 'text', req: 1 },
  { n: 'piso', l: 'Piso', t: 'text' },
  { n: 'depto', l: 'Depto', t: 'text' },
  { n: 'entre_calles', l: 'Entre calles', t: 'text', g: 2 },
  { n: 'localidad', l: 'Localidad', t: 'text', def: 'Buenos Aires', req: 1 },
  { n: 'distrito', l: 'Distrito', t: 'text' },
  { n: 'provincia', l: 'Provincia', t: 'text', def: 'Buenos Aires', req: 1 },
  { n: 'telefono_fijo', l: 'Teléfono Fijo', t: 'text' },
  { n: 'telefono_celular', l: 'Teléfono Celular', t: 'text' },
];

const SALUD_CHECKS = [
  ['salud_asma', 'Asma'],
  ['salud_celiaquia', 'Celiaquía'],
  ['salud_diabetes', 'Diabetes'],
  ['salud_obesidad', 'Obesidad'],
  ['salud_cardiopatia', 'Cardiopatía'],
];

const SALUD = [
  { n: 'salud_otros_checklist', l: 'Otras condiciones', t: 'text', g: 2 },
  { n: 'salud_alergias', l: 'Alergias', t: 'area' },
  { n: 'salud_internaciones', l: 'Internaciones', t: 'area' },
  { n: 'salud_antecedentes_salud', l: 'Antecedentes Personales de Salud', t: 'area', g: 2 },
  { n: 'salud_obra_social_nombre', l: 'Obra Social / Prepaga', t: 'text' },
  { n: 'salud_obra_social_nro', l: 'N° de Afiliado', t: 'text' },
];

function respFields(num, opcional) {
  const p = 'resp' + num + '_';
  const base = [
    { n: p + 'vinculo', l: 'Vínculo', t: 'textlist', list: 'vinculos', req: opcional ? 0 : 1 },
    { n: p + 'apellido', l: 'Apellido', t: 'text', req: opcional ? 0 : 1 },
    { n: p + 'nombre', l: 'Nombre', t: 'text', req: opcional ? 0 : 1 },
    { n: p + 'tipo_dni', l: 'Tipo Doc', t: 'select', opts: TIPOS_DNI, def: 'DNI Argentino' },
    { n: p + 'dni', l: 'Número Doc', t: 'text', req: opcional ? 0 : 1, hint: 'Si está vacío se omite el responsable' },
    { n: p + 'nacionalidad', l: 'Nacionalidad', t: 'text', def: 'Argentina' },
    { n: p + 'profesion', l: 'Profesión', t: 'text' },
    { n: p + 'nivel_educativo', l: 'Nivel Educativo', t: 'text' },
    { n: p + 'condicion_actividad', l: 'Condición de Actividad', t: 'textlist', list: 'cond_act' },
    { n: p + 'convive', l: '¿Convive con el estudiante?', t: 'check', g: 2 },
    { n: p + 'calle', l: 'Calle', t: 'text' },
    { n: p + 'numero', l: 'N°', t: 'text' },
    { n: p + 'piso', l: 'Piso', t: 'text' },
    { n: p + 'depto', l: 'Depto', t: 'text' },
    { n: p + 'telefono_celular', l: 'Celular', t: 'text' },
    { n: p + 'email', l: 'Email', t: 'email', g: 2 },
  ];
  return base;
}

function estudianteGroups(data) {
  return [
    { t: '1. Datos del Estudiante', f: BASE_EST },
    { t: '2. Domicilio y Contacto', f: DOMICILIO },
    { t: '3. Antecedentes de Salud', f: SALUD, checks: SALUD_CHECKS },
    { t: '4. Datos del Responsable 1 (Tutor)', f: respFields(1, false) },
    { t: '5. Datos del Responsable 2 (Opcional)', f: respFields(2, true) },
    { t: '6. Sección Inscripción', f: [{ n: 'id_curso', l: 'Curso (Año y División)', t: 'cursos', req: 1 }, { n: 'fecha_ingreso', l: 'Fecha de Ingreso', t: 'date', def: hoyISO(), req: 1 }] },
    {
      t: '7. Restricciones Judiciales',
      f: [
        { n: 'rj_nombre', l: 'Nombre y Apellido del Restringido', t: 'text' },
        { n: 'rj_tipo_doc', l: 'Tipo Doc', t: 'text' },
        { n: 'rj_nro_doc', l: 'N° Doc', t: 'text' },
        { n: 'rj_descripcion', l: 'Descripción de la Restricción', t: 'area', g: 2 },
      ],
    },
  ].map((g) => ({ t: g.t, f: g.f, checks: g.checks || null, datos: data }));
}

function docenteGroups(edit) {
  const base = [
    { t: 'Datos Básicos', f: [{ n: 'apellido', l: 'Apellido', t: 'text', req: 1 }, { n: 'nombre', l: 'Nombre', t: 'text', req: 1 }, { n: 'dni', l: 'DNI (7 a 10 números)', t: 'text', req: 1, hint: 'Solo números' }, { n: 'fecha_inscripcion', l: 'Fecha de Inscripción', t: 'date', def: hoyISO(), req: 1 }, { n: 'telefono', l: 'Teléfono', t: 'text' }, { n: 'email', l: 'Email', t: 'email' }, { n: 'situacion_revista', l: 'Situación de Revista', t: 'select', opts: CARGOS, req: 1 }] },
  ];
  if (edit) {
    base.push({ t: 'Cargos y Horarios Asignados', asig: 1 });
  }
  return base;
}

function cursoGroups() {
  return [{ t: 'Datos del Curso', f: [{ n: 'anio', l: 'Año (1 a 7)', t: 'select', opts: [1, 2, 3, 4, 5, 6, 7], req: 1 }, { n: 'division', l: 'División', t: 'number', req: 1, hint: 'Solo el número, ej: 1' }, { n: 'turno', l: 'Turno', t: 'select', opts: TURNOS, req: 1 }, { n: 'ciclo', l: 'Ciclo', t: 'select', opts: CICLOS, req: 1 }, { n: 'jornada', l: 'Jornada', t: 'select', opts: JORNADAS, req: 1 }] }];
}

function materiaGroups() {
  return [{ t: 'Datos de la Materia', f: [{ n: 'nombre', l: 'Nombre de la Materia', t: 'text', req: 1, hint: 'Ej: Matemática' }] }];
}

// ---------------------------------------------------------------------------
// Construcción de formularios
// ---------------------------------------------------------------------------

export function fieldValue(data, name, def) {
  if (!data) return isSet(def) ? def : '';
  const v = data[name];
  if (v === undefined || v === null) return isSet(def) ? def : '';
  return String(v);
}

function fieldInputHTML(f, data, opts) {
  const name = f.n;
  const val = fieldValue(data, name, f.def);
  const req = f.req ? ' required' : '';
  const hiddenByDefault = f.vis && String(data ? data[f.for] : '') !== f.vis;
  const span = f.g && f.g > 1 ? ' class="span-2"' : '';
  const visAttr = f.vis ? ' data-for="' + esc(f.for) + '"' : '';
  let ctrl = '';
  if (f.t === 'select') {
    ctrl = '<select class="crud-select" name="' + esc(name) + '"' + req + '>' + selectOptions(f.opts, val) + '</select>';
  } else if (f.t === 'cursos') {
    ctrl = '<select class="crud-select" name="' + esc(name) + '"' + req + '><option value="">Seleccionar…</option>' + cursoOptions(opts && opts.cursos, val) + '</select>';
  } else if (f.t === 'check') {
    ctrl = '<label class="crud-check"><input type="checkbox" name="' + esc(name) + '"' + (Number(val) === 1 ? ' checked' : '') + '> Sí</label>';
  } else if (f.t === 'area') {
    ctrl = '<textarea class="crud-textarea" name="' + esc(name) + '"' + req + '>' + esc(val) + '</textarea>';
  } else {
    const type = f.t === 'date' ? 'date' : f.t === 'email' ? 'email' : f.t === 'number' ? 'number' : 'text';
    const list = f.t === 'textlist' ? ' list="' + esc(f.list) + '"' : '';
    ctrl = '<input class="crud-input" type="' + type + '" name="' + esc(name) + '" value="' + esc(val) + '"' + (f.hint ? ' placeholder="' + esc(f.hint) + '"' : '') + list + req + '>';
  }
  const hint = f.hint ? '<span class="crud-hint">' + esc(f.hint) + '</span>' : '';
  return '<div class="crud-field' + (hiddenByDefault ? ' hidden-field' : '') + '"' + span + visAttr + '><label>' + esc(f.l) + (f.req ? ' <span class="req">*</span>' : '') + '</label>' + ctrl + hint + '</div>';
}

function datalistsHTML() {
  return (
    '<datalist id="vinculos">' + VINCULOS.map((v) => '<option value="' + esc(v) + '"></option>').join('') + '</datalist>' +
    '<datalist id="cond_act">' + CONDICION_ACTIVIDAD.map((v) => '<option value="' + esc(v) + '"></option>').join('') + '</datalist>'
  );
}

function materiasDatalistHTML(materias) {
  return '<datalist id="materias_dl">' + (materias || []).map((m) => '<option value="' + esc(m.nombre) + '"></option>').join('') + '</datalist>';
}

function checksHTML(checks, data) {
  return '<div class="crud-checks">' + checks.map((c) => '<label class="crud-check"><input type="checkbox" name="' + esc(c[0]) + '"' + (Number(fieldValue(data, c[0])) === 1 ? ' checked' : '') + '> ' + esc(c[1]) + '</label>').join('') + '</div>';
}

export function assignRowHTML(opts, asignacion) {
  const row = asignacion || {};
  const selectedCurso = isSet(row.id_curso) ? row.id_curso : '';
  return (
    '<div class="crud-assign-row" data-asig-row>' +
    '<div class="crud-field"><label>Curso</label><select class="crud-select" name="asig_curso" required><option value="">—</option>' + cursoOptions(opts && opts.cursos, selectedCurso) + '</select></div>' +
    '<div class="crud-field"><label>Materia</label><input class="crud-input" name="asig_materia" list="materias_dl" value="' + esc(row.materia || '') + '" required placeholder="Materia"></div>' +
    '<div class="crud-field"><label>Cargo</label><select class="crud-select" name="asig_cargo">' + selectOptions(CARGOS_ASIG, row.cargo || 'Titular') + '</select></div>' +
    '<div class="crud-field"><label>Día</label><select class="crud-select" name="asig_dia" required><option value="">—</option>' + selectOptions(DIAS, row.dia_semana) + '</select></div>' +
    '<div class="crud-field"><label>Hora Inicio</label><input class="crud-input" type="time" name="asig_ini" value="' + esc(String(row.hora_inicio || '').slice(0, 5)) + '" required></div>' +
    '<div class="crud-field"><label>Hora Fin</label><input class="crud-input" type="time" name="asig_fin" value="' + esc(String(row.hora_fin || '').slice(0, 5)) + '" required></div>' +
    '<button class="assign-remove" type="button" data-asig-remove aria-label="Quitar horario">' + icon('Trash2', 15) + '</button>' +
    '</div>'
  );
}

export function buildFormHTML(tipo, data, opts, extra) {
  const extraOpts = extra || {};
  let groups;
  if (tipo === 'estudiantes') groups = estudianteGroups(data);
  else if (tipo === 'docentes') groups = docenteGroups(extraOpts.edit);
  else if (tipo === 'cursos') groups = cursoGroups();
  else if (tipo === 'materias') groups = materiaGroups();
  else return '';

  const materiasList = datalistsHTML() + materiasDatalistHTML(opts && opts.materias);

  const sections = groups
    .map((g) => {
      let body;
      if (g.asig) {
        const rows = (extraOpts.asignaciones || []).map((a, i) => assignRowHTML(opts, a, i)).join('');
        body = '<div class="crud-section-body open"><div class="crud-assign-row" data-asig-row data-asig-template hidden></div>' + rows +
          '<button class="crud-btn crud-btn-ghost assign-add" type="button" data-crud="assign-add">' + icon('Plus', 14) + ' Agregar Horario/Curso</button></div>';
      } else {
        const checks = g.checks ? checksHTML(g.checks, data) : '';
        body = '<div class="crud-section-body"><div class="crud-checks" style="margin-bottom:8px;">' + (checks ? checks : '') + '</div>' +
          '<div class="crud-grid">' + g.f.map((f) => fieldInputHTML(f, data, opts)).join('') + '</div></div>';
      }
      return '<div class="crud-section open" data-crud-section><button class="crud-section-head" type="button" data-toggle-section>' + esc(g.t) + ' <span class="chev">' + icon('ChevronRight', 15) + '</span></button>' + body + '</div>';
    })
    .join('');

  return materiasList + sections;
}

// ---------------------------------------------------------------------------
// Recolección de datos
// ---------------------------------------------------------------------------

export function gatherForm(formEl) {
  const data = {};
  formEl.querySelectorAll('[name]').forEach((el) => {
    const name = el.getAttribute('name');
    if (el.type === 'checkbox') {
      data[name] = el.checked ? 1 : 0;
    } else {
      data[name] = el.value;
    }
  });
  return data;
}

export function usuarioPayload(formEl, mode, id) {
  const data = gatherForm(formEl);
  const payload = { action: mode, data: {} };
  if (mode === 'create') {
    payload.data = { username: data.username, password: data.password, nombre_completo: data.nombre_completo, rol: data.rol };
  } else {
    payload.id = id;
    payload.data = {
      nombre_completo: data.nombre_completo,
      rol: data.rol,
      activo: Number(data.activo),
    };
    if (isSet(data.password) && String(data.password) !== '') payload.data.password = data.password;
  }
  return payload;
}

export function asignacionData(formEl, cursoId) {
  const d = gatherForm(formEl);
  return {
    id_docente: Number(d.id_docente),
    materia: String(d.materia || '').trim(),
    id_curso: Number(cursoId),
    cargo: d.cargo || 'Titular',
    dia_semana: d.dia_semana,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    ciclo_lectivo: Number(d.ciclo_lectivo) || new Date().getFullYear(),
    activo: 1,
  };
}

export function assignRowsData(formEl) {
  const rows = [];
  formEl.querySelectorAll('[data-asig-row]').forEach((el) => {
    if (el.hasAttribute('data-asig-template') || el.closest('[hidden]')) return;
    const g = (n) => el.querySelector('[name="' + n + '"]');
    const curso = g('asig_curso');
    if (!curso || !curso.value) return;
    const materia = (g('asig_materia') && g('asig_materia').value || '').trim();
    rows.push({
      id_curso: Number(curso.value),
      materia: materia,
      cargo: g('asig_cargo') ? g('asig_cargo').value : 'Titular',
      dia_semana: g('asig_dia') ? g('asig_dia').value : '',
      hora_inicio: g('asig_ini') ? g('asig_ini').value : '',
      hora_fin: g('asig_fin') ? g('asig_fin').value : '',
    });
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Capa de datos
// ---------------------------------------------------------------------------

async function apiWrite(state, path, method, body) {
  const res = await fetch(path, {
    method: method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf || '' },
    body: JSON.stringify(body),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) throw new Error(d.error || 'Error del servidor (' + res.status + ')');
  return d;
}

async function selCursos(state) {
  if (!state.crudSel) state.crudSel = {};
  if (!state.crudSel.cursos) state.crudSel.cursos = fetch('api.php?table=lista_cursos&limit=100').then((r) => r.json());
  return state.crudSel.cursos;
}

async function selDocentes(state) {
  if (!state.crudSel) state.crudSel = {};
  if (!state.crudSel.docentes) state.crudSel.docentes = fetch('api.php?table=docentes&limit=100').then((r) => r.json());
  return state.crudSel.docentes;
}

async function selMaterias(state) {
  if (!state.crudSel) state.crudSel = {};
  if (!state.crudSel.materias) state.crudSel.materias = fetch('api.php?table=materias&limit=100').then((r) => r.json());
  return state.crudSel.materias;
}

async function selContentHTML(state) {
  const [cursos, materias] = await Promise.all([selCursos(state), selMaterias(state)]);
  return { cursos: cursos, materias: materias };
}

// ---------------------------------------------------------------------------
// OCR Planilla — helpers puros (exportados para tests)
// ---------------------------------------------------------------------------

export function normalizeDNI(v) {
  return String(v || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
}

export function ocrZoneHTML() {
  return (
    '<div class="ocr-zone" data-ocr-zone>' +
    '<input type="file" class="ocr-input" data-ocr-file accept="application/pdf,image/png,image/jpeg,image/webp,image/bmp" multiple hidden>' +
    '<div class="ocr-drop" data-ocr-drop>' +
    icon('ScanText', 20) +
    '<p><strong>Escanear planilla</strong> o arrastrá la foto/PDF acá</p>' +
    '<span>Se autocompleta el formulario con el OCR offline</span>' +
    '</div>' +
    '<div class="ocr-status" data-ocr-status hidden></div>' +
    '</div>'
  );
}

export function reinscripcionBannerHTML() {
  return (
    '<div class="reinscripcion-banner">' +
    icon('BadgeCheck', 18) +
    '<div><strong>Reinscripción de alumno</strong><p>El DNI ya existe. Se editará el registro actualizado con los datos de la planilla.</p></div>' +
    '</div>'
  );
}

export function applyOcrFields(fields, formEl) {
  if (!fields || !formEl) return;
  formEl.querySelectorAll('[name]').forEach((el) => {
    const name = el.getAttribute('name');
    if (!(name in fields) || name === 'id_curso') return;
    const val = fields[name];
    if (el.type === 'checkbox') {
      el.checked = !!val && val !== '0';
    } else if (el.tagName === 'SELECT') {
      setSelectValue(el, val);
    } else if (el.type !== 'file') {
      el.value = String(val === undefined || val === null ? '' : val);
    }
  });
}

function setSelectValue(sel, val) {
  const s = String(val);
  let matched = false;
  Array.from(sel.options).forEach((o) => { if (o.value === s) { o.selected = true; matched = true; } });
  if (!matched) {
    const o = document.createElement('option');
    o.value = s;
    o.text = s;
    o.selected = true;
    sel.appendChild(o);
  }
}

export function mergePrefill(dbRow, planillaFields) {
  const out = Object.assign({}, dbRow || {}, planillaFields || {});
  delete out.id_curso;
  return out;
}

export async function findAlumnoMatch(state, dni) {
  const nd = normalizeDNI(dni);
  if (!nd || nd.length < 7) return null;
  const res = await fetch('api.php?table=search&search=' + encodeURIComponent(nd));
  const rows = await res.json().catch(() => []);
  const list = Array.isArray(rows) ? rows : (rows && rows.data) || [];
  return list.find((r) => String(r.rol || '').toLowerCase() === 'alumno' && normalizeDNI(r.dni) === nd) || null;
}

export async function runOcr(state, files) {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append('planilla', f));
  const res = await fetch('api.php?action=ocr', {
    method: 'POST',
    headers: { 'X-CSRF-Token': state.csrf || '' },
    body: fd,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) throw new Error(d.error || 'Error de OCR (' + res.status + ')');
  return d;
}

function showOcrPreview(state, zone, d) {
  let prev = zone.querySelector('.ocr-preview');
  if (prev) prev.remove();
  prev = document.createElement('div');
  prev.className = 'ocr-preview';
  prev.innerHTML = '<details><summary>' + icon('ScanText', 15) + ' Texto OCR detectado</summary><pre>' + esc((d.text || []).join('\n')) + '</pre></details>';
  zone.appendChild(prev);
}

// ---------------------------------------------------------------------------
// OCR — revisión de campos detectados
// ---------------------------------------------------------------------------

const OCR_GROUPS = [
  { prefix: '', label: 'Datos del estudiante' },
  { prefix: 'resp1_', label: 'Responsable 1' },
  { prefix: 'resp2_', label: 'Responsable 2' },
  { prefix: 'salud_', label: 'Salud' },
  { prefix: 'rj_', label: 'Restricciones judiciales' },
];

const OCR_LABELS = {
  apellido: 'Apellido/s', nombre: 'Nombre/s', dni: 'DNI', cuil: 'CUIL',
  fecha_nacimiento: 'Fecha de nacimiento', lugar_nacimiento: 'Lugar de nacimiento',
  nacionalidad: 'Nacionalidad', tipo_dni: 'Tipo de DNI',
  calle: 'Calle', numero: 'Número', piso: 'Piso', depto: 'Depto',
  entre_calles: 'Entre calles', provincia: 'Provincia', distrito: 'Distrito', localidad: 'Localidad',
  telefono_fijo: 'Teléfono fijo', telefono_celular: 'Teléfono celular',
  email: 'Correo electrónico', correo: 'Correo electrónico',
  salud_obra_social_nombre: 'Obra social', salud_obra_social_nro: 'N° afiliado',
  rj_nombre: 'Nombre', rj_tipo_doc: 'Tipo de doc', rj_nro_doc: 'N° de doc', rj_descripcion: 'Restricción',
};

// Campos que jamás deben autocompletarse desde el OCR.
const OCR_IGNORE = new Set(['id_curso', 'fecha_ingreso']);

function ocrFieldLabel(name) {
  if (OCR_LABELS[name]) return OCR_LABELS[name];
  return name.replace(/^[^_]+_/, '').replace(/_/g, ' ');
}

// ocrFieldsHTML arma las tarjetas editables con los campos detectados.
// Si `base` es un registro existente (reinscripción), marca con badge si el
// valor detectado es nuevo, sobrescribe o dejaría el campo vacío.
export function ocrFieldsHTML(fields, base) {
  if (!fields) return '';
  const entries = Object.entries(fields).filter(([k]) => !OCR_IGNORE.has(k));
  const groups = OCR_GROUPS
    .map((g) => ({
      ...g,
      items: entries.filter(([k]) => (g.prefix ? k.startsWith(g.prefix) : !OCR_GROUPS.some((o) => o.prefix && k.startsWith(o.prefix)))).sort((a, b) => a[0].localeCompare(b[0])),
    }))
    .filter((g) => g.items.length)
    .map((g) => {
      const rows = g.items.map(([k, v]) => {
        const val = v === null || v === undefined ? '' : String(v);
        const dbv = base && base[k] !== null && base[k] !== undefined ? String(base[k]) : '';
        let badge = '';
        if (base) {
          if (val === '') badge = '<span class="ocr-badge ocr-badge-del" title="Estaría vacío al guardar">vacío</span>';
          else if (dbv === '') badge = '<span class="ocr-badge ocr-badge-new" title="No estaba cargado">nuevo</span>';
          else if (val !== dbv) badge = '<span class="ocr-badge ocr-badge-up" title="Cambiará el valor actual">sobrescribe</span>';
        }
        return '<label class="ocr-frow' + (badge ? ' ocr-frow-alert' : '') + '">' +
          '<span class="ocr-flabel">' + esc(ocrFieldLabel(k)) + badge + '</span>' +
          '<input class="crud-input" data-ocr-field name="' + esc(k) + '" value="' + esc(val) + '">' +
          '</label>';
      }).join('');
      return '<fieldset class="ocr-fgroup"><legend>' + esc(g.label) + '</legend>' + rows + '</fieldset>';
    });
  if (!groups.length) return '';
  return '<div class="ocr-fields" data-ocr-fields>' +
    '<div class="ocr-fhead"><strong>Campos detectados por OCR</strong><span>Revisá y corregí antes de aplicarlos al formulario</span></div>' +
    groups.join('') +
    '<button class="crud-btn crud-btn-primary" type="button" data-ocr-apply>' + icon('Check', 15) + ' Aplicar al formulario</button>' +
    '</div>';
}

export function collectOcrValues(zone) {
  const values = {};
  const els = zone ? zone.querySelectorAll('[data-ocr-field]') : [];
  Array.from(els).forEach((el) => { values[el.getAttribute('name')] = el.value; });
  return values;
}

function renderOcrFields(zone, fields, base) {
  if (!fields || !Object.keys(fields).some((k) => !OCR_IGNORE.has(k))) return;
  const old = zone.querySelector('[data-ocr-fields]');
  if (old) old.remove();
  const holder = document.createElement('div');
  holder.innerHTML = ocrFieldsHTML(fields, base);
  const panel = holder.firstElementChild;
  if (panel) zone.appendChild(panel);
}

// ---------------------------------------------------------------------------
// Modal + toast
// ---------------------------------------------------------------------------

export function modalHTML(head, bodyHTML, footerHTML) {
  return (
    '<div class="crud-overlay" data-crud-overlay>' +
    '<div class="crud-modal" role="dialog" aria-modal="true">' +
    '<div class="crud-head">' +
    head +
    '<button class="crud-close" type="button" data-crud-close aria-label="Cerrar">' + icon('X', 18) + '</button>' +
    '</div>' +
    '<div class="crud-body">' + bodyHTML + '</div>' +
    (footerHTML ? '<div class="crud-actions">' + footerHTML + '</div>' : '') +
    '</div>' +
    '</div>'
  );
}

function headHTML(iconName, color, title, sub) {
  return '<div class="crud-head-icon icon-' + color + '">' + icon(iconName, 19) + '</div><div class="crud-head-copy"><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div>';
}

function openCrudModal(state, html) {
  closeCrudModal(state);
  const wrap = document.createElement('div');
  wrap.className = 'crud-root-append';
  wrap.innerHTML = html;
  state.root.appendChild(wrap);
  return wrap.querySelector('.crud-overlay');
}

function closeCrudModal(state) {
  const cur = state.root.querySelector('.crud-root-append');
  if (cur) cur.remove();
}

export function toast(state, msg, okOk) {
  const prev = state.root.querySelector('.crud-toast');
  if (prev) prev.remove();
  const el = document.createElement('div');
  el.className = 'crud-toast' + (okOk ? ' ok' : ' err');
  el.innerHTML = icon(okOk ? 'CheckCircle2' : 'AlertTriangle', 17) + ' <span>' + esc(msg) + '</span>';
  state.root.appendChild(el);
  window.setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 3600);
}

// ---------------------------------------------------------------------------
// Auditoría (helpers puros)
// ---------------------------------------------------------------------------

export function auditAccionClass(accion) {
  const a = String(accion || '').toUpperCase();
  if (a === 'INSERT') return 'status status-active';
  if (a === 'DELETE') return 'status status-pending';
  return 'status ';
}

export function auditAccionText(accion) {
  const a = String(accion || '').toUpperCase();
  if (a === 'INSERT') return 'Alta';
  if (a === 'UPDATE') return 'Edición';
  if (a === 'DELETE') return 'Baja';
  return a || '—';
}

export function auditoriaRowsHTML(rows) {
  if (!rows || rows.length === 0) {
    return '<tr><td colspan="6" class="table-empty">Sin movimientos registrados.</td></tr>';
  }
  return rows
    .map(
      (r) =>
        '<tr class="crud-audit-row">' +
        '<td><span class="cell-muted">' + esc(String(r.created_at || '').slice(0, 16)) + '</span></td>' +
        '<td><strong>' + esc(r.usuario_nombre || r.username || '—') + '</strong></td>' +
        '<td><span class="course-level level-blue">' + esc(r.tabla || '—') + '</span></td>' +
        '<td><span class="' + auditAccionClass(r.accion) + '">' + esc(auditAccionText(r.accion)) + '</span></td>' +
        '<td><span class="cell-muted">' + esc(isSet(r.registro_id) ? r.registro_id : '—') + '</span></td>' +
        '<td><span class="cell-muted">' + esc(r.ip_address || '—') + '</span></td>' +
        '</tr>'
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Manejadores (DOM)
// ---------------------------------------------------------------------------

export function createCrud(state) {

  async function loadFormSel(tipo) {
    if (tipo === 'estudiantes') return selContentHTML(state);
    if (tipo === 'docentes') {
      const [materias, cursos] = await Promise.all([selMaterias(state), selCursos(state)]);
      return { materias: materias, cursos: cursos };
    }
    return { cursos: await selCursos(state), materias: [] };
  }

  function actionsFooter(tipo, mode, id, extra) {
    return (
      '<button class="crud-btn crud-btn-ghost" type="button" data-crud-cancel>' + icon('X', 15) + ' Cancelar</button>' +
      '<button class="crud-btn crud-btn-primary" type="submit">' + icon('CheckCircle2', 15) + ' ' + (mode === 'edit' ? 'Guardar Cambios' : 'Guardar') + '</button>' +
      (extra || '')
    );
  }

  async function formModal(tipo, mode, id, opts) {
    const meta = TIPOS[tipo];
    let data = {};
    let asignaciones = [];
    let body = '';
    if (mode === 'edit') {
      if (tipo === 'estudiantes') data = await fetch('api.php?table=estudiantes&id=' + encodeURIComponent(id)).then((r) => r.json());
      else if (tipo !== 'usuarios') data = await fetch('api.php?table=' + encodeURIComponent(tipo) + '&id=' + encodeURIComponent(id)).then((r) => r.json());
    }
    const sels = await loadFormSel(tipo);
    if (tipo === 'docentes' && mode === 'edit') {
      try {
        asignaciones = await fetch('api.php?table=docente_cursos&id=' + encodeURIComponent(id)).then((r) => r.json());
      } catch (e) {
        asignaciones = [];
      }
    }
    if (opts && opts.prefill && tipo === 'estudiantes') {
      data = Object.assign({}, data, opts.prefill);
      delete data.id_curso;
    }
    body = buildFormHTML(tipo, data, sels, { edit: mode === 'edit', asignaciones: asignaciones });

    const ocr = tipo === 'estudiantes';
    const formBody =
      (opts && opts.banner ? opts.banner : '') +
      (ocr ? ocrZoneHTML() : '') +
      '<form data-crud-form data-tipo="' + esc(tipo) + '" data-id="' + esc(id || '') + '">' + body + '</form>';
    const html = modalHTML(
      headHTML(meta.icon, meta.color, mode === 'edit' ? 'Editar ' + meta.singular : meta.newTitle, meta.title + (mode === 'edit' ? ' · ID ' + id : '')),
      formBody,
      actionsFooter(tipo, mode, id, mode === 'edit' ? '<button class="crud-btn crud-btn-danger" type="button" data-crud="del" data-tipo="' + esc(tipo) + '" data-id="' + esc(id) + '">' + icon('Trash2', 15) + ' Eliminar</button>' : '')
    );
    openCrudModal(state, html);
    if (ocr) wireOcr(state);
    if (ocr && opts && opts.ocrFields) {
      const zoneEl = state.root.querySelector('[data-ocr-zone]');
      if (zoneEl && state.user && (state.user.rol || state.user.role) === 'admin') {
        renderOcrFields(zoneEl, opts.ocrFields, opts.ocrBase || null);
      }
    }
  }

  async function remove(tipo, id, label) {
    if (!window.confirm('¿Está seguro de eliminar ' + (label || TIPOS[tipo].singular) + '?')) return;
    try {
      await apiWrite(state, 'api.php?table=' + encodeURIComponent(tipo) + '&id=' + encodeURIComponent(id), 'DELETE', {});
      closeCrudModal(state);
      toast(state, 'Registro eliminado con éxito', true);
      state.crudRefresh(TIPOS[tipo].section);
    } catch (err) {
      toast(state, 'Error: ' + err.message, false);
    }
  }

  async function openAsignar(cursoId) {
    const [docentes, materias] = await Promise.all([selDocentes(state), selMaterias(state)]);
    const body =
      '<form data-crud-form data-kind="asignacion" data-id="' + esc(cursoId) + '">' +
      '<div class="crud-grid">' +
      '<div class="crud-field"><label>Docente <span class="req">*</span></label><select class="crud-select" name="id_docente" required><option value="">Seleccione un docente…</option>' + docenteOptions(docentes, '') + '</select></div>' +
      '<div class="crud-field"><label>Materia <span class="req">*</span></label><input class="crud-input" name="materia" list="materias_dl" required placeholder="Especifica la materia"></div>' +
      '<div class="crud-field"><label>Cargo</label><select class="crud-select" name="cargo">' + selectOptions(CARGOS_ASIG, 'Titular') + '</select></div>' +
      '<div class="crud-field"><label>Día <span class="req">*</span></label><select class="crud-select" name="dia_semana" required><option value="">Selecciona un día</option>' + selectOptions(DIAS, '') + '</select></div>' +
      '<div class="crud-field"><label>Hora Inicio</label><input class="crud-input" type="time" name="hora_inicio" required></div>' +
      '<div class="crud-field"><label>Hora Fin</label><input class="crud-input" type="time" name="hora_fin" required></div>' +
      '<div class="crud-field"><label>Ciclo Lectivo</label><input class="crud-input" type="number" name="ciclo_lectivo" min="2000" max="2100" value="' + new Date().getFullYear() + '" required></div>' +
      '<div class="crud-field"><label>&nbsp;</label>' + materias.length + ' materias disponibles</div>' +
      '</div>' +
      '<datalist id="materias_dl">' + materias.map((m) => '<option value="' + esc(m.nombre) + '"></option>').join('') + '</datalist>' +
      '</form>';
    openCrudModal(state, modalHTML(headHTML('UserPlus', 'teal', 'Asignar Docente a Curso', 'Suma una asignación al curso en el ciclo lectivo'), body, actionsFooter('asignaciones', 'create')));
  }

  async function removeAsignacion(id, label) {
    if (!window.confirm('¿Está seguro de quitar esta asignación? (' + label + ')')) return;
    try {
      await apiWrite(state, 'api.php?table=asignaciones&id=' + encodeURIComponent(id), 'DELETE', {});
      toast(state, 'Asignación eliminada', true);
      state.crudRefresh('Listado por Cursos');
    } catch (err) {
      toast(state, 'Error: ' + err.message, false);
    }
  }

  function usuarioFormHTML(mode, row) {
    const r = row || {};
    const disabled = mode === 'edit' ? ' readonly' : '';
    return (
      '<form data-crud-form data-kind="usuario" data-mode="' + esc(mode) + '" data-id="' + esc(r.id_usuario || '') + '">' +
      '<div class="crud-grid">' +
      '<div class="crud-field"><label>Usuario <span class="req">*</span></label><input class="crud-input" name="username" ' + (disabled ? 'disabled' : 'required') + ' value="' + esc(r.username || '') + '"></div>' +
      '<div class="crud-field"><label>Nombre Completo <span class="req">*</span></label><input class="crud-input" name="nombre_completo" required value="' + esc(r.nombre_completo || '') + '"></div>' +
      '<div class="crud-field"><label>Rol</label><select class="crud-select" name="rol">' + selectOptions(ROLES, r.rol || 'lectura') + '</select></div>' +
      '<div class="crud-field"><label>&nbsp;</label><label class="crud-check"><input type="checkbox" name="activo" checked> Cuenta activa</label></div>' +
      '<div class="crud-field span-2"><label>Contraseña ' + (mode === 'edit' ? '' : '<span class="req">*</span>') + '</label><input class="crud-input" type="password" name="password" ' + (mode === 'edit' ? 'placeholder="Dejar en blanco para mantener"' : 'required') + '></div>' +
      '</div>' +
      '</form>'
    );
  }

  function openUsuario(mode, row) {
    openCrudModal(state, modalHTML(headHTML('ShieldCheck', 'violet', mode === 'edit' ? 'Editar Usuario' : 'Nuevo Usuario', mode === 'edit' ? 'Ajustes del usuario #' + row.id_usuario : 'Crea una cuenta para el sistema'), usuarioFormHTML(mode, row), actionsFooter('usuarios', mode)));
  }

  async function saveUsuario(mode, formEl, id) {
    const payload = usuarioPayload(formEl, mode, id);
    try {
      await apiWrite(state, 'api.php?table=usuarios', 'POST', payload);
      closeCrudModal(state);
      toast(state, mode === 'edit' ? 'Usuario actualizado' : 'Usuario creado con éxito', true);
      state.crudRefresh('Usuarios');
    } catch (err) {
      toast(state, 'Error: ' + err.message, false);
    }
  }

  async function removeUsuario(row) {
    if (!window.confirm('¿Eliminar el usuario "' + row.username + '"?')) return;
    try {
      await apiWrite(state, 'api.php?table=usuarios', 'POST', { action: 'delete', id: String(row.id_usuario) });
      toast(state, 'Usuario eliminado', true);
      state.crudRefresh('Usuarios');
    } catch (err) {
      toast(state, 'Error: ' + err.message, false);
    }
  }

  async function auditorsBody(page, filtro) {
    const q = new URLSearchParams({ table: 'audit_log', page: String(page || 1), limit: '30' });
    if (filtro) q.set('filtro_tabla', filtro);
    const res = await fetch('api.php?' + q.toString());
    const d = await res.json();
    const rows = Array.isArray(d) ? d : (d && d.data) || [];
    const meta = d && d.data ? d : { total: rows.length, page: 1, pages: 1 };
    const pag = '<div class="crud-paginado"><span>' + meta.total + ' movimientos</span>' +
      '<span>' + (meta.page || 1) + '/' + (meta.pages || 1) + '</span></div>';
    return '<div class="data-panel">' +
      '<div class="panel-heading"><div><h2>Registro de auditoría</h2><p>Operaciones de alta, edición y baja</p></div>' +
      '<div class="crud-filters"><select class="crud-select" data-crud-filtro aria-label="Filtrar por tabla">' +
      '<option value="">Todas las tablas</option>' + ['alumnos', 'docentes', 'cursos', 'materias', 'docente_materia_curso', 'usuarios', 'audit_log'].map((t) => '<option' + (filtro === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
      '</select>' +
      '<button class="filter-button" type="button" data-crud="audit" data-page="1">' + icon('Search', 15) + ' Filtrar</button></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Tabla</th><th>Acción</th><th>Registro</th><th>IP</th></tr></thead><tbody>' + auditoriaRowsHTML(rows) + '</tbody></table></div>' +
      pag +
      '</div>';
  }

  function wireOcr(state) {
    const wrap = state.root.querySelector('.crud-root-append');
    const zone = wrap && wrap.querySelector('[data-ocr-zone]');
    if (!zone) return;
    const form = wrap.querySelector('[data-crud-form]');
    const input = zone.querySelector('[data-ocr-file]');
    const drop = zone.querySelector('[data-ocr-drop]');
    const status = zone.querySelector('[data-ocr-status]');
    if (!input || !drop || !status || !form) return;

    const setStatus = (msg, ok) => {
      status.hidden = false;
      status.textContent = msg;
      status.className = 'ocr-status' + (ok ? ' ok' : ' err');
    };

    drop.addEventListener('click', () => input.click());
    ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
    input.addEventListener('change', () => { if (input.files && input.files.length) handleFiles(input.files); input.value = ''; });
    zone.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ocr-apply]');
      if (btn) {
        applyOcrFields(collectOcrValues(zone), form);
        setStatus('Campos aplicados al formulario. Revisá y guardá.', true);
      }
    });

    async function handleFiles(files) {
      setStatus('Procesando planilla con OCR…', true);
      try {
        const d = await runOcr(state, files);
        if (!d.ok) throw new Error(d.error || 'No se pudo leer la planilla');
        applyOcrFields(d.fields || {}, form);
        const isAdmin = state.user && (state.user.rol || state.user.role) === 'admin';
        if (isAdmin) {
          renderOcrFields(zone, d.fields || {}, null);
          if (Array.isArray(d.text) && d.text.length) {
            showOcrPreview(state, zone, d);
          }
        }
        const dni = normalizeDNI((d.fields || {}).dni);
        if (dni) {
          const hit = await findAlumnoMatch(state, dni);
          const currentId = form.getAttribute('data-id') || '';
          if (hit && String(hit.id) !== String(currentId)) {
            closeCrudModal(state);
            await formModal('estudiantes', 'edit', hit.id, { banner: reinscripcionBannerHTML(), prefill: mergePrefill({}, d.fields || {}), ocrFields: d.fields, ocrBase: hit });
            toast(state, 'Alumno existente: se abre en edición (reinscripción)', true);
            return;
          }
          if (hit) {
            setStatus('Este DNI corresponde al registro actual', true);
            return;
          }
        }
        toast(state, 'Campos autocompletados desde la planilla', true);
      } catch (err) {
        setStatus('OCR falló: ' + err.message, false);
        toast(state, 'OCR falló: ' + err.message, false);
      }
    }
  }

  return {
    TIPOS: TIPOS,

    async openCreate(tipo) {
      if (tipo === 'usuarios') {
        this.openUsuario('create', null);
        return;
      }
      await formModal(tipo, 'create');
    },

    async openEdit(tipo, id) {
      await formModal(tipo, 'edit', id);
    },

    remove: remove,
    openAsignar: openAsignar,
    removeAsignacion: removeAsignacion,
    removeUsuario: removeUsuario,
    openUsuario: openUsuario,
    auditorsBody: auditorsBody,

    handleClick(e) {
      const crudBtn = e.target.closest('[data-crud]');
      if (crudBtn) {
        const kind = crudBtn.getAttribute('data-crud');
        const tipo = crudBtn.getAttribute('data-tipo');
        const id = crudBtn.getAttribute('data-id');
        if (kind === 'create') {
          this.openCreate(tipo);
        } else if (kind === 'edit') {
          this.openEdit(tipo, id);
        } else if (kind === 'del') {
          this.remove(tipo, id, crudBtn.getAttribute('data-label'));
        } else if (kind === 'asignar') {
          this.openAsignar(id);
        } else if (kind === 'asig-del') {
          this.removeAsignacion(id, crudBtn.getAttribute('data-label'));
        } else if (kind === 'usuario') {
          const mode = crudBtn.getAttribute('data-mode') || 'create';
          let row = null;
          if (mode === 'edit' && id) {
            row = (state.cache.Usuarios || []).find((u) => String(u.id_usuario) === String(id)) || { id_usuario: id };
          }
          this.openUsuario(mode, row);
        } else if (kind === 'usuario-del') {
          const row = (state.cache.Usuarios || []).find((u) => String(u.id_usuario) === String(id)) || { id_usuario: id, username: crudBtn.getAttribute('data-label') };
          this.removeUsuario(row);
        } else if (kind === 'assign-add') {
          const modal = state.root.querySelector('[data-crud-overlay]');
          const container = modal && modal.querySelector('.crud-assign-row[data-asig-template]');
          if (container) {
            const holder = container.parentNode;
            const tmp = document.createElement('div');
            tmp.innerHTML = assignRowHTML({ cursos: state.crudSel && state.crudSel.cursos }, null, 0);
            const fresh = tmp.querySelector('.crud-assign-row');
            holder.insertBefore(fresh, container);
          }
        } else if (kind === 'audit') {
          const overlay = state.root.querySelector('[data-crud-overlay]');
          const filtro = overlay ? (overlay.querySelector('[data-crud-filtro]') || {}).value || '' : '';
          const currentPage = Number(crudBtn.getAttribute('data-page') || 1);
          this.auditorsBody(currentPage, filtro).then((html) => {
            const wrap = state.root.querySelector('.crud-root-append');
            if (wrap) {
              wrap.innerHTML = modalHTML(headHTML('ScrollText', 'orange', 'Auditoría', 'Registro de operaciones'), html, '');
            }
          });
        }
        return true;
      }

      if (e.target.closest('.crud-section-head[data-toggle-section]')) {
        const sec = e.target.closest('[data-crud-section]');
        if (sec) sec.classList.toggle('open');
        return true;
      }

      const overlay = e.target.closest('[data-crud-overlay]');
      if (overlay) {
        if (e.target.closest('[data-crud-close]') || e.target.closest('[data-crud-cancel]')) {
          closeCrudModal(state);
          return true;
        }
        if (e.target === overlay) {
          closeCrudModal(state);
          return true;
        }
        return true; // clicks dentro del modal no caen a la app
      }

      if (e.target.closest('[data-asig-remove]')) {
        const row = e.target.closest('[data-asig-row]');
        if (row) row.remove();
        return true;
      }

      return false;
    },

    handleInput(e) {
      const t = e.target;
      if (t && t.name === 'genero' && t.tagName === 'SELECT') {
        const form = t.closest('[data-crud-form]');
        if (!form) return;
        const show = t.value === 'Otra';
        form.querySelectorAll('.crud-field[data-for="genero"]').forEach((f) => f.classList.toggle('hidden-field', !show));
      }
    },

    async handleSubmit(formEl) {
      const kind = formEl.getAttribute('data-kind');
      const tipo = formEl.getAttribute('data-tipo');
      const mode = formEl.getAttribute('data-mode') || (formEl.getAttribute('data-id') ? 'edit' : 'create');
      const id = formEl.getAttribute('data-id');

      if (kind === 'asignacion') {
        try {
          await apiWrite(state, 'api.php?table=asignaciones', 'POST', asignacionData(formEl, id));
          closeCrudModal(state);
          toast(state, 'Asignación guardada con éxito', true);
          state.crudRefresh('Listado por Cursos');
          return;
        } catch (err) {
          toast(state, 'Error: ' + err.message, false);
          return;
        }
      }

      if (kind === 'usuario') {
        await saveUsuario(mode, formEl, id);
        return;
      }

      if (!TIPOS[tipo]) return;

      const data = gatherForm(formEl);
      try {
        if (tipo === 'docentes' && mode === 'edit') {
          await apiWrite(state, 'api.php?table=docentes&id=' + encodeURIComponent(id), 'PUT', data);
          await apiWrite(state, 'api.php?table=docente_cursos&id=' + encodeURIComponent(id), 'PUT', { asignaciones: assignRowsData(formEl) });
        } else if (mode === 'edit') {
          await apiWrite(state, 'api.php?table=' + encodeURIComponent(tipo) + '&id=' + encodeURIComponent(id), 'PUT', data);
        } else {
          await apiWrite(state, 'api.php?table=' + encodeURIComponent(tipo), 'POST', data);
        }
        closeCrudModal(state);
        toast(state, 'Registro guardado con éxito', true);
        state.crudRefresh(TIPOS[tipo].section);
      } catch (err) {
        toast(state, 'Error: ' + err.message, false);
      }
    },
  };
}

export { selectOptions, cursoOptions, docenteOptions };

// Exposición global para compatibilidad con la plantilla
if (typeof window !== 'undefined') {
  window.createCrud = createCrud;
}