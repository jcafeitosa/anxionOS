---
type: debate
---

# R01 — Contexto: `modules/partners`

**Componente:** modules/partners  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P07  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Indicações, comissões e payouts — atribuição comercial.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Referral
- Commission
- Payout
- regras comissionamento

### Não possui (fronteiras ADR0002 / brain)

- Invoice plataforma — billing
- Ledger — accounting (registra efeito)

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | billing, organizations, accounting |
| **Downstream** | accounting, operations, frontend Partner console |

## Armazenamento

PG: referrals, comissões, payouts. Neo4j: parceiro→campanha→receita. SQLite: sem payout autoritativo local.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Comissão idempotente em evento pago/revertido billing?
- Payout batch vs realtime — owner único?
- Multi-tier referral — modelagem PG vs graph?
- Partner scope vs Agency tenant isolation?

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
