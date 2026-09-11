---
type: debate
---
# R03 — Esboço de domínio: `modules/evaluation`

**Rodada:** R3 · ANX-389 · ANX-109  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [R04-contracts-events.md](./R04-contracts-events.md).

## Agregados

| Agregado | Notas |
| --- | --- |
| ScoringPolicy | OP01–OP08 versionada; published imutável |
| EvaluationRecord | subjectKind AGENT\|STRATEGY; input hashes |
| Certification | issued/revoked; único caminho CERTIFIED |
| ReputationScore | versionada; sem PII |
| PromotionRecommendation | payload para governance — **não** executa |

**EVL-R03-01:** PromotionRecommendation não muta strategies.  
**EVL-R03-02:** Certification sem SimulationRun/agent version válida → rejeição.

## Ports

EvaluationRepository, CertificationRepository, ReputationRepository, EvaluationUnitOfWork, AgencyScopePort, TraversalEvaluator, EventConsumer (simulation.completed, agents.version.published, performance.outcome).

## Saída R3

Modelo v1.
