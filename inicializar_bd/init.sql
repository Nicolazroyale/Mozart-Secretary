CREATE USER IF NOT EXISTS 'DBsecretaria'@'%' IDENTIFIED BY 'Dalia1244!';
GRANT ALL PRIVILEGES ON escuela_secundaria_tecnica.* TO 'DBsecretaria'@'%';
FLUSH PRIVILEGES;
