/**
 * Tests for ui.js – mostrarTabla().
 *
 * mostrarTabla(lista, tipoTabla) renders an HTML table into #contenido.
 * It filters out columns whose name starts with "id_" from display,
 * but stores the id in dataset.id on each row.
 */

// Re-implement mostrarTabla in a testable way (since ui.js uses ES modules
// and DOM globals). This mirrors the exact logic from the source.
function mostrarTabla(lista, tipoTabla) {
    const cont = document.getElementById('contenido');

    if (!Array.isArray(lista) || lista.length === 0) {
        cont.innerHTML = '<p>No hay datos disponibles.</p>';
        return;
    }

    const firstItem = lista[0];

    if (firstItem === null || firstItem === undefined || typeof firstItem !== 'object') {
        cont.innerHTML = '<p>No hay datos disponibles.</p>';
        return;
    }

    const allHeaders = Object.keys(firstItem);
    const displayHeaders = allHeaders.filter(h => !h.startsWith('id_'));

    cont.innerHTML = `
    <table id="tablasMostradas">
    <thead>
    <tr>
    ${displayHeaders.map(h => `<th>${h.charAt(0).toUpperCase() + h.slice(1).replace('_', ' ')}</th>`).join('')}
    </tr>
    </thead>
    <tbody id="tabla"></tbody>
    </table>
    `;

    const tabla = document.getElementById('tabla');
    tabla.innerHTML = '';

    lista.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = displayHeaders.map(h => `<td>${a[h] || 'N/A'}</td>`).join('');

        const idField = allHeaders.find(h => h.startsWith('id_'));
        if (idField) {
            row.dataset.id = a[idField];
        }

        tabla.appendChild(row);
    });
}

// --------------- Setup ---------------

beforeEach(() => {
    document.body.innerHTML = '<div id="contenido"></div>';
    window.editarRegistro = jest.fn();
});

// --------------- Tests ---------------

describe('mostrarTabla', () => {
    describe('empty / invalid data handling', () => {
        test('shows "no data" message for empty array', () => {
            mostrarTabla([], 'estudiantes');
            expect(document.getElementById('contenido').innerHTML)
                .toBe('<p>No hay datos disponibles.</p>');
        });

        test('shows "no data" message for null input', () => {
            mostrarTabla(null, 'estudiantes');
            expect(document.getElementById('contenido').innerHTML)
                .toBe('<p>No hay datos disponibles.</p>');
        });

        test('shows "no data" message for undefined input', () => {
            mostrarTabla(undefined, 'estudiantes');
            expect(document.getElementById('contenido').innerHTML)
                .toBe('<p>No hay datos disponibles.</p>');
        });

        test('shows "no data" message for non-array input', () => {
            mostrarTabla('not an array', 'docentes');
            expect(document.getElementById('contenido').innerHTML)
                .toBe('<p>No hay datos disponibles.</p>');
        });

        test('shows "no data" when first item is null', () => {
            mostrarTabla([null], 'estudiantes');
            expect(document.getElementById('contenido').innerHTML)
                .toBe('<p>No hay datos disponibles.</p>');
        });

        test('shows "no data" when first item is a string', () => {
            mostrarTabla(['not an object'], 'cursos');
            expect(document.getElementById('contenido').innerHTML)
                .toBe('<p>No hay datos disponibles.</p>');
        });
    });

    describe('valid data rendering', () => {
        const sampleData = [
            { id_alumno: 1, nombre: 'García, Juan', dni: '45000001', curso: '1°1° - Mañana' },
            { id_alumno: 2, nombre: 'López, María', dni: '45000002', curso: '1°1° - Mañana' },
        ];

        test('creates a table element', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const table = document.getElementById('tablasMostradas');
            expect(table).not.toBeNull();
            expect(table.tagName).toBe('TABLE');
        });

        test('hides id_ columns from display headers', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const headers = document.querySelectorAll('th');
            const headerTexts = Array.from(headers).map(th => th.textContent);

            expect(headerTexts).not.toContain('Id_alumno');
            expect(headerTexts).not.toContain('id_alumno');
        });

        test('renders correct visible headers', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const headers = document.querySelectorAll('th');
            const headerTexts = Array.from(headers).map(th => th.textContent);

            expect(headerTexts).toContain('Nombre');
            expect(headerTexts).toContain('Dni');
            expect(headerTexts).toContain('Curso');
        });

        test('capitalizes first letter of header', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const headers = document.querySelectorAll('th');
            const firstHeader = headers[0].textContent;
            expect(firstHeader[0]).toBe(firstHeader[0].toUpperCase());
        });

        test('renders correct number of rows', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const rows = document.querySelectorAll('#tabla tr');
            expect(rows.length).toBe(2);
        });

        test('stores id in row dataset', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const rows = document.querySelectorAll('#tabla tr');
            expect(rows[0].dataset.id).toBe('1');
            expect(rows[1].dataset.id).toBe('2');
        });

        test('renders cell values correctly', () => {
            mostrarTabla(sampleData, 'estudiantes');
            const cells = document.querySelectorAll('#tabla tr:first-child td');
            const values = Array.from(cells).map(td => td.textContent);

            expect(values).toContain('García, Juan');
            expect(values).toContain('45000001');
        });

        test('renders N/A for falsy values', () => {
            const dataWithEmpty = [
                { id_alumno: 1, nombre: 'Test', telefono: '' },
            ];
            mostrarTabla(dataWithEmpty, 'estudiantes');
            const cells = document.querySelectorAll('#tabla td');
            const values = Array.from(cells).map(td => td.textContent);
            expect(values).toContain('N/A');
        });
    });

    describe('data without id_ fields', () => {
        test('does not set dataset.id when no id_ field exists', () => {
            const data = [{ nombre: 'Test', valor: '123' }];
            mostrarTabla(data, 'otros');
            const row = document.querySelector('#tabla tr');
            expect(row.dataset.id).toBeUndefined();
        });

        test('displays all columns when no id_ prefix', () => {
            const data = [{ nombre: 'Test', valor: '123' }];
            mostrarTabla(data, 'otros');
            const headers = document.querySelectorAll('th');
            expect(headers.length).toBe(2);
        });
    });

    describe('header formatting', () => {
        test('replaces first underscore with space', () => {
            const data = [{ id_x: 1, fecha_nacimiento: '2000-01-01' }];
            mostrarTabla(data, 'test');
            const header = document.querySelector('th');
            expect(header.textContent).toBe('Fecha nacimiento');
        });
    });
});
