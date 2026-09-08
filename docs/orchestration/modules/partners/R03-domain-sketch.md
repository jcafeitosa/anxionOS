---
type: debate
---

# R03 — Esboço de domínio: `modules/partners`

**Issue:** ANX-113

## Agregados

Referral, CommissionRule, CommissionAccrual, PayoutBatch

## Nota

Commission idempotente por invoiceId+referralId

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | billing.refund.processed.v1 reversal |
| EventEmitterPort | partners.commission.accrued.v1, partners.payout.scheduled.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
