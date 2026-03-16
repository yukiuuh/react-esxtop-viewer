# Stage 1
FROM node:24.4.1-bookworm-slim AS node
WORKDIR /app
COPY . .
RUN corepack enable
RUN corepack yarn install --frozen-lockfile
ENV NODE_ENV=production
RUN corepack yarn build

# Stage 2
FROM nginx:1.28.0-alpine-slim
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
RUN rm /usr/share/nginx/html/*
COPY --from=node /app/dist/ /usr/share/nginx/html
