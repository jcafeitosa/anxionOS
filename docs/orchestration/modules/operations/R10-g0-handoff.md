---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/operations`

**Rodada:** R10 · 2026-09-11 · ANX-389 · ANX-111 · **ANX-112** nao executada  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem codigo. Specs **draft**. ANX-342 `todo`.

## In scope

Incident, ExportJob, ServiceHealthSnapshot, Runbook, RetentionPolicy; PG `operations_*`; object store resultRef; projector IMPACTS; HTTP health/incidents; oraculos abaixo.

## Out of scope

Flight Recorder (`audit`); kill switch / D-GOV-010 (`risk` P06); pasta `infrastructure/`; spec accepted; ANX-342 done; G1 ANX-112; health como grant de trading (ADR0006).

## Non-goals

CI/CD real neste pack. Retention nao apaga ledger. SQLite diagnostico nao e incidente autoritativo.

## Ownership

Incident/ExportJob/Health/Runbook — **nao** Flight Recorder.

## Oraculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-OPS-01 | G3 | export idempotente |
| G3-OPS-02 | G3 | retention nao DELETE accounting/execution |
| G3-OPS-03 | G3 | health nao emite order.* |
| G5-OPS-01 | G5 | 403 cross-tenant |
| G5-OPS-02 | G5 | export sem grant 403 |
| G5-OPS-03 | G5 | ST04 SQLite |

## Veredito P1

G0 documental. **Nao** G1. ANX-342 `todo`.

## Saida R10

Handoff G0. ANX-389 evidencia — nao G7.
