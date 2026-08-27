<?php
/**
 * PHPUnit bootstrap file.
 * 
 * Loads the application functions without side effects (session_start, ini_set, etc.)
 * so that tests can exercise the real code paths.
 */

// Prevent session_start() from being called during tests
if (!function_exists('session_start')) {
    function session_start() { return true; }
}

// Load auth_config functions (verificar_sesion, get_csrf_token, validate_csrf_token)
// without the ini_set/session_start side effects at the top
require_once __DIR__ . '/../apache2/shared/api_helpers.php';

// Define verificar_sesion, get_csrf_token, validate_csrf_token directly
// (extracted from auth_config.php to avoid session_start side effects)
if (!function_exists('verificar_sesion')) {
    function verificar_sesion(): bool {
        if (!isset($_SESSION['user_id'])) {
            return false;
        }
        if (!isset($_SESSION['user_fingerprint']) || $_SESSION['user_fingerprint'] !== md5($_SERVER['HTTP_USER_AGENT'] ?? '')) {
            return false;
        }
        $timeout = 1800;
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
            return false;
        }
        $_SESSION['last_activity'] = time();
        return true;
    }
}

if (!function_exists('get_csrf_token')) {
    function get_csrf_token(): string {
        return $_SESSION['csrf_token'] ?? '';
    }
}

if (!function_exists('validate_csrf_token')) {
    function validate_csrf_token(?string $token): bool {
        if ($token === null || $token === '') return false;
        return hash_equals($_SESSION['csrf_token'] ?? '', $token);
    }
}
