---
type: debate
---

# R08 — Decision log: `modules/governance`

**Rodada:** R8 · **Data:** 2026-09-08 · **Issue:** ANX-40

## Decisões consolidadas (D-GOV-001+)

| ID | Decisão | Status |
| --- | --- | --- |
| D-GOV-001 | governance dono grants, delegations, mandates, approvals, authorityEpoch | ✅ |
| D-GOV-002 | risk dono PolicyVersion RISK e kill switch | ✅ |
| D-GOV-003 | graph executa T01; governance persiste grants + epoch | ✅ |
| D-GOV-004 | Prefixo PG `governance_*` + command journal | ✅ |
| D-GOV-005 | Eventos `ownerDomain: governance`, sufixo `.v1` | ✅ |
| D-GOV-006 | Consumer membership.activated → grant baseline owner | ✅ |
| D-GOV-007 | RevokeGrant bump authorityEpoch monotônico (GK03) | ✅ |
| D-GOV-008 | TraversalEvaluator port público; adapter → graph | ✅ |
| D-GOV-009 | ChangeProposal HIERARCHY_MODE via ADR0005/spec006 | ✅ |
| D-GOV-010 | v1 sem PolicyReference enforcement cross-risk (defer P06) | ⏳ Deferido |

## Pré-condições G0 (PC-G0)

| ID | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | R01–R08 concluídos | ✅ |
| PC-G0-02 | R09 plano slices | ✅ (R09) |
| PC-G0-03 | R10 handoff | ✅ (R10) |
| PC-G0-04 | identity G7 ANX-28 | ⏳ Pendente |
| PC-G0-05 | organizations membership events em produção | ⏳ ANX-29 in_review |
| PC-G0-06 | graph T01 adapter testável | ⏳ ANX-32 in_progress |

## Saída R8

✅ Decision log para R9/R10.
