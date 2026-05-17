export function mostrarTabla(lista, tipoTabla){
    let cont = document.getElementById("contenido");

    if (lista.length === 0) {
        cont.innerHTML = "<p>No hay datos disponibles.</p>";
        return;
    }

    // Obtener las llaves del primer objeto para las cabeceras, filtrando IDs
    const allHeaders = Object.keys(lista[0]);
    const displayHeaders = allHeaders.filter(h => !h.startsWith("id_"));

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

    let tabla = document.getElementById("tabla");
    tabla.innerHTML = "";

    lista.forEach(a => {
        const row = document.createElement("tr");
        row.innerHTML = displayHeaders.map(h => `<td>${a[h] || 'N/A'}</td>`).join('');
        
        // El ID se mantiene oculto en el dataset para permitir edición
        const idField = allHeaders.find(h => h.startsWith("id_"));
        if (idField) {
            row.dataset.id = a[idField];
            row.onclick = () => window.editarRegistro(tipoTabla, a[idField]);
        }
        
        tabla.appendChild(row);
    });
}
