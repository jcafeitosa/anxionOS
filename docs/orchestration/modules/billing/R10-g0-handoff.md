---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/billing`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issues:** ANX-389 (pack P1) · ANX-103 (debate histórico) · **ANX-104** (impl — **não** executada aqui)  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem código de produto.

## G0 — Escopo documental / G1 futuro

### In scope

| Área | Entrega |
| --- | --- |
| Domínio | Subscription, Invoice, Refund, WebhookReceipt, UsageAggregation |
| Contratos | `@anxionos/contracts/billing/*` + eventos v1 R04 |
| Persistência | PostgreSQL billing_* + journal + outbox (ADR0004) |
| Ports | EventConsumer, PaymentProviderPort, TraversalEvaluator |
| API | `/v1/billing` esboço R04 |
| Testes | G3-BIL-* ; G5-BIL-01..05 |

### Out of scope

| Item | Destino |
| --- | --- |
| Ledger | accounting |
| Comissão / payout | partners |
| Usage bruto | connections |
| Neo4j driver | graph |
| Pasta marketplace/ | PC 29 — não criar |

## Non-goals

- Nenhuma migration ST08 neste pack.
- Specs 001–005 **draft**; ANX-342 `todo`; D-GOV-010 = risk P06.
- Billing não é ledger; pasta marketplace/ não criar.
| D-GOV-010 | risk P06 |
| Spec 001–005 accepted | Owner + checklist (ST08 0/23) |
| ANX-342 G7 | Owner — **não** marcar done |
| G7 código | Owner + ANX-104 |

## PC-G0 avaliação (debate)

| ID | Status |
| --- | --- |
| PC-G0-01..03 | R1–R10 fat neste diretório |
| PC-G0-04 | spec 001/003 **draft** |
| PC-G0-05 | R06–R08 sem bloqueio documental |
| PC-G0-06 | ANX-103 contrato P07 |
| PC-G0-07 | Top 5 riscos R07 |
| PC-G0-08 | graph:billing:v1 |
| PC-G0-09 | RLS application-only D-BIL-011 |
| PC-G0-10 | Impl issue ANX-104 existe — **não** é este slice |

**Veredito P1:** pack G0 **documental completo** (profundidade agents-like). **Não** autoriza G1. Specs **draft**. Próximo serial: [partners](../partners/ROUNDS.md).

## Saída R10

G0 debate P1. ANX-389 permanece evidência — não G7 de produto. ANX-342 permanece `todo`.
