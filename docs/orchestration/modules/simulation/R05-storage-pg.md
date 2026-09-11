---
type: debate
---
# R05 — Armazenamento: `modules/simulation`

**Rodada:** R5 · ANX-389 · ANX-115 · ANX-116  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md).  
PG autoritativo (run state); Neo4j subgrafo opcional; SQLite sandbox **non-auth**; ST08 0/23; **sem migration**.

## Sandbox SQLite

Path `{SANDBOX_ROOT}/{organizationId}/{runId}/sandbox.db` · 0700 · cleanup ON COMPLETE · TTL 24h failed · sem attach external.

Tabelas PG: `simulation_manifests` · `simulation_runs` · `simulation_snapshots` · `simulation_command_journal`

SIM-R05-01 PG run state · SIM-R05-02 UoW+outbox · SIM-R05-03 SQLite nunca verdade cross-tenant · SIM-R05-04 dataset hash · SIM-R05-05 RLS defer P09.

## Saída R5

Modelo v1. Sem migration.
