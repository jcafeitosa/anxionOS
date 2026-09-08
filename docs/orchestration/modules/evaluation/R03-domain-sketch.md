---
type: debate
---

# R03 — Esboço de domínio: `modules/evaluation`

**Issue:** ANX-109

## Agregados

EvaluationRecord, Certification, ReputationScore, PromotionRecommendation, ScoringPolicy

## Nota

ScoringPolicy OP01–OP08; EvaluationRecord subjectKind AGENT|STRATEGY; PromotionRecommendation → governance only

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | simulation.run.completed.v1 + agents.version.published.v1 |
| EventEmitterPort | evaluation.score.computed.v1, evaluation.certification.issued.v1, evaluation.reputation.updated.v1, evaluation.promotion.recommended.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
