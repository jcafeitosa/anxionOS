---
type: debate
---

# R05 — Armazenamento: `modules/simulation`

**Issue:** ANX-115 · **ANX-116**

## Decisão

PG manifests (autoritativo); Neo4j subgrafos opcional; SQLite sandbox **non-auth** por run

## Sandbox SQLite

| Regra | Detalhe |
| --- | --- |
| Path | `{SANDBOX_ROOT}/{organizationId}/{runId}/sandbox.db` |
| Permissões | 0700; processo worker isolado |
| Cleanup | `ON COMPLETE` delete tree; TTL 24h failed runs |
| Escape | sem attach external; sem `file:` URLs em input |

## Invariantes

| ID | Regra |
| --- | --- |
| SIM-R05-01 | PG autoritativo para run state |
| SIM-R05-02 | Mutação+outbox mesma transação |
| SIM-R05-03 | SQLite nunca autoritativo cross-tenant |
| SIM-R05-04 | dataset hash mismatch → run FAILED |
| SIM-R05-05 | RLS defer P09 |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
