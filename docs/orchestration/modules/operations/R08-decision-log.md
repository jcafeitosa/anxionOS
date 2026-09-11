---
status: draft
type: debate
---
# R08 — Decision log: `modules/operations`

**Rodada:** R8 · 2026-09-11 · ANX-389 · ANX-111  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).

## In / Out (R8)

**In scope:** decisões de ownership Incident/Export/Health/Runbook/Retention; engines; exclusão de infrastructure/ e D-GOV-010.

**Out of scope:** G1 ANX-112; ANX-342 done; spec accepted.

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| D-OPS-001 | Dono Incident / ExportJob / HealthSnapshot / Runbook / RetentionPolicy | R1–R3 | fechada |
| D-OPS-002 | PC 17/18/20 neste módulo **sem** pasta infrastructure/ | R1 R6 | fechada |
| D-OPS-003 | PG operations_* autoritativo; export blob object store resultRef | R5 | fechada |
| D-OPS-004 | graph:operations:v1 async — IMPACTS só ids | R5 R6 | fechada |
| D-OPS-005 | Sem pasta approvals/policies | P1 | fechada |
| D-OPS-006 | D-GOV-010 = **risk P06** — não operations | R6 R7 | fechada |
| D-OPS-007 | RLS defer P09 (application-only S1–S2) | R5 | fechada |
| D-OPS-008 | Flight Recorder ≠ operations; só deltaRefId | R2 R6 | fechada |
| D-OPS-009 | Health não é grant de trading (ADR0006) | R5 R7 | fechada |
| D-OPS-010 | SQLite não é incidente autoritativo | R5 | fechada |
| P1-OPS-01 | Pack canônico em docs/orchestration/modules/operations/ | P1 | fechada |
| P1-OPS-02 | Specs 001–005 **draft**; ST08 0/23 | P1 | fechada |
| P1-OPS-03 | Este pack **não** é G7 de código nem ANX-342 | P1 | fechada |
| P1-OPS-04 | Oráculos G3-OPS-01..03 / G5-OPS-01..03 nomeados | P1 | fechada |

## Non-goals registrados

Sem migration; sem ANX-112 neste slice; retention não apaga ledger.

## Saída R8

Decision log aprovado para R9.
