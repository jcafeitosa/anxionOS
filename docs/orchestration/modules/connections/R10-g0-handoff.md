---
type: debate
status: draft
---

# R10 — Pacote G0 (handoff): `modules/connections`

**Rodada:** R10 — Pacote G0 debate R01–R10  
**Data:** 2026-09-08  
**Issues:** ANX-83 (debate) · ANX-62 (contrato P05 `in_review`) · **ANX-36** (Wave 4 epic gate `in_review`) · ANX-32 (graph consumer `in_review`)

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Executor P05 (nominal) | code-architect |
| Crítico P05 (nominal) | critic-reviewer |
| Arquiteto | architect |
| Code Review | code-reviewer |
| QA | QA |
| Security | security-reviewer |
| Red Team | security-reviewer (G5) |

## Objetivo da rodada

Fechar o **pacote G0 do debate** connections R01–R10: escopo in/out, critérios de aceite, dependências, riscos residuais, PC-G0-01..10 e handoff para implementação P05 via epic **ANX-36**.

---

## G0 — Escopo debate

### In scope (R01–R10)

R01 inventário · R02 fronteiras SIMULATED/PAPER · R03 domínio · R04 contratos · R05 storage · R06 deps · R07 riscos · R08 decision log · R09 dev-plan · R10 este artefato.

### Out of scope implementação

| Item | Destino |
| --- | --- |
| REAL_EXECUTION / broker live | P06+ (D-CX-061) |
| RLS PostgreSQL | P09 (D-CX-062) |
| Código `backend/modules/connections/` | **ANX-84** `in_review` (S1–S2 entregue; G2–G6 PASS batch) |

## Non-goals

- Nenhuma migration ST08 neste pack extra.
- Specs 001–005 **draft**; ANX-342 `todo`; D-GOV-010 = risk P06.
- REAL_EXECUTION / broker live fora deste pack (D-CX-061).

---

## Critérios de aceite G0

| # | Critério | Evidência |
| --- | --- | --- |
| AC-G0-01 | 64 decisões D-CX-* | [R08](./R08-decision-log.md) |
| AC-G0-02 | Plano S1–S5 + G3/G4/G5 | [R09](./R09-dev-plan.md) |
| AC-G0-03 | Escopo in/out | Este artefato |
| AC-G0-04 | Executor + Crítico | §Equipe |
| AC-G0-05 | PC-G0 10/10 | §PC-G0 |
| AC-G0-06 | R06 bootstrap | [R06](./R06-dependencies.md) |
| AC-G0-07 | Top 5 riscos | [R07](./R07-risks.md) |
| AC-G0-08 | P-R7-01..07 | [R08](./R08-decision-log.md) |
| AC-G0-09 | RLS application-only | D-CX-048 |
| AC-G0-10 | structure-debate cross-ref | [connections/](../../structure-debate/connections/) — **pacote canônico:** [modules/connections/](./) (R02–R10); structure-debate mantém só R01 histórico |

---

## Gates documentais G2–G6 (ANX-83)

| Gate | Disposição | Evidência |
| --- | --- | --- |
| **G2** | **PASS** | R04 contratos, ADR0002 R09 |
| **G3** | **PASS** | Matriz G3-CX-S* R09 |
| **G4** | **PASS** | R07 SSRF/secrets; G4-CX-* |
| **G5** | **PASS** | G5-CX-01..10 — exec sandbox na G1 |
| **G6** | **PASS** | R01–R10 completo; handoff ANX-36 |

**G7:** pendente aceite explícito **ANX-83**.

---

## Equipe P05

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Crítico | critic-reviewer |
| Code Review | code-reviewer |
| QA | QA |
| Security / Red Team | security-reviewer |

---

## Riscos residuais Top 5

| ID | Sev | Mitigação | Gate |
| --- | ---: | --- | --- |
| R-CX-01 | 20 | EndpointPolicy S2 | G4, G5 |
| R-CX-02 | 16 | DL-CX2 TX S3 | G3, G5 |
| R-CX-03 | 15 | SecretPort gate S1 | G4, G5 |
| R-CX-04 | 15 | UNKNOWN S2+S5 | G3, G5 |
| R-CX-05 | 15 | OrganizationScope S1 | G4, G5 |

---

## PC-G0 — Status

| # | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | Decision log R8 | ✅ |
| PC-G0-02 | Plano R9 | ✅ |
| PC-G0-03 | Pacote G0 R10 | ✅ |
| PC-G0-04 | ANX-62 contrato | ✅ |
| PC-G0-05 | R06–R08 sem bloqueios | ✅ |
| PC-G0-06 | ANX-36 Wave 4 | ✅ |
| PC-G0-07 | Top 5 riscos | ✅ |
| PC-G0-08 | graph:connections:v1 | ✅ ANX-32 |
| PC-G0-09 | RLS application-only | ✅ D-CX-048 |
| PC-G0-10 | Crítico nominal | ✅ |

**Resumo:** 10/10 ✅

---

## Handoff

### ANX-83 debate — ✅ PRONTO → `in_review`

Debate R01–R10 encerrado. Fila: **`g0_ready`**.

### Implementação P05 — relacionar ANX-36 (não duplicar ANX-83)

| Condição | Status |
| --- | --- |
| G0 debate PC-G0 10/10 | ✅ |
| Epic ANX-36 gate | ✅ `in_review` |
| Issue impl dedicada | **ANX-84** `in_review` — S1–S2 core + invoke SIMULATED |

**Issue impl:** ANX-84 — parent/related **ANX-36** + ANX-62.

### ANX-32 — paralelo

Consumer `graph:connections:v1` — não bloqueia PG S1–S4.

---

## Veredito R10

| Pergunta | Resposta |
| --- | --- |
| G0 debate pronto? | **Sim** — PC-G0 10/10 |
| ANX-83 → in_review? | **Sim** |
| G2–G6 doc PASS? | **Sim** |
| G7-ready? | **Sim** — aguarda aceite ANX-83 |
| Código autorizado? | Condicional — claim issue impl + ANX-36 |

✅ Pacote G0 aprovado — debate connections **encerrado**.
