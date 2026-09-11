---
type: guide
title: Funcionalidades — modules/risk
---
# Funcionalidades — `modules/risk` (P06)

**Issue mapa:** ANX-347 · **Serial:** [PC 16 Security](/notes/anxionos-pc16-security-debate.md) · [PC 25 Policies](/notes/anxionos-pc25-policies-debate.md)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [alinhamento](/notes/anxionos-product-company-module-alignment.md) · spec 003 · D-GOV-002

## Responsabilidade

PolicyVersion kind=RISK, RiskCheck, limites, kill switch. **Não** pasta `policies`. PolicyReference genérico vive em `governance`. **Não** é Approval.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Atualizar limite, ativar kill switch | `UpdateRiskPolicy`, `ActivateKillSwitch` |
| **Platform** | Kill switch institucional | `ActivateKillSwitch` (PLATFORM) |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Execution adapter** | `risk.check.validate` | Nunca ALLOW só do grafo |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `UpdateRiskPolicy` | PolicyVersion RISK | `risk.policy.updated.v1` |
| `ValidateRiskCheck` | Check + digest | `risk.check.completed.v1` |
| `ActivateKillSwitch` | Bloqueio mutável | `risk.kill_switch.activated.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetEffectiveRiskPolicy` | Policy vigente |
| `GetKillSwitchState` | On/off + reason |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `risk.policy.updated.v1` | governance (mandatos), graph |
| `risk.kill_switch.activated.v1` | execution, orchestration |

## Integração

| Módulo | Borda |
| --- | --- |
| **governance** | PolicyReference ponteiro; corpo RISK aqui |
| **decisions** | Intent → check |
| **execution** | Revalidação epoch |
| **portfolios** | Exposição |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/risk/src/index.ts` presente. **Não** G7. D-GOV-010 deferido P06 (enforcement corpo RISK).
