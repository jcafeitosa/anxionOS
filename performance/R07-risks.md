---
type: debate
---
# R07 — Riscos: `modules/performance`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-105  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-PERF-01 | Cross-tenant snapshot | 3 | 5 | 15 | AgencyScopePort | G5 |
| R-PERF-02 | Duplicate idempotency | 3 | 4 | 12 | unique command_id | G3 |
| R-PERF-03 | P&L stale vs ledger | 3 | 5 | 15 | asOfRevision + reject stale | G3 |
| R-PERF-04 | Upstream missing | 2 | 4 | 8 | fixtures G1; fail-closed | G3 |
| R-PERF-05 | Timescale drift vs PG | 3 | 5 | 15 | rebuild validator | G3 G4 |
| R-PERF-06 | Série usada como saldo | 2 | 5 | 10 | Non-goal R02; G3-PERF-02 | G2 |
| R-PERF-07 | Pasta analytics/ | 2 | 4 | 8 | PC 22 composto | P1 |
| R-PERF-08 | D-GOV-010 neste módulo | 1 | 3 | 3 | **Não** — risk P06 | P06 |
| R-PERF-09 | Certificação aqui | 2 | 5 | 10 | evaluation dono; G3-PERF-03 | G2 |
| R-PERF-10 | FK accounting | 2 | 4 | 8 | só eventos | G2 |

### Top 5

1. R-PERF-03 stale P&L · 2. R-PERF-05 drift Timescale · 3. R-PERF-01 cross-tenant · 4. R-PERF-02 duplicate · 5. R-PERF-06 série=saldo

## Oráculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-PERF-01 | G3 | outcome idempotente (command journal) |
| G3-PERF-02 | G3 | série Timescale não UPDATE accounting ledger |
| G3-PERF-03 | G3 | evaluation consome recorded; não certifica aqui |
| G5-PERF-01 | G5 | replay ledger duplicate no-op |
| G5-PERF-02 | G5 | ledger vs position divergente → snapshot marcado |
| G5-PERF-03 | G5 | GET outra org 403 |

## Non-goals

Ledger; certificação; pasta analytics/; spec accepted; ANX-342 done; D-GOV-010.

## Saída R7

Para R8.
