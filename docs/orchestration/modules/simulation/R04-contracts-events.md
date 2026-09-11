---
type: debate
---

# R04 — Contratos, API e eventos: `modules/simulation`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-115 · impl futura ANX-116  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de produção. API esboço `/v1/simulation` apenas.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `simulation` |
| eventType | `simulation.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Segredos | **proibido** em DTO/evento (keys REAL, tokens venue) |

**KEEP adapter-gateway** se já exportado — não remover.

## In / Out (R4)

**In:** POST `/v1/simulation/runs`; GET `/v1/simulation/runs/:id`; POST `/v1/simulation/snapshots`; consumer `strategies.backtest.requested.v1`. Idempotency-Key. T01 pré-start.

**Out:** `simulation.run.started.v1`, `simulation.run.completed.v1`, `simulation.snapshot.created.v1`, `simulation.run.failed.v1`. Códigos `SIM_*`. **SIM-R04-01:** não emite `execution.order.*` nem `evaluation.certification.*`.

## Non-goals

Não OpenAPI público neste pack. Não schema produção. Não emitir journal de accounting. Specs permanecem **draft**. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| SimulationRun / Snapshot / Manifest | **simulation** |
| Certification | **evaluation** |
| Order | **execution** |
| adapter-gateway | **KEEP** |

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| SIM_RUN_NOT_FOUND | 404 | Fora do scope |
| SIM_DUPLICATE_IDEMPOTENCY | 409 | Conflito de comando |
| SIM_CROSS_TENANT | 403 | Org mismatch |
| SIM_GRANT_INVALID | 403 | T01 DENY |
| SIM_DATASET_HASH_MISMATCH | 422/failed | Hash fixture ≠ manifest |
| SIM_REAL_EGRESS_FORBIDDEN | 403/failed | Tentativa REAL |
| SIM_TIER_INVALID | 422 | Completed para evaluation com tier ≠ SIMULATED |
| SIM_IDEMPOTENT_REPLAY | 200 | Replay mesmo commandId |

## Layout `@anxionos/contracts/simulation/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`.

## Eventos v1 emitidos

| eventType | Payload (sem secrets) | Consumidores |
| --- | --- | --- |
| `simulation.run.started.v1` | runId, organizationId, manifestId, seedHash | audit, graph isolado |
| `simulation.run.completed.v1` | runId, resultRef, datasetHash | **evaluation**, strategies, audit |
| `simulation.snapshot.created.v1` | snapshotId, datasetRef, hash | audit |
| `simulation.run.failed.v1` | runId, code | audit, operations |

**Consumer:** `strategies.backtest.requested.v1`.  
**SIM-R04-01:** não emite `execution.order.*` nem `evaluation.certification.*`.

## REST `/v1/simulation/*`

| Método | Path | Grant |
| --- | --- | --- |
| POST | `/v1/simulation/runs` | simulation.run + T01 |
| GET | `/v1/simulation/runs/:id` | simulation.read |
| POST | `/v1/simulation/snapshots` | simulation.admin + T01 |

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-SIM-01 | backtest requested → started+completed (ou failed) |
| G3-SIM-02 | hash mismatch FAILED |
| G3-SIM-03 | completed **não** emite certification.* |
| G5-SIM-01 | cross-tenant 403 |
| G5-SIM-02 | REAL egress bloqueado |
| G5-SIM-05 | T01 DENY → 403 SIM_GRANT_INVALID; run não started |

## Alternativas rejeitadas

Sandbox com credenciais REAL; Neo4j de produção como twin; emitir order.* “só para paper”; pasta experiments/; D-GOV-010 aqui.

## Saída R4

Contratos v1. → **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
