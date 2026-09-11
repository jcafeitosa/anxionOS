---
type: debate
---
# R04 — Contratos e eventos: `modules/portfolios`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issues:** ANX-95 · ANX-58 · ANX-91 · ANX-93 · pack ANX-389  
**Callers:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R05-storage-pg.md](./R05-storage-pg.md).

## Convenções

`ownerDomain: portfolios` · `portfolios.<aggregate>.<action>.v1` · `executionMode` SIMULATED|PAPER only · payloads sem segredos venue

**KEEP adapter-gateway** se já exportado.

## In / Out (R4)

**In:** POST/GET portfolios, positions, valuation, rebalance-plans, reconciliation. Idempotency-Key em POST; grant `portfolios.*` + T01. Consumers: fill.confirmed, ledger.posted, allocation.activated/released, observation.recorded, grant.revoked.

**Out:** `portfolios.position.updated.v1` / valuation.confirmed / rebalance.* → risk, decisions, performance, graph. **Não** JournalEntry. **Não** Allocation. **Não** Order. Sem secrets.

## Non-goals

Não REAL v1. Não SQLite position. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não executar ordem a partir de RebalancePlan.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| Portfolio / Position / Holding / ValuationSnapshot / RebalancePlan | **portfolios** |
| Allocation / Reservation | **capital** |
| JournalEntry | **accounting** |
| Fill | **execution** |
| adapter-gateway | **KEEP** |

## HTTP `/v1/portfolios/*` (v1 debate)

| Método | Rota | Comando |
| --- | --- | --- |
| POST | `/portfolios` | createPortfolio |
| GET | `/portfolios/:id` | getPortfolio |
| GET | `/portfolios/:id/positions` | listPositions |
| GET | `/portfolios/:id/positions/:positionId` | getPosition |
| GET | `/portfolios/:id/valuation` | getValuationSnapshot (asOf) |
| POST | `/portfolios/:id/valuation/confirm` | confirmValuationSnapshot |
| POST | `/portfolios/:id/rebalance-plans` | proposeRebalancePlan |
| POST | `/rebalance-plans/:id/approve` | approveRebalancePlan |
| POST | `/reconciliation-cases` | openPositionReconciliationCase |
| POST | `/reconciliation-cases/:id/resolve` | resolvePositionReconciliationCase |

Idempotency-Key obrigatório em POST; scope `organizationId` + grant `portfolios.*`.

## Eventos emitidos v1

| eventType | Payload mínimo | Consumidores |
| --- | --- | --- |
| `portfolios.portfolio.created.v1` | portfolioId, organizationId, capitalAccountId | graph, capital, audit |
| `portfolios.portfolio.activated.v1` | portfolioId, allocationId? | strategies, risk |
| `portfolios.position.updated.v1` | positionId, portfolioId, instrumentId, quantity, asOfRevision | **risk**, decisions, performance, graph |
| `portfolios.holding.opened.v1` | holdingId, positionId, attribution | performance, audit |
| `portfolios.valuation.confirmed.v1` | snapshotId, portfolioId, navBase, asOf, qualityFlags[] | **risk**, performance, decisions |
| `portfolios.exposure.snapshot.v1` | portfolioId, grossExposure, netExposure, valuationVersion | risk, operations |
| `portfolios.rebalance.proposed.v1` | planId, portfolioId, targetWeights[] | decisions, audit |
| `portfolios.rebalance.approved.v1` | planId, approvalRef | decisions, execution (via intent) |
| `portfolios.reconciliation.opened.v1` | caseId, caseKind, positionId? | operations, audit |

## Eventos consumidos (portfolios)

| eventType | Ação |
| --- | --- |
| `execution.fill.confirmed.v1` | projector → `applyFillToPosition` |
| `accounting.ledger.posted.v1` | reconcilia cash Position vs ledger lines |
| `capital.allocation.activated.v1` | valida mandateRef em Portfolio |
| `capital.allocation.released.v1` | marca Portfolio DRAINING se policy |
| `market_data.observation.recorded.v1` | invalida valuation DRAFT stale (não auto-confirma) |
| `governance.grant.revoked.v1` | bloqueia novos rebalance APPROVED sob grant |

## Separação contratual (R02)

| Evento origem | portfolios faz | portfolios **não** faz |
| --- | --- | --- |
| `execution.fill.confirmed.v1` | Atualiza Position/Holding | Reservar capital |
| `accounting.ledger.posted.v1` | Reconcilia cash position | JournalEntry |
| `capital.allocation.activated.v1` | Valida mandateRef | Criar Allocation |
| `strategies.deployment.activated.v1` | Referencia deploymentId em Holding | Publicar estratégia |

## Erros institucionais

`PF_DUPLICATE_POSITION_KEY` · `PF_DUPLICATE_IDEMPOTENCY` · `PF_CROSS_TENANT` · `PF_GRANT_INVALID` · `PF_REAL_MODE_REJECTED` · `PF_INVALID_PRICE_REF` · `PF_PORTFOLIO_CLOSED` · `PF_ALLOCATION_MISMATCH` · `PF_VALUATION_STALE`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
