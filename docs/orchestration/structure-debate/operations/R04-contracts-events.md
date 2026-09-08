---
type: debate
---

# R04 — Contratos e eventos: `modules/operations`

**Issues:** ANX-111 · **ANX-112**

## Convenções

`ownerDomain: operations` · `operations.<aggregate>.<action>.v1`

## HTTP `/v1/operations/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/health` | platform health agregado |
| GET | `/health/:serviceId` | getServiceHealth |
| POST | `/incidents` | openIncident |
| POST | `/export-jobs` | createExportJob (grant + retention policy) |
| GET | `/export-jobs/:id` | getExportJobStatus |

## ExportJob state machine

`PENDING` → `RUNNING` → `COMPLETED` | `FAILED` | `CANCELLED` — idempotency por `Idempotency-Key`; retry com backoff; `deltaRefId` de audit.

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `operations.incident.opened.v1` | audit, graph |
| `operations.export.completed.v1` | audit |
| `operations.export.failed.v1` | audit |
| `operations.health.degraded.v1` | audit, orchestration |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `audit.manifest.recorded.v1` | index export sources |
| `observability.alert.fired.v1` | open incident (correlation) |
| `*.heartbeat.v1` (module probes) | ServiceHealthSnapshot |

## Erros

`OPS_DUPLICATE_IDEMPOTENCY` · `OPS_CROSS_TENANT` · `OPS_GRANT_INVALID` · `OPS_RETENTION_DENIED`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
