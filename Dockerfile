FROM php:8.2-apache

# Instala y activa extensiones PHP requeridas
RUN apt-get update && apt-get install -y libpng-dev libzip-dev zip unzip libonig-dev libxml2-dev
RUN docker-php-ext-install pdo_mysql gd mbstring zip xml

# Instala Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copia composer.json y instala dependencias
WORKDIR /var/www/html

