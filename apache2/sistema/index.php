<?php
require_once '../Login/auth_config.php';
if (!verificar_sesion()) {
    header('Location: ../Login/Login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?php echo htmlspecialchars(get_csrf_token()); ?>">
    <title>Gestión Escolar</title>
    <link rel="stylesheet" href="../css/styles.css?v=3">
    <link rel="icon" href="../imagenes/logo.png?v=1" type="image/png">
</head>
<body>
<script>
    // Initialize theme immediately
    (function() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    })();
    </script>
    <header>
        <div style="width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 20px;">
            <div style="display: flex; align-items: center; justify-content: flex-start;">
                <img src="../imagenes/logo.png" alt="Logo" style="height: 60px; width: auto;">
            </div>
            <div style="text-align: center;">
                <h2 style="margin: 0;">SISTEMA DE GESTIÓN DE ARCHIVOS</h2>
            </div>
            <div style="display: flex; justify-content: flex-end; align-items: center;">
                <div class="user-badge" style="background: #34495e; padding: 5px 15px; border-radius: 20px; font-size: 13px;">
                    <span id="userNameDisplay"><?php echo htmlspecialchars($_SESSION['nombre'], ENT_QUOTES, 'UTF-8'); ?></span> (<?php echo htmlspecialchars($_SESSION['rol'], ENT_QUOTES, 'UTF-8'); ?>)
                    <a href="../logout.php" style="color: #e74c3c; margin-left: 10px; text-decoration: none; font-weight: bold;">Salir</a>
                </div>
                <button class="settings-btn" onclick="toggleSettings()">⚙️ Configuración</button>
            </div>
        </div>
        <div class="search-container">
            <div class="search-box">
                <input type="text" id="globalSearch" placeholder="Buscar por Nombre, Apellido o DNI..." oninput="handleSearchInput(this.value)">
                <div id="searchSuggestions" class="suggestions-box"></div>
            </div>
        </div>
    </header>
    <nav>
        <div class="mode-selector">
            <button id="btnVer" class="active" onclick="cambiarModo('archivos')">Ver Datos</button>
            <?php if ($_SESSION['rol'] === 'admin'): ?>
            <button id="btnSubir" onclick="cambiarModo('subir')">Cargar Nuevo</button>
            <?php endif; ?>
        </div>
        <button onclick="actualizarDatos()">Actualizar</button>
    </nav>

<div class="main">

    <div class="menu">
        <button onclick="cargarEstudiantes()">Estudiantes</button>
        <button onclick="cargarProfesores()">Docentes</button>
        <button onclick="cargarCursos()">Cursos</button>
        <button onclick="cargarVistaNomina()">Listado por Curso</button>
        <button onclick="cargarMaterias()">Materias</button>
    </div>

    <div id="contenido">
        <!-- El contenido se carga dinámicamente -->
    </div>

</div>

<script>
    // Pasar el rol de PHP a JS
    window.userRole = "<?php echo htmlspecialchars($_SESSION['rol'], ENT_QUOTES, 'UTF-8'); ?>";
</script>
<div id="settingsModal" class="settings-modal" style="display: none;">
    <div class="settings-container">
        <span class="settings-close" onclick="toggleSettings()">&times;</span>
        <h2>Configuración</h2>
        
        <div class="settings-section">
            <h3>Tema</h3>
            <div class="theme-toggle">
                <button class="theme-btn-light" onclick="setTheme('light')">☀️ Modo Claro</button>
                <button class="theme-btn-dark" onclick="setTheme('dark')">🌙 Modo Oscuro</button>
            </div>
        </div>
        
        <?php if ($_SESSION['rol'] === 'admin'): ?>
        <div class="settings-section">
            <h3>Gestión de Usuarios</h3>
            <div style="margin-bottom: 15px;">
                <button onclick="showAddUserForm()" style="background: #2ecc71; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Agregar Usuario</button>
            </div>
            <div id="addUserForm" style="display: none; margin-bottom: 20px; padding: 20px; background: #ecf0f1; border-radius: 8px;">
                <h4>Nuevo Usuario</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label>Usuario</label>
                        <input type="text" id="newUsername" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                    </div>
                    <div>
                        <label>Contraseña</label>
                        <input type="password" id="newPassword" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                    </div>
                    <div>
                        <label>Nombre Completo</label>
                        <input type="text" id="newNombre" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                    </div>
                    <div>
                        <label>Rol</label>
                        <select id="newRol" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                        </select>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="addUser()" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Guardar</button>
                    <button onclick="hideAddUserForm()" style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Cancelar</button>
                </div>
            </div>
            <table class="users-table" id="usersTable">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>
</div>

<script src="../js/app.js" type="module"></script>
<script src="../js/ui.js" type="module"></script>
<script>
// Function to get human-readable role names
function getRoleName(role) {
    const roleNames = {
        'lectura': 'Lectura',
        'lectura_escritura_viejos': 'Lectura y escritura de datos viejos',
        'lectura_escritura_nuevos': 'Lectura y escritura de datos nuevos',
        'lectura_escritura_total': 'Lectura y escritura total',
        'admin': 'Administrador'
    };
    return roleNames[role] || role;
}

// Function to generate role options for select
function getRoleOptions(selectedRole) {
    const roles = [
        { value: 'lectura', label: 'Lectura' },
        { value: 'lectura_escritura_viejos', label: 'Lectura y escritura de datos viejos' },
        { value: 'lectura_escritura_nuevos', label: 'Lectura y escritura de datos nuevos' },
        { value: 'lectura_escritura_total', label: 'Lectura y escritura total' },
        { value: 'admin', label: 'Administrador' }
    ];
    
    return roles.map(role => 
        `<option value="${role.value}" ${selectedRole === role.value ? 'selected' : ''}>${role.label}</option>`
    ).join('');
}

// Theme management
function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
}

// Initialize theme from localStorage
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

// Settings modal toggle
function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        modal.classList.remove('show');
    } else {
        modal.style.display = 'flex';
        modal.classList.add('show');
        if (window.userRole === 'admin') {
            loadUsers();
        }
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('settingsModal');
    if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
});

<?php if ($_SESSION['rol'] === 'admin'): ?>
// User management functions
async function loadUsers() {
    try {
        const response = await fetch('api.php?table=usuarios');
        const data = await response.json();
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = data.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.nombre_completo}</td>
                <td>
                    <select onchange="updateUserRol(${user.id_usuario}, this.value)">
                        ${getRoleOptions(user.rol)}
                    </select>
                </td>
                <td>
                    <input type="checkbox" ${user.activo ? 'checked' : ''} onchange="updateUserActivo(${user.id_usuario}, this.checked)">
                </td>
                <td>
                    <button onclick="editUserPassword(${user.id_usuario})" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Cambiar Contraseña</button>
                    <button onclick="deleteUser(${user.id_usuario})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function showAddUserForm() {
    document.getElementById('addUserForm').style.display = 'block';
    document.getElementById('newRol').innerHTML = getRoleOptions('lectura');
}

function hideAddUserForm() {
    document.getElementById('addUserForm').style.display = 'none';
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newNombre').value = '';
}

async function addUser() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const nombre = document.getElementById('newNombre').value;
    const rol = document.getElementById('newRol').value;

    if (!username || !password || !nombre) {
        alert('Por favor complete todos los campos');
        return;
    }

    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'usuarios',
                action: 'create',
                data: { username, password, nombre_completo: nombre, rol }
            })
        });
        const result = await response.json();
        if (result.error) {
            alert('Error: ' + result.error);
        } else {
            alert('Usuario agregado exitosamente');
            hideAddUserForm();
            loadUsers();
        }
    } catch (error) {
        console.error('Error adding user:', error);
        alert('Error al agregar usuario');
    }
}

async function updateUserRol(id, rol) {
    try {
        await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'usuarios',
                action: 'update',
                id: id,
                data: { rol }
            })
        });
    } catch (error) {
        console.error('Error updating user rol:', error);
    }
}

async function updateUserActivo(id, activo) {
    try {
        await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'usuarios',
                action: 'update',
                id: id,
                data: { activo: activo ? 1 : 0 }
            })
        });
    } catch (error) {
        console.error('Error updating user activo:', error);
    }
}

async function editUserPassword(id) {
    const newPassword = prompt('Ingrese la nueva contraseña:');
    if (!newPassword) return;

    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'usuarios',
                action: 'update',
                id: id,
                data: { password: newPassword }
            })
        });
        const result = await response.json();
        if (result.error) {
            alert('Error: ' + result.error);
        } else {
            alert('Contraseña actualizada exitosamente');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        alert('Error al actualizar contraseña');
    }
}

async function deleteUser(id) {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;

    try {
        await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'usuarios',
                action: 'delete',
                id: id
            })
        });
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
    }
}
<?php endif; ?>
</script>
</body>
</html>
