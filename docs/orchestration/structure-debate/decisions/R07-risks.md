---
type: debate
---

# R07 — Riscos: `modules/decisions`

**Issue:** ANX-97

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-DC-01 | **Authority bypass** — agente auto-aprova ou grant forjado | 20 | DC-R02-INV-08 FI03; GovernancePort + traversal T01; test G5 |
| R-DC-02 | **Stale epoch** — intent aprovado com authorityEpoch/riskEpoch revogado | 20 | DC-R02-INV-09; isPermitStale; consumer epoch.bumped |
| R-DC-03 | **Cross-tenant decision** — portfolioId de outra org | 20 | DC-R02-INV-12; org scope todas queries; G5-DC-01 |
| R-DC-04 | Intent hash drift pós-approval | 18 | Disposition vinculada intentHash; alteração = novo intent |
| R-DC-05 | Evidence mínima omitida | 16 | DC-R03-INV-06; FI09 block |
| R-DC-06 | SQLite decision local dev | 18 | DC-R05-05 CI |
| R-DC-07 | REAL mode bypass v1 | 10 | schema reject |
| R-DC-08 | Orchestration task conflito com decision state | 14 | correlationId; estados separados |
| R-DC-09 | Double submit mesmo intent | 19 | idempotency + permit single-use |
| R-DC-10 | Audit manifest perdido | 13 | manifestHash em outbox atômico |

## Adversarial (G5)

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-DC-01 | Principal org-A referencia portfolio org-B | DC_CROSS_TENANT reject |
| G5-DC-02 | Agent propõe e aprova mesmo intent (policy independent) | DC_INDEPENDENT_APPROVER_REQUIRED |
| G5-DC-03 | governance.authority_epoch.bumped após APPROVED, submit sem recheck | DC_AUTHORITY_STALE / DC_PERMIT_STALE |

Top 5 → R08.

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
