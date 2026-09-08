---
type: debate
status: draft
---

# R08 — Decision log: `modules/risk`

**Issue:** ANX-99 · gate: ANX-58

| ID | Decisão | Status |
| --- | --- | --- |
| D-RK-001 | risk dono LimitPolicy, ExposureSnapshot, RiskCheckResult, RiskPermit | ✅ |
| D-RK-002 | decisions TradeIntent separado — risk valida intentHash only | ✅ |
| D-RK-003 | governance MandateVersion declarativo; risk LimitPolicy executável | ✅ |
| D-RK-004 | capital reserva; risk consulta não muta | ✅ |
| D-RK-005 | execution revalida RiskPermit + ExecutionPermit + epochs | ✅ |
| D-RK-006 | CONFIG_REQUIRED fail-closed (spec 003) | ✅ |
| D-RK-007 | Kill switch bump riskEpoch sem apagar histórico | ✅ |
| D-RK-008 | PG autoritativo; zero SQLite | ✅ |
| D-RK-009 | SIMULATED+PAPER only v1 | ✅ |
| D-RK-010 | Pre-trade obrigatório; post-trade defer S4 | ✅ |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
