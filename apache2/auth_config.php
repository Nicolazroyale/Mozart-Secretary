<?php
// Configuración de seguridad para las cookies de sesión
ini_set('session.cookie_httponly', 1); // Evita acceso via JavaScript (XSS)
ini_set('session.cookie_samesite', 'Lax'); // Protege contra CSRF
ini_set('session.use_only_cookies', 1); // Evita ataques por URL

// Solo activar Secure si hay HTTPS. Como estamos en entorno local/IP, lo dejamos condicional
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

session_start();

// Generate CSRF token if not present
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * Get the current CSRF token.
 */
function get_csrf_token(): string {
    return $_SESSION['csrf_token'] ?? '';
}

/**
 * Validate a CSRF token against the session token.
 */
function validate_csrf_token(?string $token): bool {
    if ($token === null || $token === '') return false;
    return hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

/**
 * Función para verificar la validez de la sesión
 */
function verificar_sesion() {
    // 1. Verificar si existe la sesión básica
    if (!isset($_SESSION['user_id'])) {
        return false;
    }

    // 2. Verificar Huella Digital (User-Agent) para evitar Hijacking
    if (!isset($_SESSION['user_fingerprint']) || $_SESSION['user_fingerprint'] !== md5($_SERVER['HTTP_USER_AGENT'])) {
        session_destroy();
        return false;
    }

    // 3. Verificar tiempo de inactividad (ej: 30 minutos)
    $timeout = 1800; // 30 minutos en segundos
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
        session_destroy();
        return false;
    }
    
    // Actualizar última actividad
    $_SESSION['last_activity'] = time();
    return true;
}
?>