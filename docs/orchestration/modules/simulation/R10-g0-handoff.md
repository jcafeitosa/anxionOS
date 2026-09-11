---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/simulation`

**Rodada:** R10 · 2026-09-11 · ANX-389 · ANX-115 · **ANX-116** nao executada  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem codigo. Specs **draft**. ANX-342 `todo`.

## In scope

SimulationRun, ScenarioSnapshot, TwinManifest, SandboxCheckpoint; PG run state; SQLite sandbox **non-auth**; `graph:simulation:v1` isolado; HTTP `/v1/simulation`; oraculos abaixo.

## Out of scope

Certification (`evaluation`); execution REAL; pasta `experiments/`; D-GOV-010 (`risk` P06); spec accepted; ANX-342 done; G1.

## Non-goals

Twin nao escreve capital/execution. Completed ≠ CERTIFIED. Credenciais no sandbox **proibido**.

## Ownership

PG e verdade do run. SQLite so sandbox. resultRef em object store.

## Oraculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-SIM-01 | G3 | requested → started+completed/failed |
| G3-SIM-02 | G3 | hash mismatch FAILED |
| G3-SIM-03 | G3 | sem certification.* |
| G5-SIM-01 | G5 | 403 cross-tenant |
| G5-SIM-02 | G5 | REAL egress bloqueado |
| G5-SIM-05 | G5 | T01 DENY |

## Veredito P1

G0 documental. **Nao** autoriza G1. Twin nao escreve capital/execution.

## Saida R10

Handoff G0. ANX-389 evidencia — nao G7.
