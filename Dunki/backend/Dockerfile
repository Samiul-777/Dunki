FROM php:8.4-fpm

RUN apt-get update && apt-get install -y \
    git curl zip unzip libonig-dev libxml2-dev default-mysql-client \
    && docker-php-ext-install pdo pdo_mysql mbstring xml

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-interaction --optimize-autoloader

RUN chmod -R 775 storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]