---
type: guide
title: Funcionalidades — modules/market-data
---
# Funcionalidades — `modules/market-data` (P06)

**Issue mapa:** ANX-347 · **Serial:** [PC 22 Analytics](/notes/anxionos-pc22-analytics-debate.md)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md) · spec 003

## Responsabilidade

Instrumentos, observações, calendário de venue, FX, corporate actions, backfill. **Não** é P&L (`performance`). **Não** é posição (`portfolios`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Operator** | Resolver instrumento, ver qualidade | `ResolveInstrument`, `GetObservation` |
| **Platform** | Backfill, registrar calendário | `StartBackfill`, `RegisterVenueCalendar` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Strategy worker** | `market-data.observation.get` | Sem write de preço inventado |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `RecordObservation` | Série Timescale | `market-data.observation.ingested.v1` |
| `RecordCorporateAction` | Ajuste | `market-data.corporate_action.recorded.v1` |
| `RecordFxRate` | FX | `market-data.fx.recorded.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetAdjustedPrice` | Preço ajustado |
| `ResolveTradingSession` | Sessão/calendário |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `market-data.instrument.registered.v1` | graph, strategies |
| `market-data.observation.ingested.v1` | portfolios, performance |

## Integração

| Módulo | Borda |
| --- | --- |
| **strategies** | Inputs de sinal |
| **portfolios** | Valuation |
| **performance** | Analytics composto |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/market-data/src/index.ts` presente. **Não** G7.
