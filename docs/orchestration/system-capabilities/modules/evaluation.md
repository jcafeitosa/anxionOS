---
type: guide
title: Funcionalidades — modules/evaluation
---
# Funcionalidades — `modules/evaluation` (P08)

**Issue mapa:** ANX-347 · **Serial:** [PC 15 Testing](/notes/anxionos-pc15-testing-debate) · [PC 21](/notes/anxionos-pc21-experiments-debate) · [PC 28 Learning](/notes/anxionos-pc28-learning-debate)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 004

## Responsabilidade

Certificação, reputação, promoção Strategy/Agent, loop de learning. Testing da taxonomia 30 é **composto** com `backend/tests` — sem pasta Testing.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Ver certificação / reputação | `GetCertification`, `GetReputation` |
| **Platform** | Rodar evaluation | `RunEvaluation` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Eval worker** | `evaluation.run`, `evaluation.certify` | Sem auto-promover live |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `RunEvaluation` | Job | `evaluation.completed.v1` |
| `IssueCertification` | Cert | `evaluation.certification.issued.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetReputation` | Score + janela |
| `GetCertification` | Status |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `evaluation.completed.v1` | agents, strategies, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **strategies** | Backtest |
| **simulation** | Experimentos |
| **knowledge** | Learning / Memory |
| **agents** | Skill promotion gate |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/evaluation/src/index.ts` presente. **Não** G7.
