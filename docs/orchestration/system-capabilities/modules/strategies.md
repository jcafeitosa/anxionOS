---
type: guide
title: Funcionalidades — modules/strategies
---
# Funcionalidades — `modules/strategies` (P06)

**Issue mapa:** ANX-347 · **Serial:** [PC 10 Products](/notes/anxionos-pc10-products-debate) (composto; sem pasta products)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 003

## Responsabilidade

Strategy, StrategyVersion, backtest, deployment paper/live. **Não** submete ordem (`execution`). **Não** é Product físico (spec 007 composta).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Criar versão, promover paper→live | `CreateStrategyVersion`, `PromoteDeployment` |
| **Operator** | Ver backtest | `GetBacktest` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Brain AGENCY** | `strategies.backtest.run` | Grant; live exige risk + permit |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `CreateStrategyVersion` | Versão imutável | `strategies.version.created.v1` |
| `RunBacktest` | Job isolado | `strategies.backtest.completed.v1` |
| `ActivateDeployment` | Ambiente PAPER/REAL | `strategies.deployment.activated.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetStrategyVersion` | Spec + digest |
| `ListDeployments` | Agency + ambiente |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `strategies.deployment.activated.v1` | risk, execution, graph |
| `strategies.backtest.completed.v1` | evaluation |

## Integração

| Módulo | Borda |
| --- | --- |
| **market-data** | Observações |
| **evaluation** | Certificação |
| **decisions** | Sinais → intent |
| **simulation** | Twin antes de live |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/strategies/src/index.ts` presente. **Não** G7.
