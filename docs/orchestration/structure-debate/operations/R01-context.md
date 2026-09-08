---
type: debate
---

# R01 — Contexto: `modules/operations`

**Componente:** modules/operations  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P07  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Incidentes, retenção, exportação e recuperação — procedimentos e adapters repo/CI/deploy.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Incidentes
- procedimentos
- retenção
- export jobs
- recuperação
- adapters engenharia OP01–OP08

### Não possui (fronteiras ADR0002 / brain)

- Audit replay — audit
- Kill switch — risk
- Secrets — packages/secrets

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | audit, observability, graph, todos os módulos (health) |
| **Downstream** | apps/api (health), frontend Platform console, deploy pipelines |

## Armazenamento

PG: incidentes, export jobs, retenção. Neo4j: impacto serviço→dependência. SQLite: checkpoints diagnóstico local não crítico.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Agentes engenharia: ferramentas limitadas vs shell admin?
- Recuperação P09: coordenação operations vs por-módulo?
- Export GDPR: operations vs audit ownership?
- Incident vs kill switch risk — escalonamento?

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
