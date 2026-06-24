-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: escuela_secundaria_tecnica
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alumno_responsable`
--

DROP TABLE IF EXISTS `alumno_responsable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumno_responsable` (
  `id_alumno` int unsigned NOT NULL,
  `id_responsable` int unsigned NOT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_alumno`,`id_responsable`),
  KEY `fk_ar_responsable` (`id_responsable`),
  CONSTRAINT `fk_ar_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_responsable` FOREIGN KEY (`id_responsable`) REFERENCES `responsables` (`id_responsable`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relación alumno ↔ responsable';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumno_responsable`
--

LOCK TABLES `alumno_responsable` WRITE;
/*!40000 ALTER TABLE `alumno_responsable` DISABLE KEYS */;
INSERT INTO `alumno_responsable` VALUES (1,1,1),(2,2,1),(3,3,1),(4,4,1),(5,5,1),(6,6,1),(7,7,1),(8,8,1),(9,9,1),(10,10,1);
/*!40000 ALTER TABLE `alumno_responsable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alumnos`
--

DROP TABLE IF EXISTS `alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumnos` (
  `id_alumno` int unsigned NOT NULL AUTO_INCREMENT,
  `apellido` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_dni` enum('DNI Argentino','DNI en trámite','CPI','Documento Extranjero') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DNI Argentino',
  `dni` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cuil` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date NOT NULL,
  `lugar_nacimiento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nacionalidad` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Argentina',
  `genero` enum('Mujer','Mujer trans/travesti','Varón','Varón trans/masculinidad trans','No binario','Otra','No desea responder') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'No desea responder',
  `genero_especificar` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Si genero es "Otra"',
  `calle` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `piso` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `depto` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entre_calles` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localidad` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Buenos Aires',
  `distrito` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provincia` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Buenos Aires',
  `telefono_fijo` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_celular` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_curso` int unsigned NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_ingreso` date NOT NULL,
  PRIMARY KEY (`id_alumno`),
  UNIQUE KEY `uq_alumno_dni` (`tipo_dni`,`dni`),
  KEY `fk_alumno_curso` (`id_curso`),
  CONSTRAINT `fk_alumno_curso` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alumnos matriculados';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumnos`
--

LOCK TABLES `alumnos` WRITE;
/*!40000 ALTER TABLE `alumnos` DISABLE KEYS */;
INSERT INTO `alumnos` VALUES (1,'Alumno','Estudiante 1','DNI Argentino','45000001',NULL,'2012-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','101',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,1,1,'2025-03-01'),(2,'Alumno','Estudiante 2','DNI Argentino','45000002',NULL,'2012-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','102',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,1,1,'2025-03-01'),(3,'Alumno','Estudiante 3','DNI Argentino','45000003',NULL,'2012-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','103',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,1,1,'2025-03-01'),(4,'Alumno','Estudiante 4','DNI Argentino','45000004',NULL,'2012-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','104',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,1,1,'2025-03-01'),(5,'Alumno','Estudiante 5','DNI Argentino','45000005',NULL,'2012-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','105',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,1,1,'2025-03-01'),(6,'Alumno','Estudiante 6','DNI Argentino','45000006',NULL,'2008-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','106',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,2,1,'2025-03-01'),(7,'Alumno','Estudiante 7','DNI Argentino','45000007',NULL,'2008-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','107',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,2,1,'2025-03-01'),(8,'Alumno','Estudiante 8','DNI Argentino','45000008',NULL,'2008-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','108',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,2,1,'2025-03-01'),(9,'Alumno','Estudiante 9','DNI Argentino','45000009',NULL,'2008-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','109',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,2,1,'2025-03-01'),(10,'Alumno','Estudiante 10','DNI Argentino','45000010',NULL,'2008-01-01',NULL,'Argentina','No desea responder',NULL,'Calle Falsa','110',NULL,NULL,NULL,'Lomas de Zamora',NULL,'Buenos Aires',NULL,NULL,2,1,'2025-03-01');
/*!40000 ALTER TABLE `alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cursos`
--

DROP TABLE IF EXISTS `cursos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cursos` (
  `id_curso` int unsigned NOT NULL AUTO_INCREMENT,
  `anio` tinyint unsigned NOT NULL COMMENT '1 a 7',
  `division` tinyint unsigned NOT NULL COMMENT '1, 2, 3...',
  `turno` enum('Mañana','Tarde','Noche') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Mañana',
  `ciclo` enum('Básico','Superior') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Básico',
  `orientacion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jornada` enum('Simple','Completa','Extendida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Simple',
  PRIMARY KEY (`id_curso`),
  UNIQUE KEY `uq_curso` (`anio`,`division`,`turno`,`ciclo`),
  CONSTRAINT `chk_anio` CHECK ((`anio` between 1 and 7))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cursos/secciones de la escuela';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cursos`
--

LOCK TABLES `cursos` WRITE;
/*!40000 ALTER TABLE `cursos` DISABLE KEYS */;
INSERT INTO `cursos` VALUES (1,1,1,'Mañana','Básico',NULL,'Simple'),(2,5,1,'Tarde','Superior',NULL,'Completa');
/*!40000 ALTER TABLE `cursos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `docente_materia_curso`
--

DROP TABLE IF EXISTS `docente_materia_curso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `docente_materia_curso` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_docente` int unsigned NOT NULL,
  `id_materia` int unsigned NOT NULL,
  `id_curso` int unsigned NOT NULL,
  `cargo` enum('Titular','Provisional','Suplente','Interino','Ad-Honorem') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Titular',
  `horas_catedra` tinyint unsigned DEFAULT NULL,
  `dia_semana` enum('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `ciclo_lectivo` year NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dmc` (`id_docente`,`id_materia`,`id_curso`,`ciclo_lectivo`),
  KEY `fk_dmc_materia` (`id_materia`),
  KEY `idx_horario_curso` (`id_curso`,`dia_semana`,`hora_inicio`),
  CONSTRAINT `fk_dmc_curso` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`) ON DELETE CASCADE,
  CONSTRAINT `fk_dmc_docente` FOREIGN KEY (`id_docente`) REFERENCES `docentes` (`id_docente`) ON DELETE CASCADE,
  CONSTRAINT `fk_dmc_materia` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `docente_materia_curso`
--

LOCK TABLES `docente_materia_curso` WRITE;
/*!40000 ALTER TABLE `docente_materia_curso` DISABLE KEYS */;
/*!40000 ALTER TABLE `docente_materia_curso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `docentes`
--

DROP TABLE IF EXISTS `docentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `docentes` (
  `id_docente` int unsigned NOT NULL AUTO_INCREMENT,
  `apellido` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inscripcion` date NOT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `situacion_revista` enum('Titular','Provisional','Suplente','Interino','Ad-Honorem','Jubilado','Licencia') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Provisional',
  PRIMARY KEY (`id_docente`),
  UNIQUE KEY `uq_docente_dni` (`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `docentes`
--

LOCK TABLES `docentes` WRITE;
/*!40000 ALTER TABLE `docentes` DISABLE KEYS */;
INSERT INTO `docentes` VALUES (1,'García','Juan Carlos','20111222','2020-03-01',NULL,NULL,1,'Titular'),(2,'Rodríguez','María Elena','25333444','2021-05-15',NULL,NULL,1,'Provisional'),(3,'Sánchez','Ricardo','30555666','2023-02-10',NULL,NULL,1,'Suplente');
/*!40000 ALTER TABLE `docentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materias`
--

DROP TABLE IF EXISTS `materias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materias` (
  `id_materia` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_materia`),
  UNIQUE KEY `uq_materia_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Materias/asignaturas';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materias`
--

LOCK TABLES `materias` WRITE;
/*!40000 ALTER TABLE `materias` DISABLE KEYS */;
INSERT INTO `materias` VALUES (1,'matematicas');
/*!40000 ALTER TABLE `materias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materias_adeudadas`
--

DROP TABLE IF EXISTS `materias_adeudadas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materias_adeudadas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_alumno` int unsigned NOT NULL,
  `id_materia` int unsigned NOT NULL,
  `ciclo_lectivo` year NOT NULL,
  `aprobada` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_mad_alumno` (`id_alumno`),
  KEY `fk_mad_materia` (`id_materia`),
  CONSTRAINT `fk_mad_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE,
  CONSTRAINT `fk_mad_materia` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materias_adeudadas`
--

LOCK TABLES `materias_adeudadas` WRITE;
/*!40000 ALTER TABLE `materias_adeudadas` DISABLE KEYS */;
/*!40000 ALTER TABLE `materias_adeudadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `responsables`
--

DROP TABLE IF EXISTS `responsables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `responsables` (
  `id_responsable` int unsigned NOT NULL AUTO_INCREMENT,
  `apellido` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vinculo` enum('Madre','Padre','Tutor/a','Otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tutor/a',
  `nacionalidad` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Argentina',
  `tipo_dni` enum('DNI Argentino','DNI en trámite','CPI','Documento Extranjero') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DNI Argentino',
  `dni` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profesion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nivel_educativo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condicion_actividad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `convive_estudiante` tinyint(1) NOT NULL DEFAULT '0',
  `calle` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `piso` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `depto` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localidad` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provincia` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_fijo` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_celular` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_responsable`),
  UNIQUE KEY `uq_responsable_dni` (`tipo_dni`,`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Padres, madres o tutores';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `responsables`
--

LOCK TABLES `responsables` WRITE;
/*!40000 ALTER TABLE `responsables` DISABLE KEYS */;
INSERT INTO `responsables` VALUES (1,'Responsable','Tutor 1','Padre','Argentina','DNI Argentino','20000001',NULL,NULL,NULL,1,'Calle Falsa','101',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(2,'Responsable','Tutor 2','Padre','Argentina','DNI Argentino','20000002',NULL,NULL,NULL,1,'Calle Falsa','102',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(3,'Responsable','Tutor 3','Padre','Argentina','DNI Argentino','20000003',NULL,NULL,NULL,1,'Calle Falsa','103',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(4,'Responsable','Tutor 4','Padre','Argentina','DNI Argentino','20000004',NULL,NULL,NULL,1,'Calle Falsa','104',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(5,'Responsable','Tutor 5','Padre','Argentina','DNI Argentino','20000005',NULL,NULL,NULL,1,'Calle Falsa','105',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(6,'Responsable','Tutor 6','Padre','Argentina','DNI Argentino','20000006',NULL,NULL,NULL,1,'Calle Falsa','106',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(7,'Responsable','Tutor 7','Padre','Argentina','DNI Argentino','20000007',NULL,NULL,NULL,1,'Calle Falsa','107',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(8,'Responsable','Tutor 8','Padre','Argentina','DNI Argentino','20000008',NULL,NULL,NULL,1,'Calle Falsa','108',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(9,'Responsable','Tutor 9','Padre','Argentina','DNI Argentino','20000009',NULL,NULL,NULL,1,'Calle Falsa','109',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL),(10,'Responsable','Tutor 10','Padre','Argentina','DNI Argentino','20000010',NULL,NULL,NULL,1,'Calle Falsa','110',NULL,NULL,'Lomas de Zamora','Buenos Aires',NULL,NULL,NULL);
/*!40000 ALTER TABLE `responsables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restricciones_judiciales`
--

DROP TABLE IF EXISTS `restricciones_judiciales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restricciones_judiciales` (
  `id_alumno` int unsigned NOT NULL,
  `apellido_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_doc` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nro_doc` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_alumno`),
  CONSTRAINT `fk_restriccion_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restricciones judiciales vigentes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restricciones_judiciales`
--

LOCK TABLES `restricciones_judiciales` WRITE;
/*!40000 ALTER TABLE `restricciones_judiciales` DISABLE KEYS */;
/*!40000 ALTER TABLE `restricciones_judiciales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salud_alumno`
--

DROP TABLE IF EXISTS `salud_alumno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salud_alumno` (
  `id_alumno` int unsigned NOT NULL,
  `asma` tinyint(1) DEFAULT '0',
  `celiaquia` tinyint(1) DEFAULT '0',
  `diabetes` tinyint(1) DEFAULT '0',
  `obesidad` tinyint(1) DEFAULT '0',
  `cardiopatia` tinyint(1) DEFAULT '0',
  `otros_checklist` text COLLATE utf8mb4_unicode_ci,
  `alergias` text COLLATE utf8mb4_unicode_ci,
  `internaciones` text COLLATE utf8mb4_unicode_ci,
  `antecedentes_salud` text COLLATE utf8mb4_unicode_ci COMMENT 'Campo textarea general',
  `obra_social_nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `obra_social_nro` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_alumno`),
  CONSTRAINT `fk_salud_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Información de salud del alumno';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salud_alumno`
--

LOCK TABLES `salud_alumno` WRITE;
/*!40000 ALTER TABLE `salud_alumno` DISABLE KEYS */;
INSERT INTO `salud_alumno` VALUES (1,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(2,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(3,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(4,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(5,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(6,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(7,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(8,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(9,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL),(10,0,0,0,0,0,NULL,NULL,NULL,'Ninguno',NULL,NULL);
/*!40000 ALTER TABLE `salud_alumno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_completo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('admin','lectura') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lectura',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios del sistema con sus permisos';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin_tecnica','$2y$10$MRbARUQcdMP7rTXnqhFzj.tt23WXkalQYqFSoMJUwQB1owTE4vD.G','Administrador Técnica','admin',1),(2,'secretaria_gral','$2y$10$MRbARUQcdMP7rTXnqhFzj.tt23WXkalQYqFSoMJUwQB1owTE4vD.G','Secretaría General','admin',1),(3,'preceptor_1','$2y$10$MRbARUQcdMP7rTXnqhFzj.tt23WXkalQYqFSoMJUwQB1owTE4vD.G','Preceptor Turno Mañana','lectura',1),(4,'consulta_doc','$2y$10$MRbARUQcdMP7rTXnqhFzj.tt23WXkalQYqFSoMJUwQB1owTE4vD.G','Consulta Docente','lectura',1);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_ficha_alumno`
--

DROP TABLE IF EXISTS `v_ficha_alumno`;
/*!50001 DROP VIEW IF EXISTS `v_ficha_alumno`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ficha_alumno` AS SELECT 
 1 AS `id_alumno`,
 1 AS `alumno`,
 1 AS `dni`,
 1 AS `fecha_nacimiento`,
 1 AS `curso`,
 1 AS `responsable`,
 1 AS `vinculo`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_materias_adeudadas`
--

DROP TABLE IF EXISTS `v_materias_adeudadas`;
