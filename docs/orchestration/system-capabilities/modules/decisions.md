---
type: guide
title: Funcionalidades — modules/decisions
---
# Funcionalidades — `modules/decisions` (P06)

**Issue mapa:** ANX-347 · **Serial:** [PC 23](/notes/anxionos-pc23-decisions-debate.md)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md) · spec 003

## Responsabilidade

DecisionRecord, TradeIntent, ExecutionPermit. **Não** é Approval/ChangeProposal (`governance`). **Não** é RiskPolicy (`risk`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Propor decisão, anexar evidência | `ProposeDecision` |
| **Operator** | Ver cadeia intent → permit | `GetDecision` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Brain AGENCY L1+** | `decisions.intent.submit` | Evidence + grant; permit em comando separado |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `RecordDecision` | DecisionRecord | `decisions.decision.recorded.v1` |
| `SubmitTradeIntent` | Intent + evidence refs | `decisions.intent.submitted.v1` |
| `IssueExecutionPermit` | Permit epoch-bound | `decisions.permit.issued.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetDecision` | Record + evidências |
| `GetPermit` | Permit vigente |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `decisions.intent.submitted.v1` | risk, execution |
| `decisions.decision.recorded.v1` | graph, audit |

## Integração

| Módulo | Borda |
| --- | --- |
| **governance** | Epoch / Approval se ChangeProposal |
| **knowledge** | Evidence |
| **risk** | RiskCheck |
| **execution** | Permit-bound submit |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/decisions/src/index.ts` presente. **Não** G7.
