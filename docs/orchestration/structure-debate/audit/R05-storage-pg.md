---
type: debate
---

# R05 — Armazenamento: `modules/audit`

**Issue:** ANX-107 · **ANX-108**

## Decisão

PostgreSQL manifests + index; object storage chunks (append-only); DeltaRef owner audit

## Tabelas / blobs

| Artefato | Integridade | ACL |
| --- | --- | --- |
| `audit_manifests` | hash chain `prevHash` + `contentHash` | org scope + grant export |
| `audit_chunks` (object storage) | SHA-256 imutável; WORM policy | signed URL TTL; no cross-tenant |
| `audit_replay_sessions` | checkpoint cursor | `audit.replay` read-only grant |

## Invariantes

| ID | Regra |
| --- | --- |
| AUD-R05-01 | PG index autoritativo; blob é payload |
| AUD-R05-02 | ingest + outbox mesma transação |
| AUD-R05-03 | chunk append-only — sem update/delete |
| AUD-R05-04 | export referencia `deltaRefId` — operations consumer |
| AUD-R05-05 | RLS defer P09 |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
