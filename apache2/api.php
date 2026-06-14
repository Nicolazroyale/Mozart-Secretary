<?php
require_once 'auth_config.php';
require_once 'db.php';

header('Content-Type: application/json');

// Verificar sesión de forma robusta
if (!verificar_sesion()) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado o sesión expirada']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Verificar permisos de escritura para métodos que modifican datos
if (in_array($method, ['POST', 'PUT', 'DELETE']) && $_SESSION['rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'No tiene permisos para realizar esta acción']);
    exit;
}
$table = $_GET['table'] ?? '';
$id = $_GET['id'] ?? '';
$search = $_GET['search'] ?? '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0; // 0 significa sin límite por defecto

$allowed_tables = ['estudiantes', 'docentes', 'cursos', 'lista_cursos', 'search', 'nomina', 'docentes_por_curso', 'docente_cursos'];

if (!in_array($table, $allowed_tables)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tabla no permitida']);
    exit;
}

// Mapeo de nombres del frontend a tablas reales
$table_map = [
    'estudiantes' => 'alumnos',
    'docentes'    => 'docentes',
    'cursos'      => 'cursos',
    'materias'    => 'materias'
];

$real_table = $table_map[$table] ?? $table;

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
                $rol = $_GET['rol'] ?? 'todos';
                $anio = $_GET['anio'] ?? '';
                $turno = $_GET['turno'] ?? '';
                
                $results = [];
                
                // Búsqueda de Alumnos
                if ($rol === 'todos' || $rol === 'alumno') {
                    $sql = "SELECT id_alumno as id, CONCAT(apellido, ', ', nombre) as nombre, dni, 'alumno' as rol, id_curso 
                            FROM alumnos 
                            WHERE (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)";
                    $params = ["%$search%", "%$search%", "%$search%"];
                    
                    if ($anio || $turno) {
                        $sql .= " AND id_curso IN (SELECT id_curso FROM cursos WHERE 1=1";
                        if ($anio) { $sql .= " AND anio = ?"; $params[] = $anio; }
                        if ($turno) { $sql .= " AND turno = ?"; $params[] = $turno; }
                        $sql .= ")";
                    }
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $results = array_merge($results, $stmt->fetchAll());
                }
                
                // Búsqueda de Profesores
                if ($rol === 'todos' || $rol === 'profesor') {
                    $sql = "SELECT id_docente as id, CONCAT(apellido, ', ', nombre) as nombre, dni, 'profesor' as rol, NULL as id_curso 
                            FROM docentes 
                            WHERE (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)";
                    $params = ["%$search%", "%$search%", "%$search%"];
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $results = array_merge($results, $stmt->fetchAll());
                }
                
                echo json_encode($results);
                exit;

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
                echo json_encode($stmt->fetchAll());
                exit;
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
                echo json_encode($cursos);
                exit;
            case 'estudiantes':
                if ($id) {
                    // ... (sin cambios en la obtención por ID)
                    $query = "SELECT a.*, 
                              s.asma as salud_asma, s.celiaquia as salud_celiaquia, s.diabetes as salud_diabetes, 
                              s.obesidad as salud_obesidad, s.cardiopatia as salud_cardiopatia, 
                              s.otros_checklist as salud_otros_checklist, s.alergias as salud_alergias, 
                              s.internaciones as salud_internaciones, s.antecedentes_salud as salud_antecedentes_salud,
                              s.obra_social_nombre as salud_obra_social_nombre, s.obra_social_nro as salud_obra_social_nro,
                              rj.apellido_nombre as rj_nombre, rj.tipo_doc as rj_tipo_doc, 
                              rj.nro_doc as rj_nro_doc, rj.descripcion as rj_descripcion 
                              FROM alumnos a 
                              LEFT JOIN salud_alumno s ON a.id_alumno = s.id_alumno 
                              LEFT JOIN restricciones_judiciales rj ON a.id_alumno = rj.id_alumno
                              WHERE a.id_alumno = ?";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$id]);
                    $data = $stmt->fetch();

                    if ($data) {
                        $queryResp = "SELECT r.*, ar.es_principal 
                                      FROM responsables r 
                                      JOIN alumno_responsable ar ON r.id_responsable = ar.id_responsable 
                                      WHERE ar.id_alumno = ? 
                                      ORDER BY ar.es_principal DESC";
                        $stmtResp = $pdo->prepare($queryResp);
                        $stmtResp->execute([$id]);
                        $resps = $stmtResp->fetchAll();
                        
                        foreach ($resps as $index => $r) {
                            $num = $index + 1;
                            foreach ($r as $key => $val) {
                                if ($key !== 'es_principal') {
                                    $data["resp{$num}_{$key}"] = $val;
                                }
                            }
                        }
                    }
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
            
            // Asegurar que haya al menos una materia
            $countMaterias = $pdo->query("SELECT COUNT(*) FROM materias")->fetchColumn();
            if ($countMaterias == 0) {
                $pdo->exec("INSERT INTO materias (nombre) VALUES ('Sin Asignar')");
            }
            
            // Obtener la primera materia existente
            $materia = $pdo->query("SELECT id_materia FROM materias LIMIT 1")->fetch();
            $id_materia = $materia['id_materia'];
            
            // Insertar o actualizar la relación
            $sql = "INSERT INTO docente_materia_curso (id_docente, id_materia, id_curso, cargo, activo, ciclo_lectivo) 
                    VALUES (?, ?, ?, 'Titular', 1, YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE activo = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$input['id_docente'], $id_materia, $input['id_curso']]);
            
            echo json_encode(['success' => true]);
            exit;
        }

        if ($table === 'estudiantes') {
            $pdo->beginTransaction();
            try {
                // 1. Insertar Alumno
                $alumno_fields = [
                    'apellido', 'nombre', 'tipo_dni', 'dni', 'cuil', 'fecha_nacimiento', 
                    'lugar_nacimiento', 'nacionalidad', 'genero', 'genero_especificar',
                    'calle', 'numero', 'piso', 'depto', 'entre_calles', 'localidad', 
                    'distrito', 'provincia', 'telefono_fijo', 'telefono_celular', 
                    'id_curso', 'fecha_ingreso'
                ];
                $cols = implode(',', $alumno_fields);
                $placeholders = implode(',', array_fill(0, count($alumno_fields), '?'));
                $sqlAlu = "INSERT INTO alumnos ($cols) VALUES ($placeholders)";
                $stmtAlu = $pdo->prepare($sqlAlu);
                $alumno_values = [];
                foreach ($alumno_fields as $f) $alumno_values[] = $input[$f] ?? null;
                $stmtAlu->execute($alumno_values);
                $id_alumno = $pdo->lastInsertId();

                // 2. Insertar Salud
                $salud_fields = [
                    'asma', 'celiaquia', 'diabetes', 'obesidad', 'cardiopatia', 
                    'otros_checklist', 'alergias', 'internaciones', 'antecedentes_salud', 
                    'obra_social_nombre', 'obra_social_nro'
                ];
                $colsS = "id_alumno," . implode(',', $salud_fields);
                $placeholdersS = "?," . implode(',', array_fill(0, count($salud_fields), '?'));
                $sqlSalud = "INSERT INTO salud_alumno ($colsS) VALUES ($placeholdersS)";
                $stmtSalud = $pdo->prepare($sqlSalud);
                $salud_values = [$id_alumno];
                foreach ($salud_fields as $f) $salud_values[] = $input['salud_' . $f] ?? 0;
                $stmtSalud->execute($salud_values);

                // 3. Insertar Restricciones si existen
                if (!empty($input['rj_nombre'])) {
                    $sqlRJ = "INSERT INTO restricciones_judiciales (id_alumno, apellido_nombre, tipo_doc, nro_doc, descripcion) VALUES (?, ?, ?, ?, ?)";
                    $stmtRJ = $pdo->prepare($sqlRJ);
                    $stmtRJ->execute([$id_alumno, $input['rj_nombre'], $input['rj_tipo_doc'], $input['rj_nro_doc'], $input['rj_descripcion']]);
                }

                // 4. Insertar Responsables (hasta 2)
                for ($i = 1; $i <= 2; $i++) {
                    if (!empty($input["resp{$i}_dni"])) {
                        $resp_fields = [
                            'apellido', 'nombre', 'vinculo', 'nacionalidad', 'tipo_dni', 'dni',
                            'profesion', 'nivel_educativo', 'condicion_actividad', 'convive_estudiante',
                            'calle', 'numero', 'piso', 'depto', 'localidad', 'provincia',
                            'telefono_fijo', 'telefono_celular', 'email'
                        ];
                        $colsR = implode(',', $resp_fields);
                        $placeholdersR = implode(',', array_fill(0, count($resp_fields), '?'));
                        $sqlResp = "INSERT INTO responsables ($colsR) VALUES ($placeholdersR) ON DUPLICATE KEY UPDATE id_responsable=LAST_INSERT_ID(id_responsable)";
                        $stmtResp = $pdo->prepare($sqlResp);
                        $resp_values = [];
                        foreach ($resp_fields as $f) {
                            if ($f === 'convive_estudiante') {
                                $resp_values[] = $input["resp{$i}_convive"] ?? 0;
                            } elseif ($f === 'condicion_actividad') {
                                $resp_values[] = $input["resp{$i}_$f"] ?? 'Activo';
                            } else {
                                $resp_values[] = $input["resp{$i}_$f"] ?? null;
                            }
                        }
                        $stmtResp->execute($resp_values);
                        $id_responsable = $pdo->lastInsertId();

                        // Relación
                        $sqlRel = "INSERT INTO alumno_responsable (id_alumno, id_responsable, es_principal) VALUES (?, ?, ?)";
                        $stmtRel = $pdo->prepare($sqlRel);
                        $stmtRel->execute([$id_alumno, $id_responsable, ($i === 1 ? 1 : 0)]);
                    }
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'id' => $id_alumno]);
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log('Error en transacción estudiantes POST: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Error en transacción: ' . $e->getMessage()]);
            }
            exit;
        }

        if ($table === 'docentes') {
            // Validar campos válidos para la tabla docentes
            $allowed_fields = ['apellido', 'nombre', 'dni', 'fecha_inscripcion', 'situacion_revista', 'telefono', 'email', 'activo'];
            $valid_fields = array_intersect_key($input, array_flip($allowed_fields));
            $keys = array_keys($valid_fields);
            $cols = implode(',', $keys);
            $placeholders = implode(',', array_fill(0, count($keys), '?'));
            $values = array_values($valid_fields);
        } else {
            $keys = array_keys($input);
            $cols = implode(',', $keys);
            $placeholders = implode(',', array_fill(0, count($keys), '?'));
            $values = array_values($input);
        }
        
        $sql = "INSERT INTO $real_table ($cols) VALUES ($placeholders)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
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

        if ($table === 'docente_cursos') {
            $pdo->beginTransaction();
            try {
                // Asegurar que haya al menos una materia
                $countMaterias = $pdo->query("SELECT COUNT(*) FROM materias")->fetchColumn();
                if ($countMaterias == 0) {
                    $pdo->exec("INSERT INTO materias (nombre) VALUES ('Sin Asignar')");
                }
                
                // Obtener la primera materia existente
                $materia = $pdo->query("SELECT id_materia FROM materias LIMIT 1")->fetch();
                $id_materia = $materia['id_materia'];
                
                // Primero desactivamos todas las relaciones anteriores
                $sqlDesactivar = "UPDATE docente_materia_curso SET activo = 0 WHERE id_docente = ?";
                $stmtDesactivar = $pdo->prepare($sqlDesactivar);
                $stmtDesactivar->execute([$id]);

                // Ahora activamos o insertamos las nuevas
                if (isset($input['cursos']) && is_array($input['cursos'])) {
                    foreach ($input['cursos'] as $id_curso) {
                        $sql = "INSERT INTO docente_materia_curso (id_docente, id_materia, id_curso, cargo, activo, ciclo_lectivo) 
                                VALUES (?, ?, ?, 'Titular', 1, YEAR(CURDATE()))
                                ON DUPLICATE KEY UPDATE activo = 1";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$id, $id_materia, $id_curso]);
                    }
                }
                
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log('Error en transacción docente_cursos PUT: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Error en transacción: ' . $e->getMessage()]);
            }
            exit;
        }

        if ($table === 'estudiantes') {
            $pdo->beginTransaction();
            try {
                // 1. Actualizar Alumno
                $alumno_fields = [
                    'apellido', 'nombre', 'tipo_dni', 'dni', 'cuil', 'fecha_nacimiento', 
                    'lugar_nacimiento', 'nacionalidad', 'genero', 'genero_especificar',
                    'calle', 'numero', 'piso', 'depto', 'entre_calles', 'localidad', 
                    'distrito', 'provincia', 'telefono_fijo', 'telefono_celular', 
                    'id_curso', 'fecha_ingreso'
                ];
                $sets = [];
                $params = [];
                foreach ($alumno_fields as $f) {
                    $sets[] = "$f = ?";
                    $params[] = $input[$f] ?? null;
                }
                $params[] = $id;
                $sqlAlu = "UPDATE alumnos SET " . implode(',', $sets) . " WHERE id_alumno = ?";
                $stmtAlu = $pdo->prepare($sqlAlu);
                $stmtAlu->execute($params);

                // 2. Actualizar Salud
                $salud_fields = [
                    'asma', 'celiaquia', 'diabetes', 'obesidad', 'cardiopatia', 
                    'otros_checklist', 'alergias', 'internaciones', 'antecedentes_salud', 
                    'obra_social_nombre', 'obra_social_nro'
                ];
                $setsS = [];
                $paramsS = [];
                foreach ($salud_fields as $f) {
                    $setsS[] = "$f = ?";
                    $paramsS[] = $input['salud_' . $f] ?? 0;
                }
                $paramsS[] = $id;
                $sqlSalud = "UPDATE salud_alumno SET " . implode(',', $setsS) . " WHERE id_alumno = ?";
                $stmtSalud = $pdo->prepare($sqlSalud);
                $stmtSalud->execute($paramsS);

                // 3. Actualizar Responsables (Lógica simplificada: borrar relaciones antiguas y recrear)
                // En un sistema real se buscaría por DNI, aquí mantenemos la coherencia de la ficha
                for ($i = 1; $i <= 2; $i++) {
                    if (!empty($input["resp{$i}_dni"])) {
                        $resp_fields = [
                            'apellido', 'nombre', 'vinculo', 'nacionalidad', 'tipo_dni', 'dni',
                            'profesion', 'nivel_educativo', 'condicion_actividad', 'convive_estudiante',
                            'calle', 'numero', 'piso', 'depto', 'localidad', 'provincia',
                            'telefono_fijo', 'telefono_celular', 'email'
                        ];
                        $colsR = implode(',', $resp_fields);
                        $placeholdersR = implode(',', array_fill(0, count($resp_fields), '?'));
                        $sqlResp = "INSERT INTO responsables ($colsR) VALUES ($placeholdersR) 
                                    ON DUPLICATE KEY UPDATE id_responsable=LAST_INSERT_ID(id_responsable)";
                        
                        // Actualizar campos si ya existe
                        $updateParts = [];
                        foreach($resp_fields as $f) $updateParts[] = "$f=VALUES($f)";
                        $sqlResp .= ", " . implode(',', $updateParts);

                        $stmtResp = $pdo->prepare($sqlResp);
                        $resp_values = [];
                        foreach ($resp_fields as $f) {
                            if ($f === 'convive_estudiante') {
                                $resp_values[] = $input["resp{$i}_convive"] ?? 0;
                            } elseif ($f === 'condicion_actividad') {
                                $resp_values[] = $input["resp{$i}_$f"] ?? 'Activo';
                            } else {
                                $resp_values[] = $input["resp{$i}_$f"] ?? null;
                            }
                        }
                        $stmtResp->execute($resp_values);
                        $id_responsable = $pdo->lastInsertId();

                        // Asegurar relación
                        $sqlRel = "INSERT IGNORE INTO alumno_responsable (id_alumno, id_responsable, es_principal) VALUES (?, ?, ?)";
                        $stmtRel = $pdo->prepare($sqlRel);
                        $stmtRel->execute([$id, $id_responsable, ($i === 1 ? 1 : 0)]);
                    }
                }

                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log('Error en actualización estudiantes PUT: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Error en actualización: ' . $e->getMessage()]);
            }
            exit;
        }

        // Caso normal para el resto de tablas
        if ($real_table === 'alumnos') {
            $id_col = 'id_alumno';
        } elseif ($real_table === 'docentes') {
            $id_col = 'id_docente';
        } elseif ($real_table === 'materias') {
            $id_col = 'id_materia';
        } else {
            $id_col = "id_$real_table";
        }

        $set_parts = [];
        $params = [];
        foreach ($input as $key => $value) {
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
        
        if ($real_table === 'alumnos') {
            $id_col = 'id_alumno';
        } elseif ($real_table === 'docentes') {
            $id_col = 'id_docente';
        } elseif ($real_table === 'materias') {
            $id_col = 'id_materia';
        } else {
            $id_col = "id_$real_table";
        }

        $sql = "DELETE FROM $real_table WHERE $id_col = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    }

} catch (\PDOException $e) {
    error_log('Error de base de datos en api.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
