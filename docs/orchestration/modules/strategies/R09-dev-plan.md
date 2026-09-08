---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/strategies`

**Issue:** ANX-89 · impl: **ANX-90** · gate: ANX-58 · upstream: ANX-88

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema core, contracts skeleton, Strategy CRUD | G2, G4 |
| **P06-S2** | StrategyVersion publish, lifecycle, outbox | G3, G4 |
| **P06-S3** | BacktestRun + runner port stub | G3, G5 parcial |
| **P06-S4** | Deployment + binding validation | G3, G4 |
| **P06-S5** | Signal emit + HTTP surface | G3, G5 completo |

## Matriz G3

G3-ST-S1-01 publish idempotent · G3-ST-S2-01 invalid lifecycle reject · G3-ST-S3-01 stale signal reject · G3-ST-S4-01 deployment binding mismatch

## Dependências

ANX-88 market-data · ANX-82 agents · ANX-36 epic · ANX-32 graph projector

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
