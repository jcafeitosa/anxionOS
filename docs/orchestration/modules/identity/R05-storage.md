---
type: debate
---

# R05 — Armazenamento: `modules/identity`

**Rodada:** R5 · 2026-09-11 · ANX-389  
**Callers:** [R04-contracts.md](./R04-contracts.md) · [R06-dependencies.md](./R06-dependencies.md).  
**ADR0004:** PostgreSQL autoritativo; Neo4j `:Principal` **sem tokens**; sem Timescale/pgvector; SQLite **proibido** para sessão institucional. ST08 0/23. **Sem migration neste pack.**

Tabelas: `identity_principals` · `identity_command_journal`. Sessões Better Auth no schema auth (composition) com revogação via eventos.

Projector: `graph:identity:v1` no módulo **graph** (não neo4j-driver aqui).

Histórico: [structure R05](../../structure-debate/identity/R05-storage.md).

## Saída R5

R06–R10 já fat neste diretório.
