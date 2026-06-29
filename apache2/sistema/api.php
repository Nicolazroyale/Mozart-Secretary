<?php
require_once __DIR__ . '/../auth_config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../shared/api_helpers.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

$method = $_SERVER['REQUEST_METHOD'];
$table  = $_GET['table'] ?? '';
$id     = $_GET['id'] ?? '';
$search = $_GET['search'] ?? '';
$format = $_GET['format'] ?? ''; // pdf or excel

if ($format) {
    // First check auth without setting JSON header
    if (!verificar_sesion()) {
        http_response_code(401);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }
    export_data($pdo, $table, $id, $format);
    exit;
}

init_api($method);

$allowed_tables = ['estudiantes', 'docentes', 'cursos', 'materias', 'lista_cursos', 'search', 'nomina', 'asignaciones', 'docentes_por_curso'];

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
                
                echo json_encode(query_nomina($pdo, $id));
                exit;

            case 'docentes_por_curso':
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID de curso requerido']);
                    exit;
                }
                
                echo json_encode(query_docentes_por_curso($pdo, $id));
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
            case 'asignaciones':
                if ($id) {
                    $query = "SELECT * FROM docente_materia_curso WHERE id = ?";
                    $params = [$id];
                } else {
                    $query = "SELECT * FROM docente_materia_curso WHERE activo=1";
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
            'asignaciones' => ['id_docente', 'id_materia', 'id_curso', 'cargo', 'horas_catedra', 'dia_semana', 'hora_inicio', 'hora_fin', 'ciclo_lectivo', 'activo'],
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

        // Whitelist of allowed fields per table to prevent SQL injection via column names
        $allowed_fields_map = [
            'docentes' => ['apellido', 'nombre', 'dni', 'fecha_inscripcion', 'situacion_revista', 'telefono', 'email', 'activo'],
            'cursos'   => ['anio', 'division', 'turno', 'ciclo', 'jornada'],
            'materias' => ['nombre'],
            'asignaciones' => ['id_docente', 'id_materia', 'id_curso', 'cargo', 'horas_catedra', 'dia_semana', 'hora_inicio', 'hora_fin', 'ciclo_lectivo', 'activo'],
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
    error_log('Error de base de datos en sistema/api.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

function export_data($pdo, $table, $id, $format) {
    $data = [];
    $headers = [];
    $title = '';
    $profesores_data = [];
    $profesores_headers = [];
    $include_profesores = isset($_GET['include_profesores']) ? (int)$_GET['include_profesores'] : 1;
    $include_dni = isset($_GET['include_dni']) ? (int)$_GET['include_dni'] : 1;
    $include_responsables = isset($_GET['include_responsables']) ? (int)$_GET['include_responsables'] : 1;
    $include_telefonos = isset($_GET['include_telefonos']) ? (int)$_GET['include_telefonos'] : 1;
    $include_salud = isset($_GET['include_salud']) ? (int)$_GET['include_salud'] : 1;
    
    switch ($table) {
        case 'estudiantes':
            $title = 'Listado de Estudiantes';
            $headers = ['Nombre', 'Curso', 'DNI', 'Tutor'];
            $query = "SELECT alumno as nombre, curso, dni, responsable as tutor FROM v_ficha_alumno ORDER BY apellido, nombre";
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_NUM);
            break;
            
        case 'docentes':
            $title = 'Listado de Docentes';
            $headers = ['Nombre', 'DNI', 'Cargo'];
            $query = "SELECT CONCAT(apellido, ', ', nombre) as nombre, dni, situacion_revista as cargo FROM docentes ORDER BY apellido, nombre";
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_NUM);
            break;
            
        case 'cursos':
            $title = 'Listado de Cursos';
            $headers = ['Nombre', 'Turno', 'Profesores (Cargo/Materia)'];
            $query = "SELECT id_curso, CONCAT(anio, '°', division, '°') as nombre, turno FROM cursos ORDER BY anio, division";
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $cursos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data = array_map(function($curso) use ($pdo) {
                $docentes = query_docentes_por_curso($pdo, $curso['id_curso']);
                $profesoresStr = implode("\n", array_map(function($d) {
                    return "{$d['apellido']}, {$d['nombre']} ({$d['cargo_curso']}: {$d['materia']})";
                }, $docentes));
                return [
                    $curso['nombre'], $curso['turno'], $profesoresStr ?: '---'];
            }, $cursos);
            break;
            
        case 'materias':
            $title = 'Listado de Materias';
            $headers = ['Nombre'];
            $query = "SELECT nombre FROM materias ORDER BY nombre";
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_NUM);
            break;
            
        case 'nomina':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de curso requerido']);
                exit;
            }
            $curso = $pdo->query("SELECT CONCAT(anio, '°', division, '° (', turno, ')') as nombre FROM cursos WHERE id_curso = $id")->fetchColumn();
            $title = "Nómina del Curso: $curso";
            
            if ($include_profesores) {
                $docentes = query_docentes_por_curso($pdo, $id);
                $profesores_headers = ['Apellido', 'Nombre', 'Materia', 'Cargo', 'Teléfono'];
                $profesores_data = array_map(function($d) {
                    return [
                        $d['apellido'],
                        $d['nombre'],
                        $d['materia'],
                        $d['cargo_curso'],
                        $d['telefono'] ?: '---'
                    ];
                }, $docentes);
            }
            
            $headers = ['Apellido', 'Nombre'];
            if ($include_dni) $headers[] = 'DNI';
            if ($include_responsables) $headers[] = 'Responsable';
            if ($include_telefonos) $headers[] = 'Teléfono Resp.';
            if ($include_salud) $headers[] = 'Alerta Salud';
            
            $alumnos = query_nomina($pdo, $id);
            $data = array_map(function($row) use ($include_dni, $include_responsables, $include_telefonos, $include_salud) {
                $row_data = [$row['apellido'], $row['nombre']];
                if ($include_dni) $row_data[] = $row['dni'];
                if ($include_responsables) $row_data[] = $row['resp_nombre'] . ' ' . $row['resp_apellido'];
                if ($include_telefonos) $row_data[] = $row['resp_tel'];
                if ($include_salud) $row_data[] = $row['alerta_salud'] > 0 ? 'Sí' : 'No';
                return $row_data;
            }, $alumnos);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Tabla no válida para exportación']);
            exit;
    }
    
    if ($format === 'excel') {
        export_excel($title, $headers, $data, $profesores_headers, $profesores_data);
    } elseif ($format === 'pdf') {
        export_pdf($title, $headers, $data, $profesores_headers, $profesores_data);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Formato no válido']);
        exit;
    }
}

function export_excel($title, $headers, $data, $profesores_headers = [], $profesores_data = []) {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    
    $current_row = 1;
    
    // Title
    $sheet->setCellValue('A1', $title);
    $sheet->mergeCells('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(max(count($headers), count($profesores_headers))) . '1');
    $titleStyle = [
        'font' => ['bold' => true, 'size' => 16],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ];
    $sheet->getStyle('A1')->applyFromArray($titleStyle);
    $current_row++;
    
    // Date
    $sheet->setCellValue('A2', 'Fecha de generación: ' . date('d/m/Y H:i:s'));
    $sheet->mergeCells('A2:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(max(count($headers), count($profesores_headers))) . '2');
    $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $current_row++;
    $current_row++;
    
    // Profesores table (if available)
    if (!empty($profesores_headers) && !empty($profesores_data)) {
        $sheet->setCellValue('A' . $current_row, 'Profesores del Curso');
        $sheet->mergeCells('A' . $current_row . ':' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($profesores_headers)) . $current_row);
        $profesores_title_style = [
            'font' => ['bold' => true, 'size' => 12],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT]
        ];
        $sheet->getStyle('A' . $current_row)->applyFromArray($profesores_title_style);
        $current_row++;
        
        // Profesores headers
        $col = 1;
        foreach ($profesores_headers as $header) {
            $cell = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . $current_row;
            $sheet->setCellValue($cell, $header);
            $headerStyle = [
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'font' => ['color' => ['rgb' => 'FFFFFF']]
            ];
            $sheet->getStyle($cell)->applyFromArray($headerStyle);
            $col++;
        }
        $current_row++;
        
        // Profesores data
        foreach ($profesores_data as $rowData) {
            $col = 1;
            foreach ($rowData as $cellData) {
                $sheet->setCellValue(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . $current_row, $cellData);
                $col++;
            }
            $current_row++;
        }
        $current_row++;
        $current_row++;
    }
    
    // Alumnos headers
    $col = 1;
    foreach ($headers as $header) {
        $cell = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . $current_row;
        $sheet->setCellValue($cell, $header);
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'font' => ['color' => ['rgb' => 'FFFFFF']]
        ];
        $sheet->getStyle($cell)->applyFromArray($headerStyle);
        $col++;
    }
    $current_row++;
    
    // Alumnos data
    foreach ($data as $rowData) {
        $col = 1;
        foreach ($rowData as $cellData) {
            $sheet->setCellValue(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . $current_row, $cellData);
            $col++;
        }
        $current_row++;
    }
    
    // Auto size columns
    $max_cols = max(count($headers), count($profesores_headers));
    for ($c = 1; $c <= $max_cols; $c++) {
        $sheet->getColumnDimension(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
    }
    
    // Output
    $filename = preg_replace('/[^a-zA-Z0-9_]/', '_', $title) . '_' . date('YmdHis') . '.xlsx';
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: max-age=0');
    
    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
}

function export_pdf($title, $headers, $data, $profesores_headers = [], $profesores_data = []) {
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    $pdf->SetCreator(PDF_CREATOR);
    $pdf->SetAuthor('Sistema de Gestión Escolar');
    $pdf->SetTitle($title);
    $pdf->SetSubject($title);
    
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    
    $pdf->AddPage();
    
    // Title
    $pdf->SetFont('helvetica', 'B', 16);
    $pdf->Cell(0, 10, $title, 0, 1, 'C');
    $pdf->Ln(5);
    
    // Date
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 5, 'Fecha de generación: ' . date('d/m/Y H:i:s'), 0, 1, 'C');
    $pdf->Ln(10);
    
    // Profesores table (if available)
    if (!empty($profesores_headers) && !empty($profesores_data)) {
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 10, 'Profesores del Curso', 0, 1, 'L');
        $pdf->Ln(5);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $colWidth = 180 / count($profesores_headers);
        foreach ($profesores_headers as $header) {
            $pdf->Cell($colWidth, 8, $header, 1, 0, 'C');
        }
        $pdf->Ln();
        
        $pdf->SetFont('helvetica', '', 9);
        foreach ($profesores_data as $rowData) {
            foreach ($rowData as $cellData) {
                $pdf->Cell($colWidth, 7, $cellData, 1, 0, 'C');
            }
            $pdf->Ln();
        }
        $pdf->Ln(15);
    }
    
    // Alumnos table
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell(0, 10, 'Alumnos del Curso', 0, 1, 'L');
    $pdf->Ln(5);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $colWidth = 180 / count($headers);
    foreach ($headers as $header) {
        $pdf->Cell($colWidth, 8, $header, 1, 0, 'C');
    }
    $pdf->Ln();
    
    $pdf->SetFont('helvetica', '', 9);
    foreach ($data as $rowData) {
        foreach ($rowData as $cellData) {
            $pdf->Cell($colWidth, 7, $cellData, 1, 0, 'C');
        }
        $pdf->Ln();
    }
    
    // Output
    $filename = preg_replace('/[^a-zA-Z0-9_]/', '_', $title) . '_' . date('YmdHis') . '.pdf';
    $pdf->Output($filename, 'D');
    exit;
}
