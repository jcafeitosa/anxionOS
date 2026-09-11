---
type: debate
---

# R07 — Riscos: `modules/simulation`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-115  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## In / Out (R7)

**In:** riscos de escape de sandbox, SQLite-as-ledger, leak, completed≠CERTIFIED, hash ignorado, 24º módulo, credenciais no sandbox.

**Out:** Venue real (`execution`). Certificação (`evaluation`). PolicyVersion (`risk`). Spec accepted. ST08 live.

## Ownership

| Superfície | Dono |
| --- | --- |
| Registro de riscos de sandbox | **simulation** |
| Kill switch / D-GOV-010 | **risk** P06 |
| adapter-gateway | **KEEP** |

## Debate R7

**Arquiteto:** o risco dominante é escape (REAL egress) e tratar completed como CERTIFIED.

**Crítico:** SQLite compartilhado entre tenants é HIGH — SIM-R05-03 + ST04. Não “mitigar” com sandbox permissivo para debug.

**Security:** deny-by-default; T01 DENY não started; cross-tenant GET 403.

## In scope

Escape de sandbox, SQLite como ledger, leak cross-tenant, completed tratado como CERTIFIED, hash ignorado, 24º módulo `experiments/`, D-GOV-010 no pack errado, credenciais no `sandbox.db`.

## Out of scope

Risco de venue HTTP (`execution` infra); emissão de Certification (`evaluation`); PolicyVersion (`risk`).

## Non-goals

Não mitigar com sandbox permissivo. Não REAL v1. Não pasta `approvals/`.

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-SIM-01 | Escape sandbox / REAL egress | 20 | deny-by-default; SIM_REAL_EGRESS_FORBIDDEN |
| R-SIM-02 | SQLite como ledger | 15 | SIM-R05-03; ST04 |
| R-SIM-03 | Cross-tenant run | 15 | AgencyScope + path orgId/runId |
| R-SIM-04 | Completed virar produção | 12 | evaluation não certifica no completed |
| R-SIM-05 | Dataset hash mismatch ignorado | 12 | FAILED obrigatório |
| R-SIM-06 | Pasta `experiments/` | 8 | PC 21 composto |
| R-SIM-07 | D-GOV-010 neste pack | 3 | risk P06 |
| R-SIM-08 | Credenciais no sandbox.db | 18 | proibido; fail closed |

Top 5 (01, 08, 02, 03, 04) → R08.

## Oráculos G3 / G5

| ID | Gate | Resultado |
| --- | --- | --- |
| G3-SIM-01 | G3 | started+completed/failed |
| G3-SIM-02 | G3 | hash mismatch FAILED |
| G3-SIM-03 | G3 | sem certification.* |
| G3-SIM-04 | G3 | import execution/infra falha no boundary |
| G3-SIM-05 | G3 | sem order.* |
| G5-SIM-01 | G5 | 403 cross-tenant |
| G5-SIM-02 | G5 | REAL egress bloqueado |
| G5-SIM-03 | G5 | hash mismatch FAILED |
| G5-SIM-04 | G5 | ST04 SQLite |
| G5-SIM-05 | G5 | T01 DENY 403 |

## Saída R7

Fechado para R8.
