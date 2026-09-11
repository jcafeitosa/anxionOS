# R05 — Armazenamento: `modules/identity`

**Rodada:** R5  
**Data:** 2026-09-11  
**ADR0004:** PostgreSQL autoritativo; Neo4j Principal sem tokens; sem Timescale/pgvector; SQLite **proibido** para sessão institucional.

Tabelas: identity_principals, identity_command_journal; sessões Better Auth no schema auth (composition) com revogação via eventos.

Histórico detalhado: [structure R05](../../structure-debate/identity/R05-storage.md).

## Saída R5

R06–R10 já neste diretório.
