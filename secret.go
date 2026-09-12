package main

import (
	"crypto/rand"
	"errors"
	"os"
	"path/filepath"
)

func loadOrCreateSecret(cfg Config) ([]byte, error) {
	if cfg.AuthSecret != "" {
		if len(cfg.AuthSecret) < 16 {
			return nil, errors.New("AUTH_SECRET demasiado corto (mínimo 16 caracteres)")
		}
		return []byte(cfg.AuthSecret), nil
	}
	path := filepath.Join(cfg.DataDir, "secret.key")
	if b, err := os.ReadFile(path); err == nil && len(b) >= 32 {
		return b, nil
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, b, 0o600); err != nil {
		return nil, err
	}
	return b, nil
}