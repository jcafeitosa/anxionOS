---
type: guide
title: Funcionalidades — modules/connections
---
# Funcionalidades — `modules/connections` (P05)

**Issue mapa:** ANX-347 · **Serial:** [PC 06 Models](/notes/anxionos-pc06-models-debate) · [PC 07](/notes/anxionos-pc07-connections-debate) · [PC 30](/notes/anxionos-pc30-integrations-debate)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 005

## Responsabilidade

Providers, AIAccount, bindings, quotas, cooldown, inferência. **Não** é 24º módulo `adapter-gateway` (ADR0006: composição). **Não** executa REAL_EXECUTION na v1 (PC 07). Adapters de venue ficam nos **donos** (`execution`, etc.).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Conectar provider, SYSTEM_FREE, ver quota | `BindAccount`, `GetUsage` |
| **Platform** | Catalogar modelo, cooldown | `RegisterProvider`, `SetCooldown` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Brain AGENCY** | `connections.inference.invoke` via profile | Grant + quota; sem credencial crua |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `BindAccount` | Binding + ledger de uso | `connections.account.connected.v1` |
| `InvokeInference` | Chamada perfilada | `connections.usage.recorded.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `ListBindings` | Agency scoped |
| `GetQuota` | Uso vs limite |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `connections.quota.exceeded.v1` | orchestration, billing |
| `connections.account.connected.v1` | graph, agents |

## Integração

| Módulo | Borda |
| --- | --- |
| **governance** | Grant de rota |
| **agents** | Binding de modelo |
| **billing** | Custo PLATFORM |
| **execution** | Adapters de venue no dono, não aqui |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/connections/src/index.ts` presente. **Não** G7. `adapter-gateway` **fora** desta ficha.
