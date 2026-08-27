<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for CSRF token functions imported from the real application.
 */
class CsrfTokenTest extends TestCase
{
    protected function setUp(): void
    {
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
    }

    public function testGetCsrfTokenReturnsEmptyWhenNotSet(): void
    {
        $this->assertSame('', get_csrf_token());
    }

    public function testGetCsrfTokenReturnsSessionToken(): void
    {
        $_SESSION['csrf_token'] = 'test-token-123';
        $this->assertSame('test-token-123', get_csrf_token());
    }

    public function testValidateCsrfTokenReturnsFalseForNull(): void
    {
        $_SESSION['csrf_token'] = 'expected';
        $this->assertFalse(validate_csrf_token(null));
    }

    public function testValidateCsrfTokenReturnsFalseForEmpty(): void
    {
        $_SESSION['csrf_token'] = 'expected';
        $this->assertFalse(validate_csrf_token(''));
    }

    public function testValidateCsrfTokenReturnsFalseForMismatch(): void
    {
        $_SESSION['csrf_token'] = 'expected';
        $this->assertFalse(validate_csrf_token('wrong-token'));
    }

    public function testValidateCsrfTokenReturnsTrueForMatch(): void
    {
        $_SESSION['csrf_token'] = 'expected';
        $this->assertTrue(validate_csrf_token('expected'));
    }

    public function testValidateCsrfTokenReturnsFalseWhenSessionTokenMissing(): void
    {
        // No csrf_token in session
        $this->assertFalse(validate_csrf_token('any-token'));
    }
}
