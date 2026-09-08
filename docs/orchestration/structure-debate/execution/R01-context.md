---
type: debate
---

# R01 — Contexto: `modules/execution`

**Componente:** modules/execution  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-101**

## Propósito

Ordens, fills e reconciliação com venue — protocolo e estado de execução.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Order
- Fill
- tentativas
- permits
- reconciliação venue

### Não possui (fronteiras ADR0002 / brain)

- TradeIntent — decisions
- Posição canônica — portfolios
- Protocolo venue puro — execution-go

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | decisions, risk, governance, capital, services/execution-go |
| **Downstream** | portfolios, accounting, performance, audit |

## Armazenamento

PG: orders, fills, reconciliação. Neo4j: intenção→ordem→fill→posição. SQLite: não fila offline ordens.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.** `services/execution-go/` também ausente.

## Perguntas abertas para debate

- Fronteira execution TS vs execution-go: dispatch/report protocol?
- Reconciliação venue vs accounting — ReconciliationCase owner?
- Idempotência client order id cross-tenant?
- Permits: governance grant ou tipo execution-specific?

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
