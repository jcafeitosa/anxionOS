---
type: debate
---
# R07 — Riscos: `modules/execution`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issue:** ANX-101 · pack ANX-389  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## In / Out (R7)

**In:** permit bypass, duplicate fill, cross-tenant, stale epoch, secret leak, fill overflow, SQLite, REAL, double clientOrderId, accounting sync no hot path.

**Out:** tabela R-EX-* + G5. **Não** Red Team em venue real. Sem ST08 live.

## Non-goals

Não mitigar com stub de permit. Não REAL v1. Não spec `accepted`. Não ANX-342/389 `done`.

## Ownership (riscos)

| Superfície | Dono |
| --- | --- |
| EX_* rejects / order uniqueness | **execution** |
| Permit forge | **governance** / **risk** |
| Venue secret | **connections** |
| adapter-gateway | **KEEP** |

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-EX-01 | **Permit bypass** — ordem sem RiskPermit/ExecutionPermit ou permit já consumido | 20 | EX-R02-INV-01/07; consume atômico; EX_PERMIT_BYPASS |
| R-EX-02 | **Duplicate fill** — mesmo venueFillId ou replay callback | 20 | EX-R02-INV-05; UNIQUE constraint; EX_DUPLICATE_FILL |
| R-EX-03 | **Cross-tenant order** — intent/reservation de outra org | 20 | EX-R02-INV-12; EX_CROSS_TENANT; G5-EX-01 |
| R-EX-04 | Stale riskEpoch após submit enfileirado | 18 | revalida na transação submit; risk.epoch consumer suspend adapter |
| R-EX-05 | Segredo venue em evento/log | 19 | EX-R02-INV-09; scan CI environment-config patterns |
| R-EX-06 | Fill quantity > order remainder | 17 | EX-R03-INV-09; reject overflow |
| R-EX-07 | SQLite order queue dev | 18 | EX-R05 CI guard |
| R-EX-08 | REAL mode escalation | 10 | schema + assertAdapterAllowedForMode (contracts) |
| R-EX-09 | Double clientOrderId cross-session | 16 | UNIQUE (org, clientOrderId, adapter) |
| R-EX-10 | Accounting sync no hot path bloqueia submit | 14 | EX-R02-INV-13 async projector |

## Adversarial (G5)

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-EX-01 | submit com intentHash org-A e reservation org-B | EX_CROSS_TENANT reject |
| G5-EX-02 | RiskPermit já CONSUMED; replay submit | EX_PERMIT_BYPASS reject |
| G5-EX-03 | Callback fill duplicado mesmo venueFillId | EX_DUPLICATE_FILL ou ReconciliationCase |
| G5-EX-04 | Order sem ExecutionPermit válido | EX_PERMIT_STALE reject |
| G5-EX-05 | AdapterRef PAPER com secret inline no payload Order | EX_CONFIG_REQUIRED / CI leak scan |

Top 5 → R08.

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
