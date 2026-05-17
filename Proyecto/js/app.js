import { mostrarTabla } from "./ui.js";

// Exponer funciones al objeto global window inmediatamente
window.cargarRegistroArchivos = () => cambiarModo('archivos');
window.actualizarDatos = () => mostrarVista();
window.cambiarModo = cambiarModo;
window.toggleAccordion = toggleAccordion;
window.handleGeneroChange = handleGeneroChange;
window.copyDomicilio = copyDomicilio;
window.cargarEstudiantes = cargarEstudiantes;
window.cargarProfesores = cargarDocentes;
window.cargarCursos = cargarCursos;
window.cargarMaterias = cargarMaterias;
window.cargarVistaNomina = cargarVistaNomina;
window.actualizarNomina = actualizarNomina;
window.exportarNomina = exportarNomina;
window.guardarNuevo = guardarNuevo;
window.editarRegistro = editarRegistro;
window.guardarEdicion = guardarEdicion;
window.eliminarRegistro = eliminarRegistro;
window.cambiarPagina = cambiarPagina;
// Las funciones de búsqueda se mantienen para el buscador global en el header
window.handleSearchInput = handleSearchInput;
window.triggerSearch = triggerSearch;
window.toggleStudentFilters = () => {}; // No operativo ahora que se quitaron los filtros
window.verPerfil = verPerfil;

let searchTimeout;

// Guarda la tabla y vista seleccionada
let tablaSeleccionada = "estudiantes";
let VistaSeleccionada = "archivos";
let paginaActual = 1;
const limitePorPagina = 30;

function handleSearchInput(query) {
    clearTimeout(searchTimeout);
    const suggestionsBox = document.getElementById('searchSuggestions');
    
    if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        // Valores por defecto ahora que se quitaron los filtros del DOM
        const rol = 'todos';
        const anio = '';
        const turno = '';
        
        const url = `api.php?table=search&search=${encodeURIComponent(query)}&rol=${rol}&anio=${anio}&turno=${turno}`;
        const response = await fetch(url);
        const results = await response.json();
        
        displaySuggestions(results);
    }, 300);
}

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
        div.onclick = () => {
            verPerfil(item.rol === 'alumno' ? 'estudiantes' : 'docentes', item.id);
            suggestionsBox.style.display = 'none';
            document.getElementById('globalSearch').value = item.nombre;
        };
        suggestionsBox.appendChild(div);
    });
    
    suggestionsBox.style.display = 'block';
}

function toggleStudentFilters() {
    const rol = document.getElementById('filterRol').value;
    const studentFilters = document.getElementById('studentFilters');
    studentFilters.style.display = (rol === 'alumno') ? 'flex' : 'none';
}

async function triggerSearch() {
    const query = document.getElementById('globalSearch').value;
    // Valores por defecto ahora que se quitaron los filtros del DOM
    const rol = 'todos';
    const anio = '';
    const turno = '';
    
    if (query.length < 2 && rol === 'todos') return;

    const url = `api.php?table=search&search=${encodeURIComponent(query)}&rol=${rol}&anio=${anio}&turno=${turno}`;
    const response = await fetch(url);
    const results = await response.json();
    
    mostrarResultadosBusqueda(results);
}

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
                            <td><button class="btn-perfil" onclick="verPerfil('${item.rol === 'alumno' ? 'estudiantes' : 'docentes'}', ${item.id})">Ver Perfil</button></td>
                        </tr>
                    `).join('')}
                    ${results.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;">No se encontraron resultados</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
}

function verPerfil(tipo, id) {
    editarRegistro(tipo, id);
}

async function cargarVistaNomina() {
    tablaSeleccionada = "nomina";
    VistaSeleccionada = "archivos";
    
    const cont = document.getElementById('contenido');
    const cursos = await fetchDataTable("lista_cursos");
    const opcionesCursos = cursos.map(c => `<option value="${c.id_curso}">${c.nombre}</option>`).join('');

    cont.innerHTML = `
        <div class="upload-container" style="max-width: 1000px;">
            <h2>Nómina de Estudiantes por Curso</h2>
            
            <div class="accordion-item active">
                <div class="accordion-header" onclick="toggleAccordion(this)">Filtros de Búsqueda</div>
                <div class="accordion-content">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Seleccionar Curso (Ciclo - Año - División - Turno)</label>
                            <select id="select-curso-nomina" onchange="actualizarNomina()">
                                <option value="">Seleccione un curso...</option>
                                ${opcionesCursos}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div id="tabla-nomina-container">
                <p style="text-align:center; color:#7f8c8d; padding:20px;">Selecciona un curso para ver la nómina.</p>
            </div>
        </div>
    `;
}

async function actualizarNomina() {
    const idCurso = document.getElementById('select-curso-nomina').value;
    if (!idCurso) return;

    const container = document.getElementById('tabla-nomina-container');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Cargando nómina...</p>';

    const data = await fetchDataTable("nomina", idCurso);
    
    if (!data || data.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:${!data ? '#e74c3c' : '#7f8c8d'}; padding:20px;">
            ${!data ? 'Error al cargar los datos del curso.' : 'No hay alumnos registrados o activos en este curso.'}
        </p>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex; justify-content: flex-end; margin-bottom: 10px; gap: 10px;">
            <button onclick="exportarNomina('pdf')" style="background:#e74c3c;">Exportar PDF</button>
            <button onclick="exportarNomina('excel')" style="background:#27ae60;">Exportar Excel</button>
        </div>
        <table class="search-results-table">
            <thead>
                <tr>
                    <th>Apellido y Nombre</th>
                    <th>DNI</th>
                    <th>Responsable 1</th>
                    <th>Tel. Emergencia</th>
                    <th style="text-align:center;">Salud</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(alu => `
                    <tr>
                        <td style="font-weight:bold;">${alu.apellido.toUpperCase()}, ${alu.nombre}</td>
                        <td>${alu.dni}</td>
                        <td>${alu.resp_apellido || ''}, ${alu.resp_nombre || 'N/A'}</td>
                        <td>${alu.resp_tel || 'N/A'}</td>
                        <td style="text-align:center;">
                            ${alu.alerta_salud > 0 ? '<span title="Tiene antecedentes de salud registrados" style="cursor:help; font-size:1.2em;">⚠️</span>' : '✅'}
                        </td>
                        <td>
                            <button class="btn-perfil" onclick="verPerfil('estudiantes', ${alu.id_alumno})">Ver Ficha</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function exportarNomina(formato) {
    const select = document.getElementById('select-curso-nomina');
    const cursoNombre = select.options[select.selectedIndex].text;
    alert(`Exportando nómina de ${cursoNombre} a ${formato.toUpperCase()}...\n(Esta funcionalidad requiere librerías adicionales como jsPDF o SheetJS)`);
}

async function fetchDataTable(table, id = null) {
    try {
        let url = `api.php?table=${table}`;
        if (id) url += `&id=${id}`;
        
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            console.error(data.error);
            return id ? null : [];
        }
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
        return id ? null : [];
    }
}

/*----------------Cargado Tablas----------*/
async function cargarEstudiantes(){
    tablaSeleccionada = "estudiantes";
    mostrarVista();
}

async function cargarDocentes(){
    tablaSeleccionada = "docentes";
    mostrarVista();
}

async function cargarCursos(){
    tablaSeleccionada = "cursos";
    mostrarVista();
}

async function cargarMaterias(){
    tablaSeleccionada = "materias";
    mostrarVista();
}

function cambiarModo(modo) {
    VistaSeleccionada = modo;
    
    // Actualizar UI de botones
    document.getElementById('btnVer').classList.toggle('active', modo === 'archivos');
    document.getElementById('btnSubir').classList.toggle('active', modo === 'subir');
    
    mostrarVista();
}

/*----------------Selector de vista----------*/
async function mostrarVista(){
    if(VistaSeleccionada === "archivos"){
        const data = await fetchDataTable(tablaSeleccionada);
        mostrarTabla(data, tablaSeleccionada);
    }
    else if(VistaSeleccionada === "subir"){
        await cargarFormulario();
    }
}

function toggleAccordion(header) {
    const item = header.parentElement;
    item.classList.toggle('active');
}

function handleGeneroChange(select) {
    const especifyGroup = document.getElementById('genero_especificar_group');
    if (select.value === 'Otra') {
        especifyGroup.classList.remove('hidden');
    } else {
        especifyGroup.classList.add('hidden');
    }
}

function copyDomicilio(check, targetPrefix) {
    if (check.checked) {
        document.getElementById(`${targetPrefix}_calle`).value = document.getElementById('calle').value;
        document.getElementById(`${targetPrefix}_numero`).value = document.getElementById('numero').value;
        document.getElementById(`${targetPrefix}_piso`).value = document.getElementById('piso').value;
        document.getElementById(`${targetPrefix}_depto`).value = document.getElementById('depto').value;
        document.getElementById(`${targetPrefix}_localidad`).value = document.getElementById('localidad').value;
        document.getElementById(`${targetPrefix}_provincia`).value = document.getElementById('provincia').value;
    }
}

async function cargarFormulario(){
    let cont = document.getElementById("contenido");
    const cursosDisponibles = await fetchDataTable("lista_cursos");
    const opcionesCursos = cursosDisponibles.map(c => `<option value="${c.id_curso}">${c.nombre}</option>`).join('');

    if(tablaSeleccionada === "estudiantes"){
        cont.innerHTML = `
        <div class="upload-container">
            <h2>Ficha de Inscripción de Alumno</h2>
            <form class="upload-form" id="form-nuevo">
                
                <!-- SECCION 1: DATOS DEL ESTUDIANTE -->
                <div class="accordion-item active">
                    <div class="accordion-header" onclick="toggleAccordion(this)">1. Datos del Estudiante</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Apellido</label>
                                <input type="text" id="apellido" required>
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="nombre" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo de Documento</label>
                                <select id="tipo_dni" required>
                                    <option value="DNI Argentino">DNI Argentino</option>
                                    <option value="DNI en trámite">DNI en trámite</option>
                                    <option value="CPI">CPI</option>
                                    <option value="Documento Extranjero">Documento Extranjero</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Número de Documento</label>
                                <input type="number" id="dni" required>
                            </div>
                            <div class="form-group">
                                <label>CUIL</label>
                                <input type="text" id="cuil">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" id="fecha_nacimiento" required>
                            </div>
                            <div class="form-group">
                                <label>Lugar de Nacimiento</label>
                                <input type="text" id="lugar_nacimiento">
                            </div>
                            <div class="form-group">
                                <label>Nacionalidad</label>
                                <input type="text" id="nacionalidad" value="Argentina">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Identidad de Género</label>
                                <select id="genero" onchange="handleGeneroChange(this)" required>
                                    <option value="No desea responder">Seleccionar...</option>
                                    <option value="Mujer">Mujer</option>
                                    <option value="Mujer trans/travesti">Mujer trans/travesti</option>
                                    <option value="Varón">Varón</option>
                                    <option value="Varón trans/masculinidad trans">Varón trans/masculinidad trans</option>
                                    <option value="No binario">No binario</option>
                                    <option value="Otra">Otra</option>
                                    <option value="No desea responder">No desea responder</option>
                                </select>
                            </div>
                            <div class="form-group hidden" id="genero_especificar_group">
                                <label>Especificar Género</label>
                                <input type="text" id="genero_especificar">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCION 2: DOMICILIO Y CONTACTO -->
                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">2. Domicilio y Contacto</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group" style="flex:2">
                                <label>Calle</label>
                                <input type="text" id="calle" required>
                            </div>
                            <div class="form-group">
                                <label>N°</label>
                                <input type="text" id="numero" required>
                            </div>
                            <div class="form-group">
                                <label>Piso</label>
                                <input type="text" id="piso">
                            </div>
                            <div class="form-group">
                                <label>Depto</label>
                                <input type="text" id="depto">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Entre calles</label>
                            <input type="text" id="entre_calles">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Localidad</label>
                                <input type="text" id="localidad" value="Buenos Aires" required>
                            </div>
                            <div class="form-group">
                                <label>Distrito</label>
                                <input type="text" id="distrito">
                            </div>
                            <div class="form-group">
                                <label>Provincia</label>
                                <input type="text" id="provincia" value="Buenos Aires" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Teléfono Fijo</label>
                                <input type="text" id="telefono_fijo">
                            </div>
                            <div class="form-group">
                                <label>Teléfono Celular</label>
                                <input type="text" id="telefono_celular">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCION 3: SALUD -->
                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">3. Antecedentes de Salud</div>
                    <div class="accordion-content">
                        <label>Checklist de Salud (Marque si corresponde)</label>
                        <div class="checkbox-group">
                            <div class="checkbox-item"><input type="checkbox" id="salud_asma"> Asma</div>
                            <div class="checkbox-item"><input type="checkbox" id="salud_celiaquia"> Celiaquía</div>
                            <div class="checkbox-item"><input type="checkbox" id="salud_diabetes"> Diabetes</div>
                            <div class="checkbox-item"><input type="checkbox" id="salud_obesidad"> Obesidad</div>
                            <div class="checkbox-item"><input type="checkbox" id="salud_cardiopatia"> Cardiopatía</div>
                        </div>
                        <div class="form-group">
                            <label>Otras condiciones</label>
                            <input type="text" id="salud_otros_checklist">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Alergias</label>
                                <textarea id="salud_alergias"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Internaciones</label>
                                <textarea id="salud_internaciones"></textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Antecedentes Personales de Salud (General)</label>
                            <textarea id="salud_antecedentes_salud" rows="4"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Obra Social / Prepaga</label>
                                <input type="text" id="salud_obra_social_nombre">
                            </div>
                            <div class="form-group">
                                <label>N° de Afiliado</label>
                                <input type="text" id="salud_obra_social_nro">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCION 4: RESPONSABLE 1 (PRINCIPAL) -->
                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">4. Datos del Responsable 1 (Tutor)</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Vínculo</label>
                                <select id="resp1_vinculo" required>
                                    <option value="Madre">Madre</option>
                                    <option value="Padre">Padre</option>
                                    <option value="Tutor/a">Tutor/a</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Apellido</label>
                                <input type="text" id="resp1_apellido" required>
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="resp1_nombre" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo Doc</label>
                                <select id="resp1_tipo_dni">
                                    <option value="DNI Argentino">DNI Argentino</option>
                                    <option value="DNI en trámite">DNI en trámite</option>
                                    <option value="CPI">CPI</option>
                                    <option value="Documento Extranjero">Documento Extranjero</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Número Doc</label>
                                <input type="text" id="resp1_dni" required>
                            </div>
                            <div class="form-group">
                                <label>Nacionalidad</label>
                                <input type="text" id="resp1_nacionalidad" value="Argentina">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Profesión</label>
                                <input type="text" id="resp1_profesion">
                            </div>
                            <div class="form-group">
                                <label>Nivel Educativo</label>
                                <input type="text" id="resp1_nivel_educativo">
                            </div>
                        </div>
                        <div class="checkbox-item" style="margin: 10px 0;">
                            <input type="checkbox" id="resp1_convive" onchange="copyDomicilio(this, 'resp1')"> ¿Convive con el estudiante?
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Calle</label><input type="text" id="resp1_calle"></div>
                            <div class="form-group"><label>N°</label><input type="text" id="resp1_numero"></div>
                            <div class="form-group"><label>Piso</label><input type="text" id="resp1_piso"></div>
                            <div class="form-group"><label>Depto</label><input type="text" id="resp1_depto"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Celular</label><input type="text" id="resp1_telefono_celular"></div>
                            <div class="form-group"><label>Email</label><input type="email" id="resp1_email"></div>
                        </div>
                    </div>
                </div>

                <!-- SECCION 5: RESPONSABLE 2 (OPCIONAL) -->
                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">5. Datos del Responsable 2 (Opcional)</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Vínculo</label>
                                <select id="resp2_vinculo">
                                    <option value="">Ninguno / No aplica</option>
                                    <option value="Madre">Madre</option>
                                    <option value="Padre">Padre</option>
                                    <option value="Tutor/a">Tutor/a</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Apellido</label>
                                <input type="text" id="resp2_apellido">
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="resp2_nombre">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo Doc</label>
                                <select id="resp2_tipo_dni">
                                    <option value="DNI Argentino">DNI Argentino</option>
                                    <option value="DNI en trámite">DNI en trámite</option>
                                    <option value="CPI">CPI</option>
                                    <option value="Documento Extranjero">Documento Extranjero</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Número Doc</label>
                                <input type="text" id="resp2_dni">
                            </div>
                            <div class="form-group">
                                <label>Nacionalidad</label>
                                <input type="text" id="resp2_nacionalidad" value="Argentina">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Profesión</label>
                                <input type="text" id="resp2_profesion">
                            </div>
                            <div class="form-group">
                                <label>Nivel Educativo</label>
                                <input type="text" id="resp2_nivel_educativo">
                            </div>
                        </div>
                        <div class="checkbox-item" style="margin: 10px 0;">
                            <input type="checkbox" id="resp2_convive" onchange="copyDomicilio(this, 'resp2')"> ¿Convive con el estudiante?
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Calle</label><input type="text" id="resp2_calle"></div>
                            <div class="form-group"><label>N°</label><input type="text" id="resp2_numero"></div>
                            <div class="form-group"><label>Piso</label><input type="text" id="resp2_piso"></div>
                            <div class="form-group"><label>Depto</label><input type="text" id="resp2_depto"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Celular</label><input type="text" id="resp2_telefono_celular"></div>
                            <div class="form-group"><label>Email</label><input type="email" id="resp2_email"></div>
                        </div>
                    </div>
                </div>

                <!-- SECCION 6: INSCRIPCION -->
                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">6. Sección Inscripción</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Curso (Año y División)</label>
                                <select id="id_curso" required>
                                    <option value="">Seleccionar...</option>
                                    ${opcionesCursos}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Fecha de Ingreso</label>
                                <input type="date" id="fecha_ingreso" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCION 7: RESTRICCIONES JUDICIALES -->
                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">7. Restricciones Judiciales</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nombre y Apellido del Restringido</label>
                                <input type="text" id="rj_nombre">
                            </div>
                            <div class="form-group">
                                <label>Tipo Doc</label>
                                <input type="text" id="rj_tipo_doc">
                            </div>
                            <div class="form-group">
                                <label>N° Doc</label>
                                <input type="text" id="rj_nro_doc">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Descripción de la Restricción</label>
                            <textarea id="rj_descripcion"></textarea>
                        </div>
                    </div>
                </div>

                <button type="submit" class="submit-btn">Finalizar Inscripción del Alumno</button>
            </form>
        </div>
        `;
        document.getElementById('form-nuevo').onsubmit = (e) => { e.preventDefault(); guardarNuevo('estudiantes'); };
    } else if(tablaSeleccionada === "docentes"){
        cont.innerHTML = `
        <div class="upload-container">
            <h2>Cargar Docente</h2>
            <form class="upload-form" id="form-nuevo">
                <label for="apellido">Apellido</label>
                <input type="text" id="apellido" placeholder="Apellido" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]{2,80}$">
                
                <label for="nombre">Nombre</label>
                <input type="text" id="nombre" placeholder="Nombre" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]{2,80}$">
                
                <label for="dni">DNI (7 a 10 números)</label>
                <input type="text" id="dni" placeholder="DNI" required pattern="^[0-9]{7,10}$">
                
                <label for="fecha_inscripcion">Fecha de Inscripción</label>
                <input type="date" id="fecha_inscripcion" required>

                <label for="situacion_revista">Situación de Revista</label>
                <select id="situacion_revista" required>
                    <option value="Titular">Titular</option>
                    <option value="Provisional">Provisional</option>
                    <option value="Suplente">Suplente</option>
                </select>

                <button type="submit">Guardar Docente</button>
            </form>
        </div>
        `;
        document.getElementById('form-nuevo').onsubmit = (e) => { e.preventDefault(); guardarNuevo('docentes'); };
    } else if(tablaSeleccionada === "cursos"){
        cont.innerHTML = `
        <div class="upload-container">
            <h2>Cargar Nuevo Curso</h2>
            <form class="upload-form" id="form-nuevo">
                <label for="anio">Año (1 a 7)</label>
                <select id="anio" required>
                    <option value="">Seleccionar Año</option>
                    ${[1,2,3,4,5,6,7].map(n => `<option value="${n}">${n}° año</option>`).join('')}
                </select>

                <label for="division">División (Solo el número, ej: 1, 2, 3)</label>
                <input type="number" id="division" placeholder="Ej: 1" required min="1" max="20">

                <label for="turno">Turno</label>
                <select id="turno" required>
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                </select>

                <button type="submit">Guardar Curso</button>
            </form>
        </div>
        `;
        document.getElementById('form-nuevo').onsubmit = (e) => { e.preventDefault(); guardarNuevo('cursos'); };
    } else if(tablaSeleccionada === "materias"){
        cont.innerHTML = `
        <div class="upload-container">
            <h2>Cargar Nueva Materia</h2>
            <form class="upload-form" id="form-nuevo">
                <label for="nombre">Nombre de la Materia</label>
                <input type="text" id="nombre" placeholder="Ej: Matemática" required minlength="3" maxlength="100">

                <button type="submit">Guardar Materia</button>
            </form>
        </div>
        `;
        document.getElementById('form-nuevo').onsubmit = (e) => { e.preventDefault(); guardarNuevo('materias'); };
    }
}

async function guardarNuevo(tipo) {
    const form = document.getElementById('form-nuevo');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.id) {
            if (input.type === 'checkbox') {
                data[input.id] = input.checked ? 1 : 0;
            } else {
                data[input.id] = input.value;
            }
        }
    });

    try {
        const response = await fetch(`api.php?table=${tipo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            alert('Registro guardado con éxito');
            cambiarModo('archivos');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

async function editarRegistro(tipo, id) {
    console.log(`Cargando edición para ${tipo} con ID: ${id}`);
    
    const data = await fetchDataTable(tipo, id);
    if (!data) return alert("No se pudo cargar el registro");

    const cursosDisponibles = await fetchDataTable("lista_cursos");
    const opcionesCursos = (selectedId) => cursosDisponibles.map(c => `<option value="${c.id_curso}" ${selectedId == c.id_curso ? 'selected' : ''}>${c.nombre}</option>`).join('');

    const modal = document.createElement('div');
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    modal.id = "modal-edicion";
    
    if (tipo === 'estudiantes') {
        modal.innerHTML = `
            <div class="upload-container" style="max-width:800px; margin:0; max-height: 90vh; overflow-y: auto; width: 95%;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #3498db; margin-bottom:15px;">
                    <h2>Ficha Completa del Alumno</h2>
                    <span style="color:#7f8c8d; font-size: 0.8em;">ID: ${id}</span>
                </div>
                <form id="form-editar">
                    <!-- SECCION 1: DATOS DEL ESTUDIANTE -->
                    <div class="accordion-item active">
                        <div class="accordion-header" onclick="toggleAccordion(this)">1. Datos del Estudiante</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group"><label>Apellido</label><input type="text" id="edit-apellido" value="${data.apellido || ''}" required></div>
                                <div class="form-group"><label>Nombre</label><input type="text" id="edit-nombre" value="${data.nombre || ''}" required></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Tipo Documento</label>
                                <select id="edit-tipo_dni" required>
                                    <option value="DNI Argentino" ${data.tipo_dni === 'DNI Argentino' ? 'selected' : ''}>DNI Argentino</option>
                                    <option value="DNI en trámite" ${data.tipo_dni === 'DNI en trámite' ? 'selected' : ''}>DNI en trámite</option>
                                    <option value="CPI" ${data.tipo_dni === 'CPI' ? 'selected' : ''}>CPI</option>
                                    <option value="Documento Extranjero" ${data.tipo_dni === 'Documento Extranjero' ? 'selected' : ''}>Documento Extranjero</option>
                                </select></div>
                                <div class="form-group"><label>Número Documento</label><input type="number" id="edit-dni" value="${data.dni || ''}" required></div>
                                <div class="form-group"><label>CUIL</label><input type="text" id="edit-cuil" value="${data.cuil || ''}"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Fecha de Nacimiento</label><input type="date" id="edit-fecha_nacimiento" value="${data.fecha_nacimiento || ''}" required></div>
                                <div class="form-group"><label>Lugar de Nacimiento</label><input type="text" id="edit-lugar_nacimiento" value="${data.lugar_nacimiento || ''}"></div>
                                <div class="form-group"><label>Nacionalidad</label><input type="text" id="edit-nacionalidad" value="${data.nacionalidad || 'Argentina'}"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Identidad de Género</label>
                                    <select id="edit-genero" onchange="handleGeneroChange(this)" required>
                                        <option value="No desea responder">Seleccionar...</option>
                                        <option value="Mujer" ${data.genero === 'Mujer' ? 'selected' : ''}>Mujer</option>
                                        <option value="Mujer trans/travesti" ${data.genero === 'Mujer trans/travesti' ? 'selected' : ''}>Mujer trans/travesti</option>
                                        <option value="Varón" ${data.genero === 'Varón' ? 'selected' : ''}>Varón</option>
                                        <option value="Varón trans/masculinidad trans" ${data.genero === 'Varón trans/masculinidad trans' ? 'selected' : ''}>Varón trans/masculinidad trans</option>
                                        <option value="No binario" ${data.genero === 'No binario' ? 'selected' : ''}>No binario</option>
                                        <option value="Otra" ${data.genero === 'Otra' ? 'selected' : ''}>Otra</option>
                                        <option value="No desea responder" ${data.genero === 'No desea responder' ? 'selected' : ''}>No desea responder</option>
                                    </select>
                                </div>
                                <div class="form-group ${data.genero !== 'Otra' ? 'hidden' : ''}" id="edit-genero_especificar_group">
                                    <label>Especificar Género</label>
                                    <input type="text" id="edit-genero_especificar" value="${data.genero_especificar || ''}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SECCION 2: DOMICILIO Y CONTACTO -->
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleAccordion(this)">2. Domicilio y Contacto</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group" style="flex:2"><label>Calle</label><input type="text" id="edit-calle" value="${data.calle || ''}" required></div>
                                <div class="form-group"><label>N°</label><input type="text" id="edit-numero" value="${data.numero || ''}" required></div>
                                <div class="form-group"><label>Piso</label><input type="text" id="edit-piso" value="${data.piso || ''}"></div>
                                <div class="form-group"><label>Depto</label><input type="text" id="edit-depto" value="${data.depto || ''}"></div>
                            </div>
                            <div class="form-group"><label>Entre calles</label><input type="text" id="edit-entre_calles" value="${data.entre_calles || ''}"></div>
                            <div class="form-row">
                                <div class="form-group"><label>Localidad</label><input type="text" id="edit-localidad" value="${data.localidad || 'Buenos Aires'}" required></div>
                                <div class="form-group"><label>Distrito</label><input type="text" id="edit-distrito" value="${data.distrito || ''}"></div>
                                <div class="form-group"><label>Provincia</label><input type="text" id="edit-provincia" value="${data.provincia || 'Buenos Aires'}" required></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Teléfono Fijo</label><input type="text" id="edit-telefono_fijo" value="${data.telefono_fijo || ''}"></div>
                                <div class="form-group"><label>Teléfono Celular</label><input type="text" id="edit-telefono_celular" value="${data.telefono_celular || ''}"></div>
                            </div>
                        </div>
                    </div>

                    <!-- SECCION 3: SALUD -->
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleAccordion(this)">3. Antecedentes de Salud</div>
                        <div class="accordion-content">
                            <div class="checkbox-group">
                                <div class="checkbox-item"><input type="checkbox" id="edit-salud_asma" ${data.salud_asma == 1 ? 'checked' : ''}> Asma</div>
                                <div class="checkbox-item"><input type="checkbox" id="edit-salud_celiaquia" ${data.salud_celiaquia == 1 ? 'checked' : ''}> Celiaquía</div>
                                <div class="checkbox-item"><input type="checkbox" id="edit-salud_diabetes" ${data.salud_diabetes == 1 ? 'checked' : ''}> Diabetes</div>
                                <div class="checkbox-item"><input type="checkbox" id="edit-salud_obesidad" ${data.salud_obesidad == 1 ? 'checked' : ''}> Obesidad</div>
                                <div class="checkbox-item"><input type="checkbox" id="edit-salud_cardiopatia" ${data.salud_cardiopatia == 1 ? 'checked' : ''}> Cardiopatía</div>
                            </div>
                            <div class="form-group"><label>Otras condiciones</label><input type="text" id="edit-salud_otros_checklist" value="${data.salud_otros_checklist || ''}"></div>
                            <div class="form-row">
                                <div class="form-group"><label>Alergias</label><textarea id="edit-salud_alergias">${data.salud_alergias || ''}</textarea></div>
                                <div class="form-group"><label>Internaciones</label><textarea id="edit-salud_internaciones">${data.salud_internaciones || ''}</textarea></div>
                            </div>
                            <div class="form-group"><label>Antecedentes Personales de Salud</label><textarea id="edit-salud_antecedentes_salud">${data.salud_antecedentes_salud || ''}</textarea></div>
                            <div class="form-row">
                                <div class="form-group"><label>Obra Social</label><input type="text" id="edit-salud_obra_social_nombre" value="${data.salud_obra_social_nombre || ''}"></div>
                                <div class="form-group"><label>N° Afiliado</label><input type="text" id="edit-salud_obra_social_nro" value="${data.salud_obra_social_nro || ''}"></div>
                            </div>
                        </div>
                    </div>

                    <!-- SECCION 4: RESPONSABLE 1 -->
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleAccordion(this)">4. Datos del Responsable 1</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group"><label>Vínculo</label>
                                <select id="edit-resp1_vinculo" required>
                                    <option value="Madre" ${data.resp1_vinculo === 'Madre' ? 'selected' : ''}>Madre</option>
                                    <option value="Padre" ${data.resp1_vinculo === 'Padre' ? 'selected' : ''}>Padre</option>
                                    <option value="Tutor/a" ${data.resp1_vinculo === 'Tutor/a' ? 'selected' : ''}>Tutor/a</option>
                                    <option value="Otro" ${data.resp1_vinculo === 'Otro' ? 'selected' : ''}>Otro</option>
                                </select></div>
                                <div class="form-group"><label>Apellido</label><input type="text" id="edit-resp1_apellido" value="${data.resp1_apellido || ''}" required></div>
                                <div class="form-group"><label>Nombre</label><input type="text" id="edit-resp1_nombre" value="${data.resp1_nombre || ''}" required></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Tipo Doc</label>
                                <select id="edit-resp1_tipo_dni">
                                    <option value="DNI Argentino" ${data.resp1_tipo_dni === 'DNI Argentino' ? 'selected' : ''}>DNI Argentino</option>
                                    <option value="DNI en trámite" ${data.resp1_tipo_dni === 'DNI en trámite' ? 'selected' : ''}>DNI en trámite</option>
                                    <option value="CPI" ${data.resp1_tipo_dni === 'CPI' ? 'selected' : ''}>CPI</option>
                                    <option value="Documento Extranjero" ${data.resp1_tipo_dni === 'Documento Extranjero' ? 'selected' : ''}>Documento Extranjero</option>
                                </select></div>
                                <div class="form-group"><label>Número Doc</label><input type="text" id="edit-resp1_dni" value="${data.resp1_dni || ''}" required></div>
                            </div>
                            <div class="checkbox-item"><input type="checkbox" id="edit-resp1_convive" ${data.resp1_convive_estudiante == 1 ? 'checked' : ''}> ¿Convive?</div>
                        </div>
                    </div>

                    <!-- SECCION 5: RESPONSABLE 2 -->
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleAccordion(this)">5. Datos del Responsable 2 (Opcional)</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group"><label>Vínculo</label>
                                <select id="edit-resp2_vinculo">
                                    <option value="">Ninguno</option>
                                    <option value="Madre" ${data.resp2_vinculo === 'Madre' ? 'selected' : ''}>Madre</option>
                                    <option value="Padre" ${data.resp2_vinculo === 'Padre' ? 'selected' : ''}>Padre</option>
                                    <option value="Tutor/a" ${data.resp2_vinculo === 'Tutor/a' ? 'selected' : ''}>Tutor/a</option>
                                    <option value="Otro" ${data.resp2_vinculo === 'Otro' ? 'selected' : ''}>Otro</option>
                                </select></div>
                                <div class="form-group"><label>Apellido</label><input type="text" id="edit-resp2_apellido" value="${data.resp2_apellido || ''}"></div>
                                <div class="form-group"><label>Nombre</label><input type="text" id="edit-resp2_nombre" value="${data.resp2_nombre || ''}"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Número Doc</label><input type="text" id="edit-resp2_dni" value="${data.resp2_dni || ''}"></div>
                            </div>
                        </div>
                    </div>

                    <!-- SECCION 6: INSCRIPCION -->
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleAccordion(this)">6. Inscripción</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group"><label>Curso</label><select id="edit-id_curso" required>${opcionesCursos(data.id_curso)}</select></div>
                                <div class="form-group"><label>Fecha Ingreso</label><input type="date" id="edit-fecha_ingreso" value="${data.fecha_ingreso || ''}" required></div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button type="submit" class="submit-btn" style="flex:1;">Guardar Cambios</button>
                        <button type="button" onclick="document.body.removeChild(document.getElementById('modal-edicion'))" style="flex:1; background:#95a5a6;">Cancelar</button>
                        ${window.userRole === 'admin' ? `<button type="button" onclick="eliminarRegistro('${tipo}', ${id})" style="flex:1; background:#e74c3c;">Eliminar</button>` : ''}
                    </div>
                </form>
            </div>
        `;
    } else {
        modal.innerHTML = `
            <div class="upload-container">
                <h2>Editar Registro</h2>
                <form id="form-editar">
                    <p>Edición básica (para edición completa, modificar directamente en la base de datos)</p>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button type="button" onclick="document.body.removeChild(document.getElementById('modal-edicion'))" style="flex:1; background:#95a5a6;">Cerrar</button>
                        ${window.userRole === 'admin' ? `<button type="button" onclick="eliminarRegistro('${tipo}', ${id})" style="flex:1; background:#e74c3c;">Eliminar</button>` : ''}
                    </div>
                </form>
            </div>
        `;
    }
    
    document.body.appendChild(modal);

    // Asignar evento onsubmit después de añadir al DOM
    const formEditar = document.getElementById('form-editar');
    if (formEditar) {
        formEditar.onsubmit = (e) => { 
            e.preventDefault(); 
            guardarEdicion(tipo, id); 
        };
    }
}

async function guardarEdicion(tipo, id) {
    const form = document.getElementById('form-editar');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.id) {
            // Eliminar el prefijo 'edit-' para enviar a la API
            const realId = input.id.replace('edit-', '');
            if (input.type === 'checkbox') {
                data[realId] = input.checked ? 1 : 0;
            } else {
                data[realId] = input.value;
            }
        }
    });

    try {
        const response = await fetch(`api.php?table=${tipo}&id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            alert('Registro actualizado con éxito');
            const modal = document.getElementById('modal-edicion');
            if (modal) document.body.removeChild(modal);
            mostrarVista();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

async function eliminarRegistro(tipo, id) {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;

    try {
        const response = await fetch(`api.php?table=${tipo}&id=${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            alert('Registro eliminado con éxito');
            const modal = document.getElementById('modal-edicion');
            if (modal) document.body.removeChild(modal);
            mostrarVista();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}
