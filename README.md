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

## Backups

La base de datos (SQLCipher) se respalda automáticamente una vez por día dentro del contenedor, en `data/`. La retención es:

- **Diaria**: se conservan los snapshots de los últimos `BACKUP_RETENTION_DAYS` días (por defecto **30**).
- **Mensual**: además se conserva el primer día de cada mes durante `BACKUP_KEEP_MONTHS` meses (por defecto **12**).

Los archivos se llaman `mozart_YYYY-MM-DD.db`, están **cifrados** con la misma `DB_KEY` del `.env` y se adjuntan al log de auditoría. `BACKUP_DAY` quedó **deprecado** (ya no se usa).

### Panel web de backups (solo administradores)

Desde el botón con ícono de disco en la barra superior:

- **Listar** y **descargar** los snapshots existentes.
- **Crear backup ahora** (genera el snapshot del día actual si no existe).
- **Subir** un backup guardado en otra computadora (arrastrando el archivo). Si el backup fue cifrado con una clave distinta a la `DB_KEY` actual, el sistema pide ingresar la clave usada en ese momento. La clave **nunca se guarda en disco ni en la base**.

### Restaurar un backup (procedimiento manual)

> El alta vía web se valida al subir, pero la restauración deliberada de la BD en producción se hace deliberadamente fuera de la web para evitar reemplazar por accidente la base viva.

1. Parar el servicio: `docker compose down`
2. Elegir un snapshot en `data/`, por ejemplo `data/mozart_2026-09-15.db`
3. Reemplazar la base ACTUAL (`data/mozart.db`) por ese archivo. Si la clave difiere, exportar antes con sqlcipher a la clave actual.
4. Borrar los archivos WAL/SHM remanentes: `rm -f data/mozart.db-wal data/mozart.db-shm`
5. Volver a levantar: `docker compose up -d --build`

### Secretos y copias externas

- `DB_KEY`, `AUTH_SECRET`, `.env` y `secret.key` se guardan **únicamente** en el gestor de contraseñas, nunca junto a los backups ni en el repositorio.
- Sin un backup que incluya la clave NO es posible descifrar los snapshots.
- Todavía no hay destino off-site automático; por ahora la copia externa se hace descargando los snapshots por el panel web. Cuando exista servicio, documentar en esta sección el sync (p. ej. rclone → B2/S3/NAS).

## Estructura del proyecto

```
Mozart/
├── main.go, server.go        # Arranque, rutas, sesiones y seguridad
├── api.go                    # Despacho del API (/api.php y /sistema/api.php)
├── api_read.go               # Lecturas GET (listados, paginado, detalle, búsqueda)
├── api_write.go              # Escrituras (POST/PUT/DELETE) + auditoría
├── api_write_handlers.go     # Handlers específicos (estudiantes, usuarios, dmc)
├── api_export.go             # Exportaciones PDF/Excel con fuentes UTF-8 embebidas
├── backup.go, backup_api.go  # Backups diarios, retención y panel web (subir/listar)
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
