---
status: draft
type: debate
---
# R08 — Decision log: `modules/portfolios`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue:** ANX-95 · gate: ANX-58 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-PF-001–015 (PG, mandateRef, fill projector, RebalancePlan sem ordem, PAPER/SIMULATED).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-95/389. Sem ST08 live.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| Portfolio / Position / Holding / ValuationSnapshot / RebalancePlan | **portfolios** |
| Allocation / Reservation | **capital** |
| JournalEntry | **accounting** |
| Deployment | **strategies** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-PF-001 | portfolios dono Portfolio, Position, Holding, ValuationSnapshot, RebalancePlan | draft |
| D-PF-002 | Position key `(capitalAccountId, instrumentId, positionSide, book)` — uma canônica por key | draft |
| D-PF-003 | Posição PG autoritativa; **zero SQLite** para state | draft |
| D-PF-004 | capital Allocation/Reservation separados — portfolios só mandateRef | draft |
| D-PF-005 | accounting ledger separado — portfolios consome `ledger.posted` para cash reconcile | draft |
| D-PF-006 | strategies Deployment/Signal separados — Holding attribution only | draft |
| D-PF-007 | Fill→position assíncrono projector + idempotência | draft |
| D-PF-008 | ValuationSnapshot CONFIRMED imutável; market-data só priceRef | draft |
| D-PF-009 | RebalancePlan não executa ordem — decisions/execution downstream | draft |
| D-PF-010 | SIMULATED+PAPER only v1; REAL reject | draft |
| D-PF-011 | graph:portfolios:v1 async projeção Neo4j | draft |
| D-PF-012 | command_journal/outbox `ownerDomain=portfolios` | draft |
| D-PF-013 | organizations tenancy — portfolio capitalAccount same ownerUserId | draft |
| D-PF-014 | PositionReconciliationCase ownerDomain=portfolios | draft |
| D-PF-015 | RLS defer P09 — application-only tenancy | draft |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
