# ANX-162 S3/S4/S5 — Freqtrade sandbox slot (SIMULATED default)
# ANX-177 REAL: upstream runtime homologation pending
FROM oven/bun:1.2.19-alpine

RUN apk add --no-cache wget \
	&& adduser -D -u 10001 -h /app anxion \
	&& mkdir -p /data \
	&& chown -R anxion:anxion /app /data

WORKDIR /app
COPY --chown=anxion:anxion freqtrade/sandbox-entrypoint.mjs .
COPY --chown=anxion:anxion shared/sandbox-auth.mjs ./shared/sandbox-auth.mjs
COPY --chown=anxion:anxion shared/sandbox-logger.mjs ./shared/sandbox-logger.mjs

USER 10001

ENV FREQTRADE_SANDBOX_PORT=9055 \
	ENGINE_MODE=SIMULATED \
	FREQTRADE_SANDBOX_VERSION=0.1.0-anx162-s5

EXPOSE 9055

HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=5s \
	CMD wget --spider -q "http://localhost:${FREQTRADE_SANDBOX_PORT}/health" || exit 1

ENTRYPOINT ["bun", "sandbox-entrypoint.mjs"]
