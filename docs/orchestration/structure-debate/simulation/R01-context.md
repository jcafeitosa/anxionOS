---
type: debate
---

# R01 — Contexto: `modules/simulation`

**Componente:** modules/simulation  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P08  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Digital Twin e execução isolada de cenários — snapshots sem mutar produção.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Snapshot
- SimulationRun
- manifestos/checkpoints cenário
- subgrafos isolados

### Não possui (fronteiras ADR0002 / brain)

- ChangeProposal/aprovação — governance
- Promoção critérios — evaluation
- Ordens reais — execution

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | strategies, market-data (fixtures), governance (escopo sandbox), graph |
| **Downstream** | evaluation, strategies (backtest ref), audit |

## Armazenamento

PG: manifestos/checkpoints oficiais. Neo4j: subgrafos isolados. SQLite: sandbox/fixtures independentes.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.** research-python também ausente.

## Perguntas abertas para debate

- Isolamento tenant vs run: credenciais sintéticas?
- Aplicação resultado simulação em produção — só via comandos owners?
- Twin fidelity vs performance — quais módulos mockados?
- research-python jobs vs SimulationRun — fronteira?

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
