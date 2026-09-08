---
type: debate
---

# R06 — Dependências: `modules/execution`

**Issues:** ANX-101 · ANX-97 · ANX-99 · ANX-91 · ANX-93 · ANX-58 · ANX-83

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
