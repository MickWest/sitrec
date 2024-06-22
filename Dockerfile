FROM node:21 as build

WORKDIR /build

COPY data ./data
COPY src ./src
COPY sitrecServer ./sitrecServer
COPY package.json .
COPY package-lock.json .
COPY webpack.*.js .
COPY webpackCopyPatterns.js .
COPY docker/docker-config.js ./config.js
COPY docker/docker-config-install.js ./config-install.js

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
