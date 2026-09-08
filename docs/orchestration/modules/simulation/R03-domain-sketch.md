---
type: debate
---

# R03 — Esboço de domínio: `modules/simulation`

**Issue:** ANX-115

## Agregados

SimulationRun, ScenarioSnapshot, TwinManifest, SandboxCheckpoint

## Isolamento sandbox (verificável)

| Controle | Limite |
| --- | --- |
| CPU/mem | quota por `organizationId` + run |
| Dataset | proveniência `datasetRef` + hash; somente fixtures autorizados |
| Network | deny-by-default; sem egress REAL |
| FS | chroot SQLite path por run; cleanup on `COMPLETED`/`FAILED` |
| Promoção | `TwinManifest.fidelityTier` — só `TIER_SIMULATED` pode emitir `simulation.run.completed` para evaluation |

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | `strategies.backtest.requested.v1` |
| EventEmitterPort | simulation.run.started.v1, simulation.run.completed.v1, simulation.snapshot.created.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
