---
type: debate
status: draft
---
# R08 — Decision log: `modules/partners`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-113  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md).

## In / Out (R8)

**In scope:** ownership Referral/Rule/Accrual/PayoutBatch; PG vs grafo; billing events; KEEP adapter-gateway.

**Out of scope:** aceite spec; ANX-342 done; stamp `accepted`; ST08 live; G7 ANX-114; ANX-389 `done`.

## Non-goals

Não reabrir R02. Não fake ST08. Não criar `marketplace/`.

## Ownership consolidado

| Superfície | Dono |
| --- | --- |
| Referral / Rule / Accrual / PayoutBatch | **partners** |
| Invoice | **billing** |
| Ledger | **accounting** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-PTR-001 | Dono Referral/Rule/Accrual/PayoutBatch | fechada |
| D-PTR-002 | Accrual via billing.paid; ledger via eventos | fechada |
| D-PTR-003 | PG autoritativo; SQLite proibido | fechada |
| D-PTR-004 | UNIQUE invoiceId+referralId | fechada |
| D-PTR-005 | graph:partners:v1 async | fechada |
| D-PTR-006 | Sem pasta marketplace/approvals/policies | fechada |
| D-PTR-007 | D-GOV-010 = risk P06 | fechada |
| D-PTR-008 | RLS defer P09 | fechada |
| P1-PTR-01 | Pack canônico docs/orchestration/modules/partners/ | fechada |
| P1-PTR-02 | Spec 001–005 **draft** | fechada |
| P1-PTR-03 | Não é G7 código nem ANX-342 | fechada |

## Saída R8

Aprovado para R9.
