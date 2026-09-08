---
type: debate
---

# R05 — Armazenamento: `modules/strategies`

**Issue:** ANX-89

| Dado | Engine |
| --- | --- |
| strategies, versions, deployments, backtests, signals | PostgreSQL |
| journal + outbox | PostgreSQL |
| backtest blobs | Object storage + ref PG |
| graph nodes | Neo4j via graph:strategies:v1 |
| SQLite | dev/test only |

ST-R05-01: sem Timescale · ST-R05-04: RLS defer P09

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
