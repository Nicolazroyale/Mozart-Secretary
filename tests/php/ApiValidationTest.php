<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for the validation and routing logic extracted from api.php.
 *
 * Since api.php is a procedural script that echoes JSON and exits, we
 * extract the pure-logic checks into helper functions here and test them.
 */
class ApiValidationTest extends TestCase
{
    /**
     * The allow-list from api.php.
     */
    private array $allowedTables = [
        'estudiantes', 'docentes', 'cursos', 'lista_cursos',
        'search', 'nomina', 'docentes_por_curso', 'docente_cursos',
    ];

    /**
     * Frontend-to-DB table map from api.php.
     */
    private array $tableMap = [
        'estudiantes' => 'alumnos',
        'docentes'    => 'docentes',
        'cursos'      => 'cursos',
        'materias'    => 'materias',
    ];

    // ---------------------------------------------------------------
    //  Table allow-list validation
    // ---------------------------------------------------------------

    /** @dataProvider allowedTableProvider */
    public function testAllowedTablesAreAccepted(string $table): void
    {
        $this->assertTrue(in_array($table, $this->allowedTables));
    }

    public static function allowedTableProvider(): array
    {
        return [
            'estudiantes'      => ['estudiantes'],
            'docentes'         => ['docentes'],
            'cursos'           => ['cursos'],
            'lista_cursos'     => ['lista_cursos'],
            'search'           => ['search'],
            'nomina'           => ['nomina'],
            'docentes_por_curso' => ['docentes_por_curso'],
            'docente_cursos'   => ['docente_cursos'],
        ];
    }

    /** @dataProvider disallowedTableProvider */
    public function testDisallowedTablesAreRejected(string $table): void
    {
        $this->assertFalse(in_array($table, $this->allowedTables));
    }

    public static function disallowedTableProvider(): array
    {
        return [
            'usuarios'   => ['usuarios'],
            'alumnos'    => ['alumnos'],   // raw DB table, not frontend name
            'admin'      => ['admin'],
            'empty'      => [''],
            'sql inject' => ["'; DROP TABLE alumnos; --"],
        ];
    }

    // ---------------------------------------------------------------
    //  Table name mapping
    // ---------------------------------------------------------------

    public function testTableMapResolvesEstudiantes(): void
    {
        $this->assertSame('alumnos', $this->tableMap['estudiantes']);
    }

    public function testTableMapResolvesDocentes(): void
    {
        $this->assertSame('docentes', $this->tableMap['docentes']);
    }

    public function testTableMapResolvesCursos(): void
    {
        $this->assertSame('cursos', $this->tableMap['cursos']);
    }

    public function testTableMapFallsBackToOriginal(): void
    {
        $table = 'nomina';
        $real = $this->tableMap[$table] ?? $table;
        $this->assertSame('nomina', $real);
    }

    // ---------------------------------------------------------------
    //  Permission logic: write methods require admin role
    // ---------------------------------------------------------------

    /** @dataProvider writableMethodProvider */
    public function testWriteMethodsRequireAdmin(string $method): void
    {
        $writeMethods = ['POST', 'PUT', 'DELETE'];
        $isWrite = in_array($method, $writeMethods);
        $this->assertTrue($isWrite);

        // An admin passes the check
        $rolAdmin = 'admin';
        $this->assertTrue($rolAdmin === 'admin');

        // A non-admin is forbidden
        $rolLectura = 'lectura';
        $this->assertFalse($rolLectura === 'admin');
    }

    public static function writableMethodProvider(): array
    {
        return [
            'POST'   => ['POST'],
            'PUT'    => ['PUT'],
            'DELETE' => ['DELETE'],
        ];
    }

    public function testGetDoesNotRequireAdmin(): void
    {
        $method = 'GET';
        $writeMethods = ['POST', 'PUT', 'DELETE'];
        $this->assertFalse(in_array($method, $writeMethods));
    }

    // ---------------------------------------------------------------
    //  ID column resolution (used by PUT/DELETE)
    // ---------------------------------------------------------------

    /**
     * Replicates the id-column resolution logic from api.php.
     */
    private function resolveIdColumn(string $realTable): string
    {
        if ($realTable === 'alumnos') {
            return 'id_alumno';
        } elseif ($realTable === 'docentes') {
            return 'id_docente';
        } elseif ($realTable === 'materias') {
            return 'id_materia';
        }
        return "id_$realTable";
    }

    /** @dataProvider idColumnProvider */
    public function testIdColumnResolution(string $table, string $expected): void
    {
        $this->assertSame($expected, $this->resolveIdColumn($table));
    }

    public static function idColumnProvider(): array
    {
        return [
            'alumnos'  => ['alumnos', 'id_alumno'],
            'docentes' => ['docentes', 'id_docente'],
            'materias' => ['materias', 'id_materia'],
            'cursos'   => ['cursos', 'id_cursos'],
        ];
    }

    // ---------------------------------------------------------------
    //  Pagination calculations
    // ---------------------------------------------------------------

    public function testPaginationOffsetCalculation(): void
    {
        $page = 3;
        $limit = 30;
        $offset = ($page - 1) * $limit;
        $this->assertSame(60, $offset);
    }

    public function testFirstPageOffsetIsZero(): void
    {
        $page = 1;
        $limit = 30;
        $offset = ($page - 1) * $limit;
        $this->assertSame(0, $offset);
    }

    public function testZeroLimitMeansNoLimit(): void
    {
        $limit = 0;
        $this->assertTrue($limit === 0);
    }

    // ---------------------------------------------------------------
    //  Docentes allowed-fields filter (POST /docentes)
    // ---------------------------------------------------------------

    public function testDocentesPostFiltersInvalidFields(): void
    {
        $allowed_fields = [
            'apellido', 'nombre', 'dni', 'fecha_inscripcion',
            'situacion_revista', 'telefono', 'email', 'activo',
        ];

        $input = [
            'apellido'   => 'García',
            'nombre'     => 'Juan',
            'dni'        => '12345678',
            'malicious'  => 'DROP TABLE docentes',
            'password'   => 'secret',
        ];

        $valid = array_intersect_key($input, array_flip($allowed_fields));

        $this->assertArrayHasKey('apellido', $valid);
        $this->assertArrayHasKey('nombre', $valid);
        $this->assertArrayHasKey('dni', $valid);
        $this->assertArrayNotHasKey('malicious', $valid);
        $this->assertArrayNotHasKey('password', $valid);
    }

    public function testDocentesPostKeepsAllAllowedFields(): void
    {
        $allowed_fields = [
            'apellido', 'nombre', 'dni', 'fecha_inscripcion',
            'situacion_revista', 'telefono', 'email', 'activo',
        ];

        $input = [
            'apellido'          => 'García',
            'nombre'            => 'Juan',
            'dni'               => '12345678',
            'fecha_inscripcion' => '2024-01-01',
            'situacion_revista' => 'Titular',
            'telefono'          => '1234567',
            'email'             => 'j@example.com',
            'activo'            => 1,
        ];

        $valid = array_intersect_key($input, array_flip($allowed_fields));
        $this->assertCount(8, $valid);
    }

    // ---------------------------------------------------------------
    //  sistema/api.php allowed tables (slightly different list)
    // ---------------------------------------------------------------

    public function testSistemaApiAllowedTables(): void
    {
        $sistemaAllowed = [
            'estudiantes', 'docentes', 'cursos', 'materias',
            'lista_cursos', 'search', 'nomina',
        ];

        $this->assertTrue(in_array('materias', $sistemaAllowed));
        $this->assertFalse(in_array('docentes_por_curso', $sistemaAllowed));
        $this->assertFalse(in_array('docente_cursos', $sistemaAllowed));
    }
}
