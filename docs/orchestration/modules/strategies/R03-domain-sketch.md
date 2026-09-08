---
type: debate
---

# R03 — Esboço de domínio: `modules/strategies`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-89**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## Agregados

- **Strategy** — container org/agency
- **StrategyVersion** — sourceHash, rulesHash, parametersHash, lifecycleState (DRAFT→RETIRED)
- **BacktestRun** — dataset pin, assumptions, seed, resultRef
- **Deployment** — portfolioId, binding snapshot, executionMode SIMULATED|PAPER
- **Signal** — generatedAt, expiresAt, instrumentRefs, valueRef

## Lifecycle (spec 003)

`DRAFT → BACKTESTED → EVALUATED → CERTIFIED → PAPER → (APPROVED_FOR_LIVE|ACTIVE defer v1) → SUSPENDED|RETIRED`

## Ports

| Port | Uso |
| --- | --- |
| MarketDataPort | getPriceAsOf, resolveInstrument |
| BacktestRunnerPort | job research-python sandbox |
| SignalEmitterPort | strategies.signal.emitted.v1 |
| EvaluationConsumerPort | certification events |
| GovernancePort | grants strategies.* |

## Invariantes ST-R03-INV-*

ST-R03-INV-SV-01 hash imutável pós-publish · ST-R03-INV-SIG-01 expiresAt obrigatório · ST-R03-INV-DEP-01 binding snapshot imutável

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
