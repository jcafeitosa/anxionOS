---
type: debate
---
# R03 — Esboço de domínio: `modules/partners`

**Rodada:** R3  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-113  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [R04-contracts-events.md](./R04-contracts-events.md). Fatten in-place.

## Debate R3

**Arquiteto:** Referral (atribução), CommissionRule (versão imutável), CommissionAccrual, PayoutBatch.

**Executor:** `PartnersUnitOfWork`. Consumer billing é application.

**Crítico:** Accrual idempotente `(invoiceId, referralId)`. Refund não re-accrua.

**Security:** IDs lógicos de invoice — sem FK billing.

## Agregados

| Agregado | Notas |
| --- | --- |
| Referral | org + partnerPrincipal; status active/retired |
| CommissionRule | published imutável; nova versão para mudança |
| CommissionAccrual | invoiceId + referralId; amountHash |
| PayoutBatch | `SCHEDULED → PROCESSING → SETTLED \| FAILED \| REVERSED` |

**PTR-R03-01:** accrue só após `billing.invoice.paid.v1`.  
**PTR-R03-02:** `billing.refund.processed.v1` → reverse (não SETTLED cego).

## Ports

| Port | Uso |
| --- | --- |
| ReferralRepository | CRUD |
| CommissionRuleRepository | publish |
| AccrualRepository | accrue/reverse |
| PayoutBatchRepository | lifecycle |
| PartnersUnitOfWork | estado + journal + outbox |
| AgencyScopePort | tenancy |
| TraversalEvaluator | T01 |
| EventConsumerPort | billing paid/refund |

## Comandos

| Comando | Evento |
| --- | --- |
| RegisterReferral | `partners.referral.registered.v1` |
| PublishCommissionRule | `partners.rule.published.v1` |
| AccrueCommission | `partners.commission.accrued.v1` |
| ReverseCommission | `partners.commission.reversed.v1` |
| SchedulePayout | `partners.payout.scheduled.v1` |
| SettlePayout | `partners.payout.settled.v1` |

## Saída R3

Modelo v1 para R4.
