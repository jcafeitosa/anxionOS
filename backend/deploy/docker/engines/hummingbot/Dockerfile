# ANX-162 S3/S4/S5 — Hummingbot sandbox slot (SIMULATED default)
# ANX-176 REAL: upstream runtime homologation pending
FROM oven/bun:1.2.19-alpine

RUN apk add --no-cache wget \
	&& adduser -D -u 10001 -h /app anxion \
	&& mkdir -p /data \
	&& chown -R anxion:anxion /app /data

WORKDIR /app
COPY --chown=anxion:anxion hummingbot/sandbox-entrypoint.mjs .
COPY --chown=anxion:anxion shared/sandbox-auth.mjs ./shared/sandbox-auth.mjs
COPY --chown=anxion:anxion shared/sandbox-logger.mjs ./shared/sandbox-logger.mjs

USER 10001

ENV HUMMINGBOT_SANDBOX_PORT=9054 \
	ENGINE_MODE=SIMULATED \
	HUMMINGBOT_SANDBOX_VERSION=0.1.0-anx162-s5

EXPOSE 9054

HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=5s \
	CMD wget --spider -q "http://localhost:${HUMMINGBOT_SANDBOX_PORT}/health" || exit 1

ENTRYPOINT ["bun", "sandbox-entrypoint.mjs"]
