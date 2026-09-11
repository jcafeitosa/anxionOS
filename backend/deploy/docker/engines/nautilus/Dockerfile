# ANX-174 — NautilusTrader sandbox slot (SIMULATED default)
# REAL: upstream Python/Rust runtime homologation pending
FROM oven/bun:1.2.19-alpine

RUN apk add --no-cache wget \
	&& adduser -D -u 10001 -h /app anxion \
	&& mkdir -p /data \
	&& chown -R anxion:anxion /app /data

WORKDIR /app
COPY --chown=anxion:anxion nautilus/sandbox-entrypoint.mjs .
COPY --chown=anxion:anxion shared/sandbox-auth.mjs ./shared/sandbox-auth.mjs
COPY --chown=anxion:anxion shared/sandbox-logger.mjs ./shared/sandbox-logger.mjs

USER 10001

ENV NAUTILUS_SANDBOX_PORT=9057 \
	ENGINE_MODE=SIMULATED \
	NAUTILUS_SANDBOX_VERSION=0.1.0-anx174-s1

EXPOSE 9057

HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=5s \
	CMD wget --spider -q "http://localhost:${NAUTILUS_SANDBOX_PORT}/health" || exit 1

ENTRYPOINT ["bun", "sandbox-entrypoint.mjs"]
