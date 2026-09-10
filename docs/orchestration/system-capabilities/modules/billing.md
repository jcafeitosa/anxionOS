---
type: guide
title: Funcionalidades — modules/billing
---
# Funcionalidades — `modules/billing` (P07)

**Issue mapa:** ANX-347
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP)

## Responsabilidade

Assinatura, faturas, upgrade de plano. **Não** é ledger de trade (`accounting`). **Não** é comissão Partner (`partners`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Ver plano, faturas, upgrade | `GetSubscription`, `ListInvoices` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **CEO AGENCY** | `billing.subscription.get` | Sem mutar gateway de pagamento |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `ConfirmSubscription` | Plano ativo | `billing.subscription.confirmed.v1` |
| `RecordInvoicePaid` | Fatura | `billing.invoice.paid.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetSubscription` | Plano + status |
| `ListInvoices` | Owner scoped |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `billing.subscription.confirmed.v1` | organizations (saga UI01 deferida) |
| `billing.invoice.paid.v1` | partners |

## Integração

| Módulo | Borda |
| --- | --- |
| **organizations** | Agency pós-assinatura |
| **connections** | Custo de inferência PLATFORM |
| **partners** | Comissão sobre invoice |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/billing/src/index.ts` presente. **Não** G7.
