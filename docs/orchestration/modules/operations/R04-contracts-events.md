---
type: debate
---
# R04 — Contratos, API e eventos: `modules/operations`

**Rodada:** R4 · 2026-09-11 · ANX-389 · ANX-111 · ANX-112 não impl  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md). API esboço `/v1/operations`. Sem schema de produção.

## Convenções

ownerDomain `operations` · `operations.<aggregate>.<action>.v1` · sem secrets.

### Códigos

OPS_DUPLICATE_IDEMPOTENCY 409 · OPS_CROSS_TENANT 403 · OPS_GRANT_INVALID 403 · OPS_RETENTION_DENIED 403 · OPS_EXPORT_AUDIT_MISSING 422.

## Eventos emitidos

`operations.incident.opened.v1` · `operations.incident.closed.v1` · `operations.export.completed.v1` · `operations.export.failed.v1` · `operations.health.degraded.v1`

## Consumidos

`audit.manifest.recorded.v1` · `observability.alert.fired.v1` · `*.heartbeat.v1`

**OPS-R04-01:** não emite `audit.manifest.*` nem kill-switch.

## REST

GET `/v1/operations/health` · GET `/health/:serviceId` · POST `/incidents` · POST `/export-jobs` · GET `/export-jobs/:id`

## Oráculos

G3-OPS-01 export idempotente · G3-OPS-02 retention deny · G3-OPS-03 health snapshot · G5-OPS-01 cross-tenant 403 · G5-OPS-02 T01 DENY export.

## Saída R4

Contratos v1.
