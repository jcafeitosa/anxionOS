---
status: draft
type: debate
---
# R08 — Decision log: `modules/execution`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue:** ANX-101 · gate: ANX-58 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-EX-001–012 (ownership Order/Fill, atomic submit, async fill, secrets em connections, PG, PAPER/SIMULATED, Go defer).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-101/389. Sem ST08 live.

## Non-goals

Não ADR novo. Não merge de Permit em execution. Não ST08. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| Order / Fill / ExecutionSession / VenueAdapterRef | **execution** |
| TradeIntent | **decisions** |
| RiskPermit | **risk** |
| ExecutionPermit | **governance** |
| secretRef | **connections** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-EX-001 | execution dono Order, Fill, ExecutionSession, VenueAdapterRef | draft |
| D-EX-002 | decisions TradeIntent separado — execution valida intentHash only | draft |
| D-EX-003 | Submit atômico: consume RiskPermit + validate ExecutionPermit + reservation | draft |
| D-EX-004 | Fill→accounting/portfolios via `execution.fill.confirmed.v1` assíncrono | draft |
| D-EX-005 | capital reservation referenciada; consumo no projector fill | draft |
| D-EX-006 | connections dono secretRef; execution só VenueAdapterRef | draft |
| D-EX-007 | Duplicate fill idempotente / reject com ReconciliationCase | draft |
| D-EX-008 | PG autoritativo; zero SQLite order/fill | draft |
| D-EX-009 | SIMULATED+PAPER only v1; REAL/LIVE_TRADING rejeitado | draft |
| D-EX-010 | execution-go defer S3; simulator inline TS em S1–S2 | draft |
| D-EX-011 | ReconciliationCase venue owner execution; financeiro accounting | draft |
| D-EX-012 | clientOrderId idempotência por org+adapter | draft |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
