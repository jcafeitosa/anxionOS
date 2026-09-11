---
type: debate
---
# R06 — Dependências: `modules/portfolios`

**Rodada:** R6  
**Data:** 2026-09-11  
**Issues:** ANX-95 · ANX-91 · ANX-93 · ANX-89 · ANX-58 · ANX-29 · pack ANX-389  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md).

## In / Out (R6)

**In:** fill.confirmed; ledger.posted; allocation.activated; MarketDataPort; StrategiesQueryPort; grant rebalance.approve; org scope; eventing P02.

**Out:** position.updated / valuation.confirmed / exposure.snapshot → risk/decisions/performance/graph. Sem mutate Allocation, JournalEntry, Deployment ou Neo4j driver.

## Non-goals

D-GOV-010 = **risk P06**. Sem import `execution/infrastructure`. Sem spec `accepted`. Sem ST08 live. Sem ANX-342/389 `done`.

## Ownership (dependências)

| Superfície | Dono |
| --- | --- |
| Position / Portfolio | **portfolios** |
| Fill | **execution** |
| JournalEntry | **accounting** |
| Allocation | **capital** |
| adapter-gateway | **KEEP** |

## Upstream

| Componente | Contrato | Notas |
| --- | --- | --- |
| **execution** | `execution.fill.confirmed.v1` | Gatilho principal position update |
| **accounting** | `accounting.ledger.posted.v1` | Reconcilia cash position vs ledger |
| **capital** | `capital.allocation.activated.v1` / CapitalQueryPort | MandateRef; valida account owner |
| **market-data** | MarketDataPort read | priceRef/fxRef em ValuationSnapshot |
| **strategies** | StrategiesQueryPort | deploymentId attribution em Holding |
| **governance** | `portfolios.rebalance.approve` grant | RebalancePlan approval |
| **organizations** | tenancy scope | orgId + ownerUserId em todas as queries |
| packages/contracts, eventing | outbox/journal `ownerDomain=portfolios` | P02 |

## Downstream

| Componente | Evento consumido |
| --- | --- |
| **risk** | `portfolios.position.updated.v1`, `portfolios.valuation.confirmed.v1`, `portfolios.exposure.snapshot.v1` |
| **decisions** | valuation + positions para TradeIntent bounds |
| **performance** | positions + valuation → P&L attribution |
| **graph** | portfolios.* → projeção Neo4j |
| **audit** | todos eventos portfolios.* |
| **operations** | reconciliation.opened |

## Ordem bootstrap S1–S2 (ANX-96)

1. organizations G7 (ANX-29) ✅
2. capital S1 schema + contracts (ANX-92 após ANX-91 G7)
3. market-data instrument stub (ANX-88 após ANX-87 G7)
4. execution fill event stub (SIMULATED)
5. portfolios S1: portfolio + position schema + contracts skeleton
6. portfolios S2: fill projector + `portfolios.position.updated.v1`

## Bloqueadores conhecidos

- **execution** módulo `not_started` — S2 usa fixture `execution.fill.confirmed.v1` em testes até execution G1
- **accounting** ANX-93 `in_review` — cash reconcile projector defer S3; contrato documentado em R04
- **strategies** ANX-89 `in_review` — deployment attribution defer S3; portfolio create sem deploymentId OK

→ **R07** ([R07-risks.md](./R07-risks.md))
