---
type: guide
title: Funcionalidades — modules/capital
---
# Funcionalidades — `modules/capital` (P06)

**Issue mapa:** ANX-347
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 003

## Responsabilidade

CapitalAccount, alocações, reservas, disponível. **Não** é ledger contábil (`accounting`). **Não** é posição de mercado (`portfolios`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Abrir conta, reservar alocação | `RegisterCapitalAccount`, `ReserveAllocation` |
| **Operator** | Ver disponível | `GetAvailableCapital` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Execution adapter** | Consultar reserva antes de ordem | Sem debitar fora do comando |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `RegisterCapitalAccount` | Conta PG | `capital.account.opened.v1` |
| `ReserveAllocation` | Reserva idempotente | `capital.allocation.reserved.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetAvailableCapital` | Disponível vs reservado |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `capital.allocation.reserved.v1` | decisions, execution, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **execution** | Fill libera/consome reserva |
| **accounting** | Lançamentos |
| **portfolios** | Exposição ≠ capital reservado |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/capital/src/index.ts` presente. **Não** G7.
