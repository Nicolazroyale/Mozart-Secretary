<?php
require_once 'auth_config.php';
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Regenerar ID de sesión para prevenir Session Fixation
    session_regenerate_id(true);

    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Usuario y contraseña requeridos']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id_usuario, username, password, nombre_completo, rol FROM usuarios WHERE username = ? AND activo = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // Verificación de contraseña
        if ($user && password_verify($password, $user['password'])) {
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
            // Delay para mitigar ataques de fuerza bruta
            sleep(1); 
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
