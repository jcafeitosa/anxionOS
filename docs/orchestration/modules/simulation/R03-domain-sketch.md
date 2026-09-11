---
type: debate
---
# R03 — Esboço de domínio: `modules/simulation`

**Rodada:** R3 · ANX-389 · ANX-115  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [R04-contracts-events.md](./R04-contracts-events.md).

## Agregados

| Agregado | Notas |
| --- | --- |
| TwinManifest | fidelityTier; só TIER_SIMULATED completa para evaluation |
| ScenarioSnapshot | datasetRef + hash |
| SimulationRun | seed; status; resultRef object store |
| SandboxCheckpoint | path isolado; cleanup COMPLETED/FAILED |

Isolamento: CPU/mem quota org+run; network deny-by-default; FS chroot SQLite; dataset hash mismatch → FAILED.

## Ports

SimulationRunRepository, SnapshotRepository, SimulationUnitOfWork, BacktestRunner (infra sandbox), AgencyScopePort, TraversalEvaluator, EventConsumer (`strategies.backtest.requested.v1`).

## Saída R3

Modelo v1.
