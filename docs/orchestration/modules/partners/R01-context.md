---
type: debate
---

# R01 — Contexto: `modules/partners`

**Componente:** modules/partners  
**Rodada:** R1 — Inventário documental  
**Pacote SDD:** P07  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · ANX-42 · **ANX-113**  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [ROUNDS.md](./ROUNDS.md).  
**Fonte:** `brain/notes/anxionos-thin-partners-debate.md` (OpenKnowledge).

## Propósito

Atribuição comercial: referrals, regras de comissão, acruo e payouts. **Não** emite invoice paid (billing) nem ledger (accounting). Marketplace é composto spec 007 — **sem pasta física**. Código de produto **ausente**. Specs 001–005 **draft**. D-GOV-010 em **risk P06**. Sem `approvals/`/`policies/`.

## O módulo POSSUI

Referral, CommissionRule, CommissionAccrual, PayoutBatch (e estados SETTLED/FAILED/REVERSED).

## O módulo NÃO POSSUI

| Item | Dono |
| --- | --- |
| Invoice / webhook PSP | billing |
| Ledger / JournalEntry | accounting |
| Product listing | PC 10/29 composto |
| Membership | organizations |
| Approval / D-GOV-010 | governance / risk P06 |

## Dependências

| Direção | Componentes |
| --- | --- |
| Upstream | billing (`invoice.paid` / `refund.processed`), organizations, identity, governance T01 |
| Downstream | accounting (efeito do acruo/payout), operations, graph, audit, Partner console (P07) |

## Armazenamento (mapa draft)

PG `partners_*` + journal + outbox. Neo4j `graph:partners:v1` (parceiro→campanha→receita **ids**). SQLite **sem** payout autoritativo. ST08 **0/23**.

## Spec / ADR

| Artefato | Status |
| --- | --- |
| ADR0002 partners/ | accepted |
| ADR0004 PG | accepted |
| spec 003 comercial vs ledger | **draft** |
| PC 29 | composto — não criar pasta |

## Próxima rodada

→ **R02** ([R02-boundaries.md](./R02-boundaries.md))
