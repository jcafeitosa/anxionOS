---
type: debate
status: draft
---
# R08 — Decision log: `modules/strategies`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-89 · gate ANX-58  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R8)

**In:** síntese D-ST-*. **Out:** decision log. **Não** fechar spec accepted nem ANX done.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Decisões D-ST-* | **strategies** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| D-ST-001 | Dono Strategy/StrategyVersion/Deployment/Signal/BacktestRun | R1–R3 | fechada |
| D-ST-002 | Signal ≠ TradeIntent | R2 | fechada |
| D-ST-003 | Promoção via `evaluation.certification.issued.v1` | R2 R6 | fechada |
| D-ST-004 | SIMULATED+PAPER only v1 | R2 R5 | fechada |
| D-ST-005 | MarketDataPort — não replica preços | R6 | fechada |
| D-ST-006 | graph:strategies:v1 async | R5 R6 | fechada |
| D-ST-007 | research-python job protocol defer S3 / ANX-90 | R9 | defer |
| D-ST-008 | Sem pasta products/ (PC 10) | P1 | fechada |
| D-ST-009 | Sem Timescale neste módulo | R5 | fechada |
| D-ST-010 | Sem secrets em eventos/DTOs | R4 R7 | fechada |
| D-ST-011 | T01 fail-closed pré-publish/deploy/signal | R6 | fechada |
| D-ST-012 | D-GOV-010 não é deste módulo (risk P06) | R7 | fechada |
| D-ST-015 | RLS defer P09 | R5 | fechada |
| P1-ST-01 | Pack canônico em `docs/orchestration/modules/strategies/` | P1 | fechada |
| P1-ST-02 | Spec 003 permanece **draft** até checklist Owner | P1 | fechada |
| P1-ST-03 | Este pack não é G7 de código nem ANX-342 | P1 | fechada |

## Saída R8

Decision log aprovado para R9.
