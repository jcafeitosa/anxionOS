---
type: guide
title: Funcionalidades — modules/execution
---
# Funcionalidades — `modules/execution` (P06)

**Issue mapa:** ANX-347
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md) · spec 003 · [PC 30](/notes/anxionos-pc30-integrations-debate.md)

## Responsabilidade

Order, Fill, submit/cancel permit-bound, reconciliação venue. Adapters de venue (freqtrade, hummingbot, MT5, etc.) **vivem neste módulo**, não em `adapter-gateway` (infra). **Não** emite DecisionRecord (`decisions`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Operator** | Ver ordens abertas, cancelar | `ListOpenOrders`, `CancelOrder` |
| **Owner** | Reconciliar venue | `ReconcileVenue` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Execution worker** | `execution.order.submit` | Permit + RiskCheck + epochs atuais |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `SubmitOrder` | Ordem venue | `execution.order.submitted.v1` |
| `CancelOrder` | Cancel idempotente | `execution.order.cancelled.v1` |
| `RecordFill` | Fill | `execution.fill.received.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetOrder` | Estado venue |
| `ListOpenOrders` | Agency + ambiente |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `execution.fill.received.v1` | capital, portfolios, accounting |

## Integração

| Módulo | Borda |
| --- | --- |
| **decisions** | ExecutionPermit |
| **risk** | Check + kill switch |
| **connections** | Provider de inferência, não venue |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/execution/src/index.ts` presente (inclui adapters sandbox). **Não** G7. Homologação venue real fora desta ficha.
