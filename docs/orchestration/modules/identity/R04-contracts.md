---
type: debate
---
# R04 — Contratos: `modules/identity`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue pack:** ANX-389  
**Callers:** [R05-storage.md](./R05-storage.md) · [R06-dependencies.md](./R06-dependencies.md).  
**API:** `/v1/identity/principals` + `/v1/auth/*` em `apps/api`. Sem secrets em payload.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `identity` |
| eventType | `identity.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Segredos | **proibido** (accessToken, refresh, PAN) |

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| IDN_PRINCIPAL_NOT_FOUND | 404 | Fora do scope |
| IDN_SESSION_REVOKED | 401/409 | Sessão inválida |
| IDN_REVISION_CONFLICT | 409 | expectedRevision |
| IDN_CROSS_TENANT | 403 | Agency mismatch |
| IDN_DUPLICATE_IDEMPOTENCY | 409 | Conflito |
| IDN_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout `@anxionos/contracts/identity/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`. Código P0 ainda envelope genérico — **não** é impl deste slice. **KEEP adapter-gateway** no pacote de contratos se já exportado.

## In / Out (R4)

**In:** POST `/v1/identity/principals` (`apps/api` valida sessão); GET por id com agency header; POST suspend/revoke.

**Out:** envelope SDD; códigos IDN_*; eventos listados; **nunca** accessToken/refresh no payload.

## Non-goals

- Não tokens no Neo4j.
- Não identity importa better-auth no domain.
- Não pasta organization única.
- Não schema produção neste pack.

## Eventos v1 emitidos

| eventType | Payload (sem secrets) | Consumidores |
| --- | --- | --- |
| `identity.principal.registered.v1` | principalId, organizationId, kind | organizations, governance, graph, audit |
| `identity.principal.suspended.v1` | principalId, revision | governance, apps/api session |
| `identity.principal.revoked.v1` | principalId | governance, apps/api |
| `identity.session.revoked.v1` | sessionRefId, principalId | apps/api Better Auth consumer |

## REST `/v1/identity/*`

| Método | Path | Grant |
| --- | --- | --- |
| GET | `/v1/identity/principals/:id` | identity.read |
| POST | `/v1/identity/principals` | identity.admin + T01 |
| POST | `/v1/identity/principals/:id/suspend` | identity.admin + T01 |
| POST | `/v1/identity/principals/:id/revoke` | identity.admin + T01 |

`/v1/auth/*` permanece em **apps/api** (Better Auth) — não duplicar no módulo.

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-IDN-01 | G3 | getPrincipalById |
| G3-IDN-02 | G3 | register idempotente |
| G5-IDN-01 | G5 | token **não** em evento |
| G5-IDN-02 | G5 | suspend → session consumer |

## Alternativas rejeitadas

Tokens no Neo4j; SQLite sessão; identity importa better-auth no domain; pasta organization única.

## Saída R4

Para R5.
