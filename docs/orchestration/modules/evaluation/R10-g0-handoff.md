---
type: debate
status: draft
---

# R10 — Pacote G0 (handoff): `modules/evaluation`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issues:** ANX-389 (pack P1) · ANX-109 (debate) · **ANX-110** (impl — **não** executada)  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem código de produto.

## G0 — Escopo documental / G1 futuro

### In scope

| Área | Entrega |
| --- | --- |
| Domínio | EvaluationRecord, Certification, ReputationScore, PromotionRecommendation, ScoringPolicy |
| Contratos | `@anxionos/contracts/evaluation/*` + eventos v1 |
| Persistência | PostgreSQL `evaluation_policies`, `evaluation_records`, `evaluation_certifications`, `evaluation_reputation`, `evaluation_recommendations`, `evaluation_command_journal` |
| Grafo | projector `graph:evaluation:v1` |
| API | `/v1/evaluation` esboço |
| Testes | G3-EVL-* / G5-EVL-* |

### Out of scope

| Item | Destino |
| --- | --- |
| Mutar StrategyVersion | strategies |
| SimulationRun | simulation |
| Pasta `testing/` | PC 15 composto — não criar |
| D-GOV-010 | risk P06 |
| Spec accepted | Owner + checklist (ST08 0/23) |
| ANX-342 G7 | Owner — **não** marcar done |
| G1 código | ANX-110 |

## Non-goals

- Auto-promote. Recommendation **não** aplica ChangeProposal.
- Timescale P&L neste módulo (performance).
- Sem pasta `approvals/` / `policies/` extra.
- Nenhuma migration ST08 neste pack.

## Ownership

| Superfície | Dono |
| --- | --- |
| Evaluation / Certification / Reputation / Recommendation | **evaluation** |
| CERTIFIED só via `certification.issued` | **evaluation** |
| StrategyVersion verdade | **strategies** |
| adapter-gateway | **KEEP** |

## Oráculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-EVL-01 | G3 | score idempotente |
| G3-EVL-02 | G3 | cert sem run 409 |
| G3-EVL-04 | G3 | score.computed não promove |
| G5-EVL-01 | G5 | cross-tenant 403 |
| G5-EVL-02 | G5 | T01 DENY |
| G5-EVL-05 | G5 | recommendation ≠ apply |

## PC-G0 avaliação

| ID | Status |
| --- | --- |
| PC-G0-01..03 | R1–R10 neste diretório |
| PC-G0-04 | spec 004 **draft** |
| PC-G0-10 | ANX-110 **não** é este slice |

**Veredito P1:** G0 documental. **Não** autoriza G1. Spec 004 draft. Próximo serial: [simulation](../simulation/ROUNDS.md).

## Saída R10

Handoff G0. ANX-389 evidência — não G7. ANX-342 `todo`.
