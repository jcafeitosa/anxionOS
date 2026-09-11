---
type: debate
---
# R05 — Armazenamento: `modules/evaluation`

**Rodada:** R5 · ANX-389 · ANX-109  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md).  
PG autoritativo; Neo4j projector; **sem** Timescale de P&L; SQLite **não**; ST08 0/23; **sem migration**.

Tabelas: `evaluation_policies` · `evaluation_records` · `evaluation_certifications` · `evaluation_reputation` · `evaluation_recommendations` · `evaluation_command_journal`

EVL-R05-01 PG · EVL-R05-02 UoW+outbox · EVL-R05-03 RLS defer P09.

## Neo4j

certification.issued → CERTIFIES (subject ids + policy hash). Sem métricas cruas.

## Saída R5

Modelo v1.
