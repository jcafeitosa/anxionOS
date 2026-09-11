---
status: draft
type: debate
---
# R09 — Plano de implementação: `modules/accounting`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue:** ANX-93 · impl: **ANX-94** · gate: ANX-58 · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Plano **draft**. Sem migration neste artefato.

## In / Out (R9)

**In:** slices P06-S1–S6; G3-ACC-S2-*; fixture fill SIMULATED.

**Out:** ordem de slices. **Não** ST08. **Não** ANX-389 `done`. Billing consumer S6 defer. Graph S5 parcial.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não G7 ANX-94 neste pack.

## Ownership (plano)

| Superfície | Dono |
| --- | --- |
| chart + journal + fill projector | **accounting** (ANX-94) |
| fill fixture | **execution** |
| invoice.paid consumer | **billing** (S6) |
| adapter-gateway | **KEEP** |

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

**ANX-94** — blocked_by ANX-93 G7. Pack ANX-389 **não** `done`.

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
