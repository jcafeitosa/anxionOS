---
type: debate
---

# R01 — Contexto: `modules/identity`

**Componente:** modules/identity  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P02  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Usuários, sessões e autenticação — identidade humana e service principals; revogação e vínculo a Principal institucional.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Principal, sessões Better Auth, identidades de serviço, estado de revogação.
- Confirmação transacional PG (estado + journal + outbox).

### Não possui (fronteiras ADR0002 / brain)

- Agency, Owner, membership, onboarding — `organizations`.
- Grants, mandatos, aprovações — `governance`.
- Tokens/credenciais de provider — `connections`.

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | packages/contracts, packages/eventing, packages/database, packages/secrets (Better Auth) |
| **Downstream** | organizations, governance, apps/api (auth plugin), todos os scopes tenant |

## Armazenamento

PG: usuários, sessões, service principals. Neo4j: Principal, papéis visíveis (sem tokens). SQLite: nenhuma sessão institucional autoritativa.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Parcial (`in_review`, ANX-28).** `backend/modules/identity/` com Principal, register/get, Drizzle schema, migration 0000. Sem Better Auth integrado ao módulo ainda.

## Perguntas abertas para debate

- Better Auth fica em apps/api ou infra do módulo identity?
- Service principals para execution-go/research-python: modelo e rotação?
- Eventos de revogação: quem consome para invalidar sessões derivadas?
- Fronteira exata Principal vs authUserId duplicado em organizations.

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R04 — Contratos/API** (`R04-contracts.md`) — R03 concluído em [R03-domain-sketch.md](./R03-domain-sketch.md).
