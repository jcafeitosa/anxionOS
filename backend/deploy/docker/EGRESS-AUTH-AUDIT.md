# ANX-162 S4 — egress deny, service auth, audit manifest

Slice **S4** closes three gateway spec controls for the `engines-sandbox` profile:

| Controle | Implementação local | Oracle |
| --- | --- | --- |
| Egress deny | Rede `anxion-engines-sandbox` com `internal: true` — quartet isolado sem internet | `npm run anx162:s4-egress-auth-audit-homologation` |
| Service auth | `ENGINE_SANDBOX_AUTH_TOKEN` — Bearer em rotas API; `/health` público | mesmo oracle |
| Audit manifest | `audit/engine-sandbox-manifest.json` com tags + digests | mesmo oracle |

## Redes

```text
anxion-control         → API, NATS (control-plane)
anxion-data            → Postgres, Neo4j
anxion-engines-sandbox → quartet engines (internal: true — sem egress)
anxion-observability   → NATS metrics
```

Engines ficam **somente** em `anxion-engines-sandbox` (`internal: true` — sem egress à internet). Para homologação local, o compose **publica** portas no host (`9053`–`9056`); isso é distinto do isolamento de rede. Oráculos S3/S4 provam `/health` via `docker exec` (loopback dentro do container); o oracle S4 também valida egress deny com probe HTTPS bloqueado.

## Service auth

1. Defina um token dev em `backend/deploy/docker/.env` (nunca commitar valor real):

   ```bash
   ENGINE_SANDBOX_AUTH_TOKEN=dev-sandbox-auth-local-only
   ```

2. Adapters no control plane leem o mesmo env (`backend/.env`) e enviam `Authorization: Bearer …` em rotas REAL (`/v1/getinfo`, `/v1/status`, etc.).

3. `/health` permanece sem auth para healthcheck Docker e oracle SIMULATED S3.

## Audit manifest

Arquivo versionado: `audit/engine-sandbox-manifest.json`.

O oracle S4:

- valida política estática (rede internal, token presente no compose);
- inspeciona imagens locais e grava `digest` por engine;
- falha se tag manifest ≠ imagem em execução.

Regenerar digests após rebuild:

```bash
npm run anx162:s4-egress-auth-audit-homologation
```

## Oráculos ANX-162

| Slice | Comando |
| --- | --- |
| S2 storage/rede | `npm run anx162:engine-isolation-homologation` |
| S3 engines profile | `npm run anx162:s3-engines-homologation` |
| S4 egress/auth/audit | `npm run anx162:s4-egress-auth-audit-homologation` |
| S5 limits/logs/rollback | `npm run anx162:s5-limits-logs-rollback-homologation` |

Ver também: [LIMITS-LOGS-ROLLBACK.md](./LIMITS-LOGS-ROLLBACK.md).

Fonte: `docs/orchestration/system-capabilities/p05-p06-external-adapter-gateway-spec.md` §Isolamento Docker.
