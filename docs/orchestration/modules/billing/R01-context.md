---
type: debate
---

# R01 — Contexto: `modules/billing`

**Componente:** modules/billing  
**Rodada:** R1 — Inventário documental  
**Pacote SDD:** P07  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · debate estrutura ANX-42 · debate módulo **ANX-103**  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [ROUNDS.md](./ROUNDS.md).  
**Fonte debate thin:** `brain/notes/anxionos-thin-billing-debate.md` (OpenKnowledge).

## In / Out (R1)

**In:** inventário de cobrança comercial (assinatura, invoice, refund, webhook).

**Out:** este contexto. **Não** ledger de trading (`accounting`). Sem código de produto.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não pastas `approvals/`/`policies/`/`marketplace/`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Subscription / Invoice / Refund / WebhookReceipt | **billing** |
| JournalEntry | **accounting** |
| adapter-gateway | **KEEP** |

## Propósito

Cobrança **comercial da plataforma** (assinatura, invoice, refund, webhook). **Não** é ledger de trading. Código de produto **ausente**; este pack é G0 documental. Spec 003 ciclo de investimento permanece **draft** (ST08 0/23). Não criar pastas `approvals/` nem `policies/`. D-GOV-010 fica em **risk P06**.

## O módulo POSSUI (estado)

- Subscription e BillingPlan da plataforma (org-scoped)
- Invoice + InvoiceLine (usage rollup, não ticks)
- Refund
- WebhookReceipt (idempotência de pagamento)

## O módulo NÃO POSSUI

| Item | Dono |
| --- | --- |
| Ledger / lançamentos de trading | accounting |
| Comissão e payout | partners |
| Usage bruto de provider IA | connections (`connections.usage.recorded.v1`) |
| Grants / T01 | governance |
| Identidade de sessão | identity |
| Cobrança confirmada em SQLite | **proibido** |

## Dependências

| Direção | Componentes |
| --- | --- |
| Upstream | organizations, identity, connections (usage eventos), governance (T01 `billing.*`) |
| Downstream | accounting (invoice paid / refund), partners (accrual), operations, graph projector, audit |

## Armazenamento (mapa draft)

PostgreSQL autoritativo (`billing_*` + journal + outbox). Neo4j: projeção `graph:billing:v1` (org→plano→fatura, **sem** valor de capital). SQLite: **nenhuma** cobrança local. Timescale/pgvector: **não** neste módulo. Fonte: `brain/notes/anxionos-storage-ownership.md` (**draft**; ST08 0/23).

## Spec / ADR

| Artefato | Papel | Status |
| --- | --- | --- |
| ADR0002 | módulo físico `billing/` | accepted |
| ADR0004 | PG + Neo4j; sem SQLite autoritativo | accepted |
| spec 001 | envelope institucional, tenancy | **draft** |
| spec 003 | ciclo investimento — billing **não** substitui accounting | **draft** |
| PC 29 marketplace | composto spec 007 — **sem pasta** | P1 |

## Estado do código

**Ausente.** ANX-104 não começa neste pack.

## Perguntas fechadas neste pack (R2+)

Onboarding billing vs organizations → contrato + evento `organizations.subscription.changed.v1`. Usage → invoice via consumer assíncrono (D-CX-041). Webhook: secrets só infra; replay por `(provider, external_id)`. Refund idempotente; partners reverte comissão por `refundId`.

## Próxima rodada

→ **R02** ([R02-boundaries.md](./R02-boundaries.md))
