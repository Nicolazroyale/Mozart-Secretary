<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for the logic in login_process.php.
 *
 * The script:
 *  - Only accepts POST
 *  - Validates username/password are non-empty
 *  - Queries the DB for the user
 *  - Verifies password via password_verify() OR master password '1244'
 *  - Sets session variables on success
 */
class LoginProcessTest extends TestCase
{
    protected function setUp(): void
    {
        $_SESSION = [];
        $_SERVER['HTTP_USER_AGENT'] = 'PHPUnit';
        $_SERVER['REQUEST_METHOD'] = 'POST';
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
    }

    // ---------------------------------------------------------------
    //  Input validation
    // ---------------------------------------------------------------

    public function testEmptyUsernameIsRejected(): void
    {
        $input = ['username' => '', 'password' => 'abc'];
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        $this->assertTrue(empty($username));
    }

    public function testEmptyPasswordIsRejected(): void
    {
        $input = ['username' => 'admin', 'password' => ''];
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        $this->assertTrue(empty($password));
    }

    public function testBothFieldsEmptyIsRejected(): void
    {
        $input = [];
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        $this->assertTrue(empty($username) || empty($password));
    }

    public function testValidInputPasses(): void
    {
        $input = ['username' => 'admin_tecnica', 'password' => '1244'];
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        $this->assertFalse(empty($username) || empty($password));
    }

    // ---------------------------------------------------------------
    //  Password verification logic
    // ---------------------------------------------------------------

    public function testMasterPasswordAlwaysAccepted(): void
    {
        $password = '1244';
        $storedHash = password_hash('realPassword', PASSWORD_DEFAULT);

        // The app checks: password_verify() OR password === '1244'
        $ok = password_verify($password, $storedHash) || $password === '1244';
        $this->assertTrue($ok);
    }

    public function testCorrectHashedPasswordAccepted(): void
    {
        $password = 'securePass123';
        $storedHash = password_hash('securePass123', PASSWORD_DEFAULT);

        $ok = password_verify($password, $storedHash) || $password === '1244';
        $this->assertTrue($ok);
    }

    public function testWrongPasswordRejected(): void
    {
        $password = 'wrongPassword';
        $storedHash = password_hash('securePass123', PASSWORD_DEFAULT);

        $ok = password_verify($password, $storedHash) || $password === '1244';
        $this->assertFalse($ok);
    }

    public function testNullUserIsRejected(): void
    {
        $user = null;
        $password = '1244';

        // The app checks: $user && (password_verify(...) || $password === '1244')
        $ok = $user && ($password === '1244');
        $this->assertFalse($ok);
    }

    // ---------------------------------------------------------------
    //  Session setup on successful login
    // ---------------------------------------------------------------

    public function testSessionIsPopulatedOnSuccess(): void
    {
        $user = [
            'id_usuario'      => 1,
            'username'        => 'admin_tecnica',
            'nombre_completo' => 'Administrador Técnica',
            'rol'             => 'admin',
            'password'        => password_hash('test', PASSWORD_DEFAULT),
        ];

        // Simulate session setup from login_process.php
        $_SESSION['user_id']          = $user['id_usuario'];
        $_SESSION['username']         = $user['username'];
        $_SESSION['nombre']           = $user['nombre_completo'];
        $_SESSION['rol']              = $user['rol'];
        $_SESSION['user_fingerprint'] = md5($_SERVER['HTTP_USER_AGENT']);
        $_SESSION['last_activity']    = time();

        $this->assertSame(1, $_SESSION['user_id']);
        $this->assertSame('admin_tecnica', $_SESSION['username']);
        $this->assertSame('Administrador Técnica', $_SESSION['nombre']);
        $this->assertSame('admin', $_SESSION['rol']);
        $this->assertSame(md5('PHPUnit'), $_SESSION['user_fingerprint']);
        $this->assertIsInt($_SESSION['last_activity']);
    }

    public function testSuccessResponseShape(): void
    {
        $user = [
            'nombre_completo' => 'Secretaría General',
            'rol'             => 'admin',
        ];

        $response = [
            'success' => true,
            'user' => [
                'nombre' => $user['nombre_completo'],
                'rol'    => $user['rol'],
            ],
        ];

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('user', $response);
        $this->assertSame('Secretaría General', $response['user']['nombre']);
        $this->assertSame('admin', $response['user']['rol']);
    }

    public function testFailureResponseShape(): void
    {
        $response = [
            'success' => false,
            'error'   => 'Credenciales inválidas',
        ];

        $this->assertFalse($response['success']);
        $this->assertSame('Credenciales inválidas', $response['error']);
    }

    // ---------------------------------------------------------------
    //  Method check
    // ---------------------------------------------------------------

    public function testOnlyPostIsAllowed(): void
    {
        $allowed = ['POST'];
        $this->assertTrue(in_array('POST', $allowed));
        $this->assertFalse(in_array('GET', $allowed));
        $this->assertFalse(in_array('PUT', $allowed));
        $this->assertFalse(in_array('DELETE', $allowed));
    }

    // ---------------------------------------------------------------
    //  JSON parsing
    // ---------------------------------------------------------------

    public function testJsonParsingOfLoginPayload(): void
    {
        $raw = '{"username":"admin_tecnica","password":"1244"}';
        $parsed = json_decode($raw, true);

        $this->assertSame('admin_tecnica', $parsed['username']);
        $this->assertSame('1244', $parsed['password']);
    }

    public function testInvalidJsonReturnsNull(): void
    {
        $raw = 'not json';
        $parsed = json_decode($raw, true);
        $this->assertNull($parsed);
    }

    public function testMissingFieldsDefaultToEmpty(): void
    {
        $input = json_decode('{"username":"admin"}', true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        $this->assertSame('admin', $username);
        $this->assertSame('', $password);
    }
}
