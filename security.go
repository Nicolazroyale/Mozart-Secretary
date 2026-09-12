package main

import (
	"net"
	"net/http"
	"strings"
)

func applySecurityHeaders(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://static.cloudflareinsights.com https://cloudflareinsights.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "SAMEORIGIN")
	h.Set("X-XSS-Protection", "1; mode=block")
	h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	h.Set("X-Permitted-Cross-Domain-Policies", "none")
	h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), autoplay=(), clipboard-write=()")
	h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	// Detrás del túnel de Cloudflare cloudflared llega desde loopback; en ese
	// caso se confía en la IP real del cliente (CF-Connecting-IP o
	// X-Forwarded-For). Si el peer directo es una IP de red, esas cabeceras se
	// ignoran para evitar spoofing del límite por IP.
	if net.ParseIP(host) != nil && (net.ParseIP(host).IsLoopback()) {
		if cf := r.Header.Get("CF-Connecting-IP"); cf != "" {
			return cf
		}
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			first, _, _ := strings.Cut(xff, ",")
			if f := strings.TrimSpace(first); f != "" {
				return f
			}
		}
	}
	return host
}