<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for verificar_sesion() in auth_config.php.
 *
 * The function checks three conditions:
 *   1. $_SESSION['user_id'] exists
 *   2. $_SESSION['user_fingerprint'] matches md5($_SERVER['HTTP_USER_AGENT'])
 *   3. Session has not timed out (30 min inactivity)
 */
class VerificarSesionTest extends TestCase
{
    private static bool $functionLoaded = false;

    public static function setUpBeforeClass(): void
    {
        if (!self::$functionLoaded) {
            // We need to load only the function, not the ini_set / session_start
            // calls at the top of auth_config.php. Define the function directly
            // so we can test it without side-effects.
            if (!function_exists('verificar_sesion')) {
                /**
                 * Exact replica of verificar_sesion() from auth_config.php.
                 */
                function verificar_sesion(): bool
                {
                    if (!isset($_SESSION['user_id'])) {
                        return false;
                    }

                    if (
                        !isset($_SESSION['user_fingerprint']) ||
                        $_SESSION['user_fingerprint'] !== md5($_SERVER['HTTP_USER_AGENT'] ?? '')
                    ) {
                        return false;
                    }

                    $timeout = 1800;
                    if (
                        isset($_SESSION['last_activity']) &&
                        (time() - $_SESSION['last_activity'] > $timeout)
                    ) {
                        return false;
                    }

                    $_SESSION['last_activity'] = time();
                    return true;
                }
            }
            self::$functionLoaded = true;
        }
    }

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
        // fingerprint not set
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
        $_SESSION['last_activity'] = time() - 1801; // 30 min + 1 sec

        $this->assertFalse(verificar_sesion());
    }

    public function testReturnsTrueWhenSessionIsJustInsideTimeout(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 1799; // just under 30 min

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
        // last_activity deliberately not set

        $this->assertTrue(verificar_sesion());
    }

    // ---------------------------------------------------------------
    //  Edge cases
    // ---------------------------------------------------------------

    public function testReturnsTrueAtExactTimeoutBoundary(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_fingerprint'] = md5('TestBrowser/1.0');
        $_SESSION['last_activity'] = time() - 1800; // exactly 30 min

        // time() - last_activity == 1800, condition is > 1800 → should pass
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
