/**
 * Tests for crud_mejora.js (lógica pura del CRUD integrado).
 *
 * Convención del repo: re-implementamos las funciones puras del módulo (que
 * usa ES modules/DOM/fetch). El flujo completo e integrado se verifica con
 * node + jsdom desde /tmp/opencode (ver run_crud.mjs).
 */

function isSet(x) {
  return x !== undefined && x !== null;
}

function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TIPOS_DNI = ['DNI Argentino', 'Pasaporte'];
const CARGOS = ['Titular', 'Suplente'];
const DIAS = ['Lunes', 'Martes'];
const ROLES = ['admin', 'lectura'];

function selectOptions(opts, selected) {
  return opts
    .map((o) => '<option value="' + esc(o) + '"' + (String(o) === String(selected) ? ' selected' : '') + '>' + esc(o) + '</option>')
    .join('');
}

function cursoOptions(cursos, selected) {
  const courseShort = (c) => (isSet(c.division) ? c.anio + '°' + c.division + '°' : c.nombre);
  return (cursos || [])
    .map(
      (c) =>
        '<option value="' + esc(c.id_curso) + '"' + (String(c.id_curso) === String(selected) ? ' selected' : '') + '>' +
        esc(
          (c.turno ? courseShort(c) + ' (' + c.ciclo + ') - ' + c.turno : courseShort(c)) +
          (c.anio ? '' : '')
        ) +
        '</option>'
    )
    .join('');
}

function docenteOptions(docentes, selected) {
  return (docentes || [])
    .map(
      (d) =>
        '<option value="' + esc(d.id_docente) + '"' + (String(d.id_docente) === String(selected) ? ' selected' : '') + '>' +
        esc((d.nombre || '') + (d.dni ? ' · DNI ' + d.dni : '')) +
        '</option>'
    )
    .join('');
}

function fieldValue(data, key) {
  const target = (data && data[key]) ?? (data && data['salud_' + key]);
  return isSet(target) ? target : '';
}

function saludPayload(data) {
  const o = {};
  ['asma', 'celiaquia', 'diabetes', 'obesidad', 'cardiopatia', 'otros_checklist', 'alergias', 'internaciones', 'antecedentes_salud', 'obra_social_nombre', 'obra_social_nro'].forEach((k) => {
    o['salud_' + k] = fieldValue(data, k);
  });
  return o;
}

function respPayload(data, num) {
  const p = 'resp' + num;
  const out = {};
  ['vinculo', 'apellido', 'nombre', 'tipo_dni', 'dni', 'nacionalidad', 'profesion', 'nivel_educativo', 'condicion_actividad', 'convive', 'calle', 'numero', 'piso', 'depto', 'telefono_celular', 'email'].forEach((k) => {
    out[p + '_' + k] = isSet(data[p + '_' + k]) ? data[p + '_' + k] : '';
  });
  return out;
}

function principalPayload(data) {
  const o = { apellido: data.apellido || '', nombre: data.nombre || '', dni: data.dni || '', id_curso: data.id_curso || '' };
  return o;
}

function estudiantePayload(data) {
  const o = Object.assign({}, principalPayload(data), saludPayload(data), respPayload(data, 1));
  const rj = { rj_nombre: data.rj_nombre || '', rj_tipo_doc: data.rj_tipo_doc || '', rj_nro_doc: data.rj_nro_doc || '', rj_descripcion: data.rj_descripcion || '' };
  const resp2 = respPayload(data, 2);
  return Object.assign({}, o, resp2, rj);
}

function usuarioPayload(username, nombre, rol, activo, password, mode) {
  const data = { username, nombre_completo: nombre, rol, activo: activo ? 1 : 0 };
  if (mode !== 'edit') data.password = password;
  return { action: mode === 'edit' ? 'update' : 'create', data };
}

function asignacionData(form) {
  return {
    id_docente: form.id_docente,
    materia: form.materia,
    id_curso: form.id_curso,
    cargo: form.cargo || 'Titular',
    dia_semana: form.dia_semana,
    hora_inicio: form.hora_inicio,
    hora_fin: form.hora_fin,
    ciclo_lectivo: form.ciclo_lectivo,
    activo: 1,
  };
}

function auditAccionText(accion) {
  const a = String(accion || '').toUpperCase();
  if (a === 'INSERT') return 'Alta';
  if (a === 'UPDATE') return 'Edición';
  if (a === 'DELETE') return 'Baja';
  return a || '—';
}

function auditAccionClass(accion) {
  const a = String(accion || '').toUpperCase();
  if (a === 'INSERT') return 'status status-active';
  if (a === 'DELETE') return 'status status-pending';
  return 'status ';
}

describe('crud_mejora (lógica pura)', () => {
  test('selectOptions marca la opción seleccionada', () => {
    expect(selectOptions(CARGOS, 'Suplente')).toContain('value="Suplente" selected');
    expect(selectOptions(CARGOS, 'Titular')).not.toMatch(/value="Suplente" selected/);
  });

  test('cursoOptions usa id_curso y muestra turno/ciclo', () => {
    const html = cursoOptions([{ id_curso: 1, anio: 1, division: 1, turno: 'Mañana', ciclo: 'Básico' }], '1');
    expect(html).toContain('value="1" selected');
    expect(html).toContain('1°1°');
    expect(html).toContain('Mañana');
  });

  test('docenteOptions combina nombre y DNI', () => {
    const html = docenteOptions([{ id_docente: 4, nombre: 'Cabrera, Marcos', dni: '17746523' }], '4');
    expect(html).toContain('value="4" selected');
    expect(html).toContain('DNI 17746523');
  });

  test('estudiantePayload emite claves salud_/rj_ y resp1_', () => {
    const p = estudiantePayload({ apellido: 'Test', nombre: 'Nuevo', dni: '40999999', id_curso: '1', salud_diabetes: 1, rj_descripcion: 'Prohibición', resp1_apellido: 'Carrizo' });
    expect(p.salud_diabetes).toBe(1);
    expect(p.rj_descripcion).toBe('Prohibición');
    expect(p.resp1_apellido).toBe('Carrizo');
    expect(p.resp2_apellido).toBe('');
  });

  test('usuarioPayload crea o actualiza sin password en edit', () => {
    expect(usuarioPayload('nuevo', 'Nuevo Usuario', 'lectura', false, 'secret', 'create')).toEqual({
      action: 'create',
      data: { username: 'nuevo', nombre_completo: 'Nuevo Usuario', rol: 'lectura', activo: 0, password: 'secret' },
    });
    const edit = usuarioPayload('nuevo', 'Nuevo Usuario', 'admin', true, '', 'edit');
    expect(edit.action).toBe('update');
    expect(edit.data).not.toHaveProperty('password');
    expect(edit.data.activo).toBe(1);
  });

  test('asignacionData mapea el formulario de asignación', () => {
    const p = asignacionData({ id_docente: '4', materia: 'Matemática', id_curso: '1', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '09:30', ciclo_lectivo: '2026' });
    expect(p).toMatchObject({ id_docente: '4', materia: 'Matemática', id_curso: '1', dia_semana: 'Lunes', activo: 1, cargo: 'Titular' });
  });

  test('auditAccionText traduce INSERT/UPDATE/DELETE', () => {
    expect(auditAccionText('INSERT')).toBe('Alta');
    expect(auditAccionText('update')).toBe('Edición');
    expect(auditAccionText('DELETE')).toBe('Baja');
    expect(auditAccionClass('DELETE')).toBe('status status-pending');
    expect(auditAccionClass('INSERT')).toBe('status status-active');
  });
});