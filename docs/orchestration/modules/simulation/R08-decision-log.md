---
type: debate
status: draft
---
# R08 — Decision log: `modules/simulation`

**Rodada:** R8 · 2026-09-11 · ANX-389 · ANX-115  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md).  
**Status:** `draft` — nao spec accepted; nao G7.

## In / Out (R8)

**In:** log de ownership Run/Snapshot/Manifest; SQLite non-auth; completed sem cert.

**Out:** ANX-116 G1. ANX-342 done. research-python S3.

## Ownership

| Superfície | Dono |
| --- | --- |
| Decision log deste pack | **simulation** |
| adapter-gateway | **KEEP** |

## In scope

Ownership Run/Snapshot/Manifest/Checkpoint; SQLite non-auth; completed para evaluation **sem** cert; projector isolado; sem `experiments/`.

## Out of scope

ANX-116 G1; ANX-342 done; research-python S3.

## Non-goals

Nao autorizar egress REAL em staging neste log.

| ID | Decisao | Status |
| --- | --- | --- |
| D-SIM-001 | Dono SimulationRun, ScenarioSnapshot, TwinManifest, SandboxCheckpoint | fechada |
| D-SIM-002 | SQLite sandbox non-auth | fechada |
| D-SIM-003 | `run.completed` para evaluation; **sem** cert neste modulo | fechada |
| D-SIM-004 | `graph:simulation:v1` subgrafo isolado | fechada |
| D-SIM-005 | Sem pasta `experiments/` / `approvals/` | fechada |
| D-SIM-006 | D-GOV-010 = risk P06 | fechada |
| D-SIM-007 | Sem `execution.order.*` | fechada |
| P1-SIM-01 | Pack G0 canonico | fechada |
| P1-SIM-02 | Specs draft | fechada |
| P1-SIM-03 | Nao ANX-342 / nao G1 | fechada |

## Oraculos exigidos

G3-SIM-01..05 e G5-SIM-01..05. Engine **nao verificado** ate G1.

## Saida R8

Aprovado para R9 (documental).
