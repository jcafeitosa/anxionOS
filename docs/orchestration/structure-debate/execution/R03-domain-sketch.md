---
type: debate
---

# R03 — Esboço de domínio: `modules/execution`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-101**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## Agregados

### VenueAdapterRef

Referência operacional a binding **connections** — sem materializar segredo.

- `id`, `organizationId`, `connectionId`, `adapterKind` (`SIMULATOR` | `PAPER_STUB` | `PAPER_BROKER`)
- `executionMode`: SIMULATED | PAPER (REAL proibido v1)
- `capabilities[]`: `SUBMIT_ORDER`, `CANCEL_ORDER`, `STREAM_FILLS`
- `status`: ACTIVE → SUSPENDED | REVOKED
- `secretScope`: `connections` only — runtime via ConnectionsPort

### ExecutionSession

Unidade de trabalho correlacionada a intent/decision.

- `id`, `organizationId`, `decisionId`, `intentHash`, `tradeIntentId?`
- `reservationId`, `riskPermitId`, `executionPermitId`
- `venueAdapterRefId`, `executionMode`
- `authorityEpoch`, `riskEpoch` (snapshot na abertura)
- `status`: OPEN → SUBMITTING → PARTIALLY_FILLED → FILLED | CANCELLED | REJECTED | EXPIRED
- `openedAt`, `closedAt?`, `correlationId`

### Order

- `id`, `organizationId`, `executionSessionId`, `intentHash`
- `clientOrderId` (idempotência submit)
- `instrumentId`, `side`, `orderType`, `quantity`, `limitPrice?`, `timeInForce`
- `reservationId`, `riskPermitId`, `executionPermitId`
- `venueAdapterRefId`, `venueOrderId?`
- `lifecycleState`: PENDING → SUBMITTED → PARTIALLY_FILLED → FILLED | CANCELLED | REJECTED | EXPIRED
- `submittedAt`, `expiresAt?`

### Fill

- `id`, `organizationId`, `orderId`, `executionSessionId`
- `fillId` (interno), `venueFillId?` (unique per adapter quando presente)
- `quantity`, `price`, `feeAmount?`, `feeCurrency?`
- `filledAt`, `liquidityFlag?` (`MAKER` | `TAKER`)
- `status`: CONFIRMED | REVERSED (reversal via novo evento, não delete)
- Invariante: soma fills CONFIRMED ≤ order.quantity (partial OK)

### OrderAttempt

Tentativa de dispatch (auditoria + retry policy).

- `id`, `orderId`, `attemptNo`, `adapterKind`, `requestHash`, `responseCode`
- `status`: SENT → ACK | REJECT | TIMEOUT
- `errorCode?`, `sentAt`

### ReconciliationCase (venue)

- `id`, `organizationId`, `caseKind`: `ORDER_STATUS_MISMATCH` | `FILL_MISSING` | `DUPLICATE_VENUE_FILL`
- `orderId?`, `fillId?`, `venueAdapterRefId`
- `ownerDomain`: execution
- Estados: OPEN → INVESTIGATING → RESOLVED | ESCALATED

## Ports

| Port | Uso |
| --- | --- |
| DecisionsQueryPort | TradeIntent por intentHash |
| RiskConsumePort | consume RiskPermit single-use |
| GovernanceQueryPort | validate ExecutionPermit + authorityEpoch |
| CapitalQueryPort | validate reservation ativa |
| ConnectionsDispatchPort | resolve VenueAdapterRef + dispatch SIMULATED/PAPER |
| MarketDataPort | price sanity check opcional pre-submit |
| AccountingNotifyPort | outbox fill.confirmed |
| PortfoliosNotifyPort | outbox fill.confirmed |
| CapitalNotifyPort | outbox fill.confirmed (reservation release) |
| AuditNotifyPort | lineage manifest |

## Invariantes EX-R03-INV-*

| ID | Regra |
| --- | --- |
| EX-R03-INV-01 | Order imutável em campos material pós-SUBMITTED (correção = cancel+new) |
| EX-R03-INV-02 | Fill CONFIRMED imutável — reversal via evento dedicado |
| EX-R03-INV-03 | ExecutionSession fecha terminal quando todos orders terminal |
| EX-R03-INV-04 | clientOrderId replay → mesmo orderId (idempotência) |
| EX-R03-INV-05 | venueFillId duplicate → reject ou ReconciliationCase |
| EX-R03-INV-06 | Permit consume atômico com Order insert |
| EX-R03-INV-07 | Session.executionMode = Order.executionMode = AdapterRef.executionMode |
| EX-R03-INV-08 | CONFIG_REQUIRED quando permit/reservation ausente |
| EX-R03-INV-09 | Quantity precision por instrument registry |

## Commands

`registerVenueAdapterRef` · `openExecutionSession` · `submitOrder` · `cancelOrder` · `recordFill` · `confirmFill` · `openVenueReconciliationCase` · `resolveVenueReconciliationCase`

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
