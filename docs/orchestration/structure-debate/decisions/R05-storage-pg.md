---
type: debate
---

# R05 — Armazenamento: `modules/decisions`

**Issue:** ANX-97

## Decisão R05

**PostgreSQL** único journal de DecisionRecord, Proposal, TradeIntent, Disposition, AuthorityRef. Neo4j projeta cadeia agente→evidência→decisão→intenção. SQLite rascunho local **sem efeito** — proibido para estado autoritativo.

## Matriz

| Dado | Engine |
| --- | --- |
| decisions, proposals, trade_intents, dispositions, authority_refs | **PostgreSQL** |
| command_journal, outbox (`ownerDomain=decisions`) | **PostgreSQL** |
| Projeção decisão→intent | **Neo4j** async |

## Invariantes DC-R05-*

| ID | Regra |
| --- | --- |
| DC-R05-01 | Nenhum Decision/Intent autoritativo fora PG |
| DC-R05-02 | Mutação + outbox mesma transação |
| DC-R05-03 | idempotency_key único por org |
| DC-R05-04 | TradeIntent append-only pós-submit |
| DC-R05-05 | SQLite rejeitado em CI |
| DC-R05-06 | owner_domain = decisions |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
