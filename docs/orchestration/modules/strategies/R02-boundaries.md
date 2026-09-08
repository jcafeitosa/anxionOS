---
type: debate
---

# R02 — Fronteiras: `modules/strategies`

**Componente:** modules/strategies  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-89** · contrato P06: **ANX-58**

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre strategies e vizinhos (**market-data**, **agents**, **decisions**, **evaluation**, **simulation**, **execution**, **portfolios**, **risk**, **graph**); ratificar ciclo de vida StrategyVersion vs Deployment vs Signal; proibir promoção automática e paths **REAL/live** em v1.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário e perguntas abertas |
| spec 003 Strategy Factory | Estados, BacktestRun, TaskRequirementsSnapshot |
| spec 005 connections | inferenceRequirements; binding fixo |
| [market-data/R02-boundaries.md](../market-data/R02-boundaries.md) | Preços asOf — strategies não replica catálogo |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Decisão: possui / não possui

| Dado / comportamento | Dono |
| --- | --- |
| Strategy, StrategyVersion, BacktestRun, Deployment, Signal | **strategies** |
| TradeIntent, Decision | **decisions** |
| Ordens, fills | **execution** |
| Certification, Evaluation | **evaluation** |
| Preços, instrument registry | **market-data** |
| P&L, attribution | **performance** |

## Invariantes R02 (`ST-R02-INV-*`)

| ID | Regra |
| --- | --- |
| ST-R02-INV-01 | StrategyVersion publicada imutável — nova versão para alteração |
| ST-R02-INV-02 | Signal sem `expiresAt` → rejeição |
| ST-R02-INV-03 | Deployment sem TaskRequirementsSnapshot válido → bloqueado |
| ST-R02-INV-04 | strategies não emite `execution.order.*` |
| ST-R02-INV-05 | `executionMode=REAL` rejeitado v1 |
| ST-R02-INV-06 | Promoção exige evaluation ou workflow governance |
| ST-R02-INV-07 | BacktestRun fixa datasetId+revision |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui | ✅ |
| AC-R02-02 | Signal vs TradeIntent | ✅ |
| AC-R02-03 | REAL/live proibido v1 | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
