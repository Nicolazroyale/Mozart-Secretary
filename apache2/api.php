<?php
require_once 'auth_config.php';
require_once 'db.php';
require_once __DIR__ . '/shared/api_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
init_api($method);

$table  = $_GET['table'] ?? '';
$id     = $_GET['id'] ?? '';
$search = $_GET['search'] ?? '';
$page   = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;

$allowed_tables = ['estudiantes', 'docentes', 'cursos', 'lista_cursos', 'search', 'nomina', 'docentes_por_curso', 'docente_cursos', 'materias', 'usuarios'];

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
            case 'usuarios':
                $query = "SELECT id_usuario, username, nombre_completo, rol, activo FROM usuarios ORDER BY username";
                break;
            case 'nomina':
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID de curso requerido']);
                    exit;
                }
                
                echo json_encode(query_nomina($pdo, $id));
                exit;

            case 'search':
                $rol   = $_GET['rol'] ?? 'todos';
                $anio  = $_GET['anio'] ?? '';
                $turno = $_GET['turno'] ?? '';
                json_success(query_search($pdo, $search, $rol, $anio, $turno));

            case 'lista_cursos':
                $query = "SELECT id_curso, CONCAT(anio, '°', division, '° (', ciclo, ') - ', turno) as nombre FROM cursos ORDER BY anio, division";
                break;

            case 'docentes_por_curso':
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID de curso requerido']);
                    exit;
                }
                $query = "SELECT 
                            d.id_docente,
                            d.apellido,
                            d.nombre,
                            d.dni,
                            d.situacion_revista as cargo,
                            dmc.cargo as cargo_curso,
                            dmc.dia_semana,
                            dmc.hora_inicio,
                            dmc.hora_fin
                          FROM docentes d
                          JOIN docente_materia_curso dmc ON d.id_docente = dmc.id_docente
                          WHERE dmc.id_curso = ? AND dmc.activo = 1
                          ORDER BY d.apellido, d.nombre";
                $stmt = $pdo->prepare($query);
                $stmt->execute([$id]);
                json_success($stmt->fetchAll());

            case 'docente_cursos':
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID de docente requerido']);
                    exit;
                }
                $query = "SELECT id_curso FROM docente_materia_curso WHERE id_docente = ? AND activo = 1";
                $stmt = $pdo->prepare($query);
                $stmt->execute([$id]);
                $cursos = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
                json_success($cursos);

            case 'estudiantes':
                if ($id) {
                    $data = query_student_detail($pdo, $id);
                    echo json_encode($data);
                    exit;
                } else {
                    $total = $pdo->query("SELECT COUNT(*) FROM alumnos WHERE activo = 1")->fetchColumn();
                    $query = "SELECT 
                                a.id_alumno,
                                CONCAT(a.apellido, ', ', a.nombre) as nombre,
                                CONCAT(c.anio, '°', c.division, '° (', c.ciclo, ') - ', c.turno) as curso,
                                a.dni,
                                CONCAT(r.apellido, ', ', r.nombre) as tutor
                              FROM alumnos a
                              JOIN cursos c ON a.id_curso = c.id_curso
                              JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno
                              JOIN responsables r ON ar.id_responsable = r.id_responsable
                              WHERE a.activo = 1 AND ar.es_principal = 1";
                    if ($limit > 0) {
                        $offset = ($page - 1) * $limit;
                        $query .= " LIMIT $limit OFFSET $offset";
                    }
                    $stmt = $pdo->prepare($query);
                    $stmt->execute();
                    $data = $stmt->fetchAll();
                    echo json_encode(['data' => $data, 'total' => $total, 'page' => $page, 'limit' => $limit]);
                    exit;
                }
                break;

            case 'docentes':
                if ($id) {
                    $query = "SELECT * FROM docentes WHERE id_docente = ?";
                    $params = [$id];
                } else {
                    $total = $pdo->query("SELECT COUNT(*) FROM docentes WHERE activo = 1")->fetchColumn();
                    $query = "SELECT id_docente, CONCAT(apellido, ', ', nombre) as nombre, dni, situacion_revista as cargo FROM docentes";
                    if ($limit > 0) {
                        $offset = ($page - 1) * $limit;
                        $query .= " LIMIT $limit OFFSET $offset";
                    }
                    $stmt = $pdo->prepare($query);
                    $stmt->execute();
                    $data = $stmt->fetchAll();
                    echo json_encode(['data' => $data, 'total' => $total, 'page' => $page, 'limit' => $limit]);
                    exit;
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

        if ($table === 'docente_cursos') {
            if (!isset($input['id_docente']) || !isset($input['id_curso'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de docente y curso requeridos']);
                exit;
            }
            
            $countMaterias = $pdo->query("SELECT COUNT(*) FROM materias")->fetchColumn();
            if ($countMaterias == 0) {
                $pdo->exec("INSERT INTO materias (nombre) VALUES ('Sin Asignar')");
            }
            
            $materia = $pdo->query("SELECT id_materia FROM materias LIMIT 1")->fetch();
            $id_materia = $materia['id_materia'];
            
            $sql = "INSERT INTO docente_materia_curso (id_docente, id_materia, id_curso, cargo, activo, ciclo_lectivo) 
                    VALUES (?, ?, ?, 'Titular', 1, YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE activo = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$input['id_docente'], $id_materia, $input['id_curso']]);
            
            json_success();
        }

        if ($table === 'usuarios') {
            $action = $input['action'] ?? '';
            $data = $input['data'] ?? [];
            $id = $input['id'] ?? '';

            if ($action === 'create') {
                // Hash password
                if (!isset($data['password']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Contraseña requerida']);
                    exit;
                }
                $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
                $allowed_fields = ['username', 'password', 'nombre_completo', 'rol'];
                $valid_input = array_intersect_key($data, array_flip($allowed_fields));
                if (empty($valid_input) || !isset($valid_input['username']) || !isset($valid_input['nombre_completo'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Datos inválidos']);
                    exit;
                }
                $id_usuario = generic_insert($pdo, 'usuarios', $valid_input);
                json_success(['success' => true, 'id' => $id_usuario]);
            } elseif ($action === 'update') {
                if (empty($id)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID requerido']);
                    exit;
                }
                $allowed_fields = ['nombre_completo', 'rol', 'activo'];
                if (isset($data['password']) && !empty($data['password'])) {
                    $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
                    $allowed_fields[] = 'password';
                }
                $valid_input = array_intersect_key($data, array_flip($allowed_fields));
                if (empty($valid_input)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No hay campos para actualizar']);
                    exit;
                }
                generic_update($pdo, 'usuarios', $valid_input, $id);
                json_success();
            } elseif ($action === 'delete') {
                if (empty($id)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID requerido']);
                    exit;
                }
                // Don't allow deleting the last admin
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id_usuario != ?");
                $stmt->execute([$id]);
                $admin_count = $stmt->fetchColumn();
                if ($admin_count == 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No se puede eliminar el último administrador']);
                    exit;
                }
                generic_delete($pdo, 'usuarios', $id);
                json_success();
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Acción inválida']);
                exit;
            }
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
        
        $id = generic_insert($pdo, $real_table, $valid_fields);
        json_success(['success' => true, 'id' => $id]);
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

        if ($table === 'docente_cursos') {
            $pdo->beginTransaction();
            try {
                $countMaterias = $pdo->query("SELECT COUNT(*) FROM materias")->fetchColumn();
                if ($countMaterias == 0) {
                    $pdo->exec("INSERT INTO materias (nombre) VALUES ('Sin Asignar')");
                }
                
                $materia = $pdo->query("SELECT id_materia FROM materias LIMIT 1")->fetch();
                $id_materia = $materia['id_materia'];
                
                $pdo->prepare("UPDATE docente_materia_curso SET activo = 0 WHERE id_docente = ?")->execute([$id]);

                if (isset($input['cursos']) && is_array($input['cursos'])) {
                    foreach ($input['cursos'] as $id_curso) {
                        $sql = "INSERT INTO docente_materia_curso (id_docente, id_materia, id_curso, cargo, activo, ciclo_lectivo) 
                                VALUES (?, ?, ?, 'Titular', 1, YEAR(CURDATE()))
                                ON DUPLICATE KEY UPDATE activo = 1";
                        $pdo->prepare($sql)->execute([$id, $id_materia, $id_curso]);
                    }
                }
                
                $pdo->commit();
                json_success();
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log('Error en transacción docente_cursos PUT: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Error en transacción: ' . $e->getMessage()]);
            }
        }

        if ($table === 'estudiantes') {
            $pdo->beginTransaction();
            try {
                update_alumno($pdo, $input, $id);
                save_salud($pdo, $input, $id, 'update');
                save_responsables($pdo, $input, $id, 'upsert');

                $pdo->commit();
                json_success();
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log('Error en actualización estudiantes PUT: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Error en actualización: ' . $e->getMessage()]);
            }
        }

        // Caso normal para el resto de tablas
        // Whitelist of allowed fields per table to prevent SQL injection via column names
        $allowed_fields_map = [
            'docentes' => ['apellido', 'nombre', 'dni', 'fecha_inscripcion', 'situacion_revista', 'telefono', 'email', 'activo'],
            'cursos'   => ['anio', 'division', 'turno', 'ciclo', 'jornada'],
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

        generic_update($pdo, $real_table, $valid_input, $id);
        json_success();
    }
    elseif ($method === 'DELETE') {
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido para eliminar']);
            exit;
        }
        
        generic_delete($pdo, $real_table, $id);
        json_success();
    }

} catch (\PDOException $e) {
    error_log('Error de base de datos en api.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
