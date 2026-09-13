---
type: debate
status: draft
---

# R09 — Plano: `modules/partners`

**ANX-113** · impl **ANX-114**

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema partner+commission+payout | G2, G4 |
| S2 | invoice.paid projector | G3 |
| S3 | refund reversal + payout lifecycle | G3, G5 |
| S4 | HTTP v1 + graph stub | G6 parcial |

## Matriz G3

G3-PTR-S2-01 commission on paid · G3-PTR-S3-01 refund reversal idempotent · G3-PTR-S3-02 payout FAILED retry · G3-PTR-S3-03 cross-tenant

**Evidência impl:** `backend/tests/partners/` (ANX-114 baseline + ANX-522 S3)

**ANX-522** — S3 payout lifecycle implementado e verificado: module tests 21/21, PostgreSQL integration 2/2, fresh oracle 1925/1925 with 0 failures and 0 skips. Debate G7 permanece pendente em **ANX-113**.

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
