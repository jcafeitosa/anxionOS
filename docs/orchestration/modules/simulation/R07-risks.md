---
type: debate
---
# R07 — Riscos: `modules/simulation`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-115  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## In scope

Escape de sandbox, SQLite como ledger, leak cross-tenant, completed tratado como CERTIFIED, hash ignorado, 24o modulo `experiments/`, D-GOV-010 no pack errado.

## Out of scope

Risco de venue real (`execution`); certificacao (`evaluation`); PolicyVersion (`risk`).

## Non-goals

Nao mitigar com sandbox permissivo para debug. Deny-by-default.

| ID | Risco | Sev | Mitigacao |
| --- | --- | ---: | --- |
| R-SIM-01 | Escape sandbox / REAL egress | 20 | deny-by-default; SIM_REAL_EGRESS_FORBIDDEN |
| R-SIM-02 | SQLite como ledger | 15 | SIM-R05-03; ST04 |
| R-SIM-03 | Cross-tenant run | 15 | AgencyScope + path orgId/runId |
| R-SIM-04 | Completed virar producao | 12 | evaluation nao certifica no completed |
| R-SIM-05 | Dataset hash mismatch ignorado | 12 | FAILED |
| R-SIM-06 | Pasta `experiments/` | 8 | PC 21 |
| R-SIM-07 | D-GOV-010 neste pack | 3 | risk P06 |
| R-SIM-08 | Credenciais no sandbox.db | 18 | proibido; fail closed |

## Oraculos G3 / G5

| ID | Gate | Resultado |
| --- | --- | --- |
| G3-SIM-01 | G3 | started+completed/failed |
| G3-SIM-02 | G3 | hash mismatch FAILED |
| G3-SIM-03 | G3 | sem certification.* |
| G5-SIM-01 | G5 | 403 cross-tenant |
| G5-SIM-02 | G5 | REAL egress bloqueado |
| G5-SIM-03 | G5 | hash mismatch FAILED |
| G5-SIM-05 | G5 | T01 DENY 403 |

## Saida R7

Fechado para R8.
