---
type: debate
---

# R03 — Esboço de domínio: `modules/simulation`

**Rodada:** R3 — Domain model  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-115  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de produção.

## Debate R3 (síntese atribuída)

**Arquiteto:** Agregados v1 — `TwinManifest`, `ScenarioSnapshot`, `SimulationRun`, `SandboxCheckpoint`.

**Executor:** `SimulationUnitOfWork` (estado + journal + outbox). Consumer de backtest é application, não domain. BacktestRunner é **infra** sandbox.

**Crítico:** dataset hash mismatch → FAILED sem result oficial. Replay do mesmo `commandId` não cria segundo run.

**Security:** AgencyScopePort em todo comando; TraversalEvaluator só autoriza `TIER_SIMULATED` a completar para evaluation.

## Agregado: TwinManifest

Declara fidelityTier e sandbox_policy. **SIM-R03-01:** só `TIER_SIMULATED` emite completed consumível por evaluation para certificação futura (neste módulo: **não** certifica).

| Campo | Notas |
| --- | --- |
| id | TwinManifestId |
| fidelityTier | TIER_SIMULATED \| outros — completed→evaluation só SIMULATED |
| datasetHash | pin obrigatório |
| sandboxPolicy | deny network; CPU/mem quota |

## Agregado: ScenarioSnapshot

datasetRef + hash. Blob no object store; PG guarda metadata. **SIM-R03-02:** mismatch com fixture market-data → FAILED `SIM_DATASET_HASH_MISMATCH`.

## Agregado: SimulationRun

Status: `queued | running | completed | failed`. seed; resultRef. **SIM-R03-03:** completed **não** emite `evaluation.certification.*`.

## Agregado: SandboxCheckpoint

path `{SANDBOX_ROOT}/{organizationId}/{runId}/`; cleanup ON COMPLETED/FAILED; TTL 24h failed. **SIM-R03-04:** apagar `sandbox.db` **não** altera `simulation_runs` (ST04).

## Isolamento

CPU/mem quota org+run; network deny-by-default; FS chroot SQLite; **sem ATTACH** externo; credenciais **proibido**.

## Ports (domain/)

| Port | Responsabilidade |
| --- | --- |
| SimulationRunRepository | lifecycle do run |
| SnapshotRepository | metadata snapshot |
| ManifestRepository | TwinManifest |
| SimulationUnitOfWork | estado + journal + outbox |
| BacktestRunner | **infra** sandbox — não domain |
| AgencyScopePort | organizations |
| TraversalEvaluator | T01 start run |
| EventConsumerPort | `strategies.backtest.requested.v1` |

## Comandos application

| Comando | Idempotência | Evento |
| --- | --- | --- |
| StartSimulationRun | Idempotency-Key / commandId | `simulation.run.started.v1` |
| CompleteSimulationRun | runId + result hash | `simulation.run.completed.v1` |
| FailSimulationRun | runId + code | `simulation.run.failed.v1` |
| CreateScenarioSnapshot | snapshotId | `simulation.snapshot.created.v1` |

## In / Out (R3)

**In:** TwinManifest + ScenarioSnapshot hash; AgencyScopePort; TraversalEvaluator (somente TIER_SIMULATED completa para evaluation); EventConsumerPort (`strategies.backtest.requested.v1`).

**Out:** SimulationRun via SimulationUnitOfWork; SandboxCheckpoint isolado; FAILED se hash mismatch ou egress REAL. **Não** Order, Grant, Certification, JournalEntry de trading.

## Non-goals

- Não persistir ticks autoritativos (market-data).
- Não pasta `experiments/`.
- Não ST08 migration.
- Não G7 ANX-116 neste pack.
- Não D-GOV-010 neste módulo.

## Ownership

| Agregado | Dono |
| --- | --- |
| TwinManifest / ScenarioSnapshot / SimulationRun / SandboxCheckpoint | **simulation** |
| BacktestRunner sandbox | **simulation** infra |
| StrategyVersion verdade | **strategies** |
| CertificationIssued | **evaluation** |
| adapter-gateway | **KEEP** |

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-SIM-01 | G3 | backtest.requested → started + completed (ou failed) |
| G3-SIM-02 | G3 | hash mismatch → FAILED; sem result oficial |
| G5-SIM-01 | G5 | GET run outra org → 403 |

## Saída R3

Modelo v1 aprovado para R4.
