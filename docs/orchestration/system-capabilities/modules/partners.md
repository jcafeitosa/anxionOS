---
type: guide
title: Funcionalidades — modules/partners
---
# Funcionalidades — `modules/partners` (P07)

**Issue mapa:** ANX-347
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md)

## Responsabilidade

Indicações, comissões, payouts (console Partner). **Não** é Marketplace (spec 007 composta; sem pasta).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Partner** | Registrar referral, ver comissão | `RegisterReferral`, `GetCommission` |
| **Platform** | Autorizar payout | `SendPayout` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Partner agent** | `partners.commission.get` | Escopo Partner |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `RegisterReferral` | Referral | `partners.referral.registered.v1` |
| `AccrueCommission` | Comissão | `partners.commission.accrued.v1` |
| `SendPayout` | Payout | `partners.payout.sent.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetCommission` | Saldo |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `partners.commission.accrued.v1` | graph, audit |

## Integração

| Módulo | Borda |
| --- | --- |
| **billing** | Invoice paid |
| **graph** | T20 atribuição comercial |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/partners/src/index.ts` presente. **Não** G7.
