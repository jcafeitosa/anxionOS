---
type: debate
status: draft
---
# R09 — Plano de implementacao: `modules/simulation`

**Rodada:** R9 · 2026-09-11 · ANX-389 / ANX-115  
**Implementacao:** **ANX-116** — nao neste pack.  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

## In / Out (R9)

**In:** plano G1 futuro (`simulation_*`, sandbox, HTTP runs, projector isolado).

**Out:** Migration agora. D-GOV-010. Pasta `experiments/`. Certificação. Ordens reais.

## Ownership

| Superfície | Dono |
| --- | --- |
| Plano G0 documental | **simulation** |
| adapter-gateway | **KEEP** |

## In scope (G1 futuro)

Schema `simulation_*`, contratos, consumer `backtest.requested`, sandbox SQLite + resultRef, HTTP `/v1/simulation/runs`, eventos started/completed/failed, contrato projector isolado.

## Out of scope

Migration agora; D-GOV-010; RLS P09; ST08; research-python (ANX-90 S3); pasta `experiments/`; certificacao; ordens reais.

## Non-goals P1

So G0 documental. Nao scaffold 23 modulos. Nao criar `experiments/`.

## Pre-requisitos G1

eventing · graph T01 · AgencyScope · fixtures market-data com hash · object store para resultRef.

## Arvore alvo

```text
backend/modules/simulation/src/
  domain/  application/commands/  infrastructure/persistence/  api/  index.ts
```

## Fatias P08

| Slice | Entrega | Criterio |
| --- | --- | --- |
| P08-S1 | Schema + contracts | PG run state; SQLite so sandbox |
| P08-S2 | Consumer backtest.requested | G3-SIM-01 |
| P08-S3 | Sandbox + resultRef | G3-SIM-02; G5-SIM-02 |
| P08-S4 | HTTP runs | G5-SIM-01 |

## Matriz oraculos

| ID | Caso |
| --- | --- |
| G3-SIM-01 | requested para started+completed/failed |
| G3-SIM-02 | hash mismatch FAILED |
| G3-SIM-03 | sem certification.* |
| G3-SIM-04 | boundaries sem execution/infra |
| G3-SIM-05 | sem order.* |
| G5-SIM-01 | 403 cross-tenant |
| G5-SIM-02 | REAL egress |
| G5-SIM-03 | hash mismatch |
| G5-SIM-04 | ST04 SQLite |
| G5-SIM-05 | T01 DENY |

## Defer

D-GOV-010; RLS P09; ST08; research-python protocol.

## Saida R9

Plano para R10. P1 nao executa S1-S4.
