<?php
$host = getenv('DB_HOST') ?: 'db';
$db   = getenv('DB_NAME') ?: 'escuela_secundaria_tecnica';
$user = getenv('DB_USER') ?: 'DBsecretaria';
$pass = getenv('DB_PASS') ?: 'Dalia1244!';
$charset = 'utf8mb4';

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
<<<<<<< HEAD
?>
=======
?>
>>>>>>> master
