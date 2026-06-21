# syntax=docker/dockerfile:1.7

# ---------- 1. deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- 2. build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable telemetry, build the standalone bundle.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run rbuild

# ---------- 3. runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# nginx + tini (for proper signal handling at PID 1).
RUN apk add --no-cache nginx tini \
 && mkdir -p /var/log/nginx /var/lib/nginx /run/nginx \
 && addgroup -S app && adduser -S app -G app

# Next.js standalone output: server.js + minimal node_modules.
COPY --from=builder /app/.next/standalone ./
# Static assets aren't in the standalone bundle — copy them next to where the
# Node server expects them.
COPY --from=builder /app/.next/static ./.next/static
# public/ doesn't exist in this barebones repo; create it so COPY doesn't fail
# if a future commit adds files there.
COPY --from=builder /app/package.json ./package.json

# nginx config + entrypoint.
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 80 443

# tini reaps zombies + forwards signals; entrypoint launches Next + nginx.
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
