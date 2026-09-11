---
type: debate
---
# R08 — Decision log: `modules/graph`

**Rodada:** R8 · 2026-09-11 · ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md)  
**Histórico:** [structure R08](../../structure-debate/graph/R08-decision-log.md) (D-GR-001..044)

## Objetivo

Consolidar P1 neste diretório. Structure-debate permanece histórico. **Não** reabre ADR0001 (proposto). Spec 001 **draft**. Pack ≠ G7 código. ANX-342 permanece `todo`.

## In / Out (R8)

**In:** D-GR / GK-R02 / P1-GRP (registry T01–T03, Neo4j adapter exclusivo, inbox, poison, projectionPending, ST08 0/23).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-389. Sem ST08 live.

## Non-goals

Não Cypher em apps. Não SQLite institucional. Não 24º gateway. Não spec `accepted`. Não ANX-342/389 `done`.

**KEEP adapter-gateway**.

## Ownership

Graph: catálogo, inbox, rebuild, adapter Neo4j, dispatcher.
**Não:** grants, capital, orders, Goal/Run, AgentVersion, journal dos donos.

## Decisões P1 (canônicas neste pack)

| ID | Decisão | Status |
| --- | --- | --- |
| GK-R02-01 / D-GR-004 | Registry único; T01–T03 kernel puro | fechada |
| GK-R02-02 / D-GR-005 | Neo4j adapter exclusivo | fechada |
| GK-R02-03 / D-GR-006 | Dispatcher roteia; Kernel não persiste negócio | fechada |
| GK-R02-04 / D-GR-007 | Consumers `graph:owner:v1` no módulo graph | fechada |
| GK-R02-05 / D-GR-012 | `projectionPending` default async | fechada |
| D-GR-003 | Zero credencial Neo4j | fechada |
| D-GR-009 | User projetado ≠ Principal PG | fechada |
| D-GR-015 | NODE_NOT_PROJECTED 409 ≠ 404 | fechada |
| D-GR-020 | T01 ALLOW+intentHash nunca cacheável | fechada |
| D-GR-023 | Inbox `(eventId, consumerName)` | fechada |
| D-GR-028 | Poison max_attempts=5 → DLQ | fechada |
| GK-R08-02 | Partial rebuild operacional **deferido** | fechada |
| P1-GRP-01 | Pack canônico `modules/graph` | fechada |
| P1-GRP-02 | Structure-debate histórico | fechada |
| P1-GRP-03 | Spec 001 draft até checklist Owner | fechada |
| P1-GRP-04 | Pack ≠ G7 código / ANX-342 | fechada |
| P1-GRP-05 | D-GOV-010 não é deste módulo | fechada |
| P1-GRP-06 | ST08 0/23 — sem stamp accepted | fechada |

## Ownership (resumo)

Graph: catálogo, inbox, rebuild, adapter Neo4j, dispatcher.  
**Não:** grants, capital, orders, Goal/Run, AgentVersion, journal dos donos.

## Oráculos que R09 deve preservar

G3-GRP-01..03 · G5-GRP-01..02 · AR04 / AR05.

## Alternativas rejeitadas

Cypher em apps; SQLite institucional; 24º gateway; spec accepted por este pack; marcar ANX-342 done.

## Saída R8

Para [R09](./R09-dev-plan.md).
