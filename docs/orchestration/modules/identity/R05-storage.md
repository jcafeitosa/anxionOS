---
type: debate
---

# R05 — Armazenamento: `modules/identity`

**Rodada:** R5 · 2026-09-11 · ANX-389  
**Callers:** [R04-contracts.md](./R04-contracts.md) · [R06-dependencies.md](./R06-dependencies.md) · [ROUNDS.md](./ROUNDS.md).  
**ADR0004:** PostgreSQL autoritativo; Neo4j `:User` projetado **sem tokens** (Principal permanece PG); sem Timescale/pgvector; SQLite **proibido** para sessão institucional. ST08 0/23. **Sem migration neste pack.**

## Ownership

| Store | Uso | Não |
| --- | --- | --- |
| PG `identity_principals` | Principal, status, revision | Agency/membership |
| PG `identity_command_journal` + outbox | estado+journal atômico | tokens Better Auth |
| Schema Better Auth (`apps/api` composition) | sessão HTTP | dono de Principal |
| Neo4j via `graph:identity:v1` | nó User + identitySubject | neo4j-driver neste módulo |
| SQLite | **proibido** | — |

Sem FK para `organizations_*`. Eventos `identity.principal.*.v1` / `identity.session.revoked.v1` **sem** secrets.

## Invariantes e oráculos

IDN-R05-01 tokens nunca no grafo. IDN-R05-02 revogação dispara consumer de sessão. IDN-R05-03 domain/ não importa Better Auth.  
G3-IDN-01 `getPrincipalById` · G5-IDN-01 token ausente em evento · G5-IDN-03 SQLite ausente no path de sessão.

## Non-goals

Pasta organization única (PC 02); D-GOV-010 (risk P06); spec `accepted`; ANX-342 G7.

Histórico: [structure R05](../../structure-debate/identity/R05-storage.md).

## Saída R5

Para [R06](./R06-dependencies.md).
