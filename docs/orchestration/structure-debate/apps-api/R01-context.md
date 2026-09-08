---
type: debate
---

# R01 — Contexto: `apps/api`

**Componente:** apps/api  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P01–P07  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Composition root HTTP — API Bun + Elysia; registra módulos, plugins, auth e rotas sem concentrar regra de negócio.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Bootstrap do servidor Elysia/Bun e registro de plugins compartilhados (auth, error-handler, request-context, OpenAPI/Scalar).
- Montagem de rotas públicas e `/v1/*` delegando a `modules/*/api` e packages.
- Gateway realtime (WebSocket/SSE) como composition root, não dono de eventos de domínio.

### Não possui (fronteiras ADR0002 / brain)

- Entidades, invariantes ou persistência de qualquer módulo.
- Journal/outbox ou projeções de grafo.
- Segredos em código ou resposta — resolução via `packages/secrets` na infra autorizada.

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | packages/contracts, packages/observability, packages/database (pool), packages/eventing (NATS bridge), modules registrados |
| **Downstream** | frontend/consoles, agents/tools HTTP, webhooks externos |

## Armazenamento

**Nenhum estado autoritativo.** Não é ownerDomain. Logs/traces via observability.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Parcial (`in_review`).** `backend/apps/api/` com app.ts, auth Better Auth, plugins, realtime, dev-routes, email. Sem rotas completas de domínios P06+.

## Perguntas abertas para debate

- Quais rotas permanecem no composition root vs. `modules/*/api` montadas por plugin?
- Como versionar OpenAPI agregada sem acoplar schemas de todos os módulos prematuramente?
- O gateway realtime pertence integralmente a apps/api ou extrai subpacote em P05?
- Quais health checks de dependências (PG, NATS, Neo4j) expor sem vazar tenancy?

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
