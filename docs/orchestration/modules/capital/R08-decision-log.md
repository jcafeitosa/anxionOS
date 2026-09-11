---
type: debate
status: draft
---

# R08 — Decision log: `modules/capital`

**Issue:** ANX-91 · gate: ANX-58 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md).  
**Status:** `draft` — não spec accepted; não G7.

## In / Out (R8)

**In scope:** ownership CapitalAccount/Allocation/Reservation; PG vs grafo; SIMULATED|PAPER; KEEP adapter-gateway.

**Out of scope:** spec accepted; ANX-342 done; ST08 live; G7 ANX-92; ANX-389 `done`.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não REAL v1.

## Ownership consolidado

| Superfície | Dono |
| --- | --- |
| CapitalAccount / Allocation / Reservation / BalanceView | **capital** |
| Grant | **governance** |
| Ledger | **accounting** |
| Position | **portfolios** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-CAP-001 | capital dono CapitalAccount, Allocation, CapitalReservation | ✅ |
| D-CAP-002 | Allocation = mandato; não duplica saldo | ✅ |
| D-CAP-003 | Reserva global por conta — FI02 | ✅ |
| D-CAP-004 | Grant em governance; capital só grantId | ✅ |
| D-CAP-005 | Ledger em accounting; BalanceView derivada | ✅ |
| D-CAP-006 | Position em portfolios | ✅ |
| D-CAP-007 | SIMULATED+PAPER only v1 | ✅ |
| D-CAP-008 | PG autoritativo; zero SQLite saldo | ✅ |
| D-CAP-009 | FX via MarketDataPort | ✅ |
| D-CAP-010 | reservation events + balance.snapshot | ✅ |
| D-CAP-011 | strategies budget → capital Allocation | ✅ |
| D-CAP-012 | graph:capital:v1 async | ✅ |
| D-CAP-015 | RLS defer P09 | ✅ |
| P1-CAP-01 | Pack G0 canônico; D-GOV-010 = risk P06 | ✅ |
| P1-CAP-02 | Specs draft; ST08 0/23; ANX-342 não done | ✅ |

## Oráculos exigidos

G3-CAP-01; G5-CAP-01..03. Engine **não verificado** até G1.

## Saída R8

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
