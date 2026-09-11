---
type: debate
---

# R01 — Contexto: `modules/evaluation`

**Rodada:** R1 · P08 · 2026-09-11 · ANX-389 · ANX-109  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [ROUNDS.md](./ROUNDS.md). Fatten in-place. Fonte PC 15: `brain/notes/anxionos-pc15-testing-debate.md`.

## Propósito

Avaliação, certificação, reputação e **recomendação** de promoção. **Não** publica StrategyVersion, **não** corre SimulationRun, **não** aplica ChangeProposal. CERTIFIED é o único caminho de promoção para strategies (D-ST-003). Specs **draft**. Sem `approvals/`. D-GOV-010 em **risk P06**.

## POSSUI

EvaluationRecord, Certification, ReputationScore, PromotionRecommendation, ScoringPolicy.

## NÃO POSSUI

| Item | Dono |
| --- | --- |
| StrategyVersion / Deployment | strategies |
| SimulationRun | simulation |
| Agent config | agents |
| ChangeProposal apply | governance |
| P&L | performance (input via evento) |

## Armazenamento

PG evaluation_*; Neo4j reputação **projeção**; SQLite não. ST08 0/23.

→ **R02** ([R02-boundaries.md](./R02-boundaries.md))
