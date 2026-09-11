---
type: debate
---
# R01 — Contexto: `modules/performance`

**Componente:** modules/performance  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-11  
**Issue debate estrutura:** ANX-42 · pack ANX-389 · debate módulo ANX-105 · impl futura ANX-106 (não neste pack)  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [ROUNDS.md](./ROUNDS.md). Sem API runtime.

## In / Out (R1)

**In:** inventário de P&L, métricas oficiais, atribuição, séries Timescale derivadas.

**Out:** este contexto. **Não** ledger (`accounting`). **Não** Position (`portfolios`). **Não** Decision (`decisions`). Sem código de produto.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não pasta `analytics/` (PC 22). D-GOV-010 = **risk P06**.

## Ownership

| Superfície | Dono |
| --- | --- |
| OfficialMetricDefinition / OutcomeSnapshot / AttributionRun / MetricSeries | **performance** |
| JournalEntry | **accounting** |
| Position | **portfolios** |
| TradeIntent | **decisions** |
| adapter-gateway | **KEEP** |

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

PG + TimescaleDB: outcomes/atribuição. Neo4j: resultado→fill→decisão→estratégia. SQLite: análise experimental local **non-auth**.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente** neste pack G0 (não implementar agora).

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
