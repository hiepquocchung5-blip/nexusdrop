FROM node:20-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV NODE_ENV=development

COPY package*.json ./
RUN npm config set strict-ssl false \
    && npm install -g npm@9.9.4 --no-audit --no-fund \
    && npm config set strict-ssl false \
    && npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
