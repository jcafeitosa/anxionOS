---
status: draft
type: debate
---
# R08 — Decision log: `modules/audit`

**Rodada:** R8 · 2026-09-11 · ANX-389 · ANX-107  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| D-AUD-001 | Dono Flight Recorder / DeltaRef / Manifest / ReplaySession | R1–R3 | fechada |
| D-AUD-002 | Não é segundo ledger | R2 | fechada |
| D-AUD-003 | PG audit_manifests + audit_command_journal; object audit_chunks append-only | R5 | fechada |
| D-AUD-004 | Replay grant audit.replay read-only | R4 R6 | fechada |
| D-AUD-005 | graph:audit:v1 async — só ids | R5 R6 | fechada |
| D-AUD-006 | Sem pastas approvals/policies | P1 | fechada |
| D-AUD-007 | Spec 001–005 draft; ST08 0/23 | P1 | fechada |
| D-AUD-008 | D-GOV-010 = **risk P06** | R6 R7 | fechada |
| D-AUD-009 | operations consome deltaRefId; não grava trail | R6 | fechada |
| D-AUD-010 | RLS defer P09 | R5 | fechada |
| P1-AUD-01 | Pack canônico; **não** G7 código nem ANX-342 | P1 | fechada |
| P1-AUD-02 | Oráculos G3-AUD-* / G5-AUD-* nomeados | P1 | fechada |

## Non-goals registrados

SQLite trail; Cypher no módulo; mutation em replay; kill switch.

## Saída R8

Para R9.
