---
type: debate
---
# R05 — Armazenamento: `modules/risk`

**Rodada:** R5  
**Data:** 2026-09-11  
**Issue:** ANX-99 · P1 ANX-389

## ADR0004

| Engine | Uso neste módulo |
| --- | --- |
| PostgreSQL | LimitPolicy, ExposureSnapshot, RiskCheckResult, RiskPermit, KillSwitchState, risk_epoch_registry, command_journal |
| Neo4j | projeção async via graph — restrições/violações |
| Timescale | **não** — séries de exposição derivadas podem viver em performance/portfolios |
| pgvector | **não** |
| SQLite | **proibido** para check/permit/kill switch autoritativo |

D-GOV-010 (corpo PolicyVersion RISK) **deferido P06** — este pack só referencia PolicyReference em governance.

UoW: estado + journal + outbox na mesma transação. Sem FK para capital/portfolios.

## Saída R5

Para R06.
