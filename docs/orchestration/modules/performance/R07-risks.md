---
type: debate
---
# R07 — Riscos: `modules/performance`

**Issue:** ANX-105 · pack ANX-389  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-PERF-01 | Cross-tenant snapshot | 3 | 5 | 15 | AgencyScopePort | G5 |
| R-PERF-02 | Duplicate idempotency | 3 | 4 | 12 | unique command_id | G3 |
| R-PERF-03 | P&L stale vs ledger | 3 | 5 | 15 | asOfRevision + reject stale | G3 |
| R-PERF-04 | Upstream missing | 2 | 4 | 8 | fixtures G1; fail-closed | G3 |
| R-PERF-05 | Timescale drift vs PG | 3 | 5 | 15 | rebuild validator | G3 G4 |
| R-PERF-06 | Série usada como saldo | 2 | 5 | 10 | Non-goal R02 | G2 |
| R-PERF-07 | Pasta analytics/ | 2 | 4 | 8 | PC 22 composto | P1 |
| R-PERF-08 | D-GOV-010 aqui | 1 | 3 | 3 | risk P06 | P06 |

### Top 5

R-PERF-03 · R-PERF-05 · R-PERF-01 · R-PERF-02 · R-PERF-06

## Oráculos G5

| ID | Esperado |
| --- | --- |
| G5-PERF-01 | replay ledger duplicate no-op |
| G5-PERF-02 | ledger vs position divergente → snapshot marcado |
| G5-PERF-03 | GET outra org 403 |

## Saída R7

Para R8.
