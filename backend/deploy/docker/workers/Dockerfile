# ANX-453 — outbox-relay (and other WORKER_PROFILE values) for local compose.
FROM oven/bun:1.4.0-alpine

WORKDIR /app
COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY modules ./modules

RUN bun install --frozen-lockfile

WORKDIR /app/apps/workers
USER bun
ENV WORKER_PROFILE=outbox-relay
CMD ["bun", "src/index.ts"]
