# syntax=docker/dockerfile:1.7
#
# Production image for Brick Voyage. Builds:
#   1. deps   — npm ci
#   2. build  — next build (standalone output)
#   3. runtime — alpine + nginx + node + tini + built standalone server
#
# Runtime layout matches the spec's "single web image, Postgres is a sibling
# container" model. nginx terminates the Cloudflare Origin Cert on 443 and
# proxies to Next.js on localhost:3000.

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
ENV NEXT_TELEMETRY_DISABLED=1
# next.config.mjs sets output: 'standalone' — the build emits
# .next/standalone (minimal Node server) and .next/static (assets).
RUN npm run build

# ---------- 3. runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# nginx + tini (proper PID 1 signal handling for the entrypoint that
# launches both Node and nginx in the same container).
RUN apk add --no-cache nginx tini \
 && mkdir -p /var/log/nginx /var/lib/nginx /run/nginx

# Next.js standalone bundle.
COPY --from=builder /app/.next/standalone ./
# Static assets — standalone doesn't auto-copy these.
COPY --from=builder /app/.next/static ./.next/static
# Public assets (resume PDF, project screenshots) — also not auto-copied.
COPY --from=builder /app/public ./public

COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 80 443

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
