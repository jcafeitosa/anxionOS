---
type: debate
---
# R04 — Contratos e eventos: `modules/orchestration`

**Issue:** ANX-393. Histórico: [structure R04](../../structure-debate/orchestration/R04-contracts-events.md).

Eventos: `orchestration.goal.created.v1`, `orchestration.task.checked_out.v1` (sem leaseToken), `orchestration.run.completed.v1`, `orchestration.run.waiting_human.v1`, `orchestration.gate.disposition.recorded.v1`.

API: `/v1/orchestration/*`. Oráculos: INV-ORC-02 um lease vigente; G3 checkout idempotente; G5 não bypass G7 via espelho `done`.
