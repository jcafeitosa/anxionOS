---
type: debate
---
# R04 — Contratos, API e eventos: `modules/simulation`

**Rodada:** R4 · ANX-389 · ANX-115 · ANX-116 não impl  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md). API esboço `/v1/simulation`. Sem schema produção.

ownerDomain `simulation` · `simulation.<aggregate>.<action>.v1`.

Códigos: SIM_DUPLICATE_IDEMPOTENCY · SIM_CROSS_TENANT · SIM_GRANT_INVALID · SIM_DATASET_HASH_MISMATCH · SIM_REAL_EGRESS_FORBIDDEN · SIM_TIER_INVALID.

## Eventos emitidos

`simulation.run.started.v1` · `simulation.run.completed.v1` (evaluation, strategies, audit) · `simulation.snapshot.created.v1` · `simulation.run.failed.v1`

**Consumer:** `strategies.backtest.requested.v1`.  
**SIM-R04-01:** não emite `execution.order.*` nem `evaluation.certification.*`.

## REST

POST `/v1/simulation/runs` · GET `/v1/simulation/runs/:id` · POST `/v1/simulation/snapshots`

## Oráculos

G3-SIM-01 backtest requested → started+completed · G3-SIM-02 hash mismatch FAILED · G5-SIM-01 cross-tenant 403 · G5-SIM-02 REAL egress bloqueado.

## In / Out (R4)

**In:** POST `/v1/simulation/runs`; GET `/v1/simulation/runs/:id`; POST `/v1/simulation/snapshots`; consumer `strategies.backtest.requested.v1`.

**Out:** `simulation.run.started.v1`, `simulation.run.completed.v1`, `simulation.snapshot.created.v1`, `simulation.run.failed.v1`. Códigos SIM_*. **SIM-R04-01:** não emite `execution.order.*` nem `evaluation.certification.*`.

## Non-goals

Não OpenAPI público neste pack. Não schema produção. Não emitir journal de accounting. Specs permanecem draft.

## Saída R4

Contratos v1.
