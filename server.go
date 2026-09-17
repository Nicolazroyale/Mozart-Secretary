package main

import (
	"database/sql"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"mozart/auth"
	"mozart/db"
)

type Config struct {
	TLSAddr             string
	HTTPAddr            string
	DataDir             string
	DBPath              string
	WebRoot             string
	TemplatesDir        string
	Hostname            string
	MasterPassword      string
	AdminUser           string
	AdminPassword       string
	AutoLogin           string // formato dev: "usuario,rol,nombre" (solo si AUTOLOGIN se específica; no hay sesión real)
	AuthSecret          string
	DBKey               string
	BackupDir           string
	BackupDay           time.Weekday // deprecado: los snapshots son diarios (se conserva por compatibilidad)
	BackupRetentionDays int
	BackupKeepMonths    int
}

func loadConfig() Config {
	port := envOr("PORT", "443")
	dataDir := envOr("DATA_DIR", "./data")
	httpPort := os.Getenv("HTTP_PORT")
	httpAddr := ""
	if httpPort != "" && httpPort != "0" {
		httpAddr = ":" + httpPort
	}
	backupDay := 0 // domingo
	if v := os.Getenv("BACKUP_DAY"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 && n <= 6 {
			backupDay = n
		} else {
			log.Printf("BACKUP_DAY inválido (%q), usando 0 (domingo)", v)
		}
	}
	retention := 30 // diarios
	if v := os.Getenv("BACKUP_RETENTION_DAYS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			retention = n
		} else {
			log.Printf("BACKUP_RETENTION_DAYS inválido (%q), usando 30", v)
		}
	}
	keepMonths := 12 // primer día de cada mes
	if v := os.Getenv("BACKUP_KEEP_MONTHS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			keepMonths = n
		} else {
			log.Printf("BACKUP_KEEP_MONTHS inválido (%q), usando 12", v)
		}
	}
	return Config{
		TLSAddr:             ":" + port,
		HTTPAddr:            httpAddr,
		DataDir:             dataDir,
		DBPath:              envOr("DB_PATH", dataDir+"/mozart.db"),
		WebRoot:             envOr("WEB_ROOT", "./web"),
		TemplatesDir:        envOr("TEMPLATES_DIR", "./web/templates"),
		Hostname:            envOr("HOSTNAME", ""),
		MasterPassword:      os.Getenv("MASTER_PASSWORD"),
		AdminUser:           os.Getenv("ADMIN_USER"),
		AdminPassword:       os.Getenv("ADMIN_PASSWORD"),
		AutoLogin:           os.Getenv("AUTOLOGIN"),
		AuthSecret:          os.Getenv("AUTH_SECRET"),
		DBKey:               os.Getenv("DB_KEY"),
		BackupDir:           envOr("BACKUP_DIR", filepath.Join(dataDir, "backups")),
		BackupDay:           time.Weekday(backupDay),
		BackupRetentionDays: retention,
		BackupKeepMonths:    keepMonths,
	}
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

type Server struct {
	cfg        Config
	secret     []byte
	dbs        *sql.DB
	limiter    *RateLimiter
	tplNuevo   *template.Template
	tplLogin   *template.Template
	tplMejoras *template.Template
	CertFile   string
	KeyFile    string

	lockoutMu sync.Mutex
	lockouts  map[string]*lockout
}

func NewServer(cfg Config) (*Server, error) {
	if err := os.MkdirAll(cfg.DataDir, 0o700); err != nil {
		return nil, err
	}
	secret, err := loadOrCreateSecret(cfg)
	if err != nil {
		return nil, err
	}
	certFile, keyFile, err := ensureCertificate(cfg)
	if err != nil {
		return nil, err
	}
	conn, err := db.Open(cfg.DBPath, cfg.DBKey)
	if err != nil {
		return nil, err
	}
	if err := db.EnsureSchema(conn); err != nil {
		conn.Close()
		return nil, err
	}
	if err := db.Seed(conn, cfg.AdminUser, cfg.AdminPassword, cfg.MasterPassword); err != nil {
		conn.Close()
		return nil, err
	}
	parse := func(name string) *template.Template {
		return template.Must(template.ParseFiles(filepath.Join(cfg.TemplatesDir, name)))
	}
	// Límite de requerimientos por IP por minuto (RATE_LIMIT_PER_MIN, default 60).
	ratePerMin := 60
	if v := os.Getenv("RATE_LIMIT_PER_MIN"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			ratePerMin = n
		} else {
			log.Printf("RATE_LIMIT_PER_MIN inválido (%q), usando 60", v)
		}
	}
	return &Server{
		cfg:        cfg,
		secret:     secret,
		dbs:        conn,
		limiter:    NewRateLimiter(ratePerMin, float64(ratePerMin)/60.0),
		tplNuevo:   parse("index.html"),
		tplLogin:   parse("login.html"),
		tplMejoras: parse("interfaz.html"),
		CertFile:   certFile,
		KeyFile:    keyFile,
		lockouts:   make(map[string]*lockout),
	}, nil
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	applySecurityHeaders(w, r)
	path := r.URL.Path

	switch {
	case path == "/api.php" || path == "/sistema/api.php":
		s.handleApi(w, r)
	case path == "/login_process.php":
		if r.Method != http.MethodPost {
			methodNotAllowed(w)
			return
		}
		s.handleLogin(w, r)
	case path == "/login" || path == "/login/":
		if r.Method == http.MethodPost {
			s.handleLogin(w, r)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			methodNotAllowed(w)
			return
		}
		s.handleLoginPage(w, r)
	case path == "/logout" || path == "/logout.php":
		s.handleLogout(w, r)
	case path == "/index.php" || path == "/sistema/index.php":
		http.Redirect(w, r, "/sistema/", http.StatusMovedPermanently)
	case path == "/Login" || path == "/Login/" || path == "/Login/Login.php":
		http.Redirect(w, r, "/login", http.StatusMovedPermanently)
	case path == "/" || path == "/sistema" || path == "/sistema/":
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			methodNotAllowed(w)
			return
		}
		s.handleDashboard(w, r, s.tplNuevo)
	case path == "/interfaz" || path == "/interfaz/":
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			methodNotAllowed(w)
			return
		}
		s.handleDashboard(w, r, s.tplMejoras)
	case isStatic(path):
		s.serveStatic(w, r, path)
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) currentSession(r *http.Request) *auth.Session {
	if s.cfg.AutoLogin != "" {
		return s.autoSession()
	}
	sess, err := auth.SessionFromRequest(r, s.secret)
	if err != nil {
		return nil
	}
	return sess
}

func (s *Server) autoSession() *auth.Session {
	parts := strings.SplitN(s.cfg.AutoLogin, ",", 3)
	user := parts[0]
	rol := "lectura"
	nombre := user
	if len(parts) > 1 {
		rol = parts[1]
	}
	if len(parts) > 2 {
		nombre = parts[2]
	}
	return auth.NewSession(0, user, nombre, rol, "dev")
}

type viewData struct {
	CSRF         string
	Nombre       string
	Rol          string
	EsAdmin      bool
	Permisos     string
	UltimoBackup string
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request, tpl *template.Template) {
	sess := s.currentSession(r)
	if sess == nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	data := viewData{
		CSRF:         sess.CSRF,
		Nombre:       sess.Name,
		Rol:          sess.Role,
		EsAdmin:      sess.Role == "admin",
		Permisos:     permsJSON(s.userPerms(sess)),
		UltimoBackup: s.lastBackupDate(),
	}
	if err := tpl.Execute(w, data); err != nil {
		log.Printf("render dashboard: %v", err)
	}
	if s.cfg.AutoLogin == "" {
		auth.RefreshSession(w, sess, s.secret)
	}
}

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	if sess := s.currentSession(r); sess != nil {
		http.Redirect(w, r, "/sistema/", http.StatusFound)
		return
	}
	if err := s.tplLogin.Execute(w, nil); err != nil {
		log.Printf("render login: %v", err)
	}
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSessionCookie(w)
	http.Redirect(w, r, "/login", http.StatusFound)
}
