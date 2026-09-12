package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func isStatic(path string) bool {
	switch {
	case strings.HasPrefix(path, "/css/"),
		strings.HasPrefix(path, "/js/"),
		strings.HasPrefix(path, "/imagenes/"):
		return true
	case path == "/Login/Login.css", path == "/Login/Login.js":
		return true
	case path == "/favicon.ico":
		return true
	}
	return false
}

func (s *Server) serveStatic(w http.ResponseWriter, r *http.Request, path string) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		methodNotAllowed(w)
		return
	}
	p := strings.TrimPrefix(path, "/")
	if path == "/favicon.ico" {
		p = "imagenes/logo.png"
	}
	root := filepath.Clean(s.cfg.WebRoot)
	full := filepath.Join(root, filepath.FromSlash(p))
	rel, err := filepath.Rel(root, full)
	if err != nil || strings.HasPrefix(rel, "..") {
		http.NotFound(w, r)
		return
	}
	info, err := os.Stat(full)
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}
	f, err := os.Open(full)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}