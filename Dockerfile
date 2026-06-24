FROM php:8.2-apache

# Instala y activa la extensión de PDO MySQL requerida por tu código PHP
RUN docker-php-ext-install pdo_mysql
