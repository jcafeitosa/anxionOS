---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/capital`

**Issue:** ANX-91 · impl: **ANX-92** · gate: ANX-58

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema core, contracts skeleton, registerCapitalAccount | G2, G4 |
| **P06-S2** | Allocation + reserveForIntent + releaseReservation + consumeReservation + outbox | G3, G5 |
| **P06-S3** | accounting.ledger.posted consumer (settled lag) | G3 |
| **P06-S4** | balance.snapshot + HTTP available + FX as-of | G3 |
| **P06-S5** | graph:capital:v1 projector stub | G6 parcial |

## Lifecycle reserva (R03)

`HELD` → `CONSUMED` | `RELEASED` | `EXPIRED` — release idempotente; consume exige `intentHash` estável; revoke grant → auto-release HELD.

## Matriz G3

| ID | Cenário | Slice |
| --- | --- | --- |
| G3-CAP-S2-01 | insufficient available | S2 |
| G3-CAP-S2-02 | grant invalid / epoch stale | S2 |
| G3-CAP-S2-03 | FI02 concurrency (duas reservas) | S2 |
| G3-CAP-S2-04 | REAL mode reject | S2 |
| G3-CAP-S2-05 | releaseReservation idempotent | S2 |
| G3-CAP-S2-06 | consumeReservation após release → reject | S2 |
| G3-CAP-S2-07 | grant revoked → HELD auto-released | S2 |
| G3-CAP-S3-01 | ledger posted lag — available só após settled | S3 |
| G3-CAP-S4-01 | FX as-of — available baseCurrency | S4 |

## Matriz G5

G5-CAP-01 cross-tenant command journal · G5-CAP-02 replay stale epoch · G5-CAP-03 double consume retry

**Evidência impl:** `backend/tests/capital/integration/capital-s1-s2.test.ts` (ANX-92 `in_review`)

**ANX-92** — impl `in_review`; debate G7 pendente **ANX-91**

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
