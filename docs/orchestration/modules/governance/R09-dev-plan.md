---
type: debate
---

# R09 — Plano de implementação: `modules/governance`

**Rodada:** R9 · **Data:** 2026-09-08 · **Issue:** ANX-40 · **Impl:** ANX-30

## Pré-requisitos G1

| Gate | Evidência |
| --- | --- |
| R10 G0 | R10-g0-handoff.md |
| identity G7 | ANX-28 done — getPrincipalById |
| eventing schema | ANX-27 aceite |
| organizations events | ANX-29 membership.* publicados |

## Slices

| Slice | Entrega | Gates |
| --- | --- | --- |
| **S1** | Schema PG + command journal + AuthorityEpochStore | G3 schema test |
| **S2** | IssueGrant, RevokeGrant + GK03 epoch bump + eventos | G3 unit |
| **S3** | Consumer membership.activated/revoked | G3 integration |
| **S4** | ChangeProposal + ResolveApproval | G3 |
| **S5** | TraversalEvaluator adapter → graph T01 | G3 contract |
| **S6** | REST `/v1/agencies/:agencyId/grants` + AR01 boundary | G3, G5 |

## Árvore ADR0002

```text
backend/modules/governance/src/
  domain/ entities, ports
  application/ commands, queries, consumers
  infrastructure/ persistence, adapters (identity, graph-t01)
  index.ts
```

## Matriz testes G3

| ID | Cenário |
| --- | --- |
| G3-GOV-01 | IssueGrant idempotente |
| G3-GOV-02 | RevokeGrant bump epoch |
| G3-GOV-03 | membership.revoked fecha derived grants |
| G3-GOV-04 | Delegation excede parent → 409 |
| G3-GOV-05 | T01 timeout → DENY |

## Saída R9

✅ Plano G1 para ANX-30.
