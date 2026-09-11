---
type: debate
---
# R05 — Armazenamento: `modules/identity`

**Rodada:** R5  
**Data:** 2026-09-11  
**Issue pack:** ANX-389  
**Callers:** [R04-contracts.md](./R04-contracts.md) · [R06-dependencies.md](./R06-dependencies.md) · [ROUNDS.md](./ROUNDS.md).  
**ADR0004:** PostgreSQL autoritativo; Neo4j `:User` projetado **sem tokens**; sem Timescale/pgvector; SQLite **proibido** para sessão institucional. ST08 0/23. **Sem migration neste pack.**

## In / Out (R5)

**In:** writes de Principal/status via UoW; projector consome eventos para Neo4j (módulo **graph**).

**Out:** rows `identity_principals` + `identity_command_journal` + outbox. Sem tokens Better Auth nas tabelas deste módulo.

## Out of scope (não gravar aqui)

| Dado | Dono |
| --- | --- |
| Agency / membership | **organizations** |
| Grants | **governance** |
| Sessão HTTP cookie/token | **apps/api** Better Auth |
| Driver Neo4j | **graph** |
| Secrets de provider | **connections** |

## Non-goals

- Pasta organization única (PC 02).
- D-GOV-010 (risk P06).
- Spec `accepted`.
- ANX-342 G7.
- Migration / ST08 live.

## Ownership de engines

| Store | Uso | Não |
| --- | --- | --- |
| PG `identity_principals` | Principal, status, revision | Agency/membership |
| PG `identity_command_journal` + outbox | estado+journal atômico | tokens Better Auth |
| Schema Better Auth (`apps/api`) | sessão HTTP | dono de Principal |
| Neo4j via `graph:identity:v1` | nó User + identitySubject | neo4j-driver neste módulo |
| SQLite | **proibido** | — |

Sem FK para `organizations_*`. Eventos **sem** secrets.

## Princípios

| Princípio | Decisão |
| --- | --- |
| Fonte transacional | PostgreSQL |
| Grafo | projector `graph:identity:v1` — sem tokens |
| FK cross-module | **Não** |

**IDN-R05-01** tokens nunca no grafo. **IDN-R05-02** revogação dispara consumer de sessão. **IDN-R05-03** domain/ não importa Better Auth.

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-IDN-01 | G3 | getPrincipalById |
| G5-IDN-01 | G5 | token ausente em evento |
| G5-IDN-03 | G5 | SQLite ausente no path de sessão |

Histórico: [structure R05](../../structure-debate/identity/R05-storage.md).

## Saída R5

Para [R06](./R06-dependencies.md).
