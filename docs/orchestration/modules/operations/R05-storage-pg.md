---
type: debate
---
# R05 — Armazenamento: `modules/operations`

**Rodada:** R5 · 2026-09-11 · ANX-389 · ANX-111  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md).  
PG autoritativo; Neo4j impact projector; SQLite **não**; ST08 0/23; **sem migration**. Tabelas documentais.

## Tabelas alvo G1

`operations_incidents` · `operations_runbooks` · `operations_retention_policies` · `operations_export_jobs` (idempotency_key) · `operations_health_snapshots` · `operations_command_journal`

**OPS-R05-01** PG. **OPS-R05-02** UoW+outbox. **OPS-R05-03** RLS defer P09. **OPS-R05-04** blob export em object store (`resultRef`), não BYTEA.

## Neo4j

incident.opened → IMPACTS (ids de serviço). Sem PII.

## Saída R5

Modelo v1. Sem migration.
