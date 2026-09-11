---
type: debate
---

# R10 — Pacote G0 (handoff): `modules/organizations`

**Rodada:** R10 — Pacote G0 para claim ANX-29  
**Data:** 2026-09-07  
**Issues:** ANX-39 (debate) · ANX-29 (implementação G1+) · ANX-28 (identity `in_review`)

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Executor G1 (nominal) | code-architect |
| Crítico G1 (nominal) | critic-reviewer |
| Arquiteto | architect |
| Code Review | code-reviewer |
| QA | QA |
| Security | security-reviewer |
| Red Team | security-reviewer (G5) |

## Objetivo da rodada

Fechar o **pacote G0** que autoriza claim de ANX-29: escopo v1 fechado, critérios de aceite, dependências, riscos, checklist de evidências, status PC-G0-01..10 e condições de handoff. Nenhuma implementação nesta rodada.

---

## G0 — Escopo ANX-29 (v1 fechado)

### In scope (G1)

| Área | Entrega |
| --- | --- |
| **Domínio** | Agency, Owner, Membership — sem entidade `Organization` multi-company (D-ORG-007) |
| **Comandos** | `CreateAgency`, `UpdateAgencyMarkets`, `InviteMember`, `ActivateMembership`, `RevokeMembership`, `AcceptInviteByToken` |
| **Queries** | `GetAgencyById`, `ListAgenciesForPrincipal`, `ListMembershipsByAgency`, `GetMembership` |
| **Contratos** | `@anxionos/contracts/organizations/*` — types, commands, queries, events, errors (D-ORG-012) |
| **Persistência** | PostgreSQL `organizations_*`; command journal + outbox via `@anxionos/eventing` (D-ORG-017) |
| **API** | Prefixo `/v1/organizations`; idempotência HTTP; tenancy guards (D-ORG-013..015, D-ORG-030) |
| **Convites** | HMAC-SHA256 + pepper; TTL 7d; email match accept; rate limit 10/min/IP (D-ORG-018..019, 027..029, 034) |
| **Testes** | Unitários, contratos, integração UoW (P-R5-06), matriz G3-01..10, checklist G5 R07, AR01 boundary |

### Out of scope (explicitamente fora ANX-29 v1)

| Item | Destino | Decisão |
| --- | --- | --- |
| Entidade `Organization` + `CONTAINS_AGENCY` | Pós-v1 | D-ORG-043 |
| `organizations_blueprints` / onboarding blueprint | agents / R09 defer | D-ORG-042 |
| Saga `AdvanceOnboarding` + webhook billing | P04 | D-ORG-039 |
| Realtime `organizations:agency:{agencyId}` | P07 opcional | D-ORG-038 |
| RLS PostgreSQL tenancy | P09 | D-ORG-040 |

## Non-goals

- Nenhuma migration ST08 neste pack extra.
- Specs 001–005 **draft**; ANX-342 permanece `todo`; D-GOV-010 = risk P06.
- Sem pasta `approvals/` / `policies/`.
| Quota `maxCompanies` enforcement | billing P07 | D-ORG-035 |
| Export/listagem global memberships | Pré-G4 | D-ORG-044 |
| Graph projector Neo4j | graph P03 consumer | D-ORG-021 |
| Department, Team | Fora P02 baseline | DEF-10 |

---

## Critérios de aceite G0 (debate → implementação)

| # | Critério | Evidência |
| --- | --- | --- |
| AC-G0-01 | 44 decisões `D-ORG-001`..`044` registradas; P-R7-01/02 resolvidos | [R08-decision-log.md](./R08-decision-log.md) |
| AC-G0-02 | Plano 6 slices S1–S6 com matriz G3/G5 | [R09-dev-plan.md](./R09-dev-plan.md) |
| AC-G0-03 | Escopo ANX-29 fechado (tabela in/out acima) | Este artefato §G0 |
| AC-G0-04 | Executor e Crítico G1 nominados | §Equipe G1 |
| AC-G0-05 | PC-G0-01..10 avaliados (tabela abaixo) | §PC-G0 |
| AC-G0-06 | Debate Slack R10 com 8 papéis | [SLACK-TRANSCRIPTS.md §Session 5](./SLACK-TRANSCRIPTS.md#session-5) |
| AC-G0-07 | Top 5 riscos com mitigação G4/G5 mapeada | §Riscos + [R07-risks.md](./R07-risks.md) |
| AC-G0-08 | Dependências upstream documentadas | §Dependências |

**Saída debate:** ✅ G0 **aprovado** — ANX-39 pode ir para `in_review`.

---

## Equipe G1 (nominal)

| Papel | Agente | Responsabilidade |
| --- | --- | --- |
| **Executor** | code-architect | Implementar slices S1–S6 conforme R09; evidências por slice |
| **Crítico** | critic-reviewer | Acompanhar plano; aprovar handoff G1→G2 somente com critérios satisfeitos |
| Code Review | code-reviewer | Gate G2 independente |
| QA | QA | Gate G3 — matriz G3-01..10 |
| Security | security-reviewer | Gate G4 |
| Red Team | security-reviewer (G5) | Checklist G5 R07 |

**PC-G0-10:** ✅ Crítico nominal = **critic-reviewer** (distinto do executor code-architect).

---

## Dependências

| # | Dependência | Tipo | Status | Impacto |
| --- | --- | --- | --- | --- |
| DEP-01 | ANX-28 identity G7 + export `getPrincipalById` | **Satisfeito** | `done` (G7 2026-09-07) | Slice 4+ wiring integração identity ✅ |
| DEP-02 | `@anxionos/eventing` schema (`ensureEventingSchema`) | Bloqueante bootstrap | `in_review` (ANX-27) | UoW journal/outbox |
| DEP-03 | PostgreSQL dev (`DATABASE_URL`) | Ambiente | Documentado | Migrações Drizzle |
| DEP-04 | `ORG_INVITE_TOKEN_PEPPER` env | Bloqueante startup | R09 `.env.example` | Fail-fast sem pepper |
| DEP-05 | Debate R10 G0 (este pacote) | **Bloqueante claim ANX-29** | ✅ R10 | PC-G0-03, PC-G0-09 |
| DEP-06 | billing P07 | Não bloqueante v1 | `not_started` | Quota `maxCompanies` (D-ORG-035) |
| DEP-07 | graph P03 consumer | Downstream | `not_started` | Projeção Neo4j opcional pós-G1 |

**Ordem bootstrap (D-ORG-037):** `ensureEventingSchema` → `ensureIdentitySchema` → `ensureOrganizationsSchema`.

---

## Riscos residuais (Top 5 → gates)

| ID | Risco | Sev | Mitigação G1 | Gate |
| --- | --- | ---: | --- | --- |
| R-ORG-01 | Cross-tenant bypass `agencyId` | 15 | Guard 3 camadas; `ORG_CROSS_TENANT` 403 | G4, G5 |
| R-ORG-03 | Identity down em mutação | 12 | Fail-closed 503; sem cache | G4 |
| R-ORG-06 | Dupla Agency (duas Idempotency-Key) | 12 | Comportamento v1 aceito; billing P07 | G3-10 |
| R-ORG-10 | `principalId` no body | 10 | Zod strip; G5 tampering | G4, G5 |
| R-ORG-13 | ANX-28 atrasado | 12 | Bloqueio explícito G1 até G7 | G0 |

Detalhe completo: [R07-risks.md](./R07-risks.md).

---

## Plano de implementação (referência)

6 slices — ver [R09-dev-plan.md](./R09-dev-plan.md):

| Slice | Foco | Gate interno |
| --- | --- | --- |
| S1 | Contratos + schema PG | enums, errors ORG_* |
| S2 | Domain ports | sem framework |
| S3 | Infra UoW + adapters | teste P-R5-06 |
| S4 | Comandos Agency | idempotência, identity fail-closed |
| S5 | Comandos Membership | TTL, email match, owner invariant |
| S6 | API + G3/G5 | rotas R04, rate limit accept |

**Top 5 arquivos primeiro (R09):** `types.ts`, `errors.ts`, `schema.ts`, `0000_organizations_core.sql`, `principal-lookup.ts`.

---

## PC-G0 — Status das pré-condições

| # | Pré-condição | Evidência | Status |
| --- | --- | --- | --- |
| PC-G0-01 | Decision log R8 completo | [R08-decision-log.md](./R08-decision-log.md) | ✅ |
| PC-G0-02 | Plano de implementação R9 | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ |
| PC-G0-03 | Pacote G0 R10 (escopo, crítico, ambiente) | **Este artefato** | ✅ |
| PC-G0-04 | identity ANX-28 aceite G7 + `getPrincipalById` | ANX-28 `done` (G7 2026-09-07) | ✅ |
| PC-G0-05 | Debate R1–R8 sem pendências bloqueantes | P-R7-01/02 ✅; P-R7-04 → R09 errors | ✅ |
| PC-G0-06 | Contracts organizations especificados | [R04-contracts.md](./R04-contracts.md) + R09 | ✅ |
| PC-G0-07 | Riscos Top 5 + mitigação G4/G5 | [R07-risks.md](./R07-risks.md) | ✅ |
| PC-G0-08 | Consumer graph `graph:organizations:v1` | [R06-dependencies.md](./R06-dependencies.md) | ✅ |
| PC-G0-09 | ANX-29 escopo fechado v1 | §G0 in/out | ✅ |
| PC-G0-10 | Crítico nominal para executor G1 | §Equipe G1 | ✅ |

**Resumo PC-G0:** **10/10** ✅

---

## Handoff — Condições para claim ANX-29

### G0 debate (ANX-39) — ✅ PRONTO

Todos os artefatos R01–R10 existem. Debate formal encerrado. ANX-39 pode mover para `in_review`.

### Claim ANX-29 (`todo` → `in_progress`)

| # | Condição | Status |
| --- | --- | --- |
| H-01 | R10 G0 aprovado (PC-G0-01..03, 05..10) | ✅ |
| H-02 | ANX-39 debate `in_review` ou `done` | ⏳ após move desta sessão |
| H-03 | Issue ANX-29 descrição alinhada ao escopo §G0 | ✅ |
| H-04 | Executor + Crítico nominados | ✅ |
| H-05 | Ambiente: PG + eventing + pepper documentados | ✅ R09 |

**ANX-29 `done`** (G7 2026-09-07) — implementação isolada entregue. Revalidação G6 integrado pendente.

### G1 implementação (código integrado) — ✅ ENTREGUE (isolado)

| # | Condição | Status |
| --- | --- | --- |
| B-01 | **PC-G0-04:** ANX-28 G7 + `getPrincipalById` | ✅ |
| B-02 | Slices S1–S6 + API 9 rotas | ✅ ANX-29 `done` |
| B-03 | G6 integrado formal pós-ANX-28 | ⏳ revalidação pendente |

---

## Checklist de evidências (executor G1)

O executor deve anexar à issue ANX-29 ao submeter G2:

- [ ] Diff `backend/modules/organizations/` + `packages/contracts/src/organizations/`
- [ ] Migrações `0000`, `0001` aplicadas em PG dev
- [ ] `ensureOrganizationsSchema` idempotente no startup
- [ ] Testes unitários por comando
- [ ] `backend/tests/contracts/organizations/` round-trip Zod
- [ ] `integration/uow-journal-outbox.test.ts` (P-R5-06)
- [ ] Matriz G3-01..10 verde
- [ ] Checklist G5 R07 executado (evidência Red Team)
- [ ] `boundary/organizations-imports.test.ts` (AR01)
- [ ] OpenAPI tags `/v1/organizations`
- [ ] `.env.example` com `ORG_INVITE_TOKEN_PEPPER`
- [ ] Sem token/pepper em logs/eventos (D-ORG-019)

---

## Ambiente mínimo

| Variável / serviço | Obrigatório | Notas |
| --- | --- | --- |
| `DATABASE_URL` | Sim | PostgreSQL local/dev |
| `ORG_INVITE_TOKEN_PEPPER` | Sim | Fail-fast startup |
| NATS / eventing | Sim | Outbox consumer dev |
| Neo4j | Não (G1) | graph P03 downstream |
| `@anxionos/identity` | Sim (G1 slice 4+) | `getPrincipalById` |

---

## Links — rodadas R01–R10

| Rodada | Artefato |
| --- | --- |
| R01 | [R01-context.md](./R01-context.md) |
| R02 | [R02-boundaries.md](./R02-boundaries.md) |
| R03 | [R03-domain-sketch.md](./R03-domain-sketch.md) |
| R04 | [R04-contracts.md](./R04-contracts.md) |
| R05 | [R05-storage.md](./R05-storage.md) |
| R06 | [R06-dependencies.md](./R06-dependencies.md) |
| R07 | [R07-risks.md](./R07-risks.md) |
| R08 | [R08-decision-log.md](./R08-decision-log.md) |
| R09 | [R09-dev-plan.md](./R09-dev-plan.md) |
| R10 | **Este artefato** |

## Links — Slack transcripts

| Sessão | Tema |
| --- | --- |
| [Session 1](./SLACK-TRANSCRIPTS.md#session-1) | R07 prep — RLS, cross-tenant, TTL convite |
| [Session 3](./SLACK-TRANSCRIPTS.md#session-3) | R09 kickoff — 6 slices, contracts-first |
| [Session 5](./SLACK-TRANSCRIPTS.md#session-5) | **R10 G0 ratificação** — pacote handoff ANX-29 |

Índice de rodadas: [ROUNDS.md](./ROUNDS.md) · Fila: [module-queue.md](../../module-queue.md)

---

## Veredito R10

| Pergunta | Resposta |
| --- | --- |
| **G0 debate pronto?** | **Sim** — PC-G0 **10/10** |
| **ANX-39 G7?** | `in_review` — aguarda aceite humano |
| **ANX-29 implementação?** | **`done`** (G7 2026-09-07) |
| **G6 integrado?** | Revalidação formal pendente |

✅ Pacote G0 aprovado — debate organizations **encerrado**.
