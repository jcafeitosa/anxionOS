---
type: debate
---
# R04 — Contratos, API e eventos: `modules/partners`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-113 · ANX-114 (não impl)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). API esboço `/v1/partners` apenas. Sem schema de produção.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `partners` |
| eventType | `partners.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Segredos | **proibido** em DTO/evento |

**KEEP adapter-gateway** no pacote de contratos se já exportado.

## In / Out (R4)

**In:** GET/POST `/v1/partners/referrals`; GET `/v1/partners/accruals/:id`; POST `/v1/partners/payouts`; consumers billing paid/refund.

**Out:** envelope SDD; códigos PTR_*; eventos listados. **PTR-R04-01:** não emite `billing.*` nem `accounting.journal.*`.

## Non-goals

Não OpenAPI público neste pack. Não schema produção. Não pasta marketplace. Specs draft. ST08 0/23.

### Códigos

| Código | HTTP | Quando |
| --- | --- | --- |
| PTR_NOT_FOUND | 404 | |
| PTR_DUPLICATE_IDEMPOTENCY | 409 | |
| PTR_CROSS_TENANT | 403 | |
| PTR_GRANT_INVALID | 403 | T01 DENY |
| PTR_REFUND_ALREADY_REVERSED | 409 | |
| PTR_ACCRUAL_UNPAID | 409 | accrue sem paid |
| PTR_IDEMPOTENT_REPLAY | 200 | |

## Layout `@anxionos/contracts/partners/`

types/commands/queries/events/errors/index.

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `partners.referral.registered.v1` | graph, audit |
| `partners.rule.published.v1` | graph, audit |
| `partners.commission.accrued.v1` | accounting, audit |
| `partners.commission.reversed.v1` | accounting, audit |
| `partners.payout.scheduled.v1` | accounting, operations |
| `partners.payout.settled.v1` | accounting, audit |
| `partners.payout.failed.v1` | operations, audit |

**Consumers:** `billing.invoice.paid.v1` accrue; `billing.refund.processed.v1` reverse.  
**PTR-R04-01:** não emite `billing.*` nem `accounting.journal.*`.

## REST `/v1/partners/*`

| Método | Path | Grant |
| --- | --- | --- |
| GET | `/v1/partners/referrals` | partners.read |
| POST | `/v1/partners/referrals` | partners.admin + T01 |
| GET | `/v1/partners/accruals/:id` | partners.read |
| POST | `/v1/partners/payouts` | partners.payout + T01 |

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-PTR-01 | paid → um accrual |
| G3-PTR-02 | paid replay → mesmo accrual |
| G3-PTR-03 | refund → reverse idempotente |
| G3-PTR-04 | payout FAILED retry não duplica SETTLED |
| G5-PTR-01 | GET outra org 403 |
| G5-PTR-02 | T01 DENY 403 |

## Alternativas rejeitadas

Comissão em billing; ledger em partners; pasta marketplace; SQLite payout.

## Saída R4

Contratos v1 para R5.
