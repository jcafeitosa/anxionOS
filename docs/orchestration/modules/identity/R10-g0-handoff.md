---
type: debate
status: draft
---

# R10 — Pacote G0 (handoff): `modules/identity`

**Rodada:** R10 — Pacote G0 debate R06–R10  
**Data:** 2026-09-08  
**Issues:** ANX-77 (debate) · ANX-28 (P0 impl `done`, G7 2026-09-07) · ANX-42 (structure-debate R01–R05)

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Executor P1 (nominal) | code-architect |
| Crítico P1 (nominal) | critic-reviewer |
| Arquiteto | architect |
| Code Review | code-reviewer |
| QA | QA |
| Security | security-reviewer |
| Red Team | security-reviewer (G5) |

## Objetivo da rodada

Fechar o **pacote G0 do debate** identity R06–R10: escopo P0 vs P1, critérios de aceite, dependências, riscos, PC-G0-01..10 e handoff. **Não** confundir com G7 de ANX-28 (já aceito).

---

## G0 — Escopo debate identity

### In scope debate (artefatos R06–R10)

| Área | Entrega |
| --- | --- |
| R06 | Mapa dependências upstream/downstream |
| R07 | Registro riscos + checklist G5 |
| R08 | Decision log `D-IDN-001`..`024` |
| R09 | Plano slices P1-S1..S4 |
| R10 | Este pacote handoff |

### P0 implementação (ANX-28 — **done**, fora deste debate)

| Área | Status |
| --- | --- |
| `Principal` PG + `registerPrincipal` | ✅ G7 |
| `getPrincipalById` fail-closed | ✅ G7 |
| Bootstrap `ensureIdentitySchema` | ✅ |
| Adapter organizations | ✅ |

### Out of scope P1 (explicitamente deferido)

| Item | Destino | Decisão |
| --- | --- | --- |
| `ServicePrincipal` | P02+ execution-go | D-IDN-017 |
| Rotas `/v1/identity/*` | operations P07 | D-IDN-019 |
| RLS PostgreSQL | P09 | D-IDN-018 |
| Projector Neo4j | graph ANX-32 | D-IDN-020 |
| `reactivatePrincipal` | Pós-suspend | DEF-06 |

## Non-goals

- Nenhuma migration ST08 neste pack extra.
- Specs 001–005 **draft**; ANX-342 permanece `todo`; D-GOV-010 = risk P06.
- Sem pasta `approvals/` / `policies/`.

---

## Critérios de aceite G0 (debate)

| # | Critério | Evidência |
| --- | --- | --- |
| AC-G0-01 | Decision log R08 completo | [R08-decision-log.md](./R08-decision-log.md) |
| AC-G0-02 | Plano P1 R09 com matriz G3/G4/G5 | [R09-dev-plan.md](./R09-dev-plan.md) |
| AC-G0-03 | Escopo in/out acima | Este artefato |
| AC-G0-04 | Executor + Crítico P1 nominados | §Equipe |
| AC-G0-05 | PC-G0-01..10 avaliados | §PC-G0 |
| AC-G0-06 | R06 dependências + diagrama | [R06-dependencies.md](./R06-dependencies.md) |
| AC-G0-07 | Top 5 riscos R07 | [R07-risks.md](./R07-risks.md) |
| AC-G0-08 | Cross-ref structure-debate R01–R05 | [structure-debate/identity/](../../structure-debate/identity/) |

**Saída debate:** ✅ G0 **aprovado** — ANX-77 pode ir para `in_review`.

---

## Equipe P1 (nominal — próximo slice código)

| Papel | Agente | Responsabilidade |
| --- | --- | --- |
| **Executor** | code-architect | Slices P1-S1..S4 conforme R09 |
| **Crítico** | critic-reviewer | Handoff G1→G2 do slice P1 |
| Code Review | code-reviewer | Gate G2 |
| QA | QA | Matriz G3-IDN-* |
| Security | security-reviewer | G4 payload/eventos |
| Red Team | security-reviewer | Checklist R07 |

**PC-G0-10:** ✅ Crítico nominal = **critic-reviewer**.

---

## Dependências

| # | Dependência | Tipo | Status | Impacto |
| --- | --- | --- | --- | --- |
| DEP-01 | ANX-28 P0 G7 | **Satisfeito** | `done` | Baseline código |
| DEP-02 | organizations adapter | Downstream | ✅ wired | `createIdentityPrincipalLookup` |
| DEP-03 | `@anxionos/eventing` | Bootstrap | ✅ | journal/outbox |
| DEP-04 | graph P03 consumer | Downstream async | `in_review` ANX-32 | Projector `:Principal` |
| DEP-05 | Issue P1 dedicada | **Bloqueante código P1** | ✅ **ANX-78** (`in_review`) | PC-G0-09 |
| DEP-06 | Better Auth | Composition root | ✅ apps/api | Signup → register |

---

## Riscos residuais (Top 5 → gates)

| ID | Risco | Sev | Mitigação P1 | Gate |
| --- | --- | ---: | --- | --- |
| R-IDN-01 | `authUserId` em evento | 12 | P1-S2 | G4 |
| R-IDN-05 | Identity PG down | 12 | Fail-closed adapters (P0) | G4 |
| R-IDN-06 | Sessão BA após suspend | 12 | P1-S4 consumer | G4, G5 |
| R-IDN-03 | Suspend sem evento | 8 | P1-S3 | G3, G4 |
| R-IDN-02 | EventType legado | 8 | P1-S2 | G3 |

Detalhe: [R07-risks.md](./R07-risks.md).

---

## PC-G0 — Status

| # | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | Decision log R8 | ✅ |
| PC-G0-02 | Plano R9 | ✅ |
| PC-G0-03 | Pacote G0 R10 (este artefato) | ✅ |
| PC-G0-04 | ANX-28 P0 G7 | ✅ |
| PC-G0-05 | R06–R08 sem bloqueios | ✅ |
| PC-G0-06 | Downstream wiring | ✅ |
| PC-G0-07 | Riscos Top 5 | ✅ |
| PC-G0-08 | Consumer graph especificado | ✅ |
| PC-G0-09 | Issue P1 path documentado | ✅ **ANX-78** — slices P1-S1..S4 |
| PC-G0-10 | Crítico nominal | ✅ |

**Resumo:** 10/10 ✅

---

## Handoff

### Debate ANX-77 — ✅ PRONTO

Artefatos R06–R10 completos. Cross-ref R01–R05 em `structure-debate/identity/`. Módulo identity debate → **`g0_ready`** na fila (P0 código já `done`).

### Implementação P1 — ✅ ANX-78 (`in_review`)

| # | Condição | Status |
| --- | --- | --- |
| H-01 | Debate R10 G0 (PC-G0-01..08, 10) | ✅ |
| H-02 | Issue `ANX-*` P1 claimada | ✅ ANX-78 (`in_review`) |
| H-03 | Escopo R09 alinhado | ✅ |
| H-04 | Executor + Crítico nominados | ✅ |

**Regra:** Não iniciar P1-S1 sem issue `ANX-*` no taskboard (política zero-trabalho-fora-do-board).

### G7 ANX-28

**Já aceito** 2026-09-07 — **não** repetir neste handoff. Lacunas P1 são **novo** candidato de código, não reopen ANX-28.

---

## Links — rodadas completas

| Rodada | Artefato |
| --- | --- |
| R01–R05 | [structure-debate/identity/](../../structure-debate/identity/) |
| R06 | [R06-dependencies.md](./R06-dependencies.md) |
| R07 | [R07-risks.md](./R07-risks.md) |
| R08 | [R08-decision-log.md](./R08-decision-log.md) |
| R09 | [R09-dev-plan.md](./R09-dev-plan.md) |
| R10 | **Este artefato** |

Índice: [ROUNDS.md](./ROUNDS.md) · Fila: [module-queue.md](../../module-queue.md)

---

## Veredito R10

| Pergunta | Resposta |
| --- | --- |
| **G0 debate pronto?** | **Sim** — PC-G0 10/10 |
| **ANX-77 → in_review?** | **Sim** |
| **P1 código autorizado?** | **Sim (ANX-78)** — debate G7 pendente; implementação em `in_review` |
| **Identity na fila?** | Debate `g0_ready`; P0 `done` (ANX-28) |

✅ Pacote G0 aprovado — debate identity R06–R10 **encerrado**.
