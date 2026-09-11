---
type: debate
status: draft
---
# R10 — Pacote G0: `modules/audit`

**Issues:** ANX-107 · ANX-108 · pack ANX-389  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).

### In scope

Flight Recorder, DeltaRef, tap redacted, replay read-only, oráculos G3/G5.

### Out of scope

Journal de domínio, ledger, pasta policies/approvals, D-GOV-010 (risk P06), spec accepted, ANX-342 G7, ST08 migrations. Kill switch = risk. Logs app = observability.

**Ownership:** AuditManifest, IndexCursor, RetentionPolicy (ponteiro), ReplaySession read-only. Journal = donos; ledger = accounting; D-GOV-010 = risk P06.

**Veredito P1:** pack audit documental. **Não** autoriza G1. Replay sem side-effect de capital (AUD-R02-INV-05). Specs 001–005 `draft`. Pasta approvals/policies **não criar**. ANX-342 permanece `todo`.
