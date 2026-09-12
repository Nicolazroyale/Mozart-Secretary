package main

import (
	"testing"
	"time"
)

func TestRegisterFailureLockout(t *testing.T) {
	s := &Server{lockouts: make(map[string]*lockout)}
	key := "usuario_test"

	for i := 1; i <= 4; i++ {
		if got := s.registerFailure(key); got != i {
			t.Fatalf("intento %d: attempts=%d, esperaba %d", i, got, i)
		}
		if _, blocked := s.blockedRemaining(key); blocked {
			t.Fatalf("intento %d: no debería estar bloqueado aún", i)
		}
	}

	if got := s.registerFailure(key); got != 5 {
		t.Fatalf("intento 5: attempts=%d, esperaba 5", got)
	}
	if rem, blocked := s.blockedRemaining(key); !blocked || rem <= 0 {
		t.Fatalf("tras 5 intentos debería estar bloqueado (rem=%v)", rem)
	}
}

func TestRegisterFailureResetAfterExpiry(t *testing.T) {
	s := &Server{lockouts: make(map[string]*lockout)}
	key := "usuario_exp"

	for i := 0; i < 5; i++ {
		s.registerFailure(key)
	}
	// Simula vencimiento del bloqueo
	l := s.lockouts[key]
	l.until = l.until.Add(-time.Second * 1800)
	_ = l
	if _, blocked := s.blockedRemaining(key); blocked {
		t.Fatal("el bloqueo vencido debe liberarse")
	}
	if got := s.registerFailure(key); got != 1 {
		t.Fatalf("tras expirar el bloqueo los intentos deben resetearse, attempts=%d", got)
	}
}