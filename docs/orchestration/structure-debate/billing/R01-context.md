---
type: debate
---

# R01 — Contexto: `modules/billing`

**Componente:** modules/billing  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P07  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Assinatura/cobrança da plataforma — invoices, refunds, idempotência webhooks.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Subscription plataforma
- Invoice
- refund
- webhook idempotency

### Não possui (fronteiras ADR0002 / brain)

- Provider usage IA — connections
- Ledger trading — accounting
- Comissão parceiro — partners

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | organizations, connections (usage read), identity |
| **Downstream** | accounting, partners (evento pago), operations |

## Armazenamento

PG: assinaturas, invoices, refunds. Neo4j: cliente/plano/fatura. SQLite: nenhuma cobrança local.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Onboarding saga billing step — contrato organizations?
- Usage connections→invoice: agregação período?
- Webhook provider pagamento — secrets e replay?
- Refund idempotente e impacto partners commission?

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
