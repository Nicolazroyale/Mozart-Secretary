<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for verificar_sesion() from auth_config.php.
 * Now imports the REAL function from the application code via bootstrap.
 */
class VerificarSesionTest extends TestCase
{
    protected function setUp(): void
    {
        $_SESSION = [];
        $_SERVER['HTTP_USER_AGENT'] = 'TestBrowser/1.0';
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
    }

    // ---------------------------------------------------------------
    //  Condition 1 – user_id must exist in session
    // ---------------------------------------------------------------

    public function testReturnsFalseWhenUserIdMissing(): void
    {
        $this->assertFalse(verificar_sesion());
    }

    public function testReturnsFalseWhenSessionIsCompletelyEmpty(): void
    {
        $_SESSION = [];
        $this->assertFalse(verificar_sesion());
    }

    // ---------------------------------------------------------------
    //  Condition 2 – fingerprint must match user-agent
    // ---------------------------------------------------------------

    public function testReturnsFalseWhenFingerprintMissing(): void
    {
        $_SESSION['user_id'] = 1;
        $this->assertFalse(verificar_sesion());
    }

    public function testReturnsFalseWhenFingerprintMismatch(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('DifferentBrowser/2.0');
        $_SESSION['last_activity'] = time();
        $this->assertFalse(verificar_sesion());
    }

    // ---------------------------------------------------------------
    //  Condition 3 – session must not have timed out
    // ---------------------------------------------------------------

    public function testReturnsFalseWhenSessionTimedOut(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 1801;
        $this->assertFalse(verificar_sesion());
    }

    public function testReturnsTrueWhenSessionIsJustInsideTimeout(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 1799;
        $this->assertTrue(verificar_sesion());
    }

    // ---------------------------------------------------------------
    //  Happy path
    // ---------------------------------------------------------------

    public function testReturnsTrueForValidSession(): void
    {
        $_SESSION['user_id'] = 42;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 100;
        $this->assertTrue(verificar_sesion());
    }

    public function testUpdatesLastActivityOnSuccess(): void
    {
        $before = time();
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 60;
        verificar_sesion();
        $this->assertGreaterThanOrEqual($before, $_SESSION['last_activity']);
    }

    public function testReturnsTrueWhenLastActivityNotSet(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $this->assertTrue(verificar_sesion());
    }

    // ---------------------------------------------------------------
    //  Edge cases
    // ---------------------------------------------------------------

    public function testReturnsTrueAtExactTimeoutBoundary(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 1800;
        $this->assertTrue(verificar_sesion());
    }

    public function testDifferentUserAgentsProduceDifferentFingerprints(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('Chrome/120');
        $_SESSION['last_activity'] = time();

        $_SERVER['HTTP_USER_AGENT'] = 'Firefox/120';
        $this->assertFalse(verificar_sesion());

        $_SERVER['HTTP_USER_AGENT'] = 'Chrome/120';
        $this->assertTrue(verificar_sesion());
    }
}
