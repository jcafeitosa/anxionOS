---
status: draft
type: debate
---
# R10 — Pacote G0 (handoff): `modules/accounting`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issues:** ANX-389 (pack P1) · ANX-93 (debate histórico) · **ANX-94** (impl — **não** executada neste pack)  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem código de produto. Specs 001–005 **draft**. ANX-342 permanece `todo`. D-GOV-010 = **risk P06**.

## Classificação epistemológica

| Afirmação | Status |
| --- | --- |
| Debate R01–R10 neste dir | fechado P1 documental |
| Specs 001–005 | **draft** (ST08 0/23) |
| ANX-342 | **todo** — não hijack |
| D-GOV-010 | **risk P06** — fora |
| Pasta approvals/policies | **não criar** |
| Código `backend/modules/accounting` | pack ≠ G1/G7 |

## In scope documental

| Área | Entrega |
| --- | --- |
| Domínio | ChartOfAccounts, JournalEntry, LedgerPosting, FeePosting, ReconciliationCase |
| Contratos | `@anxionos/contracts/accounting/*` + eventos R04 |
| Persistência nomeada | PostgreSQL `accounting_chart_accounts`, `accounting_journal_entries` UNIQUE (org_id, idempotency_key), `accounting_ledger_postings`, `accounting_fee_postings`, `accounting_reconciliation_cases`, `accounting_ledger_balance_lines`, `accounting_command_journal` |
| Grafo | projector `graph:accounting:v1` — só ids/linhagem |
| API | `/v1/accounting` esboço R04 |
| Testes | G3-ACC-* / G5-ACC-* abaixo |

## Out of scope

| Item | Destino |
| --- | --- |
| Saldo/reserva autoritativa | capital |
| Position/NAV | portfolios |
| Invoice / PSP | billing |
| Neo4j driver | graph |
| D-GOV-010 / kill switch | risk P06 |
| Spec accepted | Owner + checklist |
| ANX-342 G7 | Owner |
| G1 código ANX-94 | issue distinta |

## Non-goals

- Nenhuma migration ST08 neste pack.
- SQLite **não** é ledger autoritativo (ACC-R05-01).
- Accounting **não** emite `capital.reservation.*` nem `portfolios.position.*`.
- Posted entry append-only; correção só via Reversal.
- Sem pasta `approvals/` / `policies/`.
- REAL mode reject v1.

## Oráculos G3 / G5 (fecho do pack)

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-ACC-S2-01 | G3 | balanced entry POSTED + postings na mesma UoW |
| G3-ACC-S2-02 | G3 | duplicate idempotency → mesmo entry_id |
| G3-ACC-S2-03 | G3 | cross-tenant reject |
| G3-ACC-S2-04 | G3 | REAL mode reject |
| G3-ACC-S2-05 | G3 | unbalanced reject |
| G5-ACC-01 | G5 | journal outra org → 403 |
| G5-ACC-02 | G5 | double posting / replay → mesmo entry |
| G5-ACC-03 | G5 | unbalanced reject (cross-check G3-ACC-S2-05) |

## Critérios de aceite **deste** pack (P1 documental)

| # | Critério |
| --- | --- |
| AC-P1-01 | In/out/non-goals explícitos |
| AC-P1-02 | Oráculos G3/G5 nomeados |
| AC-P1-03 | Tabelas PG nomeadas em R05 + R10 |
| AC-P1-04 | Decision log R08 com P1-ACC-* |
| AC-P1-05 | R09 **sem** greenlight G1 |

**Veredito P1:** G0 documental completo. **Não** autoriza G1. Próximo serial: [capital](../capital/ROUNDS.md).

```mermaid
flowchart TB
  doc[Pack modules/accounting] --> p1[P1 in_review ANX-389]
  p1 -.->|Owner| st08[ST08 spec accepted]
  p1 -.->|Owner| a342[ANX-342 G7]
  p1 -.->|ANX-94| g1[G1 código]
```

## Saída R10

G0 debate P1 fechado. ANX-389 evidência — não G7. ANX-342 `todo`. Specs 001–005 **draft**.
