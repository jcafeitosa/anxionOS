---
type: debate
---

# R01 — Contexto: `modules/portfolios`

**Componente:** modules/portfolios  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## In / Out (R1)

**In:** inventário portfolios, posições, exposição e valuation.

**Out:** Reservation (`capital`). Ledger (`accounting`). P&L oficial (`performance`).

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Portfolio / Position / ValuationSnapshot | **portfolios** |
| adapter-gateway | **KEEP** |

## Propósito

Portfolios, posições, exposição e valuation confirmados.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Posições canônicas
- valuation
- exposição confirmada
- séries derivadas TimescaleDB elegíveis

### Não possui (fronteiras ADR0002 / brain)

- Alocação/reserva — capital
- Ledger — accounting
- Ordens/fills — execution

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | capital, market-data, execution (fills), strategies |
| **Downstream** | decisions, risk, performance, graph |

## Armazenamento

PG + TimescaleDB opcional: posições/valuation. Neo4j: portfolio→posição→instrumento. SQLite: cache leitura asOf, não decisão risco.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Valuation asOf vs tempo real: fonte de verdade?
- Reconciliação posição vs fill execution — owner único?
- Exposição agregada cross-portfolio: query graph vs PG?
- Corporate actions: market-data ou portfolios?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** ([R02-boundaries.md](./R02-boundaries.md)) · debate módulo **ANX-95**
