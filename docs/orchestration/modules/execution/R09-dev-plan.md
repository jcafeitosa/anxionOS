---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/execution`

**Issue:** ANX-101 · impl: **ANX-102** · gate: ANX-58

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema session+order+fill+adapter_ref, contracts skeleton, ensureSchema, VenueAdapterRef SIMULATED seed | G2, G4 |
| **P06-S2** | openSession + submitOrder + inline simulator fill + fill.confirmed.v1 + permit gates | G3, G5 |
| **P06-S3** | cancelOrder + partial fills + capital reservation projector hook | G3 |
| **P06-S4** | ReconciliationCase venue + duplicate fill handler | G5 |
| **P06-S5** | execution-go dispatch/report protocol | defer |
| **P06-S6** | graph:execution:v1 projeção | defer |

## Matriz G3 (S2)

| ID | Caso | Esperado |
| --- | --- | --- |
| G3-EX-S2-01 | submit válido SIMULATED → order SUBMITTED + fill CONFIRMED event | PASS |
| G3-EX-S2-02 | submit sem RiskPermit | EX_PERMIT_BYPASS |
| G3-EX-S2-03 | cross-tenant reservation | EX_CROSS_TENANT |
| G3-EX-S2-04 | duplicate clientOrderId replay | mesmo orderId idempotente |
| G3-EX-S2-05 | duplicate venueFillId | EX_DUPLICATE_FILL |
| G3-EX-S2-06 | executionMode REAL | EX_MODE_FORBIDDEN |

## Fixtures v1

- `SimulatedVenueAdapter` in-process (sem connections wire até S3 opcional)
- TradeIntent + permits fixture em `backend/tests/fixtures/execution/`
- Zero REAL_EXECUTION / LIVE_TRADING flags

**ANX-102** — blocked_by ANX-101 G7

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
