# Description: Dockerfile for building Sitrec

# This is a multi-stage build
# The first stage is to build the app, using Node.js, version 22
FROM node:22 AS build

# Set the working directory to /build
# copy the needed files and run npm install
# in build/dist
WORKDIR /build

COPY data ./data
COPY src ./src
COPY docs ./docs
COPY sitrecServer ./sitrecServer
COPY package.json .
COPY package-lock.json .
COPY webpack.*.js .
COPY webpackCopyPatterns.js .
COPY config ./config
COPY docker/docker-config-install.js ./config/config-install.js
COPY .git .git

# We use npm ci (Clean Install) to install the dependencies
RUN npm ci

# We build the app using either:
# npm run build (for development)
# or
# npm run deploy (for production)
# Both commands are defined in the package.json file
# and will build the app using Webpack into the dist folder
# (See docker-config-install.js, which sets those paths)

RUN npm run deploy


# The second stage is to build the image
# We're using the official PHP 8.4 image with Apache
# This is the image that will be used to run the app
# We're copying the built app from the first stage to this image
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
