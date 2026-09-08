---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/accounting`

**Issue:** ANX-93 · impl: **ANX-94** · gate: ANX-58

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema chart+journal, contracts skeleton, ensureSchema | G2, G4 |
| **P06-S2** | fill projector + `accounting.ledger.posted.v1` + idempotency | G3, G5 |
| **P06-S3** | fee postings + balance snapshot read model | G3 |
| **P06-S4** | reconciliation case OPEN/RESOLVE + HTTP read | G3 |
| **P06-S5** | graph:accounting:v1 projector stub | G6 parcial |
| **P06-S6** | billing.invoice.paid consumer (após billing P07) | defer |

## Matriz G3

G3-ACC-S2-01 balanced entry · G3-ACC-S2-02 duplicate idempotency → same entry · G3-ACC-S2-03 cross-tenant reject · G3-ACC-S2-04 REAL mode reject · G3-ACC-S2-05 unbalanced reject

## Fixtures v1

- `execution.fill.confirmed.v1` SIMULATED fixture até execution G1
- ChartOfAccounts seed por org em migration S1

**ANX-94** — blocked_by ANX-93 G7

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
