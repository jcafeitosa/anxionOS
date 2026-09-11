---
type: debate
---
# R06 — Dependências: `modules/execution`

**Rodada:** R6  
**Data:** 2026-09-11  
**Issues:** ANX-101 · ANX-97 · ANX-99 · ANX-91 · ANX-93 · ANX-58 · ANX-83 · pack ANX-389  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md).

## In / Out (R6)

**In:** TradeIntent (decisions); RiskPermit consume; ExecutionPermit; CapitalReservation; Venue binding SIMULATED/PAPER; instrumentId; Agency scope.

**Out:** `execution.fill.confirmed.v1` → accounting/portfolios/capital; todos `execution.*` → audit; projector graph. Sem mutate Grant, Permit storage, Reservation rows alheias, ou Neo4j driver.

## Non-goals

Não D-GOV-010. Não import `connections/infrastructure` secrets. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (dependências)

| Superfície | Dono |
| --- | --- |
| Order / Fill / Session | **execution** |
| TradeIntent | **decisions** |
| RiskPermit | **risk** |
| ExecutionPermit | **governance** |
| Reservation | **capital** |
| adapter-gateway | **KEEP** |

## Upstream (obrigatório G1)

| Módulo | Contrato | Estado debate |
| --- | --- | --- |
| **decisions** | TradeIntent, `decisions.intent.submitted.v1` | ANX-97 g0_ready |
| **risk** | RiskPermit consume, `risk.epoch.bumped.v1` | ANX-99 g0_ready |
| **governance** | ExecutionPermit | ANX-30 done |
| **capital** | CapitalReservation | ANX-91 g0_ready |
| **connections** | Venue binding SIMULATED/PAPER | ANX-83 g0_ready |
| **market-data** | instrumentId registry | ANX-87 g0_ready |
| **organizations** | tenancy | ANX-29 done |

## Downstream

| Módulo | Evento |
| --- | --- |
| **accounting** | `execution.fill.confirmed.v1` |
| **portfolios** | `execution.fill.confirmed.v1` |
| **capital** | order.submitted + fill.confirmed (reservation) |
| **performance** | fill.confirmed (defer) |
| **audit** | todos eventos execution.* |
| **graph** | projeção intent→order→fill |
| **operations** | reconciliation.opened |

## Serviços

| Serviço | Papel |
| --- | --- |
| `services/execution-go` | Protocolo wire/simulator — **defer** S3; TS simulator inline S1–S2 |

Bootstrap **ANX-102**: schema + submitOrder SIMULATED + fill.confirmed.v1.

→ **R07** ([R07-risks.md](./R07-risks.md))
