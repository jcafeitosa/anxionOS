---
type: guide
title: Funcionalidades — modules/portfolios
---
# Funcionalidades — `modules/portfolios` (P06)

**Issue mapa:** ANX-347
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 003

## Responsabilidade

Portfolio, Position, exposição, valuation snapshot. **Não** é P&L canônico (`performance`). **Não** é ordem (`execution`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Ver posições e exposição | `GetPosition`, `AnalyzeExposure` |
| **Operator** | Snapshot de valuation | `GetValuationSnapshot` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Risk worker** | `portfolios.exposure.analyze` | Read; kill switch em `risk` |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `ApplyFillToPosition` | Atualiza posição | `portfolios.position.updated.v1` |
| `SnapshotValuation` | Snapshot | `portfolios.valuation.snapshot.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetPosition` | Qty + custo |
| `AnalyzeExposure` | Por ativo/classe |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `portfolios.position.updated.v1` | risk, performance, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **execution** | Fills |
| **market-data** | Preços |
| **risk** | Limites |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/portfolios/src/index.ts` presente. **Não** G7.
