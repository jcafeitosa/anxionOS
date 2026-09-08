---
type: debate
status: draft
---

# R08 — Decision log: `modules/execution`

**Issue:** ANX-101 · gate: ANX-58

| ID | Decisão | Status |
| --- | --- | --- |
| D-EX-001 | execution dono Order, Fill, ExecutionSession, VenueAdapterRef | ✅ |
| D-EX-002 | decisions TradeIntent separado — execution valida intentHash only | ✅ |
| D-EX-003 | Submit atômico: consume RiskPermit + validate ExecutionPermit + reservation | ✅ |
| D-EX-004 | Fill→accounting/portfolios via `execution.fill.confirmed.v1` assíncrono | ✅ |
| D-EX-005 | capital reservation referenciada; consumo no projector fill | ✅ |
| D-EX-006 | connections dono secretRef; execution só VenueAdapterRef | ✅ |
| D-EX-007 | Duplicate fill idempotente / reject com ReconciliationCase | ✅ |
| D-EX-008 | PG autoritativo; zero SQLite order/fill | ✅ |
| D-EX-009 | SIMULATED+PAPER only v1; REAL/LIVE_TRADING rejeitado | ✅ |
| D-EX-010 | execution-go defer S3; simulator inline TS em S1–S2 | ✅ |
| D-EX-011 | ReconciliationCase venue owner execution; financeiro accounting | ✅ |
| D-EX-012 | clientOrderId idempotência por org+adapter | ✅ |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
