# Mozart - Sistema de Gestión Escolar EESTN°3

Sistema de archivos y gestión para la Escuela de Educación Secundaria Técnica N°3.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- Conexión a internet (para buildear la imagen)
- Almacenamiento suficiente según la cantidad de datos

## Inicio rápido

```bash
# 1. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales seguras

# 2. Levantar servicios
docker compose up -d

# 3. Acceder a la aplicación
# http://localhost:8080
```

> **Nota:** El primer inicio tarda más porque debe inicializar la base de datos.

## Usuarios por defecto

| ID | Usuario | Nombre | Rol |
|----|---------|--------|-----|
| 1 | admin_tecnica | Administrador Técnica | admin |
| 2 | secretaria_gral | Secretaría General | admin |
| 3 | preceptor_1 | Preceptor Turno Mañana | lectura |
| 4 | consulta_doc | Consulta Docente | lectura |

## Seguridad

- La contraseña maestra se configura en `MASTER_PASSWORD` del archivo `.env`
- Si `MASTER_PASSWORD` está vacía, solo funciona la contraseña hasheada de cada usuario
- **Nunca** compartas ni subas el archivo `.env` al repositorio
- Los intentos fallidos de login bloquean la cuenta por 15 minutos
- Se implementan tokens CSRF en todas las operaciones de escritura

## Auditoría

El sistema registra automáticamente todas las operaciones de escritura (INSERT, UPDATE, DELETE)
en la tabla `audit_log`. Cada registro incluye:

- Usuario que realizó la operación e IP
- Tabla y registro afectado
- Valores anteriores y nuevos (JSON)
- Campos sensibles (passwords) nunca se registran, se reemplazan por `[REDACTED]`

Solo los usuarios con rol `admin` pueden ver el log desde el menú **Log de Auditoría**.

## Estructura del proyecto

```
Mozart/
├── main.go, server.go        # Arranque, rutas, sesiones y seguridad
├── api.go                    # Despacho del API (/api.php y /sistema/api.php)
├── api_read.go               # Lecturas GET (listados, paginado, detalle, búsqueda)
├── api_write.go              # Escrituras (POST/PUT/DELETE) + auditoría
├── api_write_handlers.go     # Handlers específicos (estudiantes, usuarios, dmc)
├── api_export.go             # Exportaciones PDF/Excel con fuentes UTF-8 embebidas
├── login.go, security.go     # Login (bcrypt, lockout), CSRF y headers
├── auth/                     # Paquete: hash de contraseñas y sesiones
├── db/                       # Esquema SQLite (12 tablas), conexión WAL, seed
├── assets/fonts/             # DejaVu (incrustados en el binario vía go:embed)
├── web/                      # Frontend servido (JS, CSS, imágenes, Login/)
│   └── templates/            # Plantillas HTML (index, sistema_index, login)
├── tests/                    # Test suite del frontend (Jest)
├── docker-compose.yml        # Orquestación (servicio único Go)
├── Dockerfile                # Imagen multi-stage (build + distroless estático)
└── .env.example              # Template de variables de entorno
```

## Desarrollo

```bash
# Compilar y ejecutar en local
go build -o /tmp/mozart .
PORT=8443 DATA_DIR=./data WEB_ROOT=./web go run .   # o ./mozart

# Tests
go test .        # backend (login/lockout)
npm run test:js  # frontend Jest

# Producción vía Docker
docker compose up -d --build
```

## Licencia

Proyecto interno - EESTN°3
