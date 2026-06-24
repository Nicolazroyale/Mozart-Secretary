<?php
require_once '../auth_config.php';
// Si ya hay una sesión válida, redirigir al index directamente
if (verificar_sesion()) {
    header('Location: ../index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Base de Datos</title>
    <link rel="stylesheet" href="Login.css?v=2">
    <link rel="icon" href="/imagenes/logo.png?v=1" type="image/png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body>
    <div id="loginContainer" class="login-container">
        <div class="logo">SISTEMA DE ARCHIVOS EESTN°3</div>
        <div class="subtitle">Inicia sesión en tu cuenta</div>
        
        <div id="statusMessage" class="status-message"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Usuario</label>
                <input type="text" id="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" required>
            </div>
            
            <button type="submit" class="login-btn" id="loginBtn">
                Siguiente
            </button>
        </form>
    </div>

    <script src="Login.js?v=2"></script>
</body>
</html>
