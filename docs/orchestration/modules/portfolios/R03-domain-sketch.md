---
type: debate
---

# R03 — Esboço de domínio: `modules/portfolios`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-95**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## Agregados

### Portfolio

Container de exposição sob um titular e conta capital.

- `id`, `organizationId`, `ownerUserId`, `capitalAccountId`, `name`, `baseCurrency`
- `status`: `DRAFT` → `ACTIVE` → `DRAINING` → `CLOSED`
- `mandateRef?`: `{ grantId, allocationId }` — referência capital/governance, não duplica grant
- Invariante: `capitalAccountId` pertence ao mesmo `ownerUserId` (organizations)

### Position

Posição canônica agregada (spec 003 Position key).

- `id`, `organizationId`, `portfolioId`, `capitalAccountId`
- `instrumentId`, `positionSide` (`LONG` | `SHORT` | `CASH`), `book` (`TRADING` | `SETTLEMENT`)
- `quantity` (signed), `costBasis`, `costBasisMethodVersion`
- `asOfRevision`, `lastFillId?`, `lastLedgerEntryId?`
- Invariante PF-R02-INV-01: uma Position por key; quantity derivada de Holdings ou projector fill

### Holding

Lote atribuído com responsabilidade estratégica (spec 003 lot attribution).

- `id`, `positionId`, `portfolioId`
- `quantity`, `openFillId`, `openAt`, `costBasis`
- `attribution`: `{ allocationId?, deploymentId?, strategyDeploymentId? }`
- `status`: `OPEN` → `REDUCED` → `CLOSED`
- Invariante: soma Holdings.quantity por positionId = Position.quantity (mesmo sign)

### ValuationSnapshot

Marcação oficial asOf para NAV e risk (spec 003 ValuationSnapshot).

- `id`, `organizationId`, `portfolioId`, `asOf`, `valuationVersion`
- `status`: `DRAFT` → `CONFIRMED` → `SUPERSEDED`
- `priceRefs[]`: `{ instrumentId, observationId, asOf, qualityFlag }`
- `fxRefs[]`: `{ pair, observationId, asOf }`
- `navBase`, `navComponents` (cash, markedPositions, liabilities)
- `qualityFlags`: `STALE_PRICE` | `MISSING_FX` | `PROVISIONAL`
- Invariante: CONFIRMED imutável; correção via novo snapshot + supersede

### RebalancePlan

Plano de realocação **proposto** — não executa ordens.

- `id`, `organizationId`, `portfolioId`, `planVersion`
- `targetWeights[]`: `{ instrumentId, targetWeight, currentWeight }`
- `status`: `DRAFT` → `PROPOSED` → `APPROVED` → `EXECUTING` → `COMPLETED` | `CANCELLED`
- `approvalRef?`: `{ approverId, policyVersion, approvedAt }`
- `generatedBy`: `{ agentId?, deploymentId?, rationaleRef }`
- Invariante PF-R02-INV-11: transição EXECUTING exige TradeIntent(s) em decisions — portfolios não chama execution

### PositionReconciliationCase

Reconciliação posição vs fill/ledger (portfolios owner).

- `id`, `organizationId`, `portfolioId`, `positionId?`
- `caseKind`: `POSITION_VS_FILL` | `POSITION_VS_LEDGER` | `VALUATION_STALE`
- `ownerDomain` fixo `portfolios`
- Estados: `OPEN` → `INVESTIGATING` → `RESOLVED` | `ESCALATED`

## Fluxo fill → posição (R01 Q2)

**Decisão:** **assíncrono projector** — execution emite `execution.fill.confirmed.v1`; portfolios consumer valida idempotência, atualiza Position/Holding e persiste outbox `portfolios.position.updated.v1` na mesma transação PG. Ledger posting (`accounting.ledger.posted.v1`) reconcilia cash lines em projector separado ou mesma transação quando fill+cash já confirmados.

## Ports

| Port | Uso |
| --- | --- |
| ExecutionConsumerPort | aplica fill events → Position/Holding |
| AccountingConsumerPort | reconcilia cash position vs ledger posted |
| MarketDataPort | `getPriceAsOf`, `getFxAsOf` para ValuationSnapshot — read only |
| CapitalQueryPort | valida `allocationId`, `capitalAccountId` owner |
| OrganizationsPort | resolve Owner, valida Agency scope |
| StrategiesQueryPort | resolve `deploymentId` para attribution |
| GovernancePort | valida capability `portfolios.rebalance.approve` |
| RiskNotifyPort | emite `portfolios.exposure.snapshot.v1` (outbox) |

## Invariantes PF-R03-INV-*

| ID | Regra |
| --- | --- |
| PF-R03-INV-01 | Position quantity imutável exceto via fill projector ou audited adjustment |
| PF-R03-INV-02 | Idempotência: mesmo `idempotencyKey` fill → mesmo delta posição |
| PF-R03-INV-03 | ValuationSnapshot CONFIRMED exige todos priceRefs resolvíveis ou qualityFlag PROVISIONAL |
| PF-R03-INV-04 | RebalancePlan APPROVED exige grant + approvalRef válidos |
| PF-R03-INV-05 | Holding CLOSED não reabre — nova compra = novo Holding |
| PF-R03-INV-06 | Portfolio CLOSED rejeita novos fills exceto redução autorizada (DRAINING policy) |
| PF-R03-INV-07 | NAV = sum(cash×FX)+sum(marked×FX)−liabilities — método versionado em snapshot |

## Commands (sketch)

`createPortfolio` · `activatePortfolio` · `applyFillToPosition` · `confirmValuationSnapshot` · `proposeRebalancePlan` · `approveRebalancePlan` · `openPositionReconciliationCase` · `resolvePositionReconciliationCase`



## Ordem de rebuild (fill vs ledger)

| Prioridade | Fonte | Checkpoint | Regra |
| --- | --- | --- | --- |
| 1 | `execution.fill.confirmed.v1` | `lastFillId` + `asOfRevision` monotônico | projector fill atualiza Position.quantity e Holdings na mesma UoW |
| 2 | `accounting.ledger.posted.v1` | `lastLedgerEntryId` | projector cash reconcilia CASH position; nunca reduz quantity de instrument sem fill |
| 3 | Conflito fill duplicado | `idempotencyKey` do fill | replay → no-op (mesma revision) |
| 4 | Ledger atrasado | `PositionReconciliationCase` | abre `POSITION_VS_LEDGER` até ledger catch-up |
| 5 | Cross-tenant | `organizationId` em envelope | reject antes de mutar |

Rebuild determinístico: replay fills ordenados por `(occurredAt, eventId)` depois ledger cash lines por `(postedAt, entryId)`.

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
