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

function icon(name) {
  return '<svg data-icon="' + name + '">';
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

function normalizeDNI(v) {
  return String(v || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
}

function ocrZoneHTML() {
  return (
    '<div class="ocr-zone" data-ocr-zone>' +
    '<input type="file" class="ocr-input" data-ocr-file accept="application/pdf,image/png,image/jpeg,image/webp,image/bmp" multiple hidden>' +
    '<div class="ocr-drop" data-ocr-drop>' +
    '<p><strong>Escanear planilla</strong> o arrastrá la foto/PDF acá</p>' +
    '</div>' +
    '<div class="ocr-status" data-ocr-status hidden></div>' +
    '</div>'
  );
}

function reinscripcionBannerHTML() {
  return '<div class="reinscripcion-banner"><strong>Reinscripción de alumno</strong><p>El DNI ya existe.</p></div>';
}

function mergePrefill(dbRow, planillaFields) {
  const out = Object.assign({}, dbRow || {}, planillaFields || {});
  delete out.id_curso;
  return out;
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

function applyOcrFields(fields, formEl) {
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
      el.value = String(val == null ? '' : val);
    }
  });
}

function backupSize(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return n + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return (v >= 100 ? Math.round(v) : v.toFixed(1)) + ' ' + units[i];
}

function isMonthlyBackup(name) {
  const m = /^mozart_(\d{4})-(\d{2})-(\d{2})\.db$/.exec(String(name || ''));
  return !!(m && m[3] === '01');
}

function downloadBackupURL(name) {
  return 'api.php?action=backup_download&file=' + encodeURIComponent(String(name || ''));
}

function backupsTableHTML(list) {
  if (!list || list.length === 0) {
    return '<tr><td colspan="4" class="table-empty">Sin backups todavía. Se generan cada día automáticamente o con “Crear backup ahora”.</td></tr>';
  }
  return list
    .map((b) =>
      '<tr class="crud-audit-row">' +
      '<td><strong>' + esc(b.name) + '</strong></td>' +
      '<td><span class="cell-muted">' + esc(b.modtime || '') + '</span></td>' +
      '<td><span class="cell-muted">' + esc(backupSize(b.size)) + '</span>' + (b.mensual ? ' <span class="ocr-badge ocr-badge-new">mensual</span>' : '') + '</td>' +
      '<td><a class="crud-link" href="' + esc(downloadBackupURL(b.name)) + '">' + icon('Download', 14) + ' Descargar</a></td>' +
      '</tr>'
    )
    .join('');
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

describe('crud_mejora · OCR planilla', () => {
  test('normalizeDNI limpia ceros y separadores', () => {
    expect(normalizeDNI('38541236')).toBe('38541236');
    expect(normalizeDNI('  38.541.236 ')).toBe('38541236');
    expect(normalizeDNI('0038541236')).toBe('38541236');
    expect(normalizeDNI('')).toBe('');
    expect(normalizeDNI('AB-1234567-X')).toBe('1234567');
  });

  test('ocrZoneHTML expone la dropzone y el input de archivo', () => {
    const html = ocrZoneHTML();
    expect(html).toContain('data-ocr-zone');
    expect(html).toContain('data-ocr-file');
    expect(html).toContain('accept="application/pdf,image/png,image/jpeg,image/webp,image/bmp"');
    expect(html).toMatch(/Escanear planilla/);
  });

  test('reinscripcionBannerHTML muestra el aviso de reinscripción', () => {
    const html = reinscripcionBannerHTML();
    expect(html).toContain('reinscripcion-banner');
    expect(html).toContain('Reinscripción de alumno');
  });

  test('mergePrefill da prioridad a la planilla y omite id_curso', () => {
    const merged = mergePrefill(
      { apellido: 'PEREZ', nombre: 'MARÍA', dni: '38541236', id_curso: 3, telefono_celular: '011155566' },
      { nombre: 'MARÍA JOSÉ', dni: '38541236', id_curso: 9, lugar_nacimiento: 'Lomas de Zamora' }
    );
    expect(merged.nombre).toBe('MARÍA JOSÉ');
    expect(merged.apellido).toBe('PEREZ');
    expect(merged.lugar_nacimiento).toBe('Lomas de Zamora');
    expect(merged).not.toHaveProperty('id_curso');
  });

  test('applyOcrFields rellena inputs/selects y salta id_curso', () => {
    const form = document.createElement('form');
    form.innerHTML =
      '<input name="apellido" value="">' +
      '<input name="nombre" value="">' +
      '<select name="tipo_dni"><option>DNI Argentino</option></select>' +
      '<select name="id_curso"><option value="">—</option></select>' +
      '<input type="checkbox" name="resp1_convive">';

    applyOcrFields(
      {
        apellido: 'PEREZ',
        nombre: 'MARÍA JOSÉ',
        tipo_dni: 'DNI Argentino',
        resp1_convive: 1,
        id_curso: '7',
      },
      form
    );

    expect(form.querySelector('[name="apellido"]').value).toBe('PEREZ');
    expect(form.querySelector('[name="nombre"]').value).toBe('MARÍA JOSÉ');
    expect(form.querySelector('[name="tipo_dni"]').value).toBe('DNI Argentino');
    expect(form.querySelector('[name="resp1_convive"]').checked).toBe(true);
    expect(form.querySelector('[name="id_curso"]').value).toBe('');
  });

  test('applyOcrFields agrega opción si el valor no existe en el select', () => {
    const form = document.createElement('form');
    form.innerHTML = '<select name="tipo_dni"><option value="DNI Argentino">DNI Argentino</option></select>';
    applyOcrFields({ tipo_dni: 'Documento Extranjero' }, form);
    const sel = form.querySelector('[name="tipo_dni"]');
    expect(sel.value).toBe('Documento Extranjero');
  });

  describe('ocrFieldsHTML (revisión de campos detectados)', () => {
    const OCR_GROUPS = [
      { prefix: '', label: 'Datos del estudiante' },
      { prefix: 'resp1_', label: 'Responsable 1' },
      { prefix: 'resp2_', label: 'Responsable 2' },
      { prefix: 'salud_', label: 'Salud' },
      { prefix: 'rj_', label: 'Restricciones judiciales' },
    ];
    const OCR_LABELS = {
      apellido: 'Apellido/s', nombre: 'Nombre/s', dni: 'DNI',
      salud_obra_social_nombre: 'Obra social', rj_nombre: 'Nombre',
    };
    const OCR_IGNORE = ['id_curso', 'fecha_ingreso'];

    function icon(name) {
      return '<svg data-icon="' + name + '"></svg>';
    }

    function ocrFieldsHTML(fields, base) {
      if (!fields) return '';
      const entries = Object.entries(fields).filter(([k]) => !OCR_IGNORE.includes(k));
      const groups = OCR_GROUPS
        .map((g) => ({
          ...g,
          items: entries.filter(([k]) => (g.prefix ? k.startsWith(g.prefix) : !OCR_GROUPS.some((o) => o.prefix && k.startsWith(o.prefix)))),
        }))
        .filter((g) => g.items.length)
        .map((g) => {
          const rows = g.items
            .map(([k, v]) => {
              const val = v == null ? '' : String(v);
              const dbv = base && base[k] != null ? String(base[k]) : '';
              let badge = '';
              if (base) {
                if (val === '') badge = 'ocr-badge-del';
                else if (dbv === '') badge = 'ocr-badge-new';
                else if (val !== dbv) badge = 'ocr-badge-up';
              }
              return (
                '<label class="ocr-frow' + (badge ? ' ocr-frow-alert' : '') + '">' +
                '<span class="ocr-flabel">' +
                esc(OCR_LABELS[k] || k.replace(/^[^_]+_/, '').replace(/_/g, ' ')) +
                (badge ? '<span class="ocr-badge ' + badge + '">' + (badge === 'ocr-badge-del' ? 'vacío' : badge === 'ocr-badge-new' ? 'nuevo' : 'sobrescribe') + '</span>' : '') +
                '</span>' +
                '<input class="crud-input" data-ocr-field name="' + esc(k) + '" value="' + esc(val) + '">' +
                '</label>'
              );
            })
            .join('');
          return '<fieldset class="ocr-fgroup"><legend>' + esc(g.label) + '</legend>' + rows + '</fieldset>';
        });
      if (!groups.length) return '';
      return (
        '<div class="ocr-fields" data-ocr-fields>' +
        '<div class="ocr-fhead"></div>' +
        groups.join('') +
        '<button class="crud-btn crud-btn-primary" type="button" data-ocr-apply>' + icon('Check') + ' Aplicar al formulario</button>' +
        '</div>'
      );
    }

    function collectOcrValues(zone) {
      const values = {};
      const els = zone ? zone.querySelectorAll('[data-ocr-field]') : [];
      Array.from(els).forEach((el) => { values[el.getAttribute('name')] = el.value; });
      return values;
    }

    test('agrupa por sección, etiqueta y omite id_curso/fecha_ingreso', () => {
      const html = ocrFieldsHTML(
        {
          apellido: 'PEREZ', nombre: 'MARÍA', dni: '38541236',
          resp1_apellido: 'GONZALEZ', resp1_nombre: 'ANA',
          rj_nombre: 'JUAN PEREZ', rj_nro_doc: '99123456',
          id_curso: 5, fecha_ingreso: '2020-03-01',
        },
        null
      );
      expect(html).toContain('data-ocr-fields');
      expect(html).toContain('Datos del estudiante');
      expect(html).toContain('Responsable 1');
      expect(html).toContain('Restricciones judiciales');
      expect(html).toContain('Apellido/s');
      expect(html).toContain('name="rj_nro_doc"');
      expect(html).not.toContain('id_curso');
      expect(html).not.toContain('fecha_ingreso');
      expect(html).toContain('data-ocr-apply');
      expect(html).toContain('name="apellido" value="PEREZ"');
    });

    test('sin base no marca badges', () => {
      const html = ocrFieldsHTML({ apellido: 'PEREZ' }, null);
      expect(html).not.toContain('sobrescribe');
      expect(html).not.toContain('ocr-badge');
    });

    test('con base marca nuevo/sobrescribe/vacío', () => {
      const html = ocrFieldsHTML(
        { apellido: 'PEREZ', resp1_nombre: 'ANA', salud_obra_social_nombre: '' },
        { apellido: 'PEREZ GARCIA', nombre: 'MARIA' }
      );
      expect(html).toContain('sobrescribe');
      expect(html).toContain('sobrescribe</span>');
      expect(html).toContain('vacío');
    });

    test('collectOcrValues lee los inputs editados', () => {
      const doc = document.createElement('div');
      doc.innerHTML =
        '<div data-ocr-zone>' +
        ocrFieldsHTML({ apellido: 'PEREZ', rj_nombre: 'JUAN', rj_nro_doc: '99123456' }, null) +
        '</div>';
      const zone = doc.querySelector('[data-ocr-zone]');
      zone.querySelector('[name="rj_nombre"]').value = 'JOSE';
      const values = collectOcrValues(zone);
      expect(values.apellido).toBe('PEREZ');
      expect(values.rj_nombre).toBe('JOSE');
      expect(values.rj_nro_doc).toBe('99123456');
    });
  });
});

describe('crud_mejora · Backups', () => {
  test('backupSize formatea bytes legibles', () => {
    expect(backupSize(0)).toBe('0 B');
    expect(backupSize(512)).toBe('512 B');
    expect(backupSize(2048)).toBe('2.0 KB');
    expect(backupSize(1536 * 1024)).toBe('1.5 MB');
    expect(backupSize(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
    expect(backupSize(-5)).toBe('—');
    expect(backupSize(undefined)).toBe('0 B');
  });

  test('isMonthlyBackup detecta snapshots del primer día del mes', () => {
    expect(isMonthlyBackup('mozart_2026-09-01.db')).toBe(true);
    expect(isMonthlyBackup('mozart_2026-09-15.db')).toBe(false);
    expect(isMonthlyBackup('otro_archivo.db')).toBe(false);
    expect(isMonthlyBackup(null)).toBe(false);
  });

  test('downloadBackupURL arma enlace con encoderURIComponent', () => {
    expect(downloadBackupURL('mozart_2026-09-15.db')).toBe('api.php?action=backup_download&file=mozart_2026-09-15.db');
    expect(downloadBackupURL('mo zart.db')).toContain(encodeURIComponent('mo zart.db'));
  });

  test('backupsTableHTML lista snapshots y badge mensual', () => {
    const html = backupsTableHTML([
      { name: 'mozart_2026-09-01.db', size: 204800, modtime: '2026-09-01 00:00', mensual: true },
      { name: 'mozart_2026-09-15.db', size: 332800, modtime: '2026-09-15 10:32', mensual: false },
    ]);
    expect(html).toContain('mozart_2026-09-01.db');
    expect(html).toContain('200 KB');
    expect(html).toContain('325 KB');
    expect(html).toContain('>mensual<');
    expect(html).toContain('backup_download&amp;file=mozart_2026-09-15.db');
    expect(html).toContain('data-icon="Download"');
  });

  test('backupsTableHTML muestra vacío sin snapshots', () => {
    const html = backupsTableHTML([]);
    expect(html).toContain('Sin backups todavía');
  });
});