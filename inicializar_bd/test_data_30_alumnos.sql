-- Datos de prueba: 30 alumnos genéricos para testing de paginación
SET FOREIGN_KEY_CHECKS = 0;

-- 30 alumnos nuevos (15 en curso 1, 15 en curso 2)
INSERT INTO alumnos (apellido, nombre, tipo_dni, dni, fecha_nacimiento,
    lugar_nacimiento, nacionalidad, genero, calle, numero, localidad,
    provincia, telefono_celular, id_curso, activo, fecha_ingreso)
VALUES
-- Curso 1 (1° año, nacidos 2012)
('Alumno', 'Test 11', 'DNI Argentino', '45000011', '2012-01-15', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '11', 'Buenos Aires', 'Buenos Aires', '1111111111', 1, 1, '2025-03-01'),
('Alumno', 'Test 12', 'DNI Argentino', '45000012', '2012-02-20', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '12', 'Buenos Aires', 'Buenos Aires', '1111111112', 1, 1, '2025-03-01'),
('Alumno', 'Test 13', 'DNI Argentino', '45000013', '2012-03-10', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '13', 'Buenos Aires', 'Buenos Aires', '1111111113', 1, 1, '2025-03-01'),
('Alumno', 'Test 14', 'DNI Argentino', '45000014', '2012-04-05', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '14', 'Buenos Aires', 'Buenos Aires', '1111111114', 1, 1, '2025-03-01'),
('Alumno', 'Test 15', 'DNI Argentino', '45000015', '2012-05-18', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '15', 'Buenos Aires', 'Buenos Aires', '1111111115', 1, 1, '2025-03-01'),
('Alumno', 'Test 16', 'DNI Argentino', '45000016', '2012-06-22', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '16', 'Buenos Aires', 'Buenos Aires', '1111111116', 1, 1, '2025-03-01'),
('Alumno', 'Test 17', 'DNI Argentino', '45000017', '2012-07-30', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '17', 'Buenos Aires', 'Buenos Aires', '1111111117', 1, 1, '2025-03-01'),
('Alumno', 'Test 18', 'DNI Argentino', '45000018', '2012-08-14', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '18', 'Buenos Aires', 'Buenos Aires', '1111111118', 1, 1, '2025-03-01'),
('Alumno', 'Test 19', 'DNI Argentino', '45000019', '2012-09-25', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '19', 'Buenos Aires', 'Buenos Aires', '1111111119', 1, 1, '2025-03-01'),
('Alumno', 'Test 20', 'DNI Argentino', '45000020', '2012-10-08', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '20', 'Buenos Aires', 'Buenos Aires', '1111111120', 1, 1, '2025-03-01'),
('Alumno', 'Test 21', 'DNI Argentino', '45000021', '2012-11-12', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '21', 'Buenos Aires', 'Buenos Aires', '1111111121', 1, 1, '2025-03-01'),
('Alumno', 'Test 22', 'DNI Argentino', '45000022', '2012-12-03', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '22', 'Buenos Aires', 'Buenos Aires', '1111111122', 1, 1, '2025-03-01'),
('Alumno', 'Test 23', 'DNI Argentino', '45000023', '2012-01-28', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '23', 'Buenos Aires', 'Buenos Aires', '1111111123', 1, 1, '2025-03-01'),
('Alumno', 'Test 24', 'DNI Argentino', '45000024', '2012-02-14', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '24', 'Buenos Aires', 'Buenos Aires', '1111111124', 1, 1, '2025-03-01'),
('Alumno', 'Test 25', 'DNI Argentino', '45000025', '2012-03-22', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '25', 'Buenos Aires', 'Buenos Aires', '1111111125', 1, 1, '2025-03-01'),
-- Curso 2 (5° año, nacidos 2008)
('Alumno', 'Test 26', 'DNI Argentino', '45000026', '2008-01-10', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '26', 'Buenos Aires', 'Buenos Aires', '1111111126', 2, 1, '2025-03-01'),
('Alumno', 'Test 27', 'DNI Argentino', '45000027', '2008-02-18', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '27', 'Buenos Aires', 'Buenos Aires', '1111111127', 2, 1, '2025-03-01'),
('Alumno', 'Test 28', 'DNI Argentino', '45000028', '2008-03-25', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '28', 'Buenos Aires', 'Buenos Aires', '1111111128', 2, 1, '2025-03-01'),
('Alumno', 'Test 29', 'DNI Argentino', '45000029', '2008-04-12', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '29', 'Buenos Aires', 'Buenos Aires', '1111111129', 2, 1, '2025-03-01'),
('Alumno', 'Test 30', 'DNI Argentino', '45000030', '2008-05-07', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '30', 'Buenos Aires', 'Buenos Aires', '1111111130', 2, 1, '2025-03-01'),
('Alumno', 'Test 31', 'DNI Argentino', '45000031', '2008-06-19', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '31', 'Buenos Aires', 'Buenos Aires', '1111111131', 2, 1, '2025-03-01'),
('Alumno', 'Test 32', 'DNI Argentino', '45000032', '2008-07-28', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '32', 'Buenos Aires', 'Buenos Aires', '1111111132', 2, 1, '2025-03-01'),
('Alumno', 'Test 33', 'DNI Argentino', '45000033', '2008-08-15', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '33', 'Buenos Aires', 'Buenos Aires', '1111111133', 2, 1, '2025-03-01'),
('Alumno', 'Test 34', 'DNI Argentino', '45000034', '2008-09-22', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '34', 'Buenos Aires', 'Buenos Aires', '1111111134', 2, 1, '2025-03-01'),
('Alumno', 'Test 35', 'DNI Argentino', '45000035', '2008-10-09', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '35', 'Buenos Aires', 'Buenos Aires', '1111111135', 2, 1, '2025-03-01'),
('Alumno', 'Test 36', 'DNI Argentino', '45000036', '2008-11-14', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '36', 'Buenos Aires', 'Buenos Aires', '1111111136', 2, 1, '2025-03-01'),
('Alumno', 'Test 37', 'DNI Argentino', '45000037', '2008-12-05', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '37', 'Buenos Aires', 'Buenos Aires', '1111111137', 2, 1, '2025-03-01'),
('Alumno', 'Test 38', 'DNI Argentino', '45000038', '2008-01-20', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '38', 'Buenos Aires', 'Buenos Aires', '1111111138', 2, 1, '2025-03-01'),
('Alumno', 'Test 39', 'DNI Argentino', '45000039', '2008-02-28', 'Buenos Aires', 'Argentina', 'Mujer', 'Calle Test', '39', 'Buenos Aires', 'Buenos Aires', '1111111139', 2, 1, '2025-03-01'),
('Alumno', 'Test 40', 'DNI Argentino', '45000040', '2008-03-15', 'Buenos Aires', 'Argentina', 'Varón', 'Calle Test', '40', 'Buenos Aires', 'Buenos Aires', '1111111140', 2, 1, '2025-03-01');

-- 30 responsables nuevos
INSERT INTO responsables (apellido, nombre, vinculo, dni,
    convive_estudiante, calle, numero, localidad, provincia,
    telefono_celular)
VALUES
('Responsable', 'Test 11', 'Padre', '20000011', 1, 'Calle Test', '11', 'Buenos Aires', 'Buenos Aires', '2222222211'),
('Responsable', 'Test 12', 'Madre', '20000012', 1, 'Calle Test', '12', 'Buenos Aires', 'Buenos Aires', '2222222212'),
('Responsable', 'Test 13', 'Padre', '20000013', 1, 'Calle Test', '13', 'Buenos Aires', 'Buenos Aires', '2222222213'),
('Responsable', 'Test 14', 'Madre', '20000014', 1, 'Calle Test', '14', 'Buenos Aires', 'Buenos Aires', '2222222214'),
('Responsable', 'Test 15', 'Padre', '20000015', 1, 'Calle Test', '15', 'Buenos Aires', 'Buenos Aires', '2222222215'),
('Responsable', 'Test 16', 'Madre', '20000016', 1, 'Calle Test', '16', 'Buenos Aires', 'Buenos Aires', '2222222216'),
('Responsable', 'Test 17', 'Padre', '20000017', 1, 'Calle Test', '17', 'Buenos Aires', 'Buenos Aires', '2222222217'),
('Responsable', 'Test 18', 'Madre', '20000018', 1, 'Calle Test', '18', 'Buenos Aires', 'Buenos Aires', '2222222218'),
('Responsable', 'Test 19', 'Padre', '20000019', 1, 'Calle Test', '19', 'Buenos Aires', 'Buenos Aires', '2222222219'),
('Responsable', 'Test 20', 'Madre', '20000020', 1, 'Calle Test', '20', 'Buenos Aires', 'Buenos Aires', '2222222220'),
('Responsable', 'Test 21', 'Padre', '20000021', 1, 'Calle Test', '21', 'Buenos Aires', 'Buenos Aires', '2222222221'),
('Responsable', 'Test 22', 'Madre', '20000022', 1, 'Calle Test', '22', 'Buenos Aires', 'Buenos Aires', '2222222222'),
('Responsable', 'Test 23', 'Padre', '20000023', 1, 'Calle Test', '23', 'Buenos Aires', 'Buenos Aires', '2222222223'),
('Responsable', 'Test 24', 'Madre', '20000024', 1, 'Calle Test', '24', 'Buenos Aires', 'Buenos Aires', '2222222224'),
('Responsable', 'Test 25', 'Padre', '20000025', 1, 'Calle Test', '25', 'Buenos Aires', 'Buenos Aires', '2222222225'),
('Responsable', 'Test 26', 'Madre', '20000026', 1, 'Calle Test', '26', 'Buenos Aires', 'Buenos Aires', '2222222226'),
('Responsable', 'Test 27', 'Padre', '20000027', 1, 'Calle Test', '27', 'Buenos Aires', 'Buenos Aires', '2222222227'),
('Responsable', 'Test 28', 'Madre', '20000028', 1, 'Calle Test', '28', 'Buenos Aires', 'Buenos Aires', '2222222228'),
('Responsable', 'Test 29', 'Padre', '20000029', 1, 'Calle Test', '29', 'Buenos Aires', 'Buenos Aires', '2222222229'),
('Responsable', 'Test 30', 'Madre', '20000030', 1, 'Calle Test', '30', 'Buenos Aires', 'Buenos Aires', '2222222230'),
('Responsable', 'Test 31', 'Padre', '20000031', 1, 'Calle Test', '31', 'Buenos Aires', 'Buenos Aires', '2222222231'),
('Responsable', 'Test 32', 'Madre', '20000032', 1, 'Calle Test', '32', 'Buenos Aires', 'Buenos Aires', '2222222232'),
('Responsable', 'Test 33', 'Padre', '20000033', 1, 'Calle Test', '33', 'Buenos Aires', 'Buenos Aires', '2222222233'),
('Responsable', 'Test 34', 'Madre', '20000034', 1, 'Calle Test', '34', 'Buenos Aires', 'Buenos Aires', '2222222234'),
('Responsable', 'Test 35', 'Padre', '20000035', 1, 'Calle Test', '35', 'Buenos Aires', 'Buenos Aires', '2222222235'),
('Responsable', 'Test 36', 'Madre', '20000036', 1, 'Calle Test', '36', 'Buenos Aires', 'Buenos Aires', '2222222236'),
('Responsable', 'Test 37', 'Padre', '20000037', 1, 'Calle Test', '37', 'Buenos Aires', 'Buenos Aires', '2222222237'),
('Responsable', 'Test 38', 'Madre', '20000038', 1, 'Calle Test', '38', 'Buenos Aires', 'Buenos Aires', '2222222238'),
('Responsable', 'Test 39', 'Padre', '20000039', 1, 'Calle Test', '39', 'Buenos Aires', 'Buenos Aires', '2222222239'),
('Responsable', 'Test 40', 'Madre', '20000040', 1, 'Calle Test', '40', 'Buenos Aires', 'Buenos Aires', '2222222240');

-- 30 alumno_responsable (1:1, es_principal)
INSERT INTO alumno_responsable (id_alumno, id_responsable, es_principal)
VALUES
(11, 11, 1), (12, 12, 1), (13, 13, 1), (14, 14, 1), (15, 15, 1),
(16, 16, 1), (17, 17, 1), (18, 18, 1), (19, 19, 1), (20, 20, 1),
(21, 21, 1), (22, 22, 1), (23, 23, 1), (24, 24, 1), (25, 25, 1),
(26, 26, 1), (27, 27, 1), (28, 28, 1), (29, 29, 1), (30, 30, 1),
(31, 31, 1), (32, 32, 1), (33, 33, 1), (34, 34, 1), (35, 35, 1),
(36, 36, 1), (37, 37, 1), (38, 38, 1), (39, 39, 1), (40, 40, 1);

SET FOREIGN_KEY_CHECKS = 1;
