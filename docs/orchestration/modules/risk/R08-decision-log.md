---
status: draft
type: debate
---

# R08 — Decision log: `modules/risk`

**Issue:** ANX-99 · pack ANX-389 · gate ANX-58  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md).  
**Status documental:** `draft` — **não** spec accepted, **não** G7, **não** ST08 live.

## In / Out (R8)

**In scope:** ownership LimitPolicy/Exposure/Check/Permit; SIMULATED+PAPER; D-GOV-010 neste módulo; PG autoritativo; KEEP adapter-gateway.

**Out of scope:** aceite spec 003; greenlight ANX-100; ANX-342 done; ANX-389 `done`.

## Non-goals

Não reabrir REAL v1. Não fake ST08. Não G1 neste pack.

## Ownership consolidado

| Superfície | Dono |
| --- | --- |
| LimitPolicy / ExposureSnapshot / RiskCheckResult / RiskPermit | **risk** |
| TradeIntent | **decisions** |
| MandateVersion | **governance** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-RK-001 | risk dono LimitPolicy, ExposureSnapshot, RiskCheckResult, RiskPermit | fechada |
| D-RK-002 | decisions TradeIntent separado — risk valida intentHash only | fechada |
| D-RK-003 | governance MandateVersion declarativo; risk LimitPolicy executável | fechada |
| D-RK-004 | capital reserva; risk consulta não muta | fechada |
| D-RK-005 | execution revalida RiskPermit + ExecutionPermit + epochs | fechada |
| D-RK-006 | CONFIG_REQUIRED fail-closed (spec 003) | fechada |
| D-RK-007 | Kill switch bump riskEpoch sem apagar histórico | fechada |
| D-RK-008 | PG autoritativo; zero SQLite | fechada |
| D-RK-009 | SIMULATED+PAPER only v1 | fechada |
| D-RK-010 | Pre-trade obrigatório; post-trade defer S4 | fechada |
| P1-RK-01 | D-GOV-010 vive em risk P06 | fechada |
| P1-RK-02 | Spec 003 draft; ST08 0/23; ANX-342 não done | fechada |

## Oráculos exigidos

G3-RK-S2-01..05 e G5-RK-01..03. Sem evidência de engine = **não verificado** até G1.

## Saída R8

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
