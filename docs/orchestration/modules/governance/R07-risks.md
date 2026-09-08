---
type: debate
---

# R07 — Riscos: `modules/governance`

**Rodada:** R7 · **Data:** 2026-09-08 · **Issue:** ANX-40 · **GK03:** revogação + epoch

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

✅ Registro fechado para R8.
