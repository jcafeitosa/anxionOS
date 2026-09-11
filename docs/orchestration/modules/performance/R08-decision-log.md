---
status: draft
type: debate
---
# R08 — Decision log: `modules/performance`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue:** ANX-105 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-PERF-001–008 + P1-PERF-* (PG autoritativo, Timescale derivado, sem analytics/, D-GOV-010 fora).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-105/389. Sem ST08 live.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| métricas oficiais / OutcomeSnapshot | **performance** |
| ledger | **accounting** |
| Position | **portfolios** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-PERF-001 | Dono agregados R03 | draft |
| D-PERF-002 | Não reescreve ledger/posição | draft |
| D-PERF-003 | PG autoritativo; Timescale derivado | draft |
| D-PERF-004 | OfficialMetricDefinition versionada; rebuild idempotente | draft |
| D-PERF-005 | graph:performance:v1 async | draft |
| D-PERF-006 | Sem pasta analytics/ (PC 22) | draft |
| D-PERF-007 | Spec 003 draft; ST08 0/23 | draft |
| D-PERF-008 | D-GOV-010 não é deste módulo | draft |
| P1-PERF-01 | Pack não é G7 código nem ANX-342 | draft |
| P1-PERF-02 | D-GOV-010 não é deste módulo (risk P06) | draft |
| P1-PERF-03 | Pasta analytics/ não existe (PC 22) | draft |

## Saída R8

Ownership: métricas oficiais; PG autoritativo; Timescale derivado. Oráculos G3-PERF-01 rebuild idempotente · G3-PERF-02 fill ≠ ledger. Para [R09](./R09-dev-plan.md).
