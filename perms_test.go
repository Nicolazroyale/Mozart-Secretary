package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"html"
	"html/template"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"mozart/auth"
	"mozart/db"
)

func TestTemplatePermisosAttr(t *testing.T) {
	tpl := template.Must(template.ParseFiles("web/templates/index.html"))
	data := viewData{
		CSRF:     "tok",
		Nombre:   "Admin",
		Rol:      "admin",
		EsAdmin:  true,
		Permisos: permsJSON([]string{"ver_estudiantes", "gestion_backups"}),
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		t.Fatalf("render: %v", err)
	}
	quote := `data-permisos="`
	i := strings.Index(buf.String(), quote)
	if i < 0 {
		t.Fatal("template sin data-permisos")
	}
	rest := buf.String()[i+len(quote):]
	end := strings.Index(rest, `"`)
	if end < 0 {
		t.Fatal("atributo data-permisos sin cierre")
	}
	attr := html.UnescapeString(rest[:end])
	var got []string
	if err := json.Unmarshal([]byte(attr), &got); err != nil {
		t.Fatalf("atributo no es JSON válido tras des-escape: %q (%v)", attr, err)
	}
	if len(got) != 2 || got[0] != "ver_estudiantes" || got[1] != "gestion_backups" {
		t.Fatalf("permisos != esperado: %v", got)
	}
}

func TestTemplateUltimoBackupAttr(t *testing.T) {
	tpl := template.Must(template.ParseFiles("web/templates/index.html"))
	for _, tt := range []struct {
		name string
		data viewData
		want string
	}{
		{name: "con backup", data: viewData{UltimoBackup: "2026-09-17"}, want: `data-ultimo-backup="2026-09-17"`},
		{name: "sin backup", data: viewData{}, want: `data-ultimo-backup=""`},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			if err := tpl.Execute(&buf, tt.data); err != nil {
				t.Fatalf("render: %v", err)
			}
			quote := `data-ultimo-backup="`
			i := strings.Index(buf.String(), quote)
			if i < 0 {
				t.Fatalf("template sin data-ultimo-backup")
			}
			rest := buf.String()[i+len(quote):]
			end := strings.Index(rest, `"`)
			if end < 0 {
				t.Fatalf("atributo data-ultimo-backup sin cierre")
			}
			if got := html.UnescapeString(rest[:end]); got != tt.want[strings.Index(tt.want, `"`)+1:len(tt.want)-1] {
				t.Fatalf("ultimo backup != esperado: %q", got)
			}
		})
	}
}

func reqWithQuery(u string) *http.Request {
	return httptest.NewRequest(http.MethodPost, u, nil)
}

func asBytes(v interface{}) []byte {
	switch b := v.(type) {
	case []byte:
		return b
	case string:
		return []byte(b)
	}
	return nil
}

const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func TestHasPermAdminTieneTodo(t *testing.T) {
	for _, p := range allPerms() {
		if !hasPerm("admin", nil, p) {
			t.Fatalf("admin debería tener %q", p)
		}
	}
}

func TestHasPermLecturaLista(t *testing.T) {
	if !hasPerm("lectura", []string{"ver_estudiantes"}, permVerEstudiantes) {
		t.Fatal("lectura con ver_estudiantes debería poder ver estudiantes")
	}
	if hasPerm("lectura", []string{"ver_estudiantes"}, permVerDocentes) {
		t.Fatal("lectura sin ver_docentes no debería ver docentes")
	}
	if hasPerm("lectura", []string{"ver_estudiantes"}, permModEstudiantes) {
		t.Fatal("lectura sin modificar_estudiantes no debería modificarlos")
	}
}

func TestHasPermEscrituraImplicaLectura(t *testing.T) {
	cases := []struct {
		perm string
		view string
	}{
		{permModEstudiantes, permVerEstudiantes},
		{permModDocentes, permVerDocentes},
		{permModCursos, permVerCursos},
		{permModMaterias, permVerMaterias},
		{permGestionUsuarios, permVerUsuarios},
		{permGestionBackups, permVerBackups},
	}
	for _, c := range cases {
		if !hasPerm("lectura", []string{c.perm}, c.view) {
			t.Fatalf("%s debería implicar %s", c.perm, c.view)
		}
		if hasPerm("lectura", []string{c.perm}, c.perm) == false {
			t.Fatalf("%s debería otorgarse a sí mismo", c.perm)
		}
	}
}

func TestHasPermListaVaciaNiega(t *testing.T) {
	if hasPerm("lectura", nil, permVerEstudiantes) {
		t.Fatal("sin permisos no debería ver nada")
	}
}

func TestParsePerms(t *testing.T) {
	got := parsePerms(`["ver_estudiantes","ver_estudiantes","no_existe","gestion_backups"]`)
	if len(got) != 2 || got[0] != "ver_estudiantes" || got[1] != "gestion_backups" {
		t.Fatalf("parsePerms dedupe/filtro: %v", got)
	}
	if parsePerms("no-json{") != nil {
		t.Fatal("JSON inválido debería devolver nil")
	}
	if parsePerms("") != nil {
		t.Fatal("vacío debería devolver nil")
	}
}

func TestMapeosDeTablas(t *testing.T) {
	if viewPermForTable("usuarios") != permVerUsuarios {
		t.Fatal("usuarios → ver_usuarios")
	}
	if viewPermForTable("audit_log") != permVerAuditoria {
		t.Fatal("audit_log → ver_auditoria")
	}
	if viewPermForTable("materias") != permVerMaterias {
		t.Fatal("materias → ver_materias")
	}
	if viewPermForTable("nomina") != permVerNomina {
		t.Fatal("nomina → ver_nomina")
	}
	if viewPermForTable("desconocida") != "" {
		t.Fatal("tabla desconocida sin permiso")
	}
	if writePermForTable("estudiantes") != permModEstudiantes {
		t.Fatal("estudiantes write → modificar_estudiantes")
	}
	if writePermForTable("usuarios") != permGestionUsuarios {
		t.Fatal("usuarios write → gestion_usuarios")
	}
	if writePermForTable("paquetes") != "" {
		t.Fatal("tabla desconocida write sin permiso")
	}
}

func TestWritePermForReq(t *testing.T) {
	ocr := reqWithQuery("/api.php?action=ocr")
	if writePermForReq(ocr) != permModEstudiantes {
		t.Fatal("ocr → modificar_estudiantes")
	}
	if writePermForReq(reqWithQuery("/api.php?action=backup_crear")) != permGestionBackups {
		t.Fatal("backup_crear → gestion_backups")
	}
	if writePermForReq(reqWithQuery("/api.php?action=backup_upload")) != permGestionBackups {
		t.Fatal("backup_upload → gestion_backups")
	}
	if writePermForReq(reqWithQuery("/api.php?table=cursos")) != permModCursos {
		t.Fatal("table=cursos → modificar_cursos")
	}
}

func TestPermValuesFiltraAllowlist(t *testing.T) {
	got := permValues(map[string]interface{}{
		"permisos": []interface{}{"ver_docentes", "modificar_estudiantes", "pwn", float64(3)},
	})
	if len(got) != 2 {
		t.Fatalf("permValues debería filtrar inválidos: %v", got)
	}
}

func TestEnsureSchemaMigraPermisos(t *testing.T) {
	key := testKey
	conn, err := db.Open(filepath.Join(t.TempDir(), "test.db"), key)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()

	if err := db.EnsureSchema(conn); err != nil {
		t.Fatalf("EnsureSchema: %v", err)
	}
	// Idempotencia: una segunda pasada no debe fallar.
	if err := db.EnsureSchema(conn); err != nil {
		t.Fatalf("EnsureSchema (2º): %v", err)
	}
	if !hasColumn(t, conn, "usuarios", "permisos") {
		t.Fatal("usuarios.permisos debería existir tras migrar")
	}
	if _, err := conn.Exec(`INSERT INTO usuarios (username, password, nombre_completo, rol, permisos) VALUES (?,?,?,?,?)`,
		"lect", "hash", "Lector", "lectura", `["ver_materias","modificar_estudiantes"]`); err != nil {
		t.Fatal(err)
	}
}

func TestUserPermsDesdeDB(t *testing.T) {
	conn, err := db.Open(filepath.Join(t.TempDir(), "users.db"), testKey)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if err := db.EnsureSchema(conn); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`INSERT INTO usuarios (id_usuario, username, password, nombre_completo, rol, permisos) VALUES (1,?,?,?,?,?)`,
		"lect", "hash", "Lector", "lectura", `["ver_estudiantes","gestion_backups"]`); err != nil {
		t.Fatal(err)
	}
	s := &Server{dbs: conn}
	sess := auth.NewSession(1, "lect", "Lector", "lectura", "fp")
	perms := s.userPerms(sess)
	if len(perms) != 2 || perms[0] != "ver_estudiantes" || perms[1] != "gestion_backups" {
		t.Fatalf("userPerms lectura: %v", perms)
	}

	admin := auth.NewSession(2, "admin", "Admin", "admin", "fp")
	if got := len(s.userPerms(admin)); got != len(allPerms()) {
		t.Fatalf("userPerms admin debería traer todos (%d, vino %d)", len(allPerms()), got)
	}

	if s.userPerms(nil) != nil {
		t.Fatal("sesión nula → sin permisos")
	}
}

// testPermsServer construye un Server mínimo con una BD real (usuarios con
// permisos) suficiente para probar los gates del API a nivel HTTP.
func testPermsServer(t *testing.T) (*Server, *sql.DB) {
	t.Helper()
	conn, err := db.Open(filepath.Join(t.TempDir(), "api_permisos.db"), testKey)
	if err != nil {
		t.Fatalf("db.Open: %v", err)
	}
	if err := db.EnsureSchema(conn); err != nil {
		t.Fatalf("EnsureSchema: %v", err)
	}
	if _, err := conn.Exec(
		`INSERT INTO usuarios (id_usuario, username, password, nombre_completo, rol, permisos, activo) VALUES (1,?,?,?,?,?,1)`,
		"lect", "hash", "Lector", "lectura", `[]`); err != nil {
		t.Fatalf("seed usuario: %v", err)
	}
	return &Server{
		cfg:     Config{},
		limiter: NewRateLimiter(60, 1),
		secret:  []byte("test-secret-api-perms"),
		dbs:     conn,
	}, conn
}

func setDBPerms(t *testing.T, conn *sql.DB, id int, perms []string) {
	t.Helper()
	b, err := json.Marshal(perms)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`UPDATE usuarios SET permisos = ? WHERE id_usuario = ?`, string(b), id); err != nil {
		t.Fatal(err)
	}
}

func TestAPIReadGate(t *testing.T) {
	s, conn := testPermsServer(t)
	defer conn.Close()
	lect := auth.NewSession(1, "lect", "Lector", "lectura", "")

	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=usuarios", nil, ""); rr.Code != http.StatusForbidden {
		t.Fatalf("Usuarios sin permiso: %d, esperaba 403 (%s)", rr.Code, rr.Body.String())
	}

	setDBPerms(t, conn, 1, []string{"ver_usuarios"})
	rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=usuarios", nil, "")
	if rr.Code != http.StatusOK {
		t.Fatalf("Usuarios con ver_usuarios: %d, esperaba 200", rr.Code)
	}
	var rows []map[string]interface{}
	decodeJSON(t, rr.Body.Bytes(), &rows)
	if len(rows) == 0 {
		t.Fatal("GET usuarios sin filas")
	}
	if _, ok := rows[0]["permisos"]; !ok {
		t.Fatal("GET usuarios no expone el campo permisos")
	}

	setDBPerms(t, conn, 1, []string{"gestion_usuarios"})
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=usuarios", nil, ""); rr.Code != http.StatusOK {
		t.Fatalf("gestion_usuarios debería implicar ver_usuarios: %d", rr.Code)
	}

	setDBPerms(t, conn, 1, []string{"modificar_materias"})
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=audit_log", nil, ""); rr.Code != http.StatusForbidden {
		t.Fatalf("audit_log sin ver_auditoria: %d, esperaba 403", rr.Code)
	}
	setDBPerms(t, conn, 1, []string{"ver_auditoria"})
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=audit_log", nil, ""); rr.Code != http.StatusOK {
		t.Fatalf("audit_log con ver_auditoria: %d, esperaba 200", rr.Code)
	}

	setDBPerms(t, conn, 1, []string{"ver_materias"})
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=materias", nil, ""); rr.Code != http.StatusOK {
		t.Fatalf("materias con ver_materias: %d, esperaba 200", rr.Code)
	}
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=estudiantes", nil, ""); rr.Code != http.StatusForbidden {
		t.Fatalf("alumnos sin ver_estudiantes: %d, esperaba 403", rr.Code)
	}
	if rr := backupReq(t, lect, s, http.MethodGet, "/api.php?table=estudiantes&format=csv", nil, ""); rr.Code != http.StatusForbidden {
		t.Fatalf("export sin permiso de export: %d, esperaba 403", rr.Code)
	}
}

func TestAPIWriteGate(t *testing.T) {
	s, conn := testPermsServer(t)
	defer conn.Close()
	lect := auth.NewSession(1, "lect", "Lector", "lectura", "")

	setDBPerms(t, conn, 1, []string{"ver_usuarios"})
	body := bytes.NewReader([]byte(`{"action":"create","data":{"username":"nuevo","nombre_completo":"Nuevo","rol":"lectura","password":"clave123","permisos":["ver_materias"]}}`))
	if rr := backupReq(t, lect, s, http.MethodPost, "/api.php?table=usuarios", body, "application/json"); rr.Code != http.StatusForbidden {
		t.Fatalf("crear usuario sin gestion_usuarios: %d, esperaba 403 (%s)", rr.Code, rr.Body.String())
	}

	setDBPerms(t, conn, 1, []string{"gestion_usuarios"})
	body = bytes.NewReader([]byte(`{"action":"create","data":{"username":"nuevo","nombre_completo":"Nuevo","rol":"lectura","password":"clave123","permisos":["ver_materias","modificar_estudiantes","no_existe"]}}`))
	if rr := backupReq(t, lect, s, http.MethodPost, "/api.php?table=usuarios", body, "application/json"); rr.Code != http.StatusOK {
		t.Fatalf("crear usuario con gestion_usuarios: %d (%s)", rr.Code, rr.Body.String())
	}
	var saved string
	if err := conn.QueryRow(`SELECT permisos FROM usuarios WHERE username = 'nuevo'`).Scan(&saved); err != nil {
		t.Fatal(err)
	}
	if saved != `["ver_materias","modificar_estudiantes"]` {
		t.Fatalf("permisos guardados: %s", saved)
	}

	body = bytes.NewReader([]byte(`{"action":"create","data":{"username":"hacker","nombre_completo":"Hacker","rol":"admin","password":"x"}}`))
	if rr := backupReq(t, lect, s, http.MethodPost, "/api.php?table=usuarios", body, "application/json"); rr.Code != http.StatusForbidden {
		t.Fatalf("crear un admin sin ser admin: %d, esperaba 403 (%s)", rr.Code, rr.Body.String())
	}

	body = bytes.NewReader([]byte(`{}`))
	if rr := backupReq(t, lect, s, http.MethodPost, "/api.php?action=ocr", body, "application/json"); rr.Code != http.StatusForbidden {
		t.Fatalf("ocr sin modificar_estudiantes: %d, esperaba 403 (%s)", rr.Code, rr.Body.String())
	}
}

func hasColumn(t *testing.T, conn *sql.DB, table, column string) bool {
	t.Helper()
	rows, err := conn.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		t.Fatal(err)
	}
	vals := make([]interface{}, len(cols))
	ptrs := make([]interface{}, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			t.Fatal(err)
		}
		for i, c := range cols {
			if c == "name" {
				// la columna `name` puede llegar como string o []byte
				s := string(asBytes(vals[i]))
				if s == column {
					return true
				}
			}
		}
	}
	return false
}

// TestAPISesionDeslizante verifica que cada llamada autenticada al API renueva
// la vigencia de la sesión (sliding), y que una sesión vencida responde 401 sin
// renovar la cookie.
func TestAPISesionDeslizante(t *testing.T) {
	s, conn := testPermsServer(t)
	defer conn.Close()

	admin := auth.NewSession(1, "admin", "Admin", "admin", "")
	admin.Exp = time.Now().Add(20 * time.Second).Unix() // por vencer

	rr := backupReq(t, admin, s, http.MethodGet, "/api.php?table=docentes", nil, "")
	if rr.Code != http.StatusOK {
		t.Fatalf("GET con sesión vigente: %d, esperaba 200", rr.Code)
	}
	cookies := rr.Result().Cookies()
	var renewed *http.Cookie
	for _, c := range cookies {
		if c.Name == auth.CookieName && c.Value != "" {
			renewed = c
			break
		}
	}
	if renewed == nil {
		t.Fatal("la respuesta no renovó la cookie de sesión")
	}
	sess, err := auth.Decode(renewed.Value, s.secret)
	if err != nil {
		t.Fatalf("decode cookie renovada: %v", err)
	}
	if sess.Exp <= admin.Exp {
		t.Fatalf("la sesión no se deslizó: antes %d, después %d", admin.Exp, sess.Exp)
	}

	vencida := auth.NewSession(1, "admin", "Admin", "admin", "")
	vencida.Exp = time.Now().Add(-time.Minute).Unix()
	rr = backupReq(t, vencida, s, http.MethodGet, "/api.php?table=docentes", nil, "")
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("sesión vencida: %d, esperaba 401", rr.Code)
	}
	for _, c := range rr.Result().Cookies() {
		if c.Name == auth.CookieName && c.Value != "" {
			t.Fatal("una sesión vencida no debe renovar la cookie")
		}
	}
}
