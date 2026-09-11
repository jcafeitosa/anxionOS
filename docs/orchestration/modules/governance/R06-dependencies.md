---
type: debate
---
# R06 — Dependências: `modules/governance`

**Rodada:** R6  
**Data:** 2026-09-11 · **Issue:** ANX-40 · pack ANX-389  
**Callers:** [R05-storage.md](./R05-storage.md) · [R07-risks.md](./R07-risks.md).

## In / Out (R6)

**In:** PrincipalLookup (identity); membership.* consumers (organizations); eventing; contracts; T01 via adapter (graph).

**Out:** TraversalEvaluator síncrono (orchestration); grant/epoch events → decisions/execution; ChangeProposal → simulation. Sem mutate AgentVersion, Goal/Run, PolicyVersion RISK.

## Non-goals

D-GOV-010 = **risk P06**. Sem import `organizations/infrastructure/**`, `graph/infrastructure/**`, `risk/infrastructure/**`. Sem spec `accepted`. Sem ST08 live. Sem ANX-342/389 `done`.

## Ownership (dependências)

| Superfície | Dono |
| --- | --- |
| Grant / AuthorityEpoch | **governance** |
| T01 kernel | **graph** |
| Principal | **identity** |
| PolicyVersion RISK | **risk** |
| adapter-gateway | **KEEP** |

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

Mapa v1 para R7.
