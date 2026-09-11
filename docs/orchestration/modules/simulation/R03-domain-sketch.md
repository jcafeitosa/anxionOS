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

## In / Out (R3)

**In:** TwinManifest + ScenarioSnapshot hash; AgencyScopePort; TraversalEvaluator (somente TIER_SIMULATED).

**Out:** SimulationRun status; SandboxCheckpoint isolado; FAILED se hash mismatch ou egress REAL. Sem Order, Grant, Certification.

## Non-goals

Não persistir ticks autoritativos (market-data). Não pasta `experiments/`. Não ST08 migration. Não G7 ANX-116 neste pack.

## Ownership

| Agregado | Dono |
| --- | --- |
| TwinManifest / ScenarioSnapshot / SimulationRun / SandboxCheckpoint | **simulation** |
| BacktestRunner sandbox | **simulation** infra |
| StrategyVersion verdade | **strategies** |
| CertificationIssued | **evaluation** |

## Saída R3

Modelo v1.
