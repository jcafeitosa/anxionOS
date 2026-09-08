---
type: debate
---

# R01 — Contexto: `modules/accounting`

**Componente:** modules/accounting  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-93**

## Propósito

Ledger, taxas e ajustes/reconciliação financeira institucional.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Ledger
- taxas
- reversões
- ajustes
- reconciliação financeira

### Não possui (fronteiras ADR0002 / brain)

- Consumo IA — connections/billing
- Posição — portfolios
- P&L atribuição — performance

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | execution, capital, billing (eventos pagos), partners (comissões) |
| **Downstream** | performance, audit, billing, operations |

## Armazenamento

PG: ledger, taxas, reconciliação. Neo4j: origem lançamentos. SQLite: não ledger alternativo.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Double-entry invariantes e chart of accounts — multi-tenant?
- Evento fill→lançamento: síncrono ou projector?
- ReconciliationCase subtarefas cross-domain — contrato?
- Taxas venue vs platform fee — agregados distintos?

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
