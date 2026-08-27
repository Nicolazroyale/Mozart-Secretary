-- El usuario de la base de datos lo crea automaticamente Docker via MYSQL_USER/MYSQL_PASSWORD
-- Este archivo solo restringe privilegios por si se necesita ajuste adicional
-- SELECT, INSERT, UPDATE, DELETE son los minimos necesarios para la aplicacion
REVOKE ALL PRIVILEGES ON escuela_secundaria_tecnica.* FROM 'DBsecretaria'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON escuela_secundaria_tecnica.* TO 'DBsecretaria'@'%';
FLUSH PRIVILEGES;
