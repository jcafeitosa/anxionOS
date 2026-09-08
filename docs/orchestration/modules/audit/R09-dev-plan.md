---
type: debate
status: draft
---

# R09 — Plano: `modules/audit`

**ANX-107** · impl **ANX-108**

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema manifest+replay | G2, G4 |
| S2 | domain event tap ingest + dedupe | G3, G5 |
| S3 | replay session + grant audit.replay | G3, G5 |
| S4 | HTTP v1 + graph stub | G6 parcial |

## Matriz G3/G5

G3-AUD-S2-01 tap dedupe eventId · G3-AUD-S3-01 replay read-only · G5-AUD-01 cross-tenant export · G5-AUD-02 mutable chunk rejected

**Evidência impl:** `backend/tests/audit/` (ANX-108 `in_review`)

**ANX-108** — impl `in_review`; debate G7 pendente **ANX-107**

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
