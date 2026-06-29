<?php
require_once 'auth_config.php';
if (!verificar_sesion()) {
    header('Location: Login/Login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión Escolar</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="icon" href="/imagenes/logo.png?v=1" type="image/png">
</head>
<body>
    <header>
        <div style="width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 20px;">
            <div style="display: flex; align-items: center; justify-content: flex-start;">
                <img src="imagenes/logo.png" alt="Logo" style="height: 60px; width: auto;">
            </div>
            <div style="text-align: center;">
                <h2 style="margin: 0;">SISTEMA DE ARCHIVOS EESTN°3</h2>
            </div>
            <div style="display: flex; justify-content: flex-end;">
                <div class="user-badge" style="background: #34495e; padding: 5px 15px; border-radius: 20px; font-size: 13px;">
                    <span id="userNameDisplay"><?php echo htmlspecialchars($_SESSION['nombre'], ENT_QUOTES, 'UTF-8'); ?></span> (<?php echo htmlspecialchars($_SESSION['rol'], ENT_QUOTES, 'UTF-8'); ?>)
                    <a href="logout.php" style="color: #e74c3c; margin-left: 10px; text-decoration: none; font-weight: bold;">Salir</a>
                </div>
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
    </div>

    <div id="contenido">
        <!-- El contenido se carga dinámicamente -->
    </div>

</div>

<script>
    // Pasar el rol de PHP a JS
    window.userRole = "<?php echo htmlspecialchars($_SESSION['rol'], ENT_QUOTES, 'UTF-8'); ?>";
</script>
<script src="js/app.js" type="module"></script>
<script src="js/ui.js" type="module"></script>
</body>
</html>
