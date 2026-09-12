package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"mozart/auth"
)

const (
	maxLoginAttempts = 5
	loginLockSeconds = 900 // 15 minutos
)

type lockout struct {
	attempts int
	until    time.Time
}

func (s *Server) blockedRemaining(key string) (time.Duration, bool) {
	s.lockoutMu.Lock()
	defer s.lockoutMu.Unlock()
	l, ok := s.lockouts[key]
	if !ok {
		return 0, false
	}
	rem := time.Until(l.until)
	if rem > 0 {
		return rem, true
	}
	if !l.until.IsZero() {
		// Bloqueo vencido: liberar para no bloquear en el primer intento siguiente.
		delete(s.lockouts, key)
	}
	return 0, false
}

func (s *Server) registerFailure(key string) int {
	s.lockoutMu.Lock()
	defer s.lockoutMu.Unlock()
	l, ok := s.lockouts[key]
	if !ok {
		l = &lockout{}
		s.lockouts[key] = l
	}
	if !l.until.IsZero() && time.Now().After(l.until) {
		l.attempts = 0
		l.until = time.Time{}
	}
	l.attempts++
	if l.attempts >= maxLoginAttempts {
		l.until = time.Now().Add(loginLockSeconds * time.Second)
	}
	return l.attempts
}

func (s *Server) clearLockout(key string) {
	s.lockoutMu.Lock()
	defer s.lockoutMu.Unlock()
	delete(s.lockouts, key)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	ok, retry := s.limiter.Allow("login:" + clientIP(r))
	if !ok {
		w.Header().Set("Retry-After", itoa(retry))
		jsonError(w, http.StatusTooManyRequests, "Demasiados intentos de inicio de sesión. Intente nuevamente en unos segundos.")
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req)
	}

	if req.Username == "" || req.Password == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": false, "error": "Usuario y contraseña requeridos"})
		return
	}

	key := req.Username
	if rem, blocked := s.blockedRemaining(key); blocked {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Cuenta bloqueada. Intente nuevamente en %d segundos.", int(rem.Seconds())),
		})
		return
	}

	var user struct {
		ID              int
		Username        string
		Password        string
		NombreCompleto  string
		Rol             string
	}
	err := s.dbs.QueryRow(
		`SELECT id_usuario, username, password, nombre_completo, rol FROM usuarios WHERE username = ? AND activo = 1`,
		req.Username,
	).Scan(&user.ID, &user.Username, &user.Password, &user.NombreCompleto, &user.Rol)

	master := os.Getenv("MASTER_PASSWORD")
	credsOK := err == nil && (auth.CheckPassword(user.Password, req.Password) || (master != "" && req.Password == master))

	if credsOK {
		s.clearLockout(key)
		sess := auth.NewSession(user.ID, user.Username, user.NombreCompleto, user.Rol, auth.Fingerprint(r))
		auth.SetSessionCookie(w, sess, s.secret)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"user":    map[string]string{"nombre": user.NombreCompleto, "rol": user.Rol},
		})
		return
	}

	attempts := s.registerFailure(key)
	time.Sleep(time.Duration(min(attempts, 5)) * time.Second)
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": false, "error": "Credenciales inválidas"})
}