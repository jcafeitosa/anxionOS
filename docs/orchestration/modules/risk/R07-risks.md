---
type: debate
---
# R07 — Riscos: `modules/risk`

**Issue:** ANX-99 · pack ANX-389 · gate ANX-58  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## In / Out (R7)

**In scope:** bypass de limites, permit stale, cross-tenant exposure, double consume, SQLite local, REAL bypass, LLM override DENY, kill switch estreito, reserva sem permit.

**Out of scope:** ameaça de venue HTTP (`execution` infra); P&L (`performance`); Twin (`simulation`).

## Non-goals

Não “mitigar” com stub de permit PASS. Não REAL v1.

## Registro

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-RK-01 | Bypass limits — ordem sem check | 20 | CONFIG_REQUIRED; permit só em PASS |
| R-RK-02 | Stale riskEpoch pós kill switch | 20 | isRiskPermitStale; epoch.bumped |
| R-RK-03 | Cross-tenant exposure | 20 | org scope; G5-RK-01 |
| R-RK-04 | Double consume RiskPermit | 18 | singleUse CONSUMED |
| R-RK-05 | Stale ExposureSnapshot | 16 | valuationAsOf |
| R-RK-06 | SQLite risk local | 18 | CI fail |
| R-RK-07 | REAL mode bypass v1 | 10 | schema reject |
| R-RK-08 | LLM override DENY | 14 | explanationRef only |
| R-RK-09 | Kill switch scope narrow | 12 | GLOBAL→ORG→PORTFOLIO |
| R-RK-10 | Capital reserve sem permit | 19 | capital gate on permit.issued |

## Oráculos G5

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-RK-01 | portfolioId org-A + intent org-B | RK_CROSS_TENANT |
| G5-RK-02 | PASS depois kill switch | RK_PERMIT_STALE |
| G5-RK-03 | policy revogada + epoch bump | RK_POLICY_STALE |

Top 5 → R08.
