---
type: debate
status: draft
---
# R09 — Plano de implementacao: `modules/operations`

**Rodada:** R9 · 2026-09-11 · ANX-389 / ANX-111  
**Implementacao:** **ANX-112** — nao neste pack.  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

## In scope (G1 futuro)

Schema `operations_*`, contratos, Incident + consumer de health, ExportJob + retention, HTTP health/incidents, projector `graph:operations:v1` (driver em graph).

## Out of scope

Migration agora; D-GOV-010; RLS P09; ST08; CI/CD como codigo de pipeline neste modulo; pasta `infrastructure/`; Flight Recorder (`audit`); kill switch (`risk`).

## Non-goals P1

So G0 documental. Nao criar `infrastructure/`. Nao conceder trading via health (ADR0006).

## Pre-requisitos G1

eventing · AgencyScope · object store · graph projector contract.

## Arvore alvo

```text
backend/modules/operations/src/
  domain/  application/commands/  infrastructure/persistence/  api/  index.ts
```

## Fatias P07 pos-Owner

| Slice | Entrega | Criterio |
| --- | --- | --- |
| P07-S1 | Schema + contracts | G3-OPS-01 journal |
| P07-S2 | Incident + health consumer | G3-OPS-03; G5-OPS-01 |
| P07-S3 | ExportJob + retention | G3-OPS-02; G5-OPS-02 |
| P07-S4 | HTTP health/incidents | envelope institucional |

## Matriz oraculos

| ID | Caso |
| --- | --- |
| G3-OPS-01 | export idempotente |
| G3-OPS-02 | retention nao apaga ledger alheio |
| G3-OPS-03 | health nao e ordem |
| G5-OPS-01 | 403 cross-tenant |
| G5-OPS-02 | export sem grant 403 |
| G5-OPS-03 | ST04 SQLite |

## Defer

D-GOV-010 (`risk` P06); RLS P09; ST08; execucao real de CI/CD.

## Saida R9

Plano para R10. P1 nao executa S1-S4.
