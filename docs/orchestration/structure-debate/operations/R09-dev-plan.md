---
type: debate
status: draft
---

# R09 — Plano: `modules/operations`

**ANX-111** · impl **ANX-112**

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema incident+export+health | G2, G4 |
| S2 | audit.manifest consumer + health probes | G3 |
| S3 | export job lifecycle + retention ACL | G3, G5 |
| S4 | HTTP v1 + graph stub | G6 parcial |

## Matriz G3/G5

G3-OPS-S3-01 export idempotent · G3-OPS-S3-02 retention deny · G5-OPS-01 duplicate export job · G5-OPS-02 cross-tenant manifest

**Evidência impl:** `backend/tests/operations/` (ANX-112 `in_review`)

**ANX-112** — impl `in_review`; debate G7 pendente **ANX-111**

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
