---
type: debate
status: draft
---

# R08 — Decision log: `modules/portfolios`

**Issue:** ANX-95 · gate: ANX-58

| ID | Decisão | Status |
| --- | --- | --- |
| D-PF-001 | portfolios dono Portfolio, Position, Holding, ValuationSnapshot, RebalancePlan | ✅ |
| D-PF-002 | Position key `(capitalAccountId, instrumentId, positionSide, book)` — uma canônica por key | ✅ |
| D-PF-003 | Posição PG autoritativa; **zero SQLite** para state | ✅ |
| D-PF-004 | capital Allocation/Reservation separados — portfolios só mandateRef | ✅ |
| D-PF-005 | accounting ledger separado — portfolios consome `ledger.posted` para cash reconcile | ✅ |
| D-PF-006 | strategies Deployment/Signal separados — Holding attribution only | ✅ |
| D-PF-007 | Fill→position assíncrono projector + idempotência | ✅ |
| D-PF-008 | ValuationSnapshot CONFIRMED imutável; market-data só priceRef | ✅ |
| D-PF-009 | RebalancePlan não executa ordem — decisions/execution downstream | ✅ |
| D-PF-010 | SIMULATED+PAPER only v1; REAL reject | ✅ |
| D-PF-011 | graph:portfolios:v1 async projeção Neo4j | ✅ |
| D-PF-012 | command_journal/outbox `ownerDomain=portfolios` | ✅ |
| D-PF-013 | organizations tenancy — portfolio capitalAccount same ownerUserId | ✅ |
| D-PF-014 | PositionReconciliationCase ownerDomain=portfolios | ✅ |
| D-PF-015 | RLS defer P09 — application-only tenancy | ✅ |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
