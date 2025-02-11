FROM node:22 AS build

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

FROM php:8.4-apache

USER www-data

COPY --from=build /build/dist /var/www/html

WORKDIR /var/www/html

# make sitrec-cache and upload dirs and set permissions
# cache is needed for terrain loading and starlink
# upload is needed for video and data track uploads
# but it will NOT be persisted
# So it's highly recommended you use S3 with docker
# or mount a volume to /var/www/html/sitrec-upload

RUN mkdir ./sitrec-cache
RUN chmod 777 ./sitrec-cache
RUN mkdir ./sitrec-upload
RUN chmod 777 ./sitrec-upload

VOLUME /var/www/html/sitrec-videos

EXPOSE 80
