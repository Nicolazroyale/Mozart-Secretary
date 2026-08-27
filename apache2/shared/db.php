<?php
// Canonical db.php — all other db.php files should include this one
$host = getenv('DB_HOST');
$db   = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');
$charset = 'utf8mb4';

if ($host === false || $db === false || $user === false || $pass === false) {
    error_log('Faltan variables de entorno de base de datos (DB_HOST, DB_NAME, DB_USER, DB_PASS)');
    header('Content-Type: application/json');
    http_response_code(503);
    echo json_encode(['error' => 'Configuración del servidor incompleta']);
    exit;
}

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     error_log('Error de conexión a base de datos: ' . $e->getMessage());
     header('Content-Type: application/json');
     http_response_code(503);
     echo json_encode(['error' => 'No se pudo conectar a la base de datos']);
     exit;
}
?>
