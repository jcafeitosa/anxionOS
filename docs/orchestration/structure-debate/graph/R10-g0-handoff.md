---
type: debate
---

# R10 — Pacote G0 (handoff): `modules/graph`

**Rodada:** R10 — Pacote G0 para claim ANX-32  
**Data:** 2026-09-07  
**Issues:** ANX-41 (debate) · ANX-32 (implementação G1+) · ANX-28 (identity `in_review`)

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

Fechar o **pacote G0** que autoriza claim de ANX-32: escopo v1 fechado, critérios de aceite, dependências, riscos, checklist de evidências, status PC-G0-01..10 e condições de handoff. Nenhuma implementação nesta rodada.

### Classificação epistemológica (G2)

| Afirmação | Status |
| --- | --- |
| Debate R01–R10 documental (`g0_ready`) | ✅ Fechado neste pacote |
| ADR0001 grafo operacional (`brain/`) | ⏳ **Proposto** — não substituído por este handoff |
| PC-G0-04 identity G7 + `getPrincipalById` | ⏳ Pendente upstream (ANX-28) |
| RB-D04 governance grant events | ⏳ Pendente upstream |
| Digest/manifesto de código | ⏳ Exigido na **G1 implementação** (ANX-32), não no debate G2 |
| Claim ANX-32 slices S1–S6 (planejamento) | ✅ Autorizado após debate `in_review` |
| Integração S7 HTTP T01 real | ⏳ Bloqueada até PC-G0-04 + RB-D04 |


---

## G0 — Escopo ANX-32 (v1 fechado)

### In scope (G1)

| Área | Entrega |
| --- | --- |
| **Domínio** | Graph Kernel — registry T01–T20, schema registry híbrido, dispatcher `node.create/update`, ports sem framework |
| **Projeção** | Inbox idempotente `(eventId, consumerName)`; consumers `graph:organizations:v1` + identity smoke; poison pill + DLQ |
| **Rebuild** | Full generation swap only (D-GR-037); ordem ownerDomain D-GR-026 |
| **Cache** | L1 LRU 30s + L2 Redis; epoch-aware keys; T01 ALLOW+intentHash nunca cacheável |
| **HTTP** | GraphQuery v1 — T01/T03, `node.get`, `nodes.batchGet`; admin rebuild/DLQ manual PLATFORM-only |
| **Contratos** | `@anxionos/contracts/graph/*` — types, envelope, errors, traversals T01–T20, cache |
| **Persistência** | PostgreSQL `graph_*` (registry, inbox, DLQ, rebuild markers); Neo4j adapter privado |
| **Testes** | Unitários, contratos, integração inbox+Neo4j, matriz G3-01..10, checklist G5-01..06, AR01 boundary |

### Out of scope (explicitamente fora ANX-32 v1)

| Item | Destino | Decisão |
| --- | --- | --- |
| Partial rebuild operacional single `ownerDomain` | S8 spike go/no-go | D-GR-036, GK-R08-01 |
| OpenAPI Scalar público | ANX-32 slice S8 | D-GR-038 |
| Auto-replay DLQ batch | Pós-G1 | D-GR-039 |
| Traversals T04–T20 completos além de smoke F0 | P04+ consumers | R09 defer |
| SLO premium / PagerDuty lag | P07 operations | D-GR-040/041 |
| `graphDlqReplayInputSchema` contracts | S8 | D-GR-042 |
| Graph Explorer UI P07 | frontend | fora P03 |
| Credencial Neo4j para agentes/módulos | proibido | D-GR-003 |

---

## Critérios de aceite G0 (debate → implementação)

| # | Critério | Evidência |
| --- | --- | --- |
| AC-G0-01 | 44 decisões `D-GR-001`..`044` registradas; RB-D01..RB-D09 resolvidos | [R08-decision-log.md](./R08-decision-log.md) |
| AC-G0-02 | Plano 8 slices S1–S8 com matriz G3/G5 | [R09-dev-plan.md](./R09-dev-plan.md) |
| AC-G0-03 | Escopo ANX-32 fechado (tabela in/out acima) | Este artefato §G0 |
| AC-G0-04 | Executor e Crítico G1 nominados | §Equipe G1 |
| AC-G0-05 | PC-G0-01..10 avaliados (tabela abaixo) | §PC-G0 |
| AC-G0-06 | Debate Slack R10 com 8 papéis | [SLACK-TRANSCRIPTS.md §Session M](./SLACK-TRANSCRIPTS.md#session-m--r10-g0-ratificação) |
| AC-G0-07 | Top 5 riscos com mitigação G4/G5 mapeada | §Riscos + [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md) |
| AC-G0-08 | Dependências upstream documentadas | §Dependências |

**Saída debate:** ✅ G0 **aprovado** — ANX-41 pode ir para `in_review`. **Debate status:** `g0_ready`.

---

## Equipe G1 (nominal)

| Papel | Agente | Responsabilidade |
| --- | --- | --- |
| **Executor** | code-architect | Implementar slices S1–S8 conforme R09; evidências por slice |
| **Crítico** | critic-reviewer | Acompanhar plano; aprovar handoff G1→G2 somente com critérios satisfeitos |
| Code Review | code-reviewer | Gate G2 independente |
| QA | QA | Gate G3 — matriz G3-01..10 |
| Security | security-reviewer | Gate G4 |
| Red Team | security-reviewer (G5) | Checklist G5-01..06 |

**PC-G0-10:** ✅ Crítico nominal = **critic-reviewer** (distinto do executor code-architect).

---

## Dependências

| # | Dependência | Tipo | Status | Impacto |
| --- | --- | --- | --- | --- |
| DEP-01 | ANX-28 identity G7 + export `getPrincipalById` | **Bloqueante G1 S7** | `in_review` | T01 F0 wiring integrado; identity projector smoke S4 |
| DEP-02 | RB-D04 governance grant events mínimos | **Bloqueante G1 S7** | `not_started` | T01 ALLOW/DENY F0 oracles |
| DEP-03 | `@anxionos/eventing` schema (`ensureEventingSchema`) | Bloqueante bootstrap | `in_review` (ANX-27) | UoW inbox/outbox |
| DEP-04 | Neo4j dev (`NEO4J_URI` + credenciais via secrets) | Ambiente | Documentado R09 | Adapter S3+; fail-fast startup |
| DEP-05 | Debate R10 G0 (este pacote) | **Bloqueante claim ANX-32** | ✅ R10 | PC-G0-03, PC-G0-09 |
| DEP-06 | organizations events E003/E008/E009/E016 | Bloqueante S4 consumer | organizations R10 `g0_ready` | Consumer `graph:organizations:v1` |
| DEP-07 | Redis dev (L2 cache) | Não bloqueante dev | `GRAPH_CACHE_MODE=local-only` | S6 sem Redis em dev |
| DEP-08 | audit manifest (CAP-D04) | Bloqueante admin rebuild | operations spec | `audit_manifest_id` S5/S7 |

**Ordem bootstrap (D-GR-008):** `ensureEventingSchema` → `ensureIdentitySchema` → `ensureGraphSchema`.

---

## Riscos residuais (Top 5 → gates)

| ID | Risco | Sev | Mitigação G1 | Gate |
| --- | --- | ---: | --- | --- |
| R-GR-01 | Poison nak infinito bloqueia fila NATS | 15 | `max_attempts=5` → quarantine + ack; DLQ auditável | G4, G5 |
| R-GR-04 | Stale ALLOW T01 em mutável | 15 | Zero cache ALLOW+intentHash; PG epoch revalidate | G4, G5 |
| R-GR-02 | 100k pending pós-resume OOM Neo4j | 12 | Throttle batch 100; inflight 3; bloqueia novo rebuild | G3, G5 |
| R-GR-03 | Replay DLQ duplica projeção | 10 | PLATFORM + manifest; inbox idempotente | G4, G5 |
| R-GR-06 | Secrets em payload DLQ | 10 | `payload_ref` redacted only | G4 |

Detalhe completo: [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md) · [R08-decision-log.md](./R08-decision-log.md) §Riscos.

---

## Plano de implementação (referência)

8 slices — ver [R09-dev-plan.md](./R09-dev-plan.md):

| Slice | Foco | Gate interno |
| --- | --- | --- |
| S1 | Contratos + schema PG (migrations 0000–0003) | enums, errors GRAPH_* |
| S2 | Domain registry + ports | sem framework |
| S3 | Neo4j adapter + constraints | AR01 import test |
| S4 | Inbox + DLQ + consumers organizations/identity | G3-01, G3-07 |
| S5 | Rebuild worker full generation swap | G3-06 |
| S6 | Cache L1/L2 + pub/sub invalidate | G3-09 |
| S7 | HTTP GraphQuery T01/T03 + admin | G3-02..05, G3-08, G3-10; G5-01..06 |
| S8 | OpenAPI Scalar + partial spike go/no-go | defer OK pós-G1 |

**Ordem operacional ratificada (Session L):** inbox+DLQ (S4) → rebuild (S5) → cache (S6) → HTTP (S7). S1–S3 são fundação pré-S4.

**Top 5 arquivos primeiro (R09):** `contracts/graph/errors.ts`, `schema/node-types.ts`, `persistence/schema.ts`, `0000_graph_schema_registry.sql`, `domain/schema/registry.ts`.

---

## PC-G0 — Status das pré-condições

| # | Pré-condição | Evidência | Status |
| --- | --- | --- | --- |
| PC-G0-01 | Decision log R8 completo | [R08-decision-log.md](./R08-decision-log.md) | ✅ |
| PC-G0-02 | Plano de implementação R9 | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ |
| PC-G0-03 | Pacote G0 R10 (escopo, crítico, ambiente) | **Este artefato** | ✅ |
| PC-G0-04 | identity ANX-28 aceite G7 + `getPrincipalById` | ANX-28 `in_review` | ⏳ **Bloqueia G1 S7** |
| PC-G0-05 | Debate R1–R9 sem pendências bloqueantes | RB-D01..RB-D09 ✅ | ✅ |
| PC-G0-06 | Contracts graph especificados | [R04-graphquery-contracts.md](./R04-graphquery-contracts.md) + R09 | ✅ |
| PC-G0-07 | Riscos Top 5 + mitigação G4/G5 | [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md) | ✅ |
| PC-G0-08 | Consumer organizations `graph:organizations:v1` | [R06-rebuild-inbox.md](./R06-rebuild-inbox.md) | ✅ |
| PC-G0-09 | ANX-32 escopo fechado v1 | §G0 in/out | ✅ |
| PC-G0-10 | Crítico nominal para executor G1 | §Equipe G1 | ✅ |

**Resumo PC-G0:** 9/10 ✅ · 1 pendente (PC-G0-04 — upstream identity G7).

---

## Handoff — Condições para claim ANX-32

### G0 debate (ANX-41) — ✅ PRONTO

Todos os artefatos R01–R10 existem. Debate formal encerrado. **Debate status:** `g0_ready`. ANX-41 pode mover para `in_review`.

### Claim ANX-32 (`todo` → `in_progress`)

| # | Condição | Status |
| --- | --- | --- |
| H-01 | R10 G0 aprovado (PC-G0-01..03, 05..10) | ✅ |
| H-02 | ANX-41 debate `in_review` ou `done` | ⏳ após move desta sessão |
| H-03 | Issue ANX-32 descrição alinhada ao escopo §G0 | ✅ |
| H-04 | Executor + Crítico nominados | ✅ |
| H-05 | Ambiente: PG + eventing + Neo4j + Redis documentados | ✅ R09 |

**Claim ANX-32 autorizado** assim que ANX-41 estiver `in_review`/`done` — planejamento e slices S1–S4 podem iniciar; integração identity/governance real aguarda PC-G0-04 e RB-D04.

### G1 implementação (código integrado S7) — ⏳ BLOQUEADO

| # | Bloqueio | Ação |
| --- | --- | --- |
| B-01 | **PC-G0-04:** ANX-28 `done` (G7) + `getPrincipalById` exportado | Aguardar aceite identity |
| B-02 | **RB-D04:** governance grant events mínimos para T01 F0 | Aguardar debate/implementação governance |
| B-03 | Slice S7 HTTP T01/T03 com wiring real | Mock port permitido S1–S6 apenas |

**Regra D-GR-043:** Código de integração identity/governance (slice S7) **não merge** até PC-G0-04 ✅ e RB-D04 fechado.

---

## Checklist de evidências (executor G1)

O executor deve anexar à issue ANX-32 ao submeter G2:

- [ ] Diff `backend/modules/graph/` + `packages/contracts/src/graph/`
- [ ] Migrações `0000`–`0003` aplicadas em PG dev
- [ ] `ensureGraphSchema` idempotente no startup
- [ ] Testes unitários por slice (registry, inbox, cache-key, T01)
- [ ] `backend/tests/contracts/graph/` round-trip Zod
- [ ] `integration/inbox-neo4j-pg-tx.test.ts` (S4)
- [ ] `integration/rebuild-full-swap.test.ts` (S5)
- [ ] Matriz G3-01..10 verde
- [ ] Checklist G5-01..06 executado (evidência Red Team)
- [ ] `boundary/graph-imports.test.ts` (AR01)
- [ ] Fixture `graph-f0-minimal.json` commitada (S7)
- [ ] Admin rebuild/DLQ PLATFORM-only com `audit_manifest_id`
- [ ] Sem secrets/`payload_ref` inline em DLQ (D-GR-030)

---

## Ambiente mínimo

| Variável / serviço | Obrigatório | Notas |
| --- | --- | --- |
| `DATABASE_URL` | Sim | PostgreSQL local/dev |
| `NEO4J_URI` + credenciais | Sim (S3+) | Fail-fast startup worker/API |
| NATS / eventing | Sim | Projection consumer dev |
| Redis | Não (dev) | `GRAPH_CACHE_MODE=local-only` aceito |
| `@anxionos/identity` | Sim (S4+ smoke, S7+) | `getPrincipalById` |

---

## Links — rodadas R01–R10

| Rodada | Artefato |
| --- | --- |
| R01 | [R01-context.md](./R01-context.md) |
| R02 | [R02-boundaries.md](./R02-boundaries.md) |
| R03 | [R03-schema-registry.md](./R03-schema-registry.md) |
| R04 | [R04-graphquery-contracts.md](./R04-graphquery-contracts.md) |
| R05 | [R05-cache-projection.md](./R05-cache-projection.md) |
| R06 | [R06-rebuild-inbox.md](./R06-rebuild-inbox.md) |
| R07 | [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md) |
| R08 | [R08-decision-log.md](./R08-decision-log.md) |
| R09 | [R09-dev-plan.md](./R09-dev-plan.md) |
| R10 | **Este artefato** |

## Links — Slack transcripts

| Sessão | Tema |
| --- | --- |
| [Session E](./SLACK-TRANSCRIPTS.md#session-e--r02-boundaries) | R02 boundaries — kernel vs domínio |
| [Session L](./SLACK-TRANSCRIPTS.md#session-l--r09-dev-plan) | R09 kickoff — 8 slices S1–S8 |
| [Session M](./SLACK-TRANSCRIPTS.md#session-m--r10-g0-ratificação) | **R10 G0 ratificação** — pacote handoff ANX-32 |

Índice debate: [INDEX.md](../index.md) · Fila: [module-queue.md](../../module-queue.md)

---

## Veredito R10

| Pergunta | Resposta |
| --- | --- |
| **G0 debate pronto?** | **Sim** — PC-G0-01..03, 05..10 satisfeitos; status `g0_ready` |
| **Claim ANX-32 autorizado?** | **Sim** — após ANX-41 `in_review`; R10 G0 fechado |
| **G1 código S7 autorizado?** | **Não** — bloqueado por PC-G0-04 (ANX-28 G7) + RB-D04 |
| **O que bloqueia ANX-32 claim?** | Nada após esta entrega (debate G0 completo) |
| **O que bloqueia G1 S7?** | ANX-28 `done` + RB-D04 governance grant events |

✅ Pacote G0 aprovado — debate graph **encerrado**.
