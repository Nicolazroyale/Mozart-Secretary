-- Update the users table to include new roles
ALTER TABLE `usuarios` 
MODIFY COLUMN `rol` enum('lectura','lectura_escritura_viejos','lectura_escritura_nuevos','lectura_escritura_total','admin') 
COLLATE utf8mb4_unicode_ci 
NOT NULL DEFAULT 'lectura';
