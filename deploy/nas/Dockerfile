# syntax=docker/dockerfile:1
FROM node:26-bookworm-slim AS build
RUN npm install --global pnpm@11.8.0
WORKDIR /src
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build

FROM nginxinc/nginx-unprivileged@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e
COPY --from=build /src/music_assistant_frontend/ /srv/frontend/current/
COPY deploy/nas/nginx.conf.template /etc/nginx/templates/default.conf.template
ARG MA_REVISION
LABEL org.opencontainers.image.source="https://github.com/willvanwazer/music-assistant-frontend" \
      org.opencontainers.image.revision=$MA_REVISION
ENV NGINX_ENVSUBST_FILTER=^MA_BACKEND_URL$
