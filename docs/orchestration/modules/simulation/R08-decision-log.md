---
type: debate
status: draft
---

# R08 — Decision log: `modules/simulation`

**Rodada:** R8 · 2026-09-11 · ANX-389 · ANX-115  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md).  
**Status:** `draft` — não spec accepted; não G7; não ST08 live.

## In / Out (R8)

**In:** log de ownership Run/Snapshot/Manifest/Checkpoint; SQLite non-auth; completed sem cert; projector isolado; KEEP adapter-gateway.

**Out:** ANX-116 G1. ANX-342 done. research-python S3. Spec 004 `accepted`. ANX-389 `done`.

## Ownership consolidado

| Superfície | Dono |
| --- | --- |
| SimulationRun / ScenarioSnapshot / TwinManifest / SandboxCheckpoint | **simulation** |
| StrategyVersion | **strategies** |
| Certification | **evaluation** |
| Order REAL | **execution** |
| adapter-gateway | **KEEP** |

## Non-goals

Não autorizar egress REAL em staging neste log. Não stamp `accepted`. Não fake ST08.

| ID | Decisão | Status |
| --- | --- | --- |
| D-SIM-001 | Dono SimulationRun, ScenarioSnapshot, TwinManifest, SandboxCheckpoint | fechada |
| D-SIM-002 | SQLite sandbox non-auth | fechada |
| D-SIM-003 | `run.completed` para evaluation; **sem** cert neste módulo | fechada |
| D-SIM-004 | `graph:simulation:v1` subgrafo isolado | fechada |
| D-SIM-005 | Sem pasta `experiments/` / `approvals/` / `policies/` | fechada |
| D-SIM-006 | D-GOV-010 = risk P06 | fechada |
| D-SIM-007 | Sem `execution.order.*` | fechada |
| D-SIM-008 | PG verdade do run; resultRef object store | fechada |
| D-SIM-009 | RLS defer P09 | fechada |
| P1-SIM-01 | Pack G0 canônico neste diretório | fechada |
| P1-SIM-02 | Specs 001–005 **draft**; ST08 0/23 | fechada |
| P1-SIM-03 | Não ANX-342 / não G1 / não ANX-389 done | fechada |

## Oráculos exigidos

G3-SIM-01..05 e G5-SIM-01..05. Engine **não verificado** até G1.

## Saída R8

Aprovado para R9 (documental).
