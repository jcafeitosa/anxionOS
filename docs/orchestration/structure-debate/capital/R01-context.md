---
type: debate
---

# R01 — Contexto: `modules/capital`

**Componente:** modules/capital  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07 (expandido 2026-09-08)  
**Issue debate estrutura:** ANX-42 · **debate módulo:** **ANX-91**

## Propósito

Contas de capital institucional, alocações (mandato/limite de uso), reservas transacionais e visão autoritativa de saldo disponível — titularidade verificada e reserva sem dupla alocação entre portfolios do mesmo Owner (spec 003, FI02).

## O que possui / não possui

### Possui (donos de estado ou composição)

- **CapitalAccount** — titular (`ownerUserId`), `externalAccountRef`, moeda base, estado de vínculo
- **Allocation** — mandato/limite por portfolio/estratégia (não duplica saldo depositado)
- **CapitalReservation** — holds transacionais para TradeIntent/ordens abertas (fees, buffer, encumbrances)
- **BalanceView** — settled, encumbrances, pending reservations → `available` (projeção autoritativa pré-ledger)
- Referências a **Grant** (`grantId`) — validação via governance; entidade Grant não é dona aqui

### Não possui (fronteiras ADR0002 / brain)

- **Grant** / aprovação institucional — governance
- **Ledger** / partida dobrada / taxas confirmadas — accounting
- **Position** / valuation / NAV — portfolios
- **TradeIntent** / Decision — decisions
- **Order** / fill — execution
- **PolicyVersion** / kill switch — risk (consome reservations autoritativas)
- **StrategyVersion** / Deployment — strategies

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | organizations (Owner/Agency), governance (grants), graph (projeção titular→conta→portfolio) |
| **Downstream** | portfolios, decisions, risk, execution (permit bounds), accounting, performance, audit |

## Armazenamento

| Dado | Engine |
| --- | --- |
| contas, alocações, reservas, journal, outbox | **PostgreSQL** (autoritativo) |
| titular→conta→portfolio→alocação | Neo4j via `graph:capital:v1` (projeção) |
| SQLite | **proibido** para saldo/reserva autoritativa |

Fonte: `brain/notes/anxionos-storage-ownership.md` L37.

## Estado do código atual

**Ausente.**

## Perguntas abertas (encaminhadas R02–R08)

| # | Pergunta | Rodada alvo |
| --- | --- | --- |
| Q1 | Reserva vs alocação: invariantes e liberação? | R02, R03 |
| Q2 | Multi-moeda e FX: owner único de taxa? | R02 (market-data port) |
| Q3 | CapitalAccount vs portfolio (1:N subledger)? | R03 |
| Q4 | Eventos para accounting: snapshot ou delta? | R04, R08 |
| Q5 | Concorrência dupla reserva (FI02)? | R03, R07 |

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| Investment lifecycle | `brain/project-docs/specs/003-investment-lifecycle/spec.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** ([R02-boundaries.md](./R02-boundaries.md))
