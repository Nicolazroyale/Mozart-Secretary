package main

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.SetFlags(log.LstdFlags)
	cfg := loadConfig()

	srv, err := NewServer(cfg)
	if err != nil {
		log.Fatalf("inicializando servidor: %v", err)
	}

	ln, err := net.Listen("tcp", cfg.TLSAddr)
	if err != nil {
		log.Fatalf("escuchando en %s: %v", cfg.TLSAddr, err)
	}

	httpSrv := &http.Server{
		Handler:      srv,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 2 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	// Listener HTTP opcional (HTTP_PORT), pensado para el túnel de Cloudflare
	// sobre localhost; la app principal sigue siendo HTTPS.
	var httpPlain *http.Server
	if cfg.HTTPAddr != "" {
		httpPlain = &http.Server{
			Handler:      srv,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 2 * time.Minute,
			IdleTimeout:  60 * time.Second,
		}
		lnHTTP, err := net.Listen("tcp", cfg.HTTPAddr)
		if err != nil {
			log.Fatalf("escuchando HTTP en %s: %v", cfg.HTTPAddr, err)
		}
		go func() {
			log.Printf("Gestión Escolar (Go + SQLite) escuchando también en http://%s (para túnel Cloudflare)", cfg.HTTPAddr)
			if err := httpPlain.Serve(lnHTTP); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Fatalf("servidor HTTP: %v", err)
			}
		}()
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	backupCtx, backupCancel := context.WithCancel(context.Background())
	go runBackups(backupCtx, srv.dbs, cfg)

	go func() {
		<-stop
		log.Println("Deteniendo servidor...")
		backupCancel()
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(ctx)
		if httpPlain != nil {
			_ = httpPlain.Shutdown(ctx)
		}
	}()

	log.Printf("Gestión Escolar (Go + SQLite) escuchando en https://%s", cfg.TLSAddr)
	if err := httpSrv.ServeTLS(ln, srv.CertFile, srv.KeyFile); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("servidor TLS: %v", err)
	}
	log.Println("Servidor detenido.")
}