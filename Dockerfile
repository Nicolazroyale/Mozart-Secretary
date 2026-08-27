FROM php:8.2-apache

# Instala y activa extensiones PHP requeridas
RUN apt-get update && apt-get install -y libpng-dev libzip-dev zip unzip libonig-dev libxml2-dev
RUN docker-php-ext-install pdo_mysql gd mbstring zip xml

# Instala Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copia composer.json e instala dependencias
WORKDIR /var/www/html

# Activar módulo SSL
RUN a2enmod ssl

# Generar certificado autofirmado (válido 365 días, RSA 2048)
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/mozart.key \
    -out /etc/ssl/certs/mozart.crt \
    -subj "/C=AR/ST=BuenosAires/L=SanMiguel/O=EESTN3/CN=localhost"

# Configuración VirtualHost SSL
COPY apache2-ssl.conf /etc/apache2/sites-available/mozart-ssl.conf
RUN a2ensite mozart-ssl.conf

