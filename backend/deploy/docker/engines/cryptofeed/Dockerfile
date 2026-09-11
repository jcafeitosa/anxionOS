# ANX-179 — Cryptofeed sandbox slot (SIMULATED default)
# REAL: upstream Python feed runtime homologation pending
FROM oven/bun:1.2.19-alpine

RUN apk add --no-cache wget \
	&& adduser -D -u 10001 -h /app anxion \
	&& mkdir -p /data \
	&& chown -R anxion:anxion /app /data

WORKDIR /app
COPY --chown=anxion:anxion cryptofeed/sandbox-entrypoint.mjs .
COPY --chown=anxion:anxion shared/sandbox-auth.mjs ./shared/sandbox-auth.mjs
COPY --chown=anxion:anxion shared/sandbox-logger.mjs ./shared/sandbox-logger.mjs

USER 10001

ENV CRYPTOFEED_SANDBOX_PORT=9058 \
	ENGINE_MODE=SIMULATED \
	CRYPTOFEED_SANDBOX_VERSION=0.1.0-anx179-s1

EXPOSE 9058

HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=5s \
	CMD wget --spider -q "http://localhost:${CRYPTOFEED_SANDBOX_PORT}/health" || exit 1

ENTRYPOINT ["bun", "sandbox-entrypoint.mjs"]
