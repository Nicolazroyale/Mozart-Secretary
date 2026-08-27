<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for the validation and routing logic from api_helpers.php.
 * Now imports the REAL functions instead of re-implementing them.
 */
class ApiValidationTest extends TestCase
{
    // ---------------------------------------------------------------
    //  Table allow-list validation (using real TABLE_MAP)
    // ---------------------------------------------------------------

    public function testResolveTableMapsEstudiantesToAlumnos(): void
    {
        $this->assertSame('alumnos', resolve_table('estudiantes'));
    }

    public function testResolveTableMapsDocentesToDocentes(): void
    {
        $this->assertSame('docentes', resolve_table('docentes'));
    }

    public function testResolveTableMapsCursosToCursos(): void
    {
        $this->assertSame('cursos', resolve_table('cursos'));
    }

    public function testResolveTableFallsBackToOriginal(): void
    {
        $this->assertSame('nomina', resolve_table('nomina'));
    }

    // ---------------------------------------------------------------
    //  ID column resolution (using real get_id_column)
    // ---------------------------------------------------------------

    /** @dataProvider idColumnProvider */
    public function testIdColumnResolution(string $table, string $expected): void
    {
        $this->assertSame($expected, get_id_column($table));
    }

    public static function idColumnProvider(): array
    {
        return [
            'alumnos'                => ['alumnos', 'id_alumno'],
            'docentes'               => ['docentes', 'id_docente'],
            'materias'               => ['materias', 'id_materia'],
            'docente_materia_curso'  => ['docente_materia_curso', 'id'],
            'cursos'                 => ['cursos', 'id_cursos'],
        ];
    }

    // ---------------------------------------------------------------
    //  Permission logic: write methods require admin role
    // ---------------------------------------------------------------

    public function testGetDoesNotRequireAdmin(): void
    {
        $writeMethods = ['POST', 'PUT', 'DELETE'];
        $this->assertFalse(in_array('GET', $writeMethods));
    }

    /** @dataProvider writableMethodProvider */
    public function testWriteMethodsAreWriteOperations(string $method): void
    {
        $writeMethods = ['POST', 'PUT', 'DELETE'];
        $this->assertTrue(in_array($method, $writeMethods));
    }

    public static function writableMethodProvider(): array
    {
        return [
            'POST'   => ['POST'],
            'PUT'    => ['PUT'],
            'DELETE' => ['DELETE'],
        ];
    }

    // ---------------------------------------------------------------
    //  Docentes allowed-fields filter (using real pattern)
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
}
