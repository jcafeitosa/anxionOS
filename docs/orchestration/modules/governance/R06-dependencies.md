---
type: debate
---

# R06 — Dependências: `modules/governance`

**Rodada:** R6 · **Data:** 2026-09-08 · **Issue:** ANX-40

## Decisões-chave

| ID | Decisão |
| --- | --- |
| D-R6-GOV-01 | `PrincipalLookup` via identity port — fail-closed em IssueGrant |
| D-R6-GOV-02 | Consumer `organizations.membership.activated.v1` → grant baseline owner |
| D-R6-GOV-03 | Consumer `membership.revoked.v1` → close derived grants + epoch bump |
| D-R6-GOV-04 | `TraversalEvaluator` adapter chama graph T01 — sem Neo4j no módulo |
| D-R6-GOV-05 | orchestration importa port público — não `governance/infrastructure/**` |
| D-R6-GOV-06 | risk PolicyVersion kind=RISK — governance só PolicyReference |

## Upstream

| Módulo | Uso |
| --- | --- |
| identity | PrincipalLookup |
| organizations | Eventos membership.* (async consumer) |
| packages/eventing | journal + outbox |
| packages/contracts | governance/* + graph T01 types |
| graph | T01 kernel (adapter downstream call) |

## Downstream

| Módulo | Relação |
| --- | --- |
| graph | Projector `graph:governance:v1` |
| orchestration | `TraversalEvaluator` síncrono |
| decisions/execution | Revalidação epoch |
| simulation | ChangeProposal aprova promoção |

## Imports proibidos

- `organizations/infrastructure/**`
- `graph/infrastructure/**`
- `risk/infrastructure/**`

## Saída R6

✅ Mapa v1 fechado para R7.
