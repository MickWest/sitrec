FROM node:21 AS build

WORKDIR /build

COPY data ./data
COPY src ./src
COPY docs ./docs
COPY sitrecServer ./sitrecServer
COPY package.json .
COPY package-lock.json .
COPY webpack.*.js .
COPY webpackCopyPatterns.js .
COPY config.js .
COPY docker/docker-config-install.js ./config-install.js
COPY .env .

COPY .git .git

RUN npm ci
RUN npm run build

FROM php:7.2-apache

USER www-data

COPY --from=build /build/dist /var/www/html
COPY docker/cachemaps-config.php ../sitrec-config/cachemaps-config.php

WORKDIR /var/www/html

VOLUME /var/www/html/cache
VOLUME /var/www/html/sitrec-videos

EXPOSE 80
