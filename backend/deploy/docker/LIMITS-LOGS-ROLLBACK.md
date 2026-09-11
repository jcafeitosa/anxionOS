# ANX-162 S5 — resource limits, structured logging, rollback

Slice **S5** closes operational controls for the `engines-sandbox` profile:

| Controle | Implementação local | Oracle |
| --- | --- | --- |
| Resource limits | `deploy.resources.limits` (1 CPU, 512M) por engine | `npm run anx162:s5-limits-logs-rollback-homologation` |
| Structured logging | JSON stdout via `shared/sandbox-logger.mjs` + `json-file` driver | mesmo oracle |
| Rollback homologation | `compose rm -sf` → `up -d --no-build` com imagem pinada no manifest | mesmo oracle |

## Resource limits

Cada engine no profile `engines-sandbox` declara:

```yaml
deploy:
  resources:
    limits:
      cpus: "1.0"
      memory: 512M
    reservations:
      memory: 64M
```

O oracle S5 valida presença estática no compose e, quando disponível via `docker inspect`, limites de runtime.

## Structured logging

Engines emitem logs JSON estruturados (um objeto por linha):

```json
{
  "timestamp": "2026-09-11T12:00:00.000Z",
  "level": "info",
  "event": "sandbox.started",
  "issue": "ANX-162",
  "slice": "S5",
  "engine": "gocryptotrader",
  "service": "gocryptotrader-sandbox",
  "mode": "SIMULATED",
  "version": "0.1.0-anx162-s5",
  "port": 9053
}
```

Driver Docker: `json-file` com rotação (`max-size: 10m`, `max-file: 3`).

## Rollback

Política: restaurar imagem pinada em `audit/engine-sandbox-manifest.json` sem rebuild.

```bash
docker compose -f backend/deploy/docker/docker-compose.yml \
  --env-file backend/deploy/docker/.env \
  --profile engines-sandbox \
  rm -sf gocryptotrader-sandbox

docker compose ... up -d --no-build gocryptotrader-sandbox
```

O oracle S5 executa esse ciclo por engine e valida `/health` + digest compatível com o manifest.

## Oráculos ANX-162

| Slice | Comando |
| --- | --- |
| S2 storage/rede | `npm run anx162:engine-isolation-homologation` |
| S3 engines profile | `npm run anx162:s3-engines-homologation` |
| S4 egress/auth/audit | `npm run anx162:s4-egress-auth-audit-homologation` |
| S5 limits/logs/rollback | `npm run anx162:s5-limits-logs-rollback-homologation` |

Fonte: `docs/orchestration/system-capabilities/p05-p06-external-adapter-gateway-spec.md` §Isolamento Docker.
