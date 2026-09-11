---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/evaluation`

**Rodada:** R10 · 2026-09-11 · ANX-389 · ANX-109 · **ANX-110** nao executada  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem codigo. Specs **draft**. ANX-342 `todo`.

## In scope

EvaluationRecord, Certification, ReputationScore, PromotionRecommendation, ScoringPolicy; projector `graph:evaluation:v1`; HTTP `/v1/evaluation`; oraculos abaixo.

**Persistência nomeada:** PostgreSQL `evaluation_policies`, `evaluation_records`, `evaluation_certifications`, `evaluation_reputation`, `evaluation_recommendations`, `evaluation_command_journal`.

## Out of scope

Mutar StrategyVersion (`strategies`); SimulationRun (`simulation`); pasta `testing/`; D-GOV-010 (`risk` P06); spec accepted; ANX-342 done; G1.

## Non-goals

Auto-promote. Recommendation nao aplica ChangeProposal. Timescale P&L neste modulo.

## Ownership

Dono: Evaluation/Certification/Reputation/Recommendation. CERTIFIED so via `certification.issued`.

## Oraculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-EVL-01 | G3 | score idempotente |
| G3-EVL-02 | G3 | cert sem run 409 |
| G3-EVL-04 | G3 | score.computed nao promove |
| G5-EVL-01 | G5 | cross-tenant 403 |
| G5-EVL-02 | G5 | T01 DENY |
| G5-EVL-05 | G5 | recommendation ≠ apply |

## Veredito P1

G0 documental. **Nao** autoriza G1. Spec 004 draft. Proximo serial: [simulation](../simulation/ROUNDS.md).

## Saida R10

Handoff G0. ANX-389 evidencia — nao G7.
