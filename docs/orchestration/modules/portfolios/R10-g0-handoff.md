---
status: draft
type: debate
---
# R10 — Pacote G0 (handoff): `modules/portfolios`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issues:** ANX-389 (pack P1) · ANX-95 (debate histórico) · **ANX-96** (impl — **não** executada neste pack)  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem código de produto. Specs 001–005 **draft**. ANX-342 permanece `todo`. D-GOV-010 = **risk P06**.

## Classificação epistemológica

| Afirmação | Status |
| --- | --- |
| Debate R01–R10 neste dir | fechado P1 documental |
| Specs 001–005 | **draft** (ST08 0/23) |
| ANX-342 | **todo** — não hijack |
| D-GOV-010 | **risk P06** — fora |
| Pasta approvals/policies | **não criar** |
| Código `backend/modules/portfolios` | pack ≠ G1/G7 |

## In scope documental

| Área | Entrega |
| --- | --- |
| Domínio | Portfolio, Position, Holding, ValuationSnapshot, RebalancePlan, PositionReconciliationCase |
| Contratos | `@anxionos/contracts/portfolios/*` + eventos R04 |
| Persistência nomeada | PostgreSQL `portfolios_portfolios`, `portfolios_positions`, `portfolios_holdings`, `portfolios_valuation_snapshots`, `portfolios_rebalance_plans`, `portfolios_position_reconciliation_cases`, `portfolios_exposure_lines`, `portfolios_command_journal` |
| Grafo | projector `graph:portfolios:v1` — portfolio→posição→instrumento |
| API | `/v1/portfolios` esboço R04 |
| Testes | G3-PF-* / G5-PF-* abaixo |

## Out of scope

| Item | Destino |
| --- | --- |
| Ledger | accounting |
| Reservation / Allocation | capital |
| Order / Fill canônico | execution (portfolios só consome fill) |
| Preço tick | market-data |
| Neo4j driver | graph |
| D-GOV-010 | risk P06 |
| Spec accepted | Owner + checklist |
| ANX-342 G7 | Owner |
| G1 código ANX-96 | issue distinta |

## Non-goals

- Nenhuma migration ST08 neste pack.
- SQLite **não** é Position autoritativa (PF-R05-01).
- RebalancePlan **não** envia ordem direto (PF-R02-INV-11).
- NAV Timescale sem ValuationSnapshot PG **não** confirma.
- Sem pasta `approvals/` / `policies/`.
- REAL venue position bypass reject v1.

## Oráculos G3 / G5 (fecho do pack)

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-PF-S2-01 | G3 | fill apply atualiza quantity |
| G3-PF-S2-02 | G3 | duplicate idempotency → same revision |
| G3-PF-S2-03 | G3 | cross-tenant reject |
| G3-PF-S2-04 | G3 | REAL mode reject |
| G3-PF-S2-05 | G3 | position key uniqueness |
| G3-PF-S4-01 | G3 | ledger lag → reconciliation OPEN |
| G5-PF-01 | G5 | positions outra org → 403 |
| G5-PF-02 | G5 | double fill → mesma revision |
| G5-PF-03 | G5 | position drift vs fills |

## Critérios de aceite **deste** pack (P1 documental)

| # | Critério |
| --- | --- |
| AC-P1-01 | In/out/non-goals explícitos |
| AC-P1-02 | Oráculos G3/G5 nomeados |
| AC-P1-03 | Tabelas PG nomeadas em R05 + R10 |
| AC-P1-04 | Decision log R08 com P1-PF-* |
| AC-P1-05 | R09 **sem** greenlight G1 |

**Veredito P1:** G0 documental completo. **Não** autoriza G1. Próximo serial: [risk](../risk/ROUNDS.md).

```mermaid
flowchart TB
  doc[Pack modules/portfolios] --> p1[P1 in_review ANX-389]
  p1 -.->|Owner| st08[ST08 spec accepted]
  p1 -.->|Owner| a342[ANX-342 G7]
  p1 -.->|ANX-96| g1[G1 código]
```

## Saída R10

G0 debate P1 fechado. ANX-389 evidência — não G7. ANX-342 `todo`. Specs 001–005 **draft**.
