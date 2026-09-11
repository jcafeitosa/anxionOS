---
type: debate
---

# R07 — Riscos: `modules/capital`

**Issue:** ANX-91 · pack ANX-389  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md)

## In / Out (R7)

**In scope:** double allocation FI02, grant revogado mid-flight, cross-tenant, REAL schema-reject, SQLite saldo, strategies reserva direto.

**Out of scope:** D-GOV-010 (`risk` P06); venue fills (`execution`); ledger mutation (`accounting`). Spec accepted. ST08 live.

## Non-goals

Não mitigar com stub de reserva. Não aceitar REAL v1. Não pasta `approvals/`. Não ANX-342 G7.

## Ownership

| Superfície | Dono |
| --- | --- |
| Registro de riscos de saldo/reserva | **capital** |
| Kill switch | **risk** P06 |
| adapter-gateway | **KEEP** |

## Debate R7

**Arquiteto:** FI02 (double allocation) exige serializable + unique — não retry na API.

**Crítico:** Grant revogado mid-flight **bloqueia novos holds** e revalida epoch; não desfaz hold committed sem comando.

**Security:** `organizationId` + `ownerUserId`; REAL/live schema-reject v1 (ANX-58). D-GOV-010 fica em risk P06.

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-CAP-01 | Cross-tenant leak | 15 | org scope |
| R-CAP-02 | Double allocation FI02 | 20 | serializable tx |
| R-CAP-03 | Reserva sem grant | 18 | GovernancePort |
| R-CAP-04 | Ledger drift | 12 | accounting consumer |
| R-CAP-05 | Grant revogado mid-flight | 14 | block new holds |
| R-CAP-06 | REAL bypass v1 | 10 | schema reject |
| R-CAP-07 | SQLite saldo | 16 | CI boundary ADR0004 |
| R-CAP-08 | strategies reserva direto | 14 | só Allocation pós-governance |

Top 5 (02, 03, 01, 05, 07) → R08.

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-CAP-01 | reserve idempotente |
| G5-CAP-01 | cross-tenant |
| G5-CAP-02 | FI02 |
| G5-CAP-03 | REAL reject |

## Saída R7

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
