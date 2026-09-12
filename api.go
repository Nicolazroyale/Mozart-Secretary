package main

import (
	"crypto/subtle"
	"net/http"
	"strconv"
)

func (s *Server) handleApi(w http.ResponseWriter, r *http.Request) {
	ok, retry := s.limiter.Allow(clientIP(r))
	if !ok {
		w.Header().Set("Retry-After", strconv.Itoa(retry))
		jsonError(w, http.StatusTooManyRequests, "Demasiadas solicitudes. Intente nuevamente en unos segundos.")
		return
	}

	sess := s.currentSession(r)
	if sess == nil {
		jsonError(w, http.StatusUnauthorized, "No autorizado o sesión expirada.")
		return
	}

	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		if sess.Role != "admin" && s.cfg.AutoLogin == "" {
			jsonError(w, http.StatusForbidden, "No tiene permisos para realizar esta acción")
			return
		}
		if s.cfg.AutoLogin == "" {
			if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-CSRF-Token")), []byte(sess.CSRF)) != 1 {
				jsonError(w, http.StatusForbidden, "Token CSRF inválido.")
				return
			}
		}
	}

	switch r.Method {
	case http.MethodGet, http.MethodHead:
		s.handleApiGet(w, r)
	case http.MethodPost, http.MethodPut, http.MethodDelete:
		s.handleApiWrite(w, r)
	default:
		methodNotAllowed(w)
	}
}