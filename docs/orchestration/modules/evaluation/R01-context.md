---
type: debate
---

# R01 — Contexto: `modules/evaluation`

**Componente:** modules/evaluation  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P08  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Avaliação, certificação, reputação e promoção — critérios de qualidade institucional.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Evaluation
- Certification
- Reputation versionada
- promoções

### Não possui (fronteiras ADR0002 / brain)

- StrategyVersion — strategies
- Simulation runs — simulation
- Agent config — agents

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | strategies, agents, knowledge, performance, simulation |
| **Downstream** | strategies (deployment promoção), governance (ChangeProposal), agents |

## Armazenamento

PG: avaliações, certificações, reputação. Neo4j: evidências qualidade. SQLite: resultados temporários.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Promoção simulation→produção: workflow governance+evaluation?
- Reputação: agregado por Agent vs Strategy vs tenant?
- Certificação expira e revalidação automática?
- Critérios OP01–OP08: mapeamento para entidades?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** (`R02-boundaries.md`) após consenso sobre inventário R1.
