---
type: debate
---
# R04 — Contratos, API e eventos: `modules/evaluation`

**Rodada:** R4 · ANX-389 · ANX-109 · ANX-110 não impl  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md). API esboço `/v1/evaluation`. Sem schema produção.

## Convenções

ownerDomain `evaluation` · `evaluation.<aggregate>.<action>.v1` · sem secrets.

Códigos: EVL_DUPLICATE_IDEMPOTENCY · EVL_CROSS_TENANT · EVL_GRANT_INVALID · EVL_SUBJECT_INVALID · EVL_POLICY_MISSING.

## Eventos emitidos

`evaluation.score.computed.v1` · `evaluation.certification.issued.v1` (strategies, graph, audit) · `evaluation.reputation.updated.v1` · `evaluation.promotion.recommended.v1` (governance)

## Consumidos

`performance.outcome.recorded.v1` · `simulation.run.completed.v1` · `agents.version.published.v1`

**EVL-R04-01:** strategies consome **issued**, não “recorded”.

## REST

GET/POST `/v1/evaluation/records` · POST `/v1/evaluation/certifications` (T01) · GET `/v1/evaluation/reputation/:subjectId`

## Oráculos

G3-EVL-01 score idempotente · G3-EVL-02 cert sem run 409 · G5-EVL-01 cross-tenant 403 · G5-EVL-02 T01 DENY.

## Saída R4

Contratos v1.
