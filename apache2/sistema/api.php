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
    http_response_code(400);
    echo json_encode(['error' => 'Tabla no permitida']);
    exit;
}

$real_table = resolve_table($table);

try {
    if ($method === 'GET') {
        $query = "";
        $params = [];
        
        switch ($table) {
            case 'nomina':
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID de curso requerido']);
                    exit;
                }
                
                $query = "SELECT 
                            a.id_alumno,
                            a.apellido,
                            a.nombre,
                            a.dni,
                            r.nombre as resp_nombre,
                            r.apellido as resp_apellido,
                            r.telefono_celular as resp_tel,
                            (SELECT COUNT(*) FROM salud_alumno s 
                             WHERE s.id_alumno = a.id_alumno 
                             AND (s.asma=1 OR s.celiaquia=1 OR s.diabetes=1 OR s.obesidad=1 OR s.cardiopatia=1 OR s.alergias IS NOT NULL OR s.antecedentes_salud IS NOT NULL)) as alerta_salud
                          FROM alumnos a
                          LEFT JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno AND ar.es_principal = 1
                          LEFT JOIN responsables r ON ar.id_responsable = r.id_responsable
                          WHERE a.id_curso = ? AND a.activo = 1
                          ORDER BY a.apellido ASC, a.nombre ASC";
                
                $stmt = $pdo->prepare($query);
                $stmt->execute([$id]);
                echo json_encode($stmt->fetchAll());
                exit;

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
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Datos inválidos']);
            exit;
        }

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
                error_log('Error en transacción estudiantes POST: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Error en transacción: ' . $e->getMessage()]);
            }
        }

        // Whitelist of allowed fields per table to prevent SQL injection via column names
        $allowed_fields_map = [
            'docentes' => ['apellido', 'nombre', 'dni', 'fecha_inscripcion', 'situacion_revista', 'telefono', 'email', 'activo'],
            'cursos'   => ['anio', 'division', 'turno', 'ciclo', 'jornada'],
            'materias' => ['nombre'],
        ];

        $allowed_fields = $allowed_fields_map[$real_table] ?? [];
        if (empty($allowed_fields)) {
            echo json_encode(['error' => 'Operación no permitida para esta tabla']);
            exit;
        }

        $valid_fields = array_intersect_key($input, array_flip($allowed_fields));
        if (empty($valid_fields)) {
            echo json_encode(['error' => 'No se proporcionaron campos válidos']);
            exit;
        }
        $keys = array_keys($valid_fields);
        $cols = implode(',', $keys);
        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        
        $sql = "INSERT INTO $real_table ($cols) VALUES ($placeholders)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($valid_fields));
        
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    }
    elseif ($method === 'PUT') {
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido para actualizar']);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Datos inválidos']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) json_error('Datos inválidos');

        // Whitelist of allowed fields per table to prevent SQL injection via column names
        $allowed_fields_map = [
            'docentes' => ['apellido', 'nombre', 'dni', 'fecha_inscripcion', 'situacion_revista', 'telefono', 'email', 'activo'],
            'cursos'   => ['anio', 'division', 'turno', 'ciclo', 'jornada'],
            'materias' => ['nombre'],
        ];

        $allowed_fields = $allowed_fields_map[$real_table] ?? [];
        if (empty($allowed_fields)) {
            echo json_encode(['error' => 'Operación no permitida para esta tabla']);
            exit;
        }

        $valid_input = array_intersect_key($input, array_flip($allowed_fields));
        if (empty($valid_input)) {
            echo json_encode(['error' => 'No se proporcionaron campos válidos']);
            exit;
        }

        $set_parts = [];
        $params = [];
        foreach ($valid_input as $key => $value) {
            $set_parts[] = "$key = ?";
            $params[] = $value;
        }
        $params[] = $id;
        
        $sql = "UPDATE $real_table SET " . implode(',', $set_parts) . " WHERE $id_col = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['success' => true]);
    }
    elseif ($method === 'DELETE') {
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido para eliminar']);
            exit;
        }
        
        $id_col = ($real_table === 'alumnos') ? 'id_alumno' : "id_$real_table";
        if ($real_table === 'materias') $id_col = 'id_materia';

        generic_delete($pdo, $real_table, $id);
        json_success();
    }

} catch (\PDOException $e) {
    error_log('Error de base de datos en sistema/api.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
