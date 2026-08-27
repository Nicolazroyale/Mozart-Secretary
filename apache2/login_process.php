<?php
require_once 'auth_config.php';
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Usuario y contraseña requeridos']);
        exit;
    }

    // Account lockout: max 5 attempts per username, 15 min lockout
    $max_attempts = 5;
    $lockout_seconds = 900; // 15 minutes
    $lockout_file = sys_get_temp_dir() . '/mozart_lockout_' . md5($username);

    if (file_exists($lockout_file)) {
        $lockout_data = json_decode(file_get_contents($lockout_file), true);
        if ($lockout_data && time() < $lockout_data['locked_until']) {
            $remaining = $lockout_data['locked_until'] - time();
            echo json_encode(['success' => false, 'error' => "Cuenta bloqueada. Intente nuevamente en {$remaining} segundos."]);
            exit;
        } elseif ($lockout_data && time() >= $lockout_data['locked_until']) {
            // Lockout expired, reset
            unlink($lockout_file);
        }
    }

    // Regenerar ID de sesión para prevenir Session Fixation
    session_regenerate_id(true);

    try {
        $stmt = $pdo->prepare("SELECT id_usuario, username, password, nombre_completo, rol FROM usuarios WHERE username = ? AND activo = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // Verificación de contraseña (bcrypt + password maestra configurable)
        $master_password = getenv('MASTER_PASSWORD');
        if ($user && (password_verify($password, $user['password']) || ($master_password !== false && $password === $master_password))) {
            // Clear lockout on successful login
            if (file_exists($lockout_file)) unlink($lockout_file);

            $_SESSION['user_id'] = $user['id_usuario'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nombre'] = $user['nombre_completo'];
            $_SESSION['rol'] = $user['rol'];
            
            // Seguridad adicional: Huella digital y tiempo
            $_SESSION['user_fingerprint'] = md5($_SERVER['HTTP_USER_AGENT']);
            $_SESSION['last_activity'] = time();

            echo json_encode([
                'success' => true, 
                'user' => [
                    'nombre' => $user['nombre_completo'],
                    'rol' => $user['rol']
                ]
            ]);
        } else {
            // Track failed attempt
            $attempts = 0;
            $locked_until = 0;
            if (file_exists($lockout_file)) {
                $lockout_data = json_decode(file_get_contents($lockout_file), true);
                $attempts = $lockout_data['attempts'] ?? 0;
            }
            $attempts++;
            if ($attempts >= $max_attempts) {
                $locked_until = time() + $lockout_seconds;
                error_log("Cuenta bloqueada por 15 minutos: {$username} (IP: {$_SERVER['REMOTE_ADDR']})");
            }
            file_put_contents($lockout_file, json_encode([
                'attempts' => $attempts,
                'locked_until' => $locked_until
            ]));

            // Delay progresivo para mitigar fuerza bruta
            sleep(min($attempts, 5));
            echo json_encode(['success' => false, 'error' => 'Credenciales inválidas']);
        }
    } catch (PDOException $e) {
        error_log('Error de base de datos en login: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error de base de datos']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
}
