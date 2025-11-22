# build stage
FROM node:20-alpine AS build-stage
ARG APP_ENV=br
WORKDIR /app
COPY package*.json ./
RUN echo "Building for environment: $APP_ENV"
# Use npm ci for reproducible builds, fallback to npm install if package-lock.json issues
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps || npm install
# Copy all project files to this container and build
# To ignore files like node_modules, dist, use .dockerignore file
COPY . .
RUN npm run build:$APP_ENV
# production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Alter Nginx to receive traffic on 8080 instead. Refer below explaination
# App Engine only support port 8080
COPY --from=build-stage /app/deployment/default.conf /etc/nginx/conf.d/default.conf
# Expose container port 8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]