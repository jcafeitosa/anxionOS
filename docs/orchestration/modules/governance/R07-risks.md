---
type: debate
---
# R07 — Riscos: `modules/governance`

**Rodada:** R7  
**Data:** 2026-09-11 · **Issue:** ANX-40 · **GK03:** revogação + epoch · pack ANX-389  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## In / Out (R7)

**In:** grant escalation, stale ALLOW, membership.revoked leak, T01 timeout ALLOW, HIERARCHY_MODE sem Owner.

**Out:** R-GOV-01–05 + G5. Sem Red Team em grants de produção. Sem ST08 live.

## Non-goals

Não spec `accepted`. Não ANX-342/389 `done`. Não tratar timeout como ALLOW.

## Ownership (riscos)

| Superfície | Dono |
| --- | --- |
| Grant / epoch / GOV_* rejects | **governance** |
| T01 cache | **graph** |
| adapter-gateway | **KEEP** |

## Top 5 riscos

| ID | Risco | Sev | Mitigação | Gate |
| --- | --- | ---: | --- | --- |
| R-GOV-01 | Grant escalation — agente auto-expande capability | 15 | INV-GOV-03; sem IssueGrant self-service agente | G4, G5 |
| R-GOV-02 | Stale ALLOW — T01 com epoch antigo após RevokeGrant | 12 | GK03 bump epoch; graph cache invalidation | G3, G5 |
| R-GOV-03 | membership.revoked sem fechar grants derivados | 12 | Consumer idempotente + teste integração | G3 |
| R-GOV-04 | T01 timeout tratado como ALLOW | 12 | Fail-closed DENY/503 (orchestration R07) | G4 |
| R-GOV-05 | ChangeProposal HIERARCHY_MODE sem Owner approval | 10 | INV-GOV-05; G7 explícito | G4 |

## Cenários Red Team (G5)

1. Revoke grant → replay comando com epoch antigo → DENY
2. Delegation capability superset parent → 409 GOV_DELEGATION_EXCEEDS_PARENT
3. membership.revoked → grants derived still active → falha G3

## Saída R7

Registro para R8. Debate — não `accepted` spec.
