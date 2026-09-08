---
type: guide
---

# Funcionalidades — `modules/identity` (P02)

**Issue mapa:** ANX-43 · **Implementação:** ANX-28 (`in_review`)  
**Fontes:** [identity R01](../../structure-debate/identity/R01-context.md) · [R03 domain sketch](../../structure-debate/identity/R03-domain-sketch.md) · `brain/project-docs/specs/001-institutional-contract/spec.md` · `brain/project-docs/specs/002-agents-knowledge/spec.md`

## Responsabilidade

Usuários, sessões, autenticação — Principal institucional, sessões humanas (Better Auth), service principals para runtimes Go/Python.

## Histórias humanas

| Papel | Jornada | Comando/Query |
| --- | --- | --- |
| **Owner** | Registrar/login, MFA, ver sessões ativas, revogar dispositivo | Auth via Better Auth; `getPrincipalById` |
| **Operator** | Mesmo identity do Owner ou convidado — sem Agency scope aqui | Sessão → `principalId` |
| **Platform** | Provisionar service principals, rotacionar credenciais execution-go | `registerServicePrincipal` (R-debate) |

## Histórias de agente

| Agente | Capacidade | Grant |
| --- | --- | --- |
| **Brain AGENCY** | Consultar próprio Principal, não criar sessão humana | `identity.principal.get` (self) |
| **Orchestration worker** | Resolver `actorPrincipalId` em Runs | Port interno — não tool pública |
| **Audit agent PLATFORM** | Listar revogações por janela para investigação | `identity.session.list_revoked` (R-debate) |

## Commands (sketch)

| Command | Efeito | Idempotência |
| --- | --- | --- |
| `RegisterPrincipal` | Cria Principal PG + evento | `idempotencyKey` por email/hash |
| `RevokeSession` | Invalida sessão Better Auth | `sessionId` |
| `RegisterServicePrincipal` | Credencial rotacionável | `serviceName` + version |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetPrincipalById` | Principal DTO sem secrets |
| `ListActiveSessions` | Sessões do principal autenticado |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `identity.principal.registered.v1` | graph projection, audit |
| `identity.session.revoked.v1` | governance (invalidar derivados), apps/api session cache |

## Integração

| Módulo | Borda |
| --- | --- |
| **organizations** | `PrincipalLookup` port — `getPrincipalById` (D-ORG-022) |
| **governance** | `actorPrincipalId` da sessão validada |
| **apps/api** | Auth plugin, Better Auth composition root |
| **graph** | Projeção `Principal` — sem tokens |

## Gap código

- ✅ `domain/`, `application/`, `infrastructure/` parcial
- ❌ `graph/`, `workers/`, eventos outbox, CapabilityManifest
- ❌ Better Auth integrado ao módulo (só apps/api parcial)
