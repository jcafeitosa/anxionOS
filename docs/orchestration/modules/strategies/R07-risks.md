---
type: debate
---
# R07 — Riscos: `modules/strategies`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-89  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-ST-01 | Cross-tenant strategy/signal leak | 3 | 5 | 15 | AgencyScopePort | G4 G5 |
| R-ST-02 | Stale signal → decisão errada | 4 | 5 | 20 | expiresAt + decisions reject | G3 G5 |
| R-ST-03 | Auto-promote por backtest | 3 | 5 | 15 | ST-R02-INV-06; só evaluation | G2 G4 |
| R-ST-04 | Binding swap mid-deployment | 3 | 4 | 12 | snapshot imutável | G3 |
| R-ST-05 | REAL/live bypass v1 | 2 | 5 | 10 | CHECK + ST_MODE_REAL_FORBIDDEN | G4 G5 |
| R-ST-06 | Ticks/P&L em strategies | 2 | 4 | 8 | Non-goal; Timescale = market-data/performance | G2 |
| R-ST-07 | Pasta products/ 24º módulo | 2 | 4 | 8 | PC 10 composto | P1 |
| R-ST-08 | Replay duplica CERTIFIED | 2 | 3 | 6 | Inbox + eventId | G3 |
| R-ST-09 | Outbox sem journal | 2 | 5 | 10 | UoW única | G3 |
| R-ST-10 | Params secretos no grafo | 3 | 4 | 12 | só hashes | G4 |
| R-ST-11 | Backtest com credencial REAL | 2 | 5 | 10 | simulation sandbox | G5 |
| R-ST-12 | D-GOV-010 neste módulo | 1 | 3 | 3 | **Não** — risk P06 | P06 |

### Top 5

1. R-ST-02 stale signal · 2. R-ST-01 cross-tenant · 3. R-ST-03 auto-promote · 4. R-ST-05 REAL · 5. R-ST-04 binding

## Oráculos G5

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-ST-01 | GET signal outra org | 403 |
| G5-ST-02 | deployment REAL | 400 ST_MODE_REAL_FORBIDDEN |
| G5-ST-03 | expiresAt no passado | 422 ST_SIGNAL_EXPIRED |
| G5-ST-04 | Publish T01 DENY | 403 |
| G5-ST-05 | CERTIFIED sem event | 409 ST_CERTIFICATION_REQUIRED |

## Saída R7

Riscos v1 fechados para R8.
