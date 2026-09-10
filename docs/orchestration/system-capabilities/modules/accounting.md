---
type: guide
title: Funcionalidades — modules/accounting
---
# Funcionalidades — `modules/accounting` (P06)

**Issue mapa:** ANX-347
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 003

## Responsabilidade

Ledger financeiro, taxas, ajustes, reconciliação. **Não** segundo ledger de grafo. **Não** é P&L (`performance`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Ver lançamentos, propor ajuste | `QueryLedger`, `ProposeAdjustment` |
| **Platform** | Abrir reconciliação | `OpenReconciliation` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Audit PLATFORM** | `accounting.ledger.query` | Read sanitizado |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `PostEntry` | Lançamento | `accounting.entry.posted.v1` |
| `OpenReconciliation` | Caso | `accounting.reconciliation.opened.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `QueryLedger` | Entradas por conta |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `accounting.entry.posted.v1` | performance, audit, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **execution** | Fills |
| **capital** | Reservas |
| **billing** | Taxas de plano ≠ ledger de trade |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/accounting/src/index.ts` presente. **Não** G7.
