---
type: debate
---

# R07 — Riscos: `modules/risk`

**Issue:** ANX-99

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-RK-01 | **Bypass limits** — ordem sem check ou métricas omitidas | 20 | RK-R02-INV-09 CONFIG_REQUIRED; RK-R03-INV-02 permit só em PASS; execution gate |
| R-RK-02 | **Stale riskEpoch** — permit/check após policy revoke ou kill switch | 20 | RK-R03-INV-06; isRiskPermitStale; consumer risk.epoch.bumped |
| R-RK-03 | **Cross-tenant exposure** — portfolioId de outra org no check | 20 | RK-R02-INV-12; org scope queries; G5-RK-01 |
| R-RK-04 | Double consume RiskPermit | 18 | singleUse + status CONSUMED |
| R-RK-05 | Stale ExposureSnapshot | 16 | valuationAsOf freshness; RK_STALE_EXPOSURE |
| R-RK-06 | SQLite risk local dev | 18 | RK-R05-05 CI |
| R-RK-07 | REAL mode bypass v1 | 10 | schema reject |
| R-RK-08 | LLM override deterministic DENY | 14 | explanationRef only |
| R-RK-09 | Kill switch scope too narrow | 12 | hierarchy GLOBAL→ORG→PORTFOLIO |
| R-RK-10 | Capital reserve sem risk permit | 19 | capital gate on risk.permit.issued |

## Adversarial (G5)

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-RK-01 | Check com portfolioId org-A e intent org-B | RK_CROSS_TENANT reject |
| G5-RK-02 | PASS emitido; kill switch ativa; submit com permit antigo | RK_PERMIT_STALE |
| G5-RK-03 | LimitPolicy revogada; riskEpoch bumped; reserve com permit epoch antigo | RK_POLICY_STALE |

Top 5 → R08.

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
