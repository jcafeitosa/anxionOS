---
type: debate
status: draft
---
# R08 — Decision log: `modules/billing`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-103  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-BIL-001–007 (dono Invoice, usage async, PG, graph projector).

**Out:** este log. **Não** fecha ANX-389. Sem ST08 live.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| Subscription / Invoice / Refund / WebhookReceipt | **billing** |
| ledger | **accounting** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| D-BIL-001 | Dono Subscription/Invoice/Refund/WebhookReceipt | R1–R3 | fechada |
| D-BIL-002 | Usage via `connections.usage.recorded.v1` assíncrono; não persiste ledger | R2 R6 | fechada |
| D-BIL-003 | PG autoritativo; SQLite proibido | R5 | fechada |
| D-BIL-004 | UsageAggregation idempotente por usageRecordId | R3 R5 | fechada |
| D-BIL-005 | graph:billing:v1 async | R5 R6 | fechada |
| D-BIL-006 | Refund só após paid; partners reverte por evento | R3 R4 | fechada |
| D-BIL-007 | Sem pasta marketplace/products/approvals/policies | P1 | fechada |
| D-BIL-008 | Sem secrets em eventos/DTOs | R4 R7 | fechada |
| D-BIL-009 | T01 fail-closed pré-issue/refund | R6 | fechada |
| D-BIL-010 | D-GOV-010 não é deste módulo (risk P06) | R7 | fechada |
| D-BIL-011 | RLS defer P09 | R5 | fechada |
| P1-BIL-01 | Pack canônico em `docs/orchestration/modules/billing/` | P1 | fechada |
| P1-BIL-02 | Spec 001–005 permanecem **draft** até checklist Owner | P1 | fechada |
| P1-BIL-03 | Este pack não é G7 de código nem ANX-342 | P1 | fechada |

## Saída R8

Decision log aprovado para R9.
