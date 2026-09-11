---
type: debate
---

# R04 — Contratos: `modules/identity`

**Rodada:** R4 · 2026-09-11 · ANX-389  
**Callers:** [R05-storage.md](./R05-storage.md) · [R06-dependencies.md](./R06-dependencies.md). API: `/v1/identity/principals` + `/v1/auth/*` em apps/api. Sem secrets em payload.

ownerDomain `identity`. Layout alvo `@anxionos/contracts/identity/` (P1 — código P0 ainda envelope genérico — não é este slice de impl).

Eventos: `identity.principal.registered.v1` · `identity.principal.suspended.v1` · `identity.principal.revoked.v1` · `identity.session.revoked.v1`.

Códigos: IDN_PRINCIPAL_NOT_FOUND · IDN_SESSION_REVOKED · IDN_REVISION_CONFLICT · IDN_CROSS_TENANT.

## Oráculos

G3-IDN-01 getPrincipalById · G3-IDN-02 register idempotente · G5-IDN-01 token **não** em evento · G5-IDN-02 suspend → session consumer.

## Alternativas rejeitadas

Tokens no Neo4j; SQLite sessão; identity importa better-auth; pasta organization única.

## Saída R4

Para R5.
