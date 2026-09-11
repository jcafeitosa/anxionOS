---
type: debate
status: draft
---
# R08 — Decision log: `modules/evaluation`

**Rodada:** R8 · 2026-09-11 · ANX-389 · ANX-109  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md).  
**Status documental:** `draft` — **não** spec accepted, **não** G7.

## In scope (decisões deste pack)

Ownership de Evaluation/Certification/Reputation/Recommendation; engines; caminho CERTIFIED; exclusão de `testing/` e D-GOV-010.

## Out of scope

Aceite de spec 004; greenlight G1 ANX-110; fechar ANX-342.

## Non-goals

Não reabrir D-ST-003 (CERTIFIED) neste log — apenas **aplicar** no pack evaluation.

## Log

| ID | Decisão | Status |
| --- | --- | --- |
| D-EVL-001 | Dono: EvaluationRecord, Certification, ReputationScore, PromotionRecommendation, ScoringPolicy | fechada (debate) |
| D-EVL-002 | CERTIFIED só via `evaluation.certification.issued.v1` | fechada |
| D-EVL-003 | PG `evaluation_*`; projector `graph:evaluation:v1`; sem Timescale de P&L | fechada |
| D-EVL-004 | Sem pasta `testing/`; sem `approvals/` | fechada |
| D-EVL-005 | D-GOV-010 = `risk` P06 | fechada |
| D-EVL-006 | Recommendation não aplica ChangeProposal | fechada |
| D-EVL-007 | Sem FK cross-module; subject ids + hashes | fechada |
| P1-EVL-01 | Pack canônico G0 documental neste diretório | fechada (P1) |
| P1-EVL-02 | Specs 001–005 permanecem `draft` | fechada |
| P1-EVL-03 | Não ANX-342 done; não G1 | fechada |

## Oráculos que as decisões exigem

G3-EVL-01..06 e G5-EVL-01..05 em [R07](./R07-risks.md) / [R04](./R04-contracts-events.md). Sem evidência de engine = **não verificado** até G1.

## Saída R8

Aprovado para R9 (documental).
