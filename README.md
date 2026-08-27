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

## Estructura del proyecto

```
Mozart/
├── apache2/                 # Código fuente PHP/JS/CSS
│   ├── api.php              # API endpoint (forwarding a sistema/)
│   ├── auth_config.php      # Seguridad de sesiones y headers
│   ├── db.php               # Conexión a base de datos
│   ├── login_process.php    # Autenticación de login
│   ├── logout.php           # Cierre de sesión
│   ├── seeder.php           # Carga de datos de prueba (CLI)
│   ├── shared/              # Funciones compartidas (api_helpers.php, db.php)
│   ├── sistema/             # API canónica y sistema principal
│   ├── js/                  # JavaScript (app.js, ui.js)
│   ├── css/                 # Estilos (styles.css)
│   └── Login/               # Página de login
├── inicializar_bd/          # Scripts SQL de inicialización
│   ├── escuela_secundaria_tecnica.sql  # Schema completo
│   ├── init.sql             # Permisos de usuario DB
│   └── migration_improvements.sql      # Migraciones de mejoras
├── tests/                   # Tests PHPUnit y Jest
├── docker-compose.yml       # Orquestación Docker
├── Dockerfile               # Imagen PHP/Apache
└── .env.example             # Template de variables de entorno
```

## Desarrollo

```bash
# Ejecutar tests PHP
docker compose exec web vendor/bin/phpunit --testdox

# Ejecutar tests JavaScript
npm test

# Cargar datos de prueba
docker compose exec web php /var/www/html/seeder.php
```

## Licencia

Proyecto interno - EESTN°3
