---
type: debate
---

# R10 — Pacote G0 (handoff): `modules/orchestration`

**Rodada:** R10 — Pacote G0 para claim implementação P04  
**Data:** 2026-09-08  
**Issues:** ANX-46 (debate) · ANX-42 · ANX-44 · issue implementação derivada pós-greenlight

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

Fechar o **pacote G0** que autoriza claim da issue de implementação derivada: escopo v1 fechado, critérios de aceite, dependências, riscos, checklist de evidências, status PC-G0-01..10 e condições de handoff. Nenhuma implementação nesta rodada.

### Classificação epistemológica (G2)

| Afirmação | Status |
| --- | --- |
| Debate R01–R10 + modos TREE/CIRCULAR (`g0_ready`) | ✅ Fechado neste pacote |
| ADR0005 + spec 006 (`brain/`) | ⏳ **Proposto** — fonte canônica local; G7 separado |
| Invariantes HMAC/lease/cross-tenant/migração OH08 | ✅ Documentados R02–R07 (execução G1) |
| PC-G0-04 identity G7 | ⏳ Pendente upstream (ANX-28) |
| RB-D04 + ANX-29 G1 integrado | ⏳ Pendente upstream |
| Digest/manifesto de código | ⏳ Exigido na G1 implementação, não no debate G2 |


---

## G0 — Escopo implementação v1 (fechado)

### In scope (G1)

| Área | Entrega |
| --- | --- |
| **Domínio** | Goal, Task, Run, TaskLease, RunHeartbeat, GateBinding — ports sem framework |
| **Paperclip core** | Checkout UoW transacional; renew/release lease; heartbeat coalesce + sweeper |
| **Mirror** | Webhook taskboard + polling 60s; dedupe `(issue, boardVersion, status)`; `validateMirrorTransition` |
| **Gates** | `recordGateDisposition` append-only; invalidação PASS; G7 Owner via `PrincipalLookup` |
| **Contratos** | `@anxionos/contracts/orchestration/*` — types, gate-binding 1.0.0, commands, events, errors |
| **Persistência** | PostgreSQL `orchestration_*`; command journal + outbox via `@anxionos/eventing` |
| **HTTP** | 10 rotas `/v1/orchestration/*`; scope + idempotency + HMAC prod flag |
| **Workers** | `taskboard-sync`, `heartbeat-dequeue`, `lease-sweeper` em `apps/workers` |
| **Testes** | Unitários, contratos, integração UoW (P-R5-05), matriz G3-01..10, checklist G5-01..08, AR01 boundary |

### Out of scope (explicitamente fora v1)

| Item | Destino | Decisão |
| --- | --- | --- |
| `PlanRevision` migration 0002 | S9 spike go/no-go | D-ORC-055 |
| OpenAPI Scalar público | S8 defer | D-ORC-054 |
| G5 CI sandbox automatizado | S8 spec; manual ORCH-R07-08 gate | D-ORC-056 |
| `AgentRegistryPort` forte | agents P04 | D-ORC-053 |
| Saga agents wakeup completa | agents P04 | P-R6-05 defer |
| Neo4j / ReviewEdge no módulo | graph consumer `graph:orchestration:gate:v1` | D-ORC-018 |
| Grants / T01 evaluator interno | governance port | D-ORC-036 |

---

## Critérios de aceite G0 (debate → implementação)

| # | Critério | Evidência |
| --- | --- | --- |
| AC-G0-01 | 56 decisões `D-ORC-001`..`056` registradas; P-R7-01..05 resolvidos | [R08-decision-log.md](./R08-decision-log.md) |
| AC-G0-02 | Plano 8 slices S1–S8 com matriz G3/G5 | [R09-dev-plan.md](./R09-dev-plan.md) |
| AC-G0-03 | Escopo v1 fechado (tabela in/out acima) | Este artefato §G0 |
| AC-G0-04 | Executor e Crítico G1 nominados | §Equipe G1 |
| AC-G0-05 | PC-G0-01..10 avaliados (tabela abaixo) | §PC-G0 |
| AC-G0-06 | Debate Slack R10 com 8 papéis | [SLACK-TRANSCRIPTS.md §Session J](./SLACK-TRANSCRIPTS.md#session-j--r10-g0-ratificação) |
| AC-G0-07 | Top 5 riscos com mitigação G4/G5 mapeada | §Riscos + [R07-risks.md](./R07-risks.md) |
| AC-G0-08 | Dependências upstream documentadas | §Dependências |

**Saída debate:** ✅ G0 **aprovado** — ANX-46 debate encerrado (`g0_ready`). **Debate status:** `g0_ready`.

---

## Equipe G1 (nominal)

| Papel | Agente | Responsabilidade |
| --- | --- | --- |
| **Executor** | code-architect | Implementar slices S1–S8 conforme R09; evidências por slice |
| **Crítico** | critic-reviewer | Acompanhar plano; aprovar handoff G1→G2 somente com critérios satisfeitos |
| Code Review | code-reviewer | Gate G2 independente |
| QA | QA | Gate G3 — matriz G3-01..10 |
| Security | security-reviewer | Gate G4 |
| Red Team | security-reviewer (G5) | Checklist G5-01..08 |

**PC-G0-10:** ✅ Crítico nominal = **critic-reviewer** (distinto do executor code-architect).

---

## Dependências

| # | Dependência | Tipo | Status | Impacto |
| --- | --- | --- | --- | --- |
| DEP-01 | ANX-28 identity G7 + export `getPrincipalById` | **Bloqueante G1 S6–S7** | `in_review` | G7 Owner wiring; `PrincipalLookup` adapter |
| DEP-02 | ANX-29 organizations G1 + `OrganizationScopePort` | **Bloqueante G1 S6–S7** | `in_review` | Tenancy `organizationId`; `getHierarchyMode` |
| DEP-03 | RB-D04 governance grant events mínimos (T01 F0) | **Bloqueante G1 S6–S7** | `not_started` | Checkout/renew T01 ALLOW/DENY oracles |
| DEP-04 | `@anxionos/eventing` schema (`ensureEventingSchema`) | Bloqueante bootstrap | `in_review` (ANX-27) | UoW journal/outbox |
| DEP-05 | Debate R10 G0 (este pacote) | **Bloqueante claim impl** | ✅ R10 | PC-G0-03, PC-G0-09 |
| DEP-06 | graph consumer `graph:orchestration:gate:v1` | Downstream S6 | ANX-32 `g0_ready` | Projeção ReviewEdge CIRCULAR |
| DEP-07 | Dashi taskboard loopback (`TASKBOARD_URL`) | Ambiente S4+ | Documentado R09 | Webhook + polling worker |
| DEP-08 | `TASKBOARD_WEBHOOK_SECRET` / HMAC prod | Bloqueante prod S4/S7 | `.env.example` | `ORC_WEBHOOK_HMAC_REQUIRED` |

**Ordem bootstrap (D-ORC-038):** `ensureEventingSchema` → `ensureIdentitySchema` → `ensureOrganizationsSchema` → `ensureOrchestrationSchema`.

---

## Riscos residuais (Top 5 → gates)

| ID | Risco | Sev | Mitigação G1 | Gate |
| --- | --- | ---: | --- | --- |
| R-ORC-01 | Divergência board/lease — claim Dashi vs lease PG | 20 | Checkout exige board `in_progress`; mirror reconcilia; dedupe ORCH-R05-07 | G3, G5 |
| R-ORC-04 | Spoof webhook mirror `done` sem G7 PASS | 15 | `ORC_MIRROR_REJECTED`; gate_bindings vigente; HMAC prod | G4, G5 |
| R-ORC-07 | Cross-tenant `organizationId` tamper | 15 | `OrganizationScopePort.assertMembership`; `ORC_SCOPE_DENIED` | G4, G5 |
| R-ORC-02 | T01 indisponível → checkout negado em massa | 12 | Timeout 2s fail-closed; circuit breaker 30s (D-ORC-050) | G4 |
| R-ORC-06 | Identity down em G7 — binding fantasma | 12 | `ORC_IDENTITY_UNAVAILABLE` 503; sem persistir binding | G4 |

Detalhe completo: [R07-risks.md](./R07-risks.md) · [R08-decision-log.md](./R08-decision-log.md).

---

## Plano de implementação (referência)

8 slices — ver [R09-dev-plan.md](./R09-dev-plan.md):

| Slice | Foco | Gate interno |
| --- | --- | --- |
| S1 | Contratos + schema PG (migrations 0000–0001) | enums, errors ORC_* |
| S2 | Domain entities + ports + repos + UoW | AR01 boundary |
| S3 | Checkout/renew/release UoW + `checked_out.v1` | P-R5-05 rollback; G5-08 |
| S4 | Mirror webhook HMAC + worker polling 60s | G3-04 parcial |
| S5 | Heartbeat coalesce 30s + sweeper batch 100 | G3-07, G3-08 |
| S6 | Gate disposition + adapters identity/org/governance/graph | G3-05, G3-09; T01 wiring |
| S7 | HTTP 10 rotas + matriz G3/G5 | fixture `orchestration-g5-sandbox.json` |
| S8 | OpenAPI Scalar + G5 CI spec + plan_revisions spike | defer OK pós-G1 |

**Ordem operacional ratificada (Session I/J):** PG (S1–S2) → checkout (S3) → mirror (S4) → heartbeat (S5) → gates+adapters (S6) → HTTP (S7).

**Top 5 arquivos primeiro (R09):** `contracts/orchestration/errors.ts`, `gate-binding/1.0.0/schema.ts`, `persistence/schema.ts`, `0000_orchestration_core.sql`, `checkout-task.ts`.

---

## PC-G0 — Status das pré-condições

| # | Pré-condição | Evidência | Status |
| --- | --- | --- | --- |
| PC-G0-01 | Decision log R8 completo | [R08-decision-log.md](./R08-decision-log.md) | ✅ |
| PC-G0-02 | Plano de implementação R9 | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ |
| PC-G0-03 | Pacote G0 R10 (escopo, crítico, ambiente) | **Este artefato** | ✅ |
| PC-G0-04 | identity ANX-28 aceite G7 + `getPrincipalById` | ANX-28 `in_review` | ⏳ **Bloqueia G1 S6–S7** |
| PC-G0-05 | Debate R1–R9 sem pendências bloqueantes | ORCH-R09-01..04 ✅; P-R7-04 → S8 | ✅ |
| PC-G0-06 | Contracts orchestration especificados | [R04-contracts-events.md](./R04-contracts-events.md) + R09 | ✅ |
| PC-G0-07 | Riscos Top 5 + mitigação G4/G5 | [R07-risks.md](./R07-risks.md) | ✅ |
| PC-G0-08 | Consumer graph `graph:orchestration:gate:v1` | [R06-dependencies.md](./R06-dependencies.md) | ✅ |
| PC-G0-09 | Escopo orchestration v1 fechado | §G0 in/out | ✅ |
| PC-G0-10 | Crítico nominal para executor G1 | §Equipe G1 | ✅ |

**Resumo PC-G0:** 9/10 ✅ · 1 pendente (PC-G0-04 — upstream identity G7). **RB-D04** e **ANX-29 G1** bloqueiam S6–S7 integrado (documentados em §Dependências).

---

## Handoff — Condições para claim implementação

### G0 debate (ANX-46) — ✅ PRONTO

Todos os artefatos R01–R10 existem. Debate formal encerrado. **Debate status:** `g0_ready`. ANX-46 permanece `in_review` com comentário de encerramento.

### Claim issue implementação (`todo` → `in_progress`)

| # | Condição | Status |
| --- | --- | --- |
| H-01 | R10 G0 aprovado (PC-G0-01..03, 05..10) | ✅ |
| H-02 | ANX-46 debate documentado `g0_ready` | ✅ após esta entrega |
| H-03 | Greenlight explícito usuário + issue derivada criada | ⏳ |
| H-04 | Executor + Crítico nominados | ✅ |
| H-05 | Ambiente: PG + eventing + taskboard documentados | ✅ R09 |

**Claim autorizado** após greenlight — planejamento e slices S1–S5 podem iniciar; integração identity/organizations/governance real aguarda PC-G0-04, ANX-29 G1 e RB-D04.

### G1 implementação (código integrado S6–S7) — ⏳ BLOQUEADO

| # | Bloqueio | Ação |
| --- | --- | --- |
| B-01 | **PC-G0-04:** ANX-28 `done` (G7) + `getPrincipalById` exportado | Aguardar aceite identity |
| B-02 | **ANX-29 G1:** `OrganizationScopePort` + `getHierarchyMode` | Aguardar organizations integrado |
| B-03 | **RB-D04:** governance grant events mínimos para T01 F0 | Aguardar debate/implementação governance |
| B-04 | Slice S7 HTTP com wiring real T01/G7 | Mock port permitido S1–S5 apenas |

**Regra integração S6–S7:** Código de integração identity/organizations/governance **não merge** até PC-G0-04 ✅, ANX-29 G1 e RB-D04 fechados.

---

## Checklist de evidências (executor G1)

O executor deve anexar à issue de implementação ao submeter G2:

- [ ] Diff `backend/modules/orchestration/` + `packages/contracts/src/orchestration/`
- [ ] Migrações `0000`–`0001` aplicadas em PG dev
- [ ] `ensureOrchestrationSchema` idempotente no startup
- [ ] Testes unitários por slice (checkout, mirror, heartbeat, gates)
- [ ] `backend/tests/contracts/orchestration/` round-trip Zod
- [ ] `integration/checkout-uow-journal-outbox.test.ts` (S3, P-R5-05)
- [ ] `integration/mirror-webhook-hmac.test.ts` (S4)
- [ ] `integration/heartbeat-dequeue-pg.test.ts` (S5)
- [ ] Matriz G3-01..10 verde
- [ ] Checklist G5-01..08 executado (evidência Red Team sandbox)
- [ ] `boundary/orchestration-imports.test.ts` (AR01)
- [ ] Fixture `orchestration-g5-sandbox.json` commitada (S7)
- [ ] Webhook HMAC prod flag + rate limit 60/min/IP
- [ ] Sem `leaseToken` em eventos/logs (D-ORC-026)

---

## Ambiente mínimo

| Variável / serviço | Obrigatório | Notas |
| --- | --- | --- |
| `DATABASE_URL` | Sim | PostgreSQL local/dev |
| NATS / eventing | Sim | Outbox consumer dev |
| `TASKBOARD_URL` | Sim (S4+) | Loopback `http://127.0.0.1:47823` dev |
| `TASKBOARD_WEBHOOK_SECRET` | Prod | `ORC_WEBHOOK_HMAC_REQUIRED=true` |
| `@anxionos/identity` | Sim (S6+) | `getPrincipalById` |
| `@anxionos/organizations` | Sim (S6+) | `OrganizationScopePort` |
| governance T01 port | Sim (S6+) | `TraversalEvaluator` mock OK S1–S5 |

---

## Links — rodadas R01–R10

| Rodada | Artefato |
| --- | --- |
| R01 | [R01-context.md](./R01-context.md) · [R01-hierarchy-modes.md](./R01-hierarchy-modes.md) |
| R02 | [R02-paperclip-checkout-heartbeat.md](./R02-paperclip-checkout-heartbeat.md) |
| R03 | [R03-domain-sketch.md](./R03-domain-sketch.md) |
| R04 | [R04-contracts-events.md](./R04-contracts-events.md) |
| R05 | [R05-storage-pg.md](./R05-storage-pg.md) |
| R06 | [R06-dependencies.md](./R06-dependencies.md) |
| R07 | [R07-risks.md](./R07-risks.md) |
| R08 | [R08-decision-log.md](./R08-decision-log.md) |
| R09 | [R09-dev-plan.md](./R09-dev-plan.md) |
| R10 | **Este artefato** |

## Links — Slack transcripts

| Sessão | Tema |
| --- | --- |
| [Session I](./SLACK-TRANSCRIPTS.md#session-i--r09-dev-plan) | R09 kickoff — 8 slices S1–S8 |
| [Session J](./SLACK-TRANSCRIPTS.md#session-j--r10-g0-ratificação) | **R10 G0 ratificação** — pacote handoff debate encerrado |

Índice debate: [INDEX.md](../index.md) · Fila: [module-queue.md](../../module-queue.md)

---

## Veredito R10

| Pergunta | Resposta |
| --- | --- |
| **G0 debate pronto?** | **Sim** — PC-G0-01..03, 05..10 satisfeitos; status `g0_ready` |
| **Claim implementação autorizado?** | **Sim** — após greenlight + issue derivada; R10 G0 fechado |
| **G1 código S6–S7 autorizado?** | **Não** — bloqueado por PC-G0-04 (ANX-28 G7) + ANX-29 + RB-D04 |
| **O que bloqueia claim?** | Greenlight explícito + criação issue implementação |
| **O que bloqueia G1 S6–S7?** | ANX-28 `done` + ANX-29 G1 + RB-D04 governance grant events |

✅ Pacote G0 aprovado — debate orchestration **encerrado**.
