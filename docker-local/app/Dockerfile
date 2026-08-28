FROM php:8.3-apache

# System libraries for PHP extensions + build/runtime tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
      git unzip default-mysql-client ca-certificates curl gnupg \
      libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
      libonig-dev libxml2-dev \
 && rm -rf /var/lib/apt/lists/*

# PHP extensions required by composer.json
RUN docker-php-ext-configure gd --with-jpeg --with-freetype \
 && docker-php-ext-install -j"$(nproc)" intl gd zip pdo_mysql pcntl mbstring \
 && pecl install redis \
 && docker-php-ext-enable redis

# Node.js 22 (frontend build) + Yarn
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g yarn \
 && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# TaskManager execs a hardcoded /usr/bin/php for analysis executors; the official
# image ships php at /usr/local/bin/php, so provide the path it expects.
RUN ln -sf /usr/local/bin/php /usr/bin/php

# Apache: rewrite (.htaccess), headers, expires, and proxy (SSE/websocket → node)
RUN a2enmod rewrite headers expires proxy proxy_http proxy_wstunnel
COPY apache-matecat.conf /etc/apache2/sites-available/000-default.conf
COPY php-matecat.ini /usr/local/etc/php/conf.d/zz-matecat.ini

COPY entrypoint-app.sh /usr/local/bin/entrypoint-app.sh
COPY entrypoint-worker.sh /usr/local/bin/entrypoint-worker.sh
RUN chmod +x /usr/local/bin/entrypoint-app.sh /usr/local/bin/entrypoint-worker.sh

ENV MATECAT_HOME=/var/www/html
WORKDIR /var/www/html

ENTRYPOINT ["/usr/local/bin/entrypoint-app.sh"]
