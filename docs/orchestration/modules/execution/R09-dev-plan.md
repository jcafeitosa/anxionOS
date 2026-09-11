---
status: draft
type: debate
---
# R09 — Plano de implementação: `modules/execution`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue:** ANX-101 · impl: **ANX-102** · gate: ANX-58 · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Plano **draft**. Sem migration neste artefato.

## In / Out (R9)

**In:** slices P06-S1–S6; matriz G3-EX-S2-*; fixtures SimulatedVenueAdapter.

**Out:** ordem de slices. **Não** declara ST08. **Não** `done` em ANX-389. Go protocol S5 defer. Graph S6 defer.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não REAL venue. Não G7 ANX-102 neste pack.

## Ownership (plano)

| Superfície | Dono |
| --- | --- |
| schema + submitOrder SIMULATED | **execution** (ANX-102) |
| TradeIntent fixture | **decisions** |
| permit fixtures | **risk** / **governance** |
| adapter-gateway | **KEEP** |

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

**ANX-102** — blocked_by ANX-101 G7. Pack ANX-389 **não** `done`.

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
