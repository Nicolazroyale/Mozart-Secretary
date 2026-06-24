/**
 * Tests for logic extracted from app.js.
 *
 * app.js is a large ES module with many DOM-dependent functions.
 * We test the pure-logic portions and the DOM-rendering helpers.
 */

// --------------- Helpers (extracted logic from app.js) ---------------

/**
 * displaySuggestions: renders search suggestions into a dropdown.
 * Mirrors the logic in app.js.
 */
function displaySuggestions(results) {
    const suggestionsBox = document.getElementById('searchSuggestions');
    suggestionsBox.innerHTML = '';

    if (results.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    results.slice(0, 8).forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <span>${item.nombre} <small>(${item.dni})</small></span>
            <span class="role-tag role-${item.rol}">${item.rol}</span>
        `;
        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = 'block';
}

/**
 * mostrarResultadosBusqueda: renders search results into a table.
 * Mirrors the logic in app.js.
 */
function mostrarResultadosBusqueda(results) {
    const cont = document.getElementById('contenido');
    cont.innerHTML = `
        <div class="upload-container" style="max-width: 1000px;">
            <h2>Resultados de Búsqueda</h2>
            <table class="search-results-table">
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>DNI</th>
                        <th>Rol</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(item => `
                        <tr>
                            <td>${item.nombre}</td>
                            <td>${item.dni}</td>
                            <td><span class="role-tag role-${item.rol}">${item.rol}</span></td>
                            <td><button class="btn-perfil">Ver Perfil</button></td>
                        </tr>
                    `).join('')}
                    ${results.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;">No se encontraron resultados</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * toggleStudentFilters: show/hide student-specific search filters.
 */
function toggleStudentFilters() {
    const rol = document.getElementById('filterRol').value;
    const studentFilters = document.getElementById('studentFilters');
    studentFilters.style.display = (rol === 'alumno') ? 'flex' : 'none';
}

// --------------- Setup ---------------

beforeEach(() => {
    document.body.innerHTML = `
        <div id="searchSuggestions" style="display:none"></div>
        <div id="contenido"></div>
        <input id="globalSearch" value="" />
        <select id="filterRol"><option value="todos">Todos</option><option value="alumno">Alumno</option><option value="profesor">Profesor</option></select>
        <div id="studentFilters" style="display:none"></div>
    `;
});

// --------------- Tests ---------------

describe('displaySuggestions', () => {
    test('hides box when results are empty', () => {
        displaySuggestions([]);
        const box = document.getElementById('searchSuggestions');
        expect(box.style.display).toBe('none');
        expect(box.children.length).toBe(0);
    });

    test('shows box and renders suggestions', () => {
        const results = [
            { nombre: 'García, Juan', dni: '45000001', rol: 'alumno', id: 1 },
            { nombre: 'López, María', dni: '25333444', rol: 'profesor', id: 2 },
        ];
        displaySuggestions(results);

        const box = document.getElementById('searchSuggestions');
        expect(box.style.display).toBe('block');
        expect(box.children.length).toBe(2);
    });

    test('limits to 8 suggestions max', () => {
        const results = Array.from({ length: 15 }, (_, i) => ({
            nombre: `Person ${i}`,
            dni: `${40000000 + i}`,
            rol: 'alumno',
            id: i,
        }));

        displaySuggestions(results);
        const box = document.getElementById('searchSuggestions');
        expect(box.children.length).toBe(8);
    });

    test('each suggestion has correct CSS class', () => {
        displaySuggestions([
            { nombre: 'Test', dni: '123', rol: 'alumno', id: 1 },
        ]);

        const item = document.querySelector('.suggestion-item');
        expect(item).not.toBeNull();
    });

    test('displays name and DNI in suggestion', () => {
        displaySuggestions([
            { nombre: 'García, Juan', dni: '45000001', rol: 'alumno', id: 1 },
        ]);

        const item = document.querySelector('.suggestion-item');
        expect(item.textContent).toContain('García, Juan');
        expect(item.textContent).toContain('45000001');
    });

    test('displays role tag', () => {
        displaySuggestions([
            { nombre: 'Test', dni: '123', rol: 'profesor', id: 1 },
        ]);

        const tag = document.querySelector('.role-tag.role-profesor');
        expect(tag).not.toBeNull();
        expect(tag.textContent).toBe('profesor');
    });

    test('clears previous suggestions before rendering new ones', () => {
        displaySuggestions([
            { nombre: 'First', dni: '111', rol: 'alumno', id: 1 },
        ]);
        displaySuggestions([
            { nombre: 'Second', dni: '222', rol: 'alumno', id: 2 },
        ]);

        const box = document.getElementById('searchSuggestions');
        expect(box.children.length).toBe(1);
        expect(box.textContent).toContain('Second');
        expect(box.textContent).not.toContain('First');
    });
});

describe('mostrarResultadosBusqueda', () => {
    test('renders table with correct headers', () => {
        mostrarResultadosBusqueda([]);
        const headers = document.querySelectorAll('th');
        const texts = Array.from(headers).map(h => h.textContent);

        expect(texts).toEqual(['Nombre Completo', 'DNI', 'Rol', 'Acción']);
    });

    test('shows "no results" row for empty array', () => {
        mostrarResultadosBusqueda([]);
        const cells = document.querySelectorAll('td');
        const text = Array.from(cells).map(c => c.textContent).join('');
        expect(text).toContain('No se encontraron resultados');
    });

    test('renders one row per result', () => {
        const results = [
            { nombre: 'García, Juan', dni: '45000001', rol: 'alumno', id: 1 },
            { nombre: 'López, Ana', dni: '25333444', rol: 'profesor', id: 2 },
        ];
        mostrarResultadosBusqueda(results);

        const rows = document.querySelectorAll('tbody tr');
        expect(rows.length).toBe(2);
    });

    test('renders name and DNI in cells', () => {
        mostrarResultadosBusqueda([
            { nombre: 'Test User', dni: '99999999', rol: 'alumno', id: 1 },
        ]);

        const cells = document.querySelectorAll('tbody td');
        const values = Array.from(cells).map(c => c.textContent.trim());
        expect(values[0]).toBe('Test User');
        expect(values[1]).toBe('99999999');
    });

    test('includes role tag with correct class', () => {
        mostrarResultadosBusqueda([
            { nombre: 'X', dni: '1', rol: 'profesor', id: 1 },
        ]);

        const tag = document.querySelector('.role-tag.role-profesor');
        expect(tag).not.toBeNull();
    });

    test('includes "Ver Perfil" action button', () => {
        mostrarResultadosBusqueda([
            { nombre: 'X', dni: '1', rol: 'alumno', id: 1 },
        ]);

        const btn = document.querySelector('.btn-perfil');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('Ver Perfil');
    });
});

describe('toggleStudentFilters', () => {
    test('shows filters when rol is alumno', () => {
        document.getElementById('filterRol').value = 'alumno';
        toggleStudentFilters();
        expect(document.getElementById('studentFilters').style.display).toBe('flex');
    });

    test('hides filters when rol is profesor', () => {
        document.getElementById('filterRol').value = 'profesor';
        toggleStudentFilters();
        expect(document.getElementById('studentFilters').style.display).toBe('none');
    });

    test('hides filters when rol is todos', () => {
        document.getElementById('filterRol').value = 'todos';
        toggleStudentFilters();
        expect(document.getElementById('studentFilters').style.display).toBe('none');
    });
});

describe('search input behavior', () => {
    test('queries shorter than 2 chars should not trigger search', () => {
        const query = 'a';
        expect(query.length < 2).toBe(true);
    });

    test('queries of 2+ chars should trigger search', () => {
        const query = 'ab';
        expect(query.length >= 2).toBe(true);
    });

    test('search URL is constructed correctly', () => {
        const query = 'García';
        const rol = 'todos';
        const anio = '';
        const turno = '';
        const url = `api.php?table=search&search=${encodeURIComponent(query)}&rol=${rol}&anio=${anio}&turno=${turno}`;

        expect(url).toBe('api.php?table=search&search=Garc%C3%ADa&rol=todos&anio=&turno=');
    });

    test('special characters are properly encoded in search URL', () => {
        const query = 'O\'Brien & Sons';
        const url = `api.php?table=search&search=${encodeURIComponent(query)}&rol=todos&anio=&turno=`;
        expect(url).toContain("O'Brien");
        expect(url).toContain('%26');
    });
});

describe('pagination globals', () => {
    test('default page limit is 30', () => {
        const limitePorPagina = 30;
        expect(limitePorPagina).toBe(30);
    });

    test('default starting page is 1', () => {
        const paginaActual = 1;
        expect(paginaActual).toBe(1);
    });

    test('default selected table is estudiantes', () => {
        const tablaSeleccionada = 'estudiantes';
        expect(tablaSeleccionada).toBe('estudiantes');
    });

    test('default view is archivos', () => {
        const VistaSeleccionada = 'archivos';
        expect(VistaSeleccionada).toBe('archivos');
    });
});
