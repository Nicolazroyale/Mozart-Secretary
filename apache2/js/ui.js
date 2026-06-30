export function mostrarTabla(lista, tipoTabla) {
    let cont = document.getElementById("contenido");

    if (!Array.isArray(lista) || lista.length === 0) {
        cont.innerHTML = "<p>No hay datos disponibles.</p>";
        return;
    }

    const firstItem = lista[0];
    
    if (firstItem === null || firstItem === undefined || typeof firstItem !== 'object') {
        cont.innerHTML = "<p>No hay datos disponibles.</p>";
        return;
    }
    
    const allHeaders = Object.keys(firstItem);
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

// Add export function to window so it's accessible globally
window.exportarDatos = function(tipoTabla, formato) {
    // Create a modal dialog similar to the one for nomina
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top:0;">Exportar ${tipoTabla.charAt(0).toUpperCase() + tipoTabla.slice(1)}</h3>
        <p style="color:#666;">¿Está seguro de que desea exportar los datos a ${formato.toUpperCase()}?</p>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
            <button id="cancel-export-general" style="padding:8px 16px; border:1px solid #ddd; border-radius:4px; cursor:pointer;">Cancelar</button>
            <button id="confirm-export-general" style="padding:8px 16px; background:${formato === 'pdf' ? '#e74c3c' : '#27ae60'}; color:white; border:none; border-radius:4px; cursor:pointer;">
                Confirmar Exportación
            </button>
        </div>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    document.getElementById('cancel-export-general').onclick = () => {
        document.body.removeChild(modal);
    };
    
    document.getElementById('confirm-export-general').onclick = () => {
        document.body.removeChild(modal);
        
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = 'sistema/api.php';
        
        const tableInput = document.createElement('input');
        tableInput.type = 'hidden';
        tableInput.name = 'table';
        tableInput.value = tipoTabla;
        form.appendChild(tableInput);
        
        const formatInput = document.createElement('input');
        formatInput.type = 'hidden';
        formatInput.name = 'format';
        formatInput.value = formato;
        form.appendChild(formatInput);
        
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    };
};
