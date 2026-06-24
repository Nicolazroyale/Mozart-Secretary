Este proyecto se ejecuto en un entorno de pruebas basado en linux.
Para ejecutarlo en windows y mac es necesario utilizar docker desktop. 
(En linux se recomienda utilizar docker compose en la terminal para mejores resultados)

Como requisito se requiere buildear el contenedor y tener acceso a internet como tambien almacenamiento suficiente
de acuerdo a la cantidad de datos

El primer inicio tardara mas de lo normal ya que tiene que levantar la base de datos. 
Pero una vez hecho es instantaneo el prendido y apagado

Todo se ejecuta en http://localhost:8080 (Reemplazar localhost con la ip local si se ejecuta en otra computadora)

Y por defecto se levantan estos usuarios:

ID: 1
Usuario: admin_tecnica
Nombre Completo: Administrador Técnica
Rol: admin
Contraseña maestra: 1244
-------------------------
ID: 2
Usuario: secretaria_gral
Nombre Completo: Secretaría General
Rol: admin
Contraseña maestra: 1244
-------------------------
ID: 3
Usuario: preceptor_1
Nombre Completo: Preceptor Turno Mañana
Rol: lectura
Contraseña maestra: 1244
-------------------------
ID: 4
Usuario: consulta_doc
Nombre Completo: Consulta Docente
Rol: lectura
Contraseña maestra: 1244
-------------------------

Nota: La contraseña '1244' funciona para todos los usuarios.

Una vez dentro se puede crear como editar tanto alumnos como profesores y crear cursos para unir x alumnos y x profesores

En caso de cambiar algo del codigo:

db.php 
maneja los datos de usuario y contraseña de la base de datos

auth_config.php login_process.php logout.php
maneja la seguridad y las cookies para mantener las sesiones iniciadas como tambien para evitar redireccionamientos y
salteos de archivo a archivo

seeder.php
Funcion de decoracion para agregar datos de prueba (Alumnos. Profesores y cursos)

api.php
Funcion para manejar los errores que se genera en produccion y/o pruebas y tener un error legible

inicializar_bd
Carpeta donde esta la base de datos con su estructura y init.sql para generar el usuario y permisos para la misma

apache2
Pagina web

docker-compose.yml y Dockerfile
Archivos para que docker levante los servicios necesarios y los ejecute.

Sientanse libre de analizar el codigo y probar cambiar la configuracion a su gusto!
att: Nesquik