---
type: debate
---

# R01 — Contexto: `modules/connections`

**Componente:** modules/connections  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P05  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Providers, contas, modelos, bindings, quotas, cooldowns, inferência e uso faturável de IA.

## O que possui / não possui

### Possui (donos de estado ou composição)

- ProviderSubscription
- AIAccount
- models/offerings
- bindings
- quotas/reservas
- usage

### Não possui (fronteiras ADR0002 / brain)

- Invoice assinatura plataforma — billing
- Ledger capital trading — accounting
- Agent config — agents

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | governance, packages/secrets, packages/eventing, spec 005-connections |
| **Downstream** | orchestration, agents, knowledge, billing (read usage), accounting (não misturar consumo IA com capital) |

## Armazenamento

PG: contas, subscriptions, quotas, leases, usage. Neo4j: provider→conta→modelo→agente. SQLite: cache catálogo descartável apenas.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.** Epic Wave 4 ANX-36.

## Perguntas abertas para debate

- Árvore domain subdividida (providers…usage): ordem de implementação Wave 4?
- Credential refresh workers: mesmos processos apps/workers?
- Routing/pools vs inference-profiles — fronteira?
- Usage → billing event idempotente: contrato exato?

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
