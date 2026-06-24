import { mostrarTabla } from "./ui.js";

// Variables globales
let searchTimeout;
let tablaSeleccionada = "estudiantes";
let VistaSeleccionada = "archivos";
let paginaActual = 1;
const limitePorPagina = 30;

// Funciones
function handleSearchInput(query) {
    clearTimeout(searchTimeout);
    const suggestionsBox = document.getElementById('searchSuggestions');
    
    if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const rol = 'todos';
            const anio = '';
            const turno = '';
            
            const url = `api.php?table=search&search=${encodeURIComponent(query)}&rol=${rol}&anio=${anio}&turno=${turno}`;
            const response = await fetch(url);
            if (!response.ok) {
                console.error('Error en búsqueda:', response.status);
                suggestionsBox.style.display = 'none';
                return;
            }
            const results = await response.json();
            
            if (results.error) {
                console.error('Error en búsqueda:', results.error);
                suggestionsBox.style.display = 'none';
                return;
            }
            
            displaySuggestions(results);
        } catch (error) {
            console.error('Error en búsqueda:', error);
            suggestionsBox.style.display = 'none';
        }
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
    const rol = 'todos';
    const anio = '';
    const turno = '';
    
    if (query.length < 2 && rol === 'todos') return;

    try {
        const url = `api.php?table=search&search=${encodeURIComponent(query)}&rol=${rol}&anio=${anio}&turno=${turno}`;
        const response = await fetch(url);
        if (!response.ok) {
            alert('Error al buscar: el servidor respondió con estado ' + response.status);
            return;
        }
        const results = await response.json();
        
        if (results.error) {
            alert('Error al buscar: ' + results.error);
            return;
        }
        
        mostrarResultadosBusqueda(results);
    } catch (error) {
        console.error('Error en búsqueda:', error);
        alert('Error al conectar con el servidor');
    }
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
    let cursos;
    try {
        cursos = await fetchDataTable("lista_cursos");
    } catch (error) {
        console.error('Error al cargar cursos:', error);
        cont.innerHTML = '<p style="color:#e74c3c; padding:20px;">Error al cargar los cursos: ' + error.message + '</p>';
        return;
    }
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

    let alumnos, docentes;
    try {
        [alumnos, docentes] = await Promise.all([
            fetchDataTable("nomina", idCurso),
            fetchDataTable("docentes_por_curso", idCurso)
        ]);
    } catch (error) {
        console.error('Error al cargar nómina:', error);
        container.innerHTML = '<p style="color:#e74c3c; text-align:center; padding:20px;">Error al cargar la nómina: ' + error.message + '</p>';
        return;
    }

    let htmlContent = `
        <div style="display:flex; justify-content: flex-end; margin-bottom: 10px; gap: 10px;">
            <button onclick="exportarNomina('pdf')" style="background:#e74c3c;">Exportar PDF</button>
            <button onclick="exportarNomina('excel')" style="background:#27ae60;">Exportar Excel</button>
        </div>
    `;

<<<<<<< HEAD
    // Sección de Profesores
    htmlContent += `
        <div style="margin-bottom:30px;">
            <h3 style="color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:5px; margin-bottom:15px;">
                📚 Profesores del Curso
=======
    // Sección de Docentes
    htmlContent += `
        <div style="margin-bottom:30px;">
            <h3 style="color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:5px; margin-bottom:15px;">
                📚 Docentes del Curso
>>>>>>> master
            </h3>
    `;

    if (!docentes || docentes.length === 0) {
<<<<<<< HEAD
        htmlContent += `<p style="color:#7f8c8d; padding:10px;">No hay profesores asignados a este curso.</p>`;
=======
        htmlContent += `<p style="color:#7f8c8d; padding:10px;">No hay docentes asignados a este curso.</p>`;
>>>>>>> master
    } else {
        htmlContent += `
            <table class="search-results-table">
                <thead>
                    <tr>
                        <th>Apellido y Nombre</th>
                        <th>DNI</th>
                        <th>Cargo</th>
                        <th>Día</th>
                        <th>Horario</th>
                    </tr>
                </thead>
                <tbody>
                    ${docentes.map(doc => `
                        <tr>
                            <td style="font-weight:bold;">${doc.apellido.toUpperCase()}, ${doc.nombre}</td>
                            <td>${doc.dni}</td>
                            <td>${doc.cargo_curso || doc.cargo || 'N/A'}</td>
                            <td>${doc.dia_semana || 'N/A'}</td>
                            <td>${doc.hora_inicio ? `${doc.hora_inicio.substring(0,5)} - ${doc.hora_fin ? doc.hora_fin.substring(0,5) : 'N/A'}` : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    htmlContent += `</div>`;

    // Sección de Alumnos
    htmlContent += `
        <div>
            <h3 style="color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:5px; margin-bottom:15px;">
                👨‍🎓 Alumnos del Curso
            </h3>
    `;

    if (!alumnos || alumnos.length === 0) {
        htmlContent += `<p style="color:#7f8c8d; padding:10px;">No hay alumnos registrados o activos en este curso.</p>`;
    } else {
        htmlContent += `
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
                    ${alumnos.map(alu => `
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
    htmlContent += `</div>`;

    container.innerHTML = htmlContent;
}

function exportarNomina(formato) {
    const select = document.getElementById('select-curso-nomina');
    const cursoNombre = select.options[select.selectedIndex].text;
    alert(`Exportando nómina de ${cursoNombre} a ${formato.toUpperCase()}...\n(Esta funcionalidad requiere librerías adicionales como jsPDF o SheetJS)`);
}

async function fetchDataTable(table, id = null) {
    let url = `api.php?table=${table}`;
    if (id) url += `&id=${id}`;
    console.log("Fetching URL:", url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Error del servidor (${response.status})`);
    }
    
    const data = await response.json();
    console.log("Full API response:", data);
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    if (id) {
        return data;
    }
    
    if (data.data) {
        return Array.isArray(data.data) ? data.data : [];
    }
    
    return Array.isArray(data) ? data : [];
}

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
    
    document.getElementById('btnVer').classList.toggle('active', modo === 'archivos');
    document.getElementById('btnSubir').classList.toggle('active', modo === 'subir');
    
    mostrarVista();
}

async function mostrarVista(){
    if(VistaSeleccionada === "archivos"){
        try {
            const data = await fetchDataTable(tablaSeleccionada);
            mostrarTabla(data, tablaSeleccionada);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            document.getElementById('contenido').innerHTML = '<p style="color:#e74c3c; padding:20px;">Error al cargar datos: ' + error.message + '</p>';
        }
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
        const fields = ['calle', 'numero', 'piso', 'depto', 'localidad', 'provincia'];
        fields.forEach(field => {
            const source = document.getElementById(field);
            const target = document.getElementById(`${targetPrefix}_${field}`);
            if (source && target) {
                target.value = source.value;
            }
        });
    }
}

async function cargarFormulario(){
    let cont = document.getElementById("contenido");
    let cursosDisponibles;
    try {
        cursosDisponibles = await fetchDataTable("lista_cursos");
    } catch (error) {
        console.error('Error al cargar cursos:', error);
        cont.innerHTML = '<p style="color:#e74c3c; padding:20px;">Error al cargar los cursos: ' + error.message + '</p>';
        return;
    }
    const opcionesCursos = cursosDisponibles.map(c => `<option value="${c.id_curso}">${c.nombre}</option>`).join('');

    if(tablaSeleccionada === "estudiantes"){
        cont.innerHTML = `
        <div class="upload-container">
            <h2>Ficha de Inscripción de Alumno</h2>
            <form class="upload-form" id="form-nuevo">
                
                <div class="accordion-item active">
                    <div class="accordion-header" onclick="toggleAccordion(this)">1. Datos del Estudiante</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Apellido</label>
                                <input type="text" id="apellido" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="nombre" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
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
                                <input type="text" id="dni" required pattern="^[0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>CUIL</label>
                                <input type="text" id="cuil" placeholder="XX-XXXXXXXX-X" pattern="^[0-9]{2}-[0-9]{8}-[0-9]$">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" id="fecha_nacimiento" required>
                            </div>
                            <div class="form-group">
                                <label>Lugar de Nacimiento</label>
                                <input type="text" id="lugar_nacimiento" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>Nacionalidad</label>
                                <input type="text" id="nacionalidad" value="Argentina" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Identidad de Género</label>
                                <select id="genero" onchange="handleGeneroChange(this)" required>
                                    <option value="No desea responder">Seleccionar...</option>
                                    <option value="Mujer">Mujer</option>
<<<<<<< HEAD
                                    <option value="Mujer trans/travesti">Mujer trans/travesti</option>
                                    <option value="Varón">Varón</option>
                                    <option value="Varón trans/masculinidad trans">Varón trans/masculinidad trans</option>
=======
                                    <option value="Varón">Varón</option>
>>>>>>> master
                                    <option value="No binario">No binario</option>
                                    <option value="Otra">Otra</option>
                                    <option value="No desea responder">No desea responder</option>
                                </select>
                            </div>
                            <div class="form-group hidden" id="genero_especificar_group">
                                <label>Especificar Género</label>
                                <input type="text" id="genero_especificar" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">2. Domicilio y Contacto</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group" style="flex:2">
                                <label>Calle</label>
                                <input type="text" id="calle" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>N°</label>
                                <input type="text" id="numero" required pattern="^[0-9]+$">
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
                            <input type="text" id="entre_calles" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Localidad</label>
                                <input type="text" id="localidad" value="Buenos Aires" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Distrito</label>
                                <input type="text" id="distrito" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Provincia</label>
                                <input type="text" id="provincia" value="Buenos Aires" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Teléfono Fijo</label>
                                <input type="text" id="telefono_fijo" pattern="^[0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>Teléfono Celular</label>
                                <input type="text" id="telefono_celular" pattern="^[0-9]+$">
                            </div>
                        </div>
                    </div>
                </div>

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
                            <input type="text" id="salud_otros_checklist" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Alergias</label>
                                <textarea id="salud_alergias" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Internaciones</label>
                                <textarea id="salud_internaciones" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Antecedentes Personales de Salud (General)</label>
                            <textarea id="salud_antecedentes_salud" rows="4" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Obra Social / Prepaga</label>
                                <input type="text" id="salud_obra_social_nombre" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>N° de Afiliado</label>
                                <input type="text" id="salud_obra_social_nro" pattern="^[0-9]+$">
                            </div>
                        </div>
                    </div>
                </div>

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
                                <input type="text" id="resp1_apellido" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="resp1_nombre" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
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
                                <input type="text" id="resp1_dni" required pattern="^[0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>Nacionalidad</label>
                                <input type="text" id="resp1_nacionalidad" value="Argentina" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Profesión</label>
                                <input type="text" id="resp1_profesion" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Nivel Educativo</label>
                                <input type="text" id="resp1_nivel_educativo" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                        <div class="checkbox-item" style="margin: 10px 0;">
                            <input type="checkbox" id="resp1_convive" onchange="copyDomicilio(this, 'resp1')"> ¿Convive con el estudiante?
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Calle</label><input type="text" id="resp1_calle" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                            <div class="form-group"><label>N°</label><input type="text" id="resp1_numero" pattern="^[0-9]+$"></div>
                            <div class="form-group"><label>Piso</label><input type="text" id="resp1_piso"></div>
                            <div class="form-group"><label>Depto</label><input type="text" id="resp1_depto"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Celular</label><input type="text" id="resp1_telefono_celular" pattern="^[0-9]+$"></div>
                            <div class="form-group"><label>Email</label><input type="email" id="resp1_email" placeholder="correo@ejemplo.com"></div>
                        </div>
                    </div>
                </div>

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
                                <input type="text" id="resp2_apellido" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="resp2_nombre" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
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
                                <input type="text" id="resp2_dni" pattern="^[0-9]+$">
                            </div>
                            <div class="form-group">
                                <label>Nacionalidad</label>
                                <input type="text" id="resp2_nacionalidad" value="Argentina" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Profesión</label>
                                <input type="text" id="resp2_profesion" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                            <div class="form-group">
                                <label>Nivel Educativo</label>
                                <input type="text" id="resp2_nivel_educativo" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                            </div>
                        </div>
                        <div class="checkbox-item" style="margin: 10px 0;">
                            <input type="checkbox" id="resp2_convive" onchange="copyDomicilio(this, 'resp2')"> ¿Convive con el estudiante?
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Calle</label><input type="text" id="resp2_calle" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                            <div class="form-group"><label>N°</label><input type="text" id="resp2_numero" pattern="^[0-9]+$"></div>
                            <div class="form-group"><label>Piso</label><input type="text" id="resp2_piso"></div>
                            <div class="form-group"><label>Depto</label><input type="text" id="resp2_depto"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Celular</label><input type="text" id="resp2_telefono_celular" pattern="^[0-9]+$"></div>
                            <div class="form-group"><label>Email</label><input type="email" id="resp2_email" placeholder="correo@ejemplo.com"></div>
                        </div>
                    </div>
                </div>

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
        <div class="upload-container" style="max-width: 800px;">
            <h2>Cargar Docente</h2>
            <form class="upload-form" id="form-nuevo">
                <div class="accordion-item active">
                    <div class="accordion-header" onclick="toggleAccordion(this)">Datos Básicos</div>
                    <div class="accordion-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Apellido</label>
                                <input type="text" id="apellido" placeholder="Apellido" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]{2,80}$">
                            </div>
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" id="nombre" placeholder="Nombre" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]{2,80}$">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>DNI (7 a 10 números)</label>
                                <input type="text" id="dni" placeholder="DNI" required pattern="^[0-9]{7,10}$">
                            </div>
                            <div class="form-group">
                                <label>Fecha de Inscripción</label>
                                <input type="date" id="fecha_inscripcion" required value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Teléfono</label>
                                <input type="text" id="telefono" placeholder="Teléfono">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="email" placeholder="correo@ejemplo.com">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Situación de Revista</label>
                            <select id="situacion_revista" required>
                                <option value="Titular">Titular</option>
                                <option value="Provisional">Provisional</option>
                                <option value="Suplente">Suplente</option>
                                <option value="Interino">Interino</option>
                                <option value="Ad-Honorem">Ad-Honorem</option>
                                <option value="Jubilado">Jubilado</option>
                                <option value="Licencia">Licencia</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <div class="accordion-header" onclick="toggleAccordion(this)">Cursos Asignados</div>
                    <div class="accordion-content">
                        <p style="margin-bottom:10px; color:#7f8c8d;">Selecciona los cursos donde este docente imparte clases:</p>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">
                            ${cursosDisponibles.map(curso => `
                                <div style="display:flex; align-items:center; gap:8px; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                    <input type="checkbox" id="curso-${curso.id_curso}" name="cursos" value="${curso.id_curso}">
                                    <label for="curso-${curso.id_curso}" style="margin:0; cursor:pointer;">${curso.nombre}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <button type="submit" class="submit-btn">Guardar Docente</button>
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
    let cursosSeleccionados = [];
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox' && input.name === 'cursos' && input.checked) {
            cursosSeleccionados.push(parseInt(input.value));
        } else if (input.id) {
            if (input.type === 'checkbox') {
                data[input.id] = input.checked ? 1 : 0;
            } else {
                data[input.id] = input.value;
            }
        }
    });

    try {
        if (tipo === 'docentes') {
            const response1 = await fetch(`api.php?table=${tipo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result1 = await response1.json().catch(() => ({}));
            if (!response1.ok || !result1.success) {
                alert('Error: ' + (result1.error || `Error del servidor (${response1.status})`));
                return;
            }
            
            const docenteId = result1.id;
            const response2 = await fetch(`api.php?table=docente_cursos&id=${docenteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cursos: cursosSeleccionados })
            });
            const result2 = await response2.json().catch(() => ({}));
            if (!response2.ok || result2.error) {
                alert('Error al guardar cursos: ' + (result2.error || `Error del servidor (${response2.status})`));
                return;
            }
            
            alert('Registro guardado con éxito');
            cambiarModo('archivos');
        } else {
            const response = await fetch(`api.php?table=${tipo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.success) {
                alert('Registro guardado con éxito');
                cambiarModo('archivos');
            } else {
                alert('Error: ' + (result.error || `Error del servidor (${response.status})`));
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

async function editarRegistro(tipo, id) {
    console.log(`Cargando edición para ${tipo} con ID: ${id}`);
    
    let data, cursosDisponibles;
    try {
        data = await fetchDataTable(tipo, id);
        console.log("Data received for edit:", data);
        
        if (!data) return alert("No se pudo cargar el registro");

        cursosDisponibles = await fetchDataTable("lista_cursos");
    } catch (error) {
        console.error('Error al cargar registro:', error);
        alert('Error al cargar el registro: ' + error.message);
        return;
    }
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
                    <div class="accordion-item active">
                        <div class="accordion-header" onclick="toggleAccordion(this)">1. Datos del Estudiante</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group"><label>Apellido</label><input type="text" id="edit-apellido" value="${data.apellido || ''}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Nombre</label><input type="text" id="edit-nombre" value="${data.nombre || ''}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Tipo Documento</label>
                                <select id="edit-tipo_dni" required>
                                    <option value="DNI Argentino" ${data.tipo_dni === 'DNI Argentino' ? 'selected' : ''}>DNI Argentino</option>
                                    <option value="DNI en trámite" ${data.tipo_dni === 'DNI en trámite' ? 'selected' : ''}>DNI en trámite</option>
                                    <option value="CPI" ${data.tipo_dni === 'CPI' ? 'selected' : ''}>CPI</option>
                                    <option value="Documento Extranjero" ${data.tipo_dni === 'Documento Extranjero' ? 'selected' : ''}>Documento Extranjero</option>
                                </select></div>
                                <div class="form-group"><label>Número Documento</label><input type="text" id="edit-dni" value="${data.dni || ''}" required pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>CUIL</label><input type="text" id="edit-cuil" value="${data.cuil || ''}" placeholder="XX-XXXXXXXX-X" pattern="^[0-9]{2}-[0-9]{8}-[0-9]$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Fecha de Nacimiento</label><input type="date" id="edit-fecha_nacimiento" value="${data.fecha_nacimiento || ''}" required></div>
                                <div class="form-group"><label>Lugar de Nacimiento</label><input type="text" id="edit-lugar_nacimiento" value="${data.lugar_nacimiento || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                                <div class="form-group"><label>Nacionalidad</label><input type="text" id="edit-nacionalidad" value="${data.nacionalidad || 'Argentina'}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
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
                                    <input type="text" id="edit-genero_especificar" value="${data.genero_especificar || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleAccordion(this)">2. Domicilio y Contacto</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group" style="flex:2"><label>Calle</label><input type="text" id="edit-calle" value="${data.calle || ''}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                                <div class="form-group"><label>N°</label><input type="text" id="edit-numero" value="${data.numero || ''}" required pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Piso</label><input type="text" id="edit-piso" value="${data.piso || ''}"></div>
                                <div class="form-group"><label>Depto</label><input type="text" id="edit-depto" value="${data.depto || ''}"></div>
                            </div>
                            <div class="form-group"><label>Entre calles</label><input type="text" id="edit-entre_calles" value="${data.entre_calles || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                            <div class="form-row">
                                <div class="form-group"><label>Localidad</label><input type="text" id="edit-localidad" value="${data.localidad || 'Buenos Aires'}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Distrito</label><input type="text" id="edit-distrito" value="${data.distrito || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Provincia</label><input type="text" id="edit-provincia" value="${data.provincia || 'Buenos Aires'}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Teléfono Fijo</label><input type="text" id="edit-telefono_fijo" value="${data.telefono_fijo || ''}" pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Teléfono Celular</label><input type="text" id="edit-telefono_celular" value="${data.telefono_celular || ''}" pattern="^[0-9]+$"></div>
                            </div>
                        </div>
                    </div>

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
                            <div class="form-group"><label>Otras condiciones</label><input type="text" id="edit-salud_otros_checklist" value="${data.salud_otros_checklist || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                            <div class="form-row">
                                <div class="form-group"><label>Alergias</label><textarea id="edit-salud_alergias" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">${data.salud_alergias || ''}</textarea></div>
                                <div class="form-group"><label>Internaciones</label><textarea id="edit-salud_internaciones" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">${data.salud_internaciones || ''}</textarea></div>
                            </div>
                            <div class="form-group"><label>Antecedentes Personales de Salud</label><textarea id="edit-salud_antecedentes_salud" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$">${data.salud_antecedentes_salud || ''}</textarea></div>
                            <div class="form-row">
                                <div class="form-group"><label>Obra Social</label><input type="text" id="edit-salud_obra_social_nombre" value="${data.salud_obra_social_nombre || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                                <div class="form-group"><label>N° Afiliado</label><input type="text" id="edit-salud_obra_social_nro" value="${data.salud_obra_social_nro || ''}" pattern="^[0-9]+$"></div>
                            </div>
                        </div>
                    </div>

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
                                <div class="form-group"><label>Apellido</label><input type="text" id="edit-resp1_apellido" value="${data.resp1_apellido || ''}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Nombre</label><input type="text" id="edit-resp1_nombre" value="${data.resp1_nombre || ''}" required pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Tipo Doc</label>
                                <select id="edit-resp1_tipo_dni">
                                    <option value="DNI Argentino" ${data.resp1_tipo_dni === 'DNI Argentino' ? 'selected' : ''}>DNI Argentino</option>
                                    <option value="DNI en trámite" ${data.resp1_tipo_dni === 'DNI en trámite' ? 'selected' : ''}>DNI en trámite</option>
                                    <option value="CPI" ${data.resp1_tipo_dni === 'CPI' ? 'selected' : ''}>CPI</option>
                                    <option value="Documento Extranjero" ${data.resp1_tipo_dni === 'Documento Extranjero' ? 'selected' : ''}>Documento Extranjero</option>
                                </select></div>
                                <div class="form-group"><label>Número Doc</label><input type="text" id="edit-resp1_dni" value="${data.resp1_dni || ''}" required pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Nacionalidad</label><input type="text" id="edit-resp1_nacionalidad" value="${data.resp1_nacionalidad || 'Argentina'}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Profesión</label><input type="text" id="edit-resp1_profesion" value="${data.resp1_profesion || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Nivel Educativo</label><input type="text" id="edit-resp1_nivel_educativo" value="${data.resp1_nivel_educativo || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="checkbox-item"><input type="checkbox" id="edit-resp1_convive" ${data.resp1_convive_estudiante == 1 ? 'checked' : ''}> ¿Convive?</div>
                            <div class="form-row">
                                <div class="form-group"><label>Calle</label><input type="text" id="edit-resp1_calle" value="${data.resp1_calle || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                                <div class="form-group"><label>N°</label><input type="text" id="edit-resp1_numero" value="${data.resp1_numero || ''}" pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Piso</label><input type="text" id="edit-resp1_piso" value="${data.resp1_piso || ''}"></div>
                                <div class="form-group"><label>Depto</label><input type="text" id="edit-resp1_depto" value="${data.resp1_depto || ''}"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Celular</label><input type="text" id="edit-resp1_telefono_celular" value="${data.resp1_telefono_celular || ''}" pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Email</label><input type="email" id="edit-resp1_email" value="${data.resp1_email || ''}" placeholder="correo@ejemplo.com"></div>
                            </div>
                        </div>
                    </div>

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
                                <div class="form-group"><label>Apellido</label><input type="text" id="edit-resp2_apellido" value="${data.resp2_apellido || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Nombre</label><input type="text" id="edit-resp2_nombre" value="${data.resp2_nombre || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Tipo Doc</label>
                                <select id="edit-resp2_tipo_dni">
                                    <option value="DNI Argentino" ${data.resp2_tipo_dni === 'DNI Argentino' ? 'selected' : ''}>DNI Argentino</option>
                                    <option value="DNI en trámite" ${data.resp2_tipo_dni === 'DNI en trámite' ? 'selected' : ''}>DNI en trámite</option>
                                    <option value="CPI" ${data.resp2_tipo_dni === 'CPI' ? 'selected' : ''}>CPI</option>
                                    <option value="Documento Extranjero" ${data.resp2_tipo_dni === 'Documento Extranjero' ? 'selected' : ''}>Documento Extranjero</option>
                                </select></div>
                                <div class="form-group"><label>Número Doc</label><input type="text" id="edit-resp2_dni" value="${data.resp2_dni || ''}" pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Nacionalidad</label><input type="text" id="edit-resp2_nacionalidad" value="${data.resp2_nacionalidad || 'Argentina'}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Profesión</label><input type="text" id="edit-resp2_profesion" value="${data.resp2_profesion || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                                <div class="form-group"><label>Nivel Educativo</label><input type="text" id="edit-resp2_nivel_educativo" value="${data.resp2_nivel_educativo || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"></div>
                            </div>
                            <div class="checkbox-item"><input type="checkbox" id="edit-resp2_convive" ${data.resp2_convive_estudiante == 1 ? 'checked' : ''}> ¿Convive?</div>
                            <div class="form-row">
                                <div class="form-group"><label>Calle</label><input type="text" id="edit-resp2_calle" value="${data.resp2_calle || ''}" pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.,;0-9]+$"></div>
                                <div class="form-group"><label>N°</label><input type="text" id="edit-resp2_numero" value="${data.resp2_numero || ''}" pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Piso</label><input type="text" id="edit-resp2_piso" value="${data.resp2_piso || ''}"></div>
                                <div class="form-group"><label>Depto</label><input type="text" id="edit-resp2_depto" value="${data.resp2_depto || ''}"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Celular</label><input type="text" id="edit-resp2_telefono_celular" value="${data.resp2_telefono_celular || ''}" pattern="^[0-9]+$"></div>
                                <div class="form-group"><label>Email</label><input type="email" id="edit-resp2_email" value="${data.resp2_email || ''}" placeholder="correo@ejemplo.com"></div>
                            </div>
                        </div>
                    </div>

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
    } else if (tipo === 'docentes') {
        let cursosDisponiblesDoc, cursosAsignados;
        try {
            cursosDisponiblesDoc = await fetchDataTable("lista_cursos");
            cursosAsignados = await fetchDataTable("docente_cursos", id);
        } catch (error) {
            console.error('Error al cargar cursos del docente:', error);
            alert('Error al cargar datos de cursos: ' + error.message);
            return;
        }
        const cursosAsignadosSet = new Set(cursosAsignados || []);
        
        modal.innerHTML = `
            <div class="upload-container" style="max-width: 800px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #3498db; margin-bottom:15px;">
                    <h2>Editar Docente</h2>
                    <span style="color:#7f8c8d; font-size: 0.8em;">ID: ${id}</span>
                </div>
                <form id="form-editar">
                    <div class="accordion-item active">
                        <div class="accordion-header" onclick="toggleAccordion(this)">Datos Básicos</div>
                        <div class="accordion-content">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Apellido</label>
                                    <input type="text" id="edit-apellido" value="${data.apellido || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Nombre</label>
                                    <input type="text" id="edit-nombre" value="${data.nombre || ''}" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>DNI</label>
                                    <input type="text" id="edit-dni" value="${data.dni || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Fecha Inscripción</label>
                                    <input type="date" id="edit-fecha_inscripcion" value="${data.fecha_inscripcion || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Teléfono</label>
                                    <input type="text" id="edit-telefono" value="${data.telefono || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" id="edit-email" value="${data.email || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Situación Revista</label>
                                <select id="edit-situacion_revista" required>
                                    <option value="Titular" ${data.situacion_revista === 'Titular' ? 'selected' : ''}>Titular</option>
                                    <option value="Provisional" ${data.situacion_revista === 'Provisional' ? 'selected' : ''}>Provisional</option>
                                    <option value="Suplente" ${data.situacion_revista === 'Suplente' ? 'selected' : ''}>Suplente</option>
                                    <option value="Interino" ${data.situacion_revista === 'Interino' ? 'selected' : ''}>Interino</option>
                                    <option value="Ad-Honorem" ${data.situacion_revista === 'Ad-Honorem' ? 'selected' : ''}>Ad-Honorem</option>
                                    <option value="Jubilado" ${data.situacion_revista === 'Jubilado' ? 'selected' : ''}>Jubilado</option>
                                    <option value="Licencia" ${data.situacion_revista === 'Licencia' ? 'selected' : ''}>Licencia</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="accordion-item active">
                        <div class="accordion-header" onclick="toggleAccordion(this)">Cursos Asignados</div>
                        <div class="accordion-content">
                            <p style="margin-bottom:10px; color:#7f8c8d;">Selecciona los cursos donde este docente imparte clases:</p>
                            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">
                                ${cursosDisponiblesDoc.map(curso => `
                                    <div style="display:flex; align-items:center; gap:8px; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                        <input type="checkbox" id="curso-${curso.id_curso}" name="cursos" value="${curso.id_curso}" 
                                               ${cursosAsignadosSet.has(curso.id_curso) ? 'checked' : ''}>
                                        <label for="curso-${curso.id_curso}" style="margin:0; cursor:pointer;">${curso.nombre}</label>
                                    </div>
                                `).join('')}
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
            const realId = input.id.replace('edit-', '');
            if (input.type === 'checkbox') {
                if (input.name === 'cursos') {
                    return;
                }
                data[realId] = input.checked ? 1 : 0;
            } else {
                data[realId] = input.value;
            }
        }
    });

    try {
        if (tipo === 'docentes') {
            const response1 = await fetch(`api.php?table=${tipo}&id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result1 = await response1.json().catch(() => ({}));
            if (!response1.ok || result1.error) {
                alert('Error al guardar datos: ' + (result1.error || `Error del servidor (${response1.status})`));
                return;
            }
            
            const checkboxes = document.querySelectorAll('input[name="cursos"]:checked');
            const cursosSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));
            
            const response2 = await fetch(`api.php?table=docente_cursos&id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cursos: cursosSeleccionados })
            });
            const result2 = await response2.json().catch(() => ({}));
            if (!response2.ok || result2.error) {
                alert('Error al guardar cursos: ' + (result2.error || `Error del servidor (${response2.status})`));
                return;
            }
            
            alert('Registro actualizado con éxito');
            const modal = document.getElementById('modal-edicion');
            if (modal) document.body.removeChild(modal);
            mostrarVista();
        } else {
            const response = await fetch(`api.php?table=${tipo}&id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.success) {
                alert('Registro actualizado con éxito');
                const modal = document.getElementById('modal-edicion');
                if (modal) document.body.removeChild(modal);
                mostrarVista();
            } else {
                alert('Error: ' + (result.error || `Error del servidor (${response.status})`));
            }
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
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
            alert('Registro eliminado con éxito');
            const modal = document.getElementById('modal-edicion');
            if (modal) document.body.removeChild(modal);
            mostrarVista();
        } else {
            alert('Error: ' + (result.error || `Error del servidor (${response.status})`));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

function cambiarPagina(pagina) {
    paginaActual = pagina;
    mostrarVista();
}

// Exponer funciones al objeto global window
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
window.handleSearchInput = handleSearchInput;
window.triggerSearch = triggerSearch;
window.toggleStudentFilters = () => {};
window.verPerfil = verPerfil;
