<?php
/**
 * SCRIPT DE CARGA DE DATOS COMPLETO (SEEDER)
 * IMPORTANT: This script should only be run from the command line.
 */
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo 'Acceso denegado';
    exit;
}

$host = getenv('DB_HOST') ?: 'localhost';
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

echo "Iniciando carga de datos detallada...\n";

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // 1. Limpiar tablas (DDL - No transaccional en MySQL)
    echo "Limpiando tablas...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE alumno_responsable;");
    $pdo->exec("TRUNCATE TABLE salud_alumno;");
    $pdo->exec("TRUNCATE TABLE restricciones_judiciales;");
    $pdo->exec("TRUNCATE TABLE alumnos;");
    $pdo->exec("TRUNCATE TABLE responsables;");
    $pdo->exec("TRUNCATE TABLE docentes;");
    $pdo->exec("TRUNCATE TABLE cursos;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // 2. Iniciar transacción para la carga de datos (DML)
    $pdo->beginTransaction();

    // Cursos
    echo "Cargando cursos...\n";
    $sqlCurso = "INSERT INTO cursos (anio, division, turno, ciclo, jornada) VALUES (?, ?, ?, ?, ?)";
    $stmtC = $pdo->prepare($sqlCurso);
    $stmtC->execute([1, 1, 'Mañana', 'Básico', 'Simple']);
    $idC1 = $pdo->lastInsertId();
    $stmtC->execute([5, 1, 'Tarde', 'Superior', 'Completa']);
    $idC2 = $pdo->lastInsertId();

    // Alumnos y Responsables
    echo "Cargando 10 alumnos con responsables...\n";
    for ($i = 1; $i <= 10; $i++) {
        $idCurso = ($i <= 5) ? $idC1 : $idC2;
        
        $sqlAlu = "INSERT INTO alumnos (apellido, nombre, tipo_dni, dni, fecha_nacimiento, nacionalidad, calle, numero, localidad, provincia, id_curso, fecha_ingreso) 
                   VALUES (?, ?, 'DNI Argentino', ?, ?, 'Argentina', 'Calle Falsa', ?, 'Lomas de Zamora', 'Buenos Aires', ?, '2025-03-01')";
        $stmtA = $pdo->prepare($sqlAlu);
        $dniAlu = "450000" . str_pad($i, 2, "0", STR_PAD_LEFT);
        $stmtA->execute(["Alumno", "Estudiante $i", $dniAlu, ($i <= 5 ? '2012-01-01' : '2008-01-01'), 100 + $i, $idCurso]);
        $idAlu = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO salud_alumno (id_alumno, antecedentes_salud) VALUES (?, 'Ninguno')")->execute([$idAlu]);

        $sqlResp = "INSERT INTO responsables (apellido, nombre, vinculo, tipo_dni, dni, nacionalidad, calle, numero, localidad, provincia, convive_estudiante) 
                    VALUES (?, ?, 'Padre', 'DNI Argentino', ?, 'Argentina', 'Calle Falsa', ?, 'Lomas de Zamora', 'Buenos Aires', 1)
                    ON DUPLICATE KEY UPDATE id_responsable=LAST_INSERT_ID(id_responsable)";
        $stmtR = $pdo->prepare($sqlResp);
        $dniResp = "200000" . str_pad($i, 2, "0", STR_PAD_LEFT);
        $stmtR->execute(["Responsable", "Tutor $i", $dniResp, 100 + $i]);
        $idResp = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO alumno_responsable (id_alumno, id_responsable, es_principal) VALUES (?, ?, 1)")->execute([$idAlu, $idResp]);
    }

    // Docentes
    echo "Cargando profesores...\n";
    $sqlDoc = $pdo->prepare("INSERT INTO docentes (apellido, nombre, dni, fecha_inscripcion, situacion_revista) VALUES (?, ?, ?, ?, ?)");
    $sqlDoc->execute(['García', 'Juan Carlos', '20111222', '2020-03-01', 'Titular']);
    $sqlDoc->execute(['Rodríguez', 'María Elena', '25333444', '2021-05-15', 'Provisional']);
    $sqlDoc->execute(['Sánchez', 'Ricardo', '30555666', '2023-02-10', 'Suplente']);

    $pdo->commit();
    echo "¡Carga completa finalizada con éxito!\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
