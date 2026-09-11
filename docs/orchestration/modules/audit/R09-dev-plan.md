---
type: debate
status: draft
---
# R09 — Plano: `modules/audit`

**ANX-107** · impl **ANX-108** (não neste slice) · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

Árvore ADR0002: `backend/modules/audit/src/{domain,application,infrastructure,api}`. Sem 24º módulo. Sem approvals/.

| Slice | Entrega |
| --- | --- |
| S1 | schema manifest+replay |
| S2 | domain event tap + dedupe |
| S3 | replay session + grant |
| S4 | HTTP v1 + graph stub |

G3-AUD-S2-01 tap dedupe · G3-AUD-S3-01 replay read-only · G5-AUD-01..03 R07.

P1 só G0 documental. **Sem ST08 migration.**

## Saída R9

Para R10.
