---
type: debate
---
# R04 — Contratos, API e eventos: `modules/operations`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-111 · impl futura ANX-112 **não** neste pack  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). API esboço `/v1/operations`. Sem schema de produção.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `operations` |
| eventType | `operations.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Segredos | **proibido** em DTO/evento |

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| OPS_DUPLICATE_IDEMPOTENCY | 409 | Conflito de comando |
| OPS_CROSS_TENANT | 403 | Agency mismatch |
| OPS_GRANT_INVALID | 403 | T01 DENY |
| OPS_RETENTION_DENIED | 403 | Export viola RetentionPolicy |
| OPS_EXPORT_AUDIT_MISSING | 422 | deltaRefId ausente/inválido |
| OPS_REVISION_CONFLICT | 409 | expectedRevision |
| OPS_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout `@anxionos/contracts/operations/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`. **KEEP adapter-gateway** se o pacote de contratos já o exportar — este pack não remove.

**OPS-R04-01:** não emite `audit.manifest.*` nem kill-switch.

## In / Out (R4)

**In:** GET `/v1/operations/health`; GET `/health/:serviceId`; POST `/incidents`; POST `/export-jobs`; GET `/export-jobs/:id`; consumers `audit.manifest.recorded.v1`, `observability.alert.fired.v1`, `*.heartbeat.v1`.

**Out:** eventos abaixo; envelope SDD; códigos OPS_*. Blob só `resultRef` + hash.

## Non-goals

- Não OpenAPI Scalar público neste pack.
- Não schema Drizzle executado.
- Não emitir `execution.order.*`.

## Eventos v1 emitidos

| eventType | Payload (sem secrets) | Consumidores |
| --- | --- | --- |
| `operations.incident.opened.v1` | incidentId, correlationId, serviceIds | audit, graph |
| `operations.incident.closed.v1` | incidentId, closedAt | audit, graph |
| `operations.export.completed.v1` | jobId, resultRef, deltaRefId | audit (subscriber) |
| `operations.export.failed.v1` | jobId, errorCode | operations console |
| `operations.health.degraded.v1` | serviceId, asOf | orchestration |

## REST `/v1/operations/*`

| Método | Path | Grant |
| --- | --- | --- |
| GET | `/v1/operations/health` | operations.read |
| GET | `/v1/operations/health/:serviceId` | operations.read |
| POST | `/v1/operations/incidents` | operations.incident + T01 |
| POST | `/v1/operations/export-jobs` | operations.export + T01 |
| GET | `/v1/operations/export-jobs/:id` | operations.read |

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-OPS-01 | G3 | export idempotente |
| G3-OPS-02 | G3 | retention deny |
| G3-OPS-03 | G3 | health snapshot |
| G5-OPS-01 | G5 | cross-tenant 403 |
| G5-OPS-02 | G5 | T01 DENY export |

## Alternativas rejeitadas

Export BYTEA; SQLite incidente; pasta infrastructure/; health como grant; emitir audit.manifest.

## Saída R4

Contratos v1.
