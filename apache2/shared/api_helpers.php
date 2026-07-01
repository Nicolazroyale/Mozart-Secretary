<?php

// ---------------------------------------------------------------------------
// Field-list constants (used in both POST and PUT for estudiantes)
// ---------------------------------------------------------------------------

const ALUMNO_FIELDS = [
    'apellido', 'nombre', 'tipo_dni', 'dni', 'cuil', 'fecha_nacimiento',
    'lugar_nacimiento', 'nacionalidad', 'genero', 'genero_especificar',
    'calle', 'numero', 'piso', 'depto', 'entre_calles', 'localidad',
    'distrito', 'provincia', 'telefono_fijo', 'telefono_celular',
    'id_curso', 'fecha_ingreso'
];

const SALUD_FIELDS = [
    'asma', 'celiaquia', 'diabetes', 'obesidad', 'cardiopatia',
    'otros_checklist', 'alergias', 'internaciones', 'antecedentes_salud',
    'obra_social_nombre', 'obra_social_nro'
];

const RESP_FIELDS = [
    'apellido', 'nombre', 'vinculo', 'nacionalidad', 'tipo_dni', 'dni',
    'profesion', 'nivel_educativo', 'condicion_actividad', 'convive_estudiante',
    'calle', 'numero', 'piso', 'depto', 'localidad', 'provincia',
    'telefono_fijo', 'telefono_celular', 'email'
];

const TABLE_MAP = [
    'estudiantes' => 'alumnos',
    'docentes'    => 'docentes',
    'cursos'      => 'cursos',
    'materias'    => 'materias',
    'asignaciones' => 'docente_materia_curso',
];

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------

function json_error(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

function json_success(array $data = ['success' => true]): void {
    echo json_encode($data);
    exit;
}

// ---------------------------------------------------------------------------
// API request bootstrap
// ---------------------------------------------------------------------------

/**
 * Standard preamble shared by every API endpoint:
 *  1. Verify session
 *  2. Enforce write-permission for POST/PUT/DELETE
 *
 * Call this at the top of each api.php right after including auth_config + db.
 */
function init_api(string $method): void {
    header('Content-Type: application/json');

    if (!verificar_sesion()) {
        json_error('No autorizado o sesión expirada', 401);
    }

    if (in_array($method, ['POST', 'PUT', 'DELETE']) && $_SESSION['rol'] !== 'admin') {
        json_error('No tiene permisos para realizar esta acción', 403);
    }
}

/**
 * Resolve the primary-key column name for a given real table.
 */
function get_id_column(string $real_table): string {
    if ($real_table === 'alumnos')               return 'id_alumno';
    if ($real_table === 'docentes')              return 'id_docente';
    if ($real_table === 'materias')              return 'id_materia';
    if ($real_table === 'docente_materia_curso') return 'id';
    return "id_$real_table";
}

/**
 * Map a frontend table name to its real DB table name.
 */
function resolve_table(string $table): string {
    return TABLE_MAP[$table] ?? $table;
}

// ---------------------------------------------------------------------------
// Shared GET queries
// ---------------------------------------------------------------------------

function query_nomina(PDO $pdo, string $id): array {
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
                 AND (
                     s.asma=1 
                     OR s.celiaquia=1 
                     OR s.diabetes=1 
                     OR s.obesidad=1 
                     OR s.cardiopatia=1 
                     OR (s.alergias IS NOT NULL AND TRIM(s.alergias) != '')
                     OR (s.antecedentes_salud IS NOT NULL AND TRIM(s.antecedentes_salud) != '')
                     OR (s.otros_checklist IS NOT NULL AND TRIM(s.otros_checklist) != '')
                     OR (s.internaciones IS NOT NULL AND TRIM(s.internaciones) != '')
                 )) as alerta_salud
              FROM alumnos a
              LEFT JOIN alumno_responsable ar ON a.id_alumno = ar.id_alumno AND ar.es_principal = 1
              LEFT JOIN responsables r ON ar.id_responsable = r.id_responsable
              WHERE a.id_curso = ? AND a.activo = 1
              ORDER BY a.apellido ASC, a.nombre ASC";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$id]);
    return $stmt->fetchAll();
}

function query_search(PDO $pdo, string $search, string $rol, string $anio, string $turno): array {
    $results = [];

    if ($rol === 'todos' || $rol === 'alumno') {
        $sql = "SELECT id_alumno as id, CONCAT(apellido, ', ', nombre) as nombre, dni, 'alumno' as rol, id_curso
                FROM alumnos
                WHERE (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)";
        $params = ["%$search%", "%$search%", "%$search%"];

        if ($anio || $turno) {
            $sql .= " AND id_curso IN (SELECT id_curso FROM cursos WHERE 1=1";
            if ($anio)  { $sql .= " AND anio = ?";  $params[] = $anio; }
            if ($turno) { $sql .= " AND turno = ?"; $params[] = $turno; }
            $sql .= ")";
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = array_merge($results, $stmt->fetchAll());
    }

    if ($rol === 'todos' || $rol === 'profesor') {
        $sql = "SELECT id_docente as id, CONCAT(apellido, ', ', nombre) as nombre, dni, 'profesor' as rol, NULL as id_curso
                FROM docentes
                WHERE (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)";
        $params = ["%$search%", "%$search%", "%$search%"];

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = array_merge($results, $stmt->fetchAll());
    }

    return $results;
}

/**
 * Fetch a single student with salud + restricciones + responsables.
 */
function query_student_detail(PDO $pdo, string $id): ?array {
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

    return $data ?: null;
}

// ---------------------------------------------------------------------------
// Shared write helpers for estudiantes
// ---------------------------------------------------------------------------

function insert_alumno(PDO $pdo, array $input): string {
    $cols = implode(',', ALUMNO_FIELDS);
    $placeholders = implode(',', array_fill(0, count(ALUMNO_FIELDS), '?'));
    $stmt = $pdo->prepare("INSERT INTO alumnos ($cols) VALUES ($placeholders)");
    $values = [];
    foreach (ALUMNO_FIELDS as $f) $values[] = $input[$f] ?? null;
    $stmt->execute($values);
    return $pdo->lastInsertId();
}

function update_alumno(PDO $pdo, array $input, string $id): void {
    $sets = [];
    $params = [];
    foreach (ALUMNO_FIELDS as $f) {
        $sets[] = "$f = ?";
        $params[] = $input[$f] ?? null;
    }
    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE alumnos SET " . implode(',', $sets) . " WHERE id_alumno = ?");
    $stmt->execute($params);
}

function save_salud(PDO $pdo, array $input, string $id_alumno, string $mode = 'insert'): void {
    if ($mode === 'insert') {
        $cols = "id_alumno," . implode(',', SALUD_FIELDS);
        $placeholders = "?," . implode(',', array_fill(0, count(SALUD_FIELDS), '?'));
        $stmt = $pdo->prepare("INSERT INTO salud_alumno ($cols) VALUES ($placeholders)");
        $values = [$id_alumno];
        foreach (SALUD_FIELDS as $f) $values[] = $input['salud_' . $f] ?? 0;
        $stmt->execute($values);
    } else {
        $sets = [];
        $params = [];
        foreach (SALUD_FIELDS as $f) {
            $sets[] = "$f = ?";
            $params[] = $input['salud_' . $f] ?? 0;
        }
        $params[] = $id_alumno;
        $stmt = $pdo->prepare("UPDATE salud_alumno SET " . implode(',', $sets) . " WHERE id_alumno = ?");
        $stmt->execute($params);
    }
}

function save_restriccion(PDO $pdo, array $input, string $id_alumno): void {
    // First check if there's an existing record
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM restricciones_judiciales WHERE id_alumno = ?");
    $stmtCheck->execute([$id_alumno]);
    $exists = $stmtCheck->fetchColumn() > 0;

    if (!empty($input['rj_nombre'])) {
        if ($exists) {
            $stmt = $pdo->prepare(
                "UPDATE restricciones_judiciales SET apellido_nombre = ?, tipo_doc = ?, nro_doc = ?, descripcion = ? WHERE id_alumno = ?"
            );
            $stmt->execute([$input['rj_nombre'], $input['rj_tipo_doc'], $input['rj_nro_doc'], $input['rj_descripcion'], $id_alumno]);
        } else {
            $stmt = $pdo->prepare(
                "INSERT INTO restricciones_judiciales (id_alumno, apellido_nombre, tipo_doc, nro_doc, descripcion) VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([$id_alumno, $input['rj_nombre'], $input['rj_tipo_doc'], $input['rj_nro_doc'], $input['rj_descripcion']]);
        }
    } else {
        // If no nombre, delete the restriction
        if ($exists) {
            $stmt = $pdo->prepare("DELETE FROM restricciones_judiciales WHERE id_alumno = ?");
            $stmt->execute([$id_alumno]);
        }
    }
}

/**
 * Build the parameter values array for a responsable, applying special-case
 * mappings for convive_estudiante and condicion_actividad.
 */
function build_resp_values(array $input, int $index): array {
    $values = [];
    foreach (RESP_FIELDS as $f) {
        if ($f === 'convive_estudiante') {
            $values[] = $input["resp{$index}_convive"] ?? 0;
        } elseif ($f === 'condicion_actividad') {
            $values[] = $input["resp{$index}_$f"] ?? 'Activo';
        } else {
            $values[] = $input["resp{$index}_$f"] ?? null;
        }
    }
    return $values;
}

/**
 * Insert or upsert up to 2 responsables and their alumno relationships.
 *
 * @param string $mode  'insert' for new records, 'upsert' for edit (adds UPDATE clause)
 */
function save_responsables(PDO $pdo, array $input, string $id_alumno, string $mode = 'insert'): void {
    $colsR = implode(',', RESP_FIELDS);
    $placeholdersR = implode(',', array_fill(0, count(RESP_FIELDS), '?'));

    for ($i = 1; $i <= 2; $i++) {
        if (empty($input["resp{$i}_dni"])) continue;

        $resp_values = build_resp_values($input, $i);

        if ($mode === 'upsert') {
            $sqlResp = "INSERT INTO responsables ($colsR) VALUES ($placeholdersR)
                        ON DUPLICATE KEY UPDATE id_responsable=LAST_INSERT_ID(id_responsable)";
            $updateParts = [];
            foreach (RESP_FIELDS as $f) $updateParts[] = "$f=VALUES($f)";
            $sqlResp .= ", " . implode(',', $updateParts);

            $pdo->prepare($sqlResp)->execute($resp_values);
            $id_responsable = $pdo->lastInsertId();

            $pdo->prepare(
                "INSERT IGNORE INTO alumno_responsable (id_alumno, id_responsable, es_principal) VALUES (?, ?, ?)"
            )->execute([$id_alumno, $id_responsable, ($i === 1 ? 1 : 0)]);
        } else {
            $sqlResp = "INSERT INTO responsables ($colsR) VALUES ($placeholdersR) ON DUPLICATE KEY UPDATE id_responsable=LAST_INSERT_ID(id_responsable)";
            $pdo->prepare($sqlResp)->execute($resp_values);
            $id_responsable = $pdo->lastInsertId();

            $pdo->prepare(
                "INSERT INTO alumno_responsable (id_alumno, id_responsable, es_principal) VALUES (?, ?, ?)"
            )->execute([$id_alumno, $id_responsable, ($i === 1 ? 1 : 0)]);
        }
    }
}

/**
 * Generic INSERT for simple tables.
 */
function generic_insert(PDO $pdo, string $real_table, array $input): string {
    $keys = array_keys($input);
    $cols = implode(',', $keys);
    $placeholders = implode(',', array_fill(0, count($keys), '?'));
    $stmt = $pdo->prepare("INSERT INTO $real_table ($cols) VALUES ($placeholders)");
    $stmt->execute(array_values($input));
    return $pdo->lastInsertId();
}

/**
 * Generic UPDATE for simple tables.
 */
function generic_update(PDO $pdo, string $real_table, array $input, string $id): void {
    $id_col = get_id_column($real_table);
    $set_parts = [];
    $params = [];
    foreach ($input as $key => $value) {
        $set_parts[] = "$key = ?";
        $params[] = $value;
    }
    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE $real_table SET " . implode(',', $set_parts) . " WHERE $id_col = ?");
    $stmt->execute($params);
}

/**
 * Generic DELETE for simple tables.
 */
function generic_delete(PDO $pdo, string $real_table, string $id): void {
    $id_col = get_id_column($real_table);
    $stmt = $pdo->prepare("DELETE FROM $real_table WHERE $id_col = ?");
    $stmt->execute([$id]);
}

/**
 * Get docentes with materias and cargos for a specific curso
 */
function query_docentes_por_curso(PDO $pdo, int $id_curso): array {
    $query = "SELECT
                dmc.id,
                d.id_docente, d.apellido, d.nombre, d.dni, d.telefono,
                m.id_materia, m.nombre as materia,
                dmc.cargo as cargo_curso, dmc.dia_semana, dmc.hora_inicio, dmc.hora_fin
              FROM docente_materia_curso dmc
              JOIN docentes d ON dmc.id_docente = d.id_docente
              JOIN materias m ON dmc.id_materia = m.id_materia
              WHERE dmc.id_curso = ? AND dmc.activo = 1
              ORDER BY d.apellido ASC";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$id_curso]);
    return $stmt->fetchAll();
}
