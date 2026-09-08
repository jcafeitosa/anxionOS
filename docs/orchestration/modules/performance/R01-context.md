---
type: debate
---

# R01 — Contexto: `modules/performance`

**Componente:** modules/performance  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

P&L, métricas e atribuição — snapshots e séries derivadas, sem reescrever saldos.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Outcomes
- atribuição
- métricas oficiais
- séries TimescaleDB derivadas

### Não possui (fronteiras ADR0002 / brain)

- Ledger — accounting
- Posição — portfolios
- Decisão — decisions

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | accounting, execution, portfolios, decisions, strategies |
| **Downstream** | evaluation, billing (usage reports), operations, frontend dashboards |

## Armazenamento

PG + TimescaleDB: outcomes/atribuição. Neo4j: resultado→fill→decisão→estratégia. SQLite: análise experimental local.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Snapshot vs recompute from ledger — estratégia rebuild?
- Atribuição multi-agent/multi-strategy: modelo fixo?
- Métricas oficiais vs experimental simulation?
- SLA de freshness para dashboards Owner?

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
