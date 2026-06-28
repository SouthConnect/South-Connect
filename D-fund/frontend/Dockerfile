FROM node:22-alpine AS builder

RUN apk upgrade --no-cache

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend ./

# NEXT_PUBLIC_* sont des variables build-time — à passer via --build-arg
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ARG NEXT_PUBLIC_SENTRY_DSN=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk upgrade --no-cache && \
    apk add --no-cache wget

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

RUN chown -R appuser:appgroup /app/frontend
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
