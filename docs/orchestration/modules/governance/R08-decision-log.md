---
type: debate
---
# R08 — Decision log: `modules/governance`

**Rodada:** R8  
**Data:** 2026-09-11 · **Issue:** ANX-40 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-GOV-001–010 + PC-G0 (ownership grants, T01 em graph, GK03, D-GOV-010 defer P06).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-40/389. Sem ST08 live.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não ANX-342/389 `done`. Não enforcement D-GOV-010 aqui.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| grants, delegations, mandates, approvals, authorityEpoch | **governance** |
| PolicyVersion RISK / kill switch | **risk** |
| T01 kernel | **graph** |
| adapter-gateway | **KEEP** |

## Decisões consolidadas (D-GOV-001+)

| ID | Decisão | Status |
| --- | --- | --- |
| D-GOV-001 | governance dono grants, delegations, mandates, approvals, authorityEpoch | draft |
| D-GOV-002 | risk dono PolicyVersion RISK e kill switch | draft |
| D-GOV-003 | graph executa T01; governance persiste grants + epoch | draft |
| D-GOV-004 | Prefixo PG `governance_*` + command journal | draft |
| D-GOV-005 | Eventos `ownerDomain: governance`, sufixo `.v1` | draft |
| D-GOV-006 | Consumer membership.activated → grant baseline owner | draft |
| D-GOV-007 | RevokeGrant bump authorityEpoch monotônico (GK03) | draft |
| D-GOV-008 | TraversalEvaluator port público; adapter → graph | draft |
| D-GOV-009 | ChangeProposal HIERARCHY_MODE via ADR0005/spec006 | draft |
| D-GOV-010 | v1 sem PolicyReference enforcement cross-risk (defer P06) | deferido |

## Pré-condições G0 (PC-G0)

| ID | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | R01–R08 debate neste pack | draft |
| PC-G0-02 | R09 plano slices | draft (R09) |
| PC-G0-03 | R10 handoff | draft (R10) |
| PC-G0-04 | identity G7 ANX-28 | pendente |
| PC-G0-05 | organizations membership events em produção | ANX-29 in_review |
| PC-G0-06 | graph T01 adapter testável | ANX-32 |

## Saída R8

Decision log para R9/R10. Pack ANX-389 **não** `done`.
