<?php
require_once '../Login/auth_config.php';
require_once 'db.php';
require_once __DIR__ . '/../shared/api_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
init_api($method);

$table  = $_GET['table'] ?? '';
$id     = $_GET['id'] ?? '';
$search = $_GET['search'] ?? '';

$allowed_tables = ['estudiantes', 'docentes', 'cursos', 'materias', 'lista_cursos', 'search', 'nomina'];

if (!in_array($table, $allowed_tables)) {
    json_error('Tabla no permitida');
}

$real_table = resolve_table($table);

try {
    if ($method === 'GET') {
        $query = "";
        $params = [];
        
        switch ($table) {
            case 'nomina':
                if (!$id) json_error('ID de curso requerido');
                json_success(query_nomina($pdo, $id));

            case 'search':
                $rol   = $_GET['rol'] ?? 'todos';
                $anio  = $_GET['anio'] ?? '';
                $turno = $_GET['turno'] ?? '';
                json_success(query_search($pdo, $search, $rol, $anio, $turno));

            case 'lista_cursos':
                $query = "SELECT id_curso, CONCAT(anio, '°', division, '° (', ciclo, ') - ', turno) as nombre FROM cursos ORDER BY anio, division";
                break;
            case 'estudiantes':
                if ($id) {
                    $data = query_student_detail($pdo, $id);
                    echo json_encode($data);
                    exit;
                } else {
                    $query = "SELECT id_alumno, alumno as nombre, curso, dni, responsable as tutor FROM v_ficha_alumno";
                }
                break;
            case 'docentes':
                if ($id) {
                    $query = "SELECT * FROM docentes WHERE id_docente = ?";
                    $params = [$id];
                } else {
                    $query = "SELECT id_docente, CONCAT(apellido, ', ', nombre) as nombre, dni, situacion_revista as cargo FROM docentes";
                }
                break;
            case 'cursos':
                if ($id) {
                    $query = "SELECT * FROM cursos WHERE id_curso = ?";
                    $params = [$id];
                } else {
                    $query = "SELECT id_curso, CONCAT(anio, '°', division, '°') as nombre, turno as curso FROM cursos";
                }
                break;
            case 'materias':
                if ($id) {
                    $query = "SELECT * FROM materias WHERE id_materia = ?";
                    $params = [$id];
                } else {
                    $query = "SELECT id_materia, nombre, 'N/A' as curso FROM materias";
                }
                break;
        }

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        
        if ($id && count($data) > 0) {
            echo json_encode($data[0]);
        } else {
            echo json_encode($data);
        }
    } 
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) json_error('Datos inválidos');

        if ($table === 'estudiantes') {
            $pdo->beginTransaction();
            try {
                $id_alumno = insert_alumno($pdo, $input);
                save_salud($pdo, $input, $id_alumno, 'insert');
                save_restriccion($pdo, $input, $id_alumno);
                save_responsables($pdo, $input, $id_alumno, 'insert');

                $pdo->commit();
                json_success(['success' => true, 'id' => $id_alumno]);
            } catch (Exception $e) {
                $pdo->rollBack();
                json_error('Error en transacción: ' . $e->getMessage());
            }
        }

        $new_id = generic_insert($pdo, $real_table, $input);
        json_success(['success' => true, 'id' => $new_id]);
    }
    elseif ($method === 'PUT') {
        if (!$id) json_error('ID requerido para actualizar');

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) json_error('Datos inválidos');

        generic_update($pdo, $real_table, $input, $id);
        json_success();
    }
    elseif ($method === 'DELETE') {
        if (!$id) json_error('ID requerido para eliminar');

        generic_delete($pdo, $real_table, $id);
        json_success();
    }

} catch (\PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
