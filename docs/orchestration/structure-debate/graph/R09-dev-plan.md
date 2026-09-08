---
type: debate
---

# R09 — Plano de implementação: `modules/graph`

**Componente:** modules/graph  
**Rodada:** R9 — Plano de implementação G1 (ANX-32 scaffold)  
**Pacote SDD:** P03  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-41 · **Issue implementação:** ANX-32 (bloqueada até R10 G0 + P02 foundation)  
**Sessão Slack:** [Session L — R09 dev-plan](./SLACK-TRANSCRIPTS.md#session-l--r09-dev-plan)

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Arquiteto | architect |
| Executor | code-architect |
| Crítico | critic-reviewer |
| Code Review | code-reviewer |
| QA | QA |
| Security | security-reviewer (Kai) |
| Red Team | Red Team (Ryn) |

## Objetivo da rodada

Traduzir R01–R08 (44 decisões `D-GR-001`..`044`) em plano executável G1 para **ANX-32**: árvore ADR0002, migrações PG, contratos GraphQuery v1, ordem de wiring workers/HTTP, matriz de testes e **fatias incrementais S1–S8** com critérios de aceite, gates G3/G5 e spike partial rebuild go/no-go.

## Pré-requisitos (não implementar antes)

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 aprovado | [R10-g0-handoff.md](./R10-g0-handoff.md) |
| 2 | P02 `@anxionos/eventing` | `ensureEventingSchema` no startup |
| 3 | identity G7 (ANX-28 `done`) | Export `getPrincipalById` em `@anxionos/identity` |
| 4 | RB-D04 governance grant events mínimos | Event list fechada para F0 T01 |
| 5 | Neo4j dev/staging | Container ou Aura dev; credenciais via `packages/secrets` |
| 6 | Redis dev (L2 cache) | `GRAPH_CACHE_MODE=local-only` aceito em dev sem Redis |

**Nota:** ANX-28 e RB-D04 bloqueiam wiring integrado T01 F0, não este debate. R09 pode concluir enquanto dependências permanecem `in_review`.

---

## Árvore de diretórios (ADR0002)

```text
backend/modules/graph/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── src/
    ├── index.ts
    ├── domain/
    │   ├── schema/
    │   │   ├── registry.ts
    │   │   ├── traversal-catalog.ts
    │   │   └── sub-plan-registry.ts
    │   ├── projections/
    │   │   └── inbox.ts
    │   ├── dispatch/
    │   │   └── node-dispatcher.ts
    │   └── ports/
    │       ├── graph-store.ts
    │       ├── projection-inbox.ts
    │       ├── rebuild-control.ts
    │       ├── cache-invalidator.ts
    │       └── traversal-executor.ts
    ├── application/
    │   ├── projections/
    │   │   ├── inbox/
    │   │   │   └── process-with-inbox.ts
    │   │   ├── organizations/
    │   │   │   └── organizations-projector.ts
    │   │   └── identity/
    │   │       └── identity-projector.ts
    │   ├── traversals/
    │   │   ├── T01-authorization-check.ts
    │   │   ├── T03-authorization-explain.ts
    │   │   └── registry.ts
    │   ├── queries/
    │   │   ├── node-get.ts
    │   │   └── nodes-batch-get.ts
    │   ├── commands/
    │   │   └── dispatch-node-command.ts
    │   ├── cache/
    │   │   ├── graph-cache.ts
    │   │   └── cache-key-builder.ts
    │   └── rebuild/
    │       └── full-generation-swap.ts
    ├── infrastructure/
    │   ├── adapters/
    │   │   └── neo4j/
    │   │       ├── client.ts
    │   │       ├── graph-store-adapter.ts
    │   │       └── migrations/
    │   ├── persistence/
    │   │   ├── schema.ts
    │   │   ├── inbox-repository.ts
    │   │   ├── dlq-repository.ts
    │   │   ├── rebuild-job-repository.ts
    │   │   ├── schema-registry-repository.ts
    │   │   └── projection-markers-repository.ts
    │   ├── cache/
    │   │   ├── redis-l2-cache.ts
    │   │   └── local-lru-cache.ts
    │   ├── create-db.ts
    │   ├── migrate.ts
    │   └── migrations/
    │       ├── 0000_graph_schema_registry.sql
    │       ├── 0001_graph_projection_inbox.sql
    │       ├── 0002_graph_rebuild_markers.sql
    │       ├── 0003_graph_projection_dlq.sql
    │       └── meta/
    ├── api/
    │   ├── plugin.ts
    │   ├── middleware/
    │   │   ├── require-platform-scope.ts
    │   │   └── graph-rate-limit.ts
    │   └── handlers/
    │       ├── traversals.ts
    │       ├── nodes.ts
    │       ├── admin-rebuild.ts
    │       └── admin-dlq.ts
    └── workers/
        ├── projection-consumer.ts
        └── rebuild-worker.ts

backend/packages/contracts/src/graph/
├── types.ts
├── envelope.ts
├── errors.ts
├── commands.ts
├── queries.ts
├── cache.ts
├── schema/
│   ├── node-types.ts
│   ├── edge-types.ts
│   └── index.ts
├── traversals/
│   ├── index.ts
│   ├── common.ts
│   └── T01.ts … T20.ts
└── index.ts

backend/apps/api/src/graph/
└── plugin.ts

backend/apps/workers/src/graph/
├── projection-consumer.ts
└── rebuild-worker.ts

backend/tests/
├── contracts/graph/
├── graph/
│   ├── unit/
│   └── integration/
├── boundary/
│   └── graph-imports.test.ts
└── fixtures/
    └── graph-f0-minimal.json
```

**Fora do escopo G1 (defer):** partial rebuild operacional (D-GR-036 spike only), OpenAPI Scalar público (D-GR-038 slice S8), auto-replay DLQ batch (D-GR-039), SLO premium/PagerDuty (D-GR-040/041), traversals T04–T20 completos além de smoke F0.

---

## Migrações Drizzle

| # | Arquivo | Conteúdo |
| --- | --- | --- |
| **0000** | `0000_graph_schema_registry.sql` | `graph_schema_node_types`, `graph_schema_edge_types`, `graph_traversal_catalog`, `graph_registry_generation` |
| **0001** | `0001_graph_projection_inbox.sql` | `graph_projection_inbox` — PK `(event_id, consumer_name)`, estados, `attempt_count` |
| **0002** | `0002_graph_rebuild_markers.sql` | `graph_rebuild_jobs`, `graph_projection_generation`, `graph_current_generation` |
| **0003** | `0003_graph_projection_dlq.sql` | `graph_projection_dlq`, `replay_status`, `payload_ref` redacted |

**Bootstrap:** `ensureEventingSchema` → `ensureIdentitySchema` → `ensureGraphSchema` (D-GR-008).

**Spike partial (S8, documental):** tabela opcional `graph_domain_generation` — **não** migrar em S1–S7 sem go/no-go aprovado.

---

## Startup: fail-fast e bootstrap

| Regra | Comportamento |
| --- | --- |
| `NEO4J_URI` / credenciais ausentes | Fail-fast no worker projection e API graph |
| Registry seed vs PG drift | CI diff `contracts/graph/schema` vs catálogo PG — gate AR01 |
| Sub-plano edge não registrada | Fail-fast bootstrap composition root (D-GR-011) |
| `GRAPH_CACHE_MODE=local-only` | L1 LRU only; skip Redis sem erro |
| Admin rebuild/DLQ | PLATFORM scope + `audit_manifest_id` (D-GR-034) |

Ordem composition root: schemas PG → registry bootstrap → montar rotas `/v1/graph` → registrar workers NATS.

---

## `packages/contracts/src/graph/`

| Arquivo | Responsabilidade |
| --- | --- |
| `types.ts` | `NodeKey`, `ScopeContext`, branded IDs |
| `envelope.ts` | `GraphQueryEnvelope`, `CommandAccepted`, poll params |
| `errors.ts` | `GRAPH_ERROR_CODES`, RFC7807 helpers |
| `commands.ts` | `node.create/update`, dispatcher input |
| `queries.ts` | `node.get`, `nodes.batchGet`, poll |
| `cache.ts` | `GraphCacheKeyParts`, `CachePolicy` (D-GR-018..020) |
| `schema/*` | `NodeTypeDef`, `EdgeTypeDef`, seed refs |
| `traversals/T01.ts`…`T20.ts` | input/output Zod por traversal |
| `index.ts` | Re-export público |

### Códigos de domínio (`errors.ts`)

| Código | HTTP |
| --- | --- |
| `NODE_NOT_FOUND` | 404 |
| `NODE_NOT_PROJECTED` | 409 |
| `PROJECTION_TIMEOUT` | 504 |
| `MERGE_CONFLICT` | 409 |
| `TRAVERSAL_NOT_FOUND` | 404 |
| `TRAVERSAL_INPUT_INVALID` | 422 |
| `FORBIDDEN_SCOPE` | 403 |
| `CURSOR_EXPIRED` | 410 |
| `STALE_BASELINE` | 409 |
| `GRAPH_UNAVAILABLE` | 503 |

---

## Wiring — ordem de implementação (ANX-32)

| Ordem | Componente | Slice |
| --- | --- | --- |
| 1 | Contracts graph + schema seed | S1 |
| 2 | PG migrations + `ensureGraphSchema` | S1 |
| 3 | Domain registry + ports | S2 |
| 4 | Neo4j adapter + constraints | S3 |
| 5 | `processWithInbox` + DLQ + poison pill | S4 |
| 6 | Consumer `graph:organizations:v1` + identity smoke | S4 |
| 7 | Rebuild worker full generation swap | S5 |
| 8 | Cache L1/L2 + pub/sub invalidate | S6 |
| 9 | HTTP `/v1/graph` T01/T03 + node.get/batchGet | S7 |
| 10 | Admin rebuild + DLQ manual replay | S7 |
| 11 | OpenAPI Scalar + partial spike go/no-go | S8 (defer) |

---

## Matriz de testes

### Unitários

| Teste | Foco | Slice |
| --- | --- | --- |
| `registry.test.ts` | fail-fast edge allowlist | S2 |
| `cache-key-builder.test.ts` | epoch-aware keys (D-GR-019) | S6 |
| `process-with-inbox.test.ts` | idempotência `(eventId, consumerName)` | S4 |
| `poison-pill.test.ts` | `max_attempts=5` → quarantine | S4 |
| `full-generation-swap.test.ts` | drain → N+1 → F0 → swap | S5 |
| `T01-authorization-check.test.ts` | ALLOW/DENY; intentHash não cacheável | S7 |
| `node-get.test.ts` | 409 NOT_PROJECTED vs 404 NOT_FOUND | S7 |

### Contratos (`backend/tests/contracts/graph/`)

Round-trip Zod: types, envelope, errors, T01/T03 input/output, cache key parts.

### Integração

| Teste | Foco | Slice |
| --- | --- | --- |
| `inbox-neo4j-pg-tx.test.ts` | COMMIT atômico inbox+marker+Neo4j | S4 |
| `rebuild-full-swap.test.ts` | generation alias swap | S5 |
| `redis-invalidate.test.ts` | pub/sub pós-ack | S6 |
| `organizations-consumer-e2e.test.ts` | E009 Membership → User | S4 |

### G3 (funcional)

| ID | Cenário | Esperado | Slice |
| --- | --- | --- | --- |
| G3-01 | Replay `eventId` duplicado consumer organizations | No-op; inbox acked once | S4 |
| G3-02 | `node.get` antes projeção | 409 NODE_NOT_PROJECTED | S7 |
| G3-03 | Poll `minProjectionGeneration` sucesso | 200 + node envelope | S7 |
| G3-04 | T01 ALLOW com `intentHash` | Resposta fresh; cache miss forçado | S7 |
| G3-05 | `nodes.batchGet` 51 keys | 422 validation | S7 |
| G3-06 | Rebuild full swap | Leituras em generation N+1 consistentes | S5 |
| G3-07 | Poison pill 5ª falha | quarantine + DLQ + NATS ack | S4 |
| G3-08 | DLQ manual replay PLATFORM | reprocess success; inbox idempotente | S7 |
| G3-09 | Cache T01 DENY TTL 60s | hit dentro TTL; miss após epoch bump | S6 |
| G3-10 | Rate limit 61 req/min T01 | 429 ou throttle conforme middleware | S7 |

### G5 Red Team (sandbox)

**Orçamento:** Neo4j/PG dev; sem produção.  
**Cleanup:** truncate graph_* + Neo4j `MATCH (n) DETACH DELETE n` em fixture dedicada.

| ID | Cenário | Esperado | Slice |
| --- | --- | --- | --- |
| G5-01 | Import cross-module `neo4j/client` | Build fail AR01 | S3 |
| G5-02 | Falsa `node.update` Grant via graph API | Roteia governance; sem write direto Neo4j | S7 |
| G5-03 | DLQ `payload_ref` inspection | Sem secrets; redaction validada | S4 |
| G5-04 | Rebuild trigger sem PLATFORM | 403 | S7 |
| G5-05 | Double DLQ replay mesmo `eventId` | Idempotente; zero double projection | S7 |
| G5-06 | T01 herd 100 parallel durante catch-up | Rate limit 60/min respeitado | S7 |

### AR01 (`boundary/graph-imports.test.ts`)

Proíbe: módulo→`graph/infrastructure/adapters/neo4j/**`, módulo→tabelas `graph_*`, `graph/domain`→NATS/Neo4j/Drizzle.

### Bench (targets dev-plan)

| Métrica | Target dev | Evidência |
| --- | --- | --- |
| T01 p99 latência (Redis L2 warm) | ≤ 80ms local | S7 bench script |
| Inbox ack lag p99 | ≤ 2s @ 100 evt/s | S4 load smoke |
| Rebuild full swap 10k nós | ≤ 5min dev | S5 integration |

---

## Fases (8 slices)

| Slice | Pré-requisito | Evidência mínima | Bloqueio se ausente |
| --- | --- | --- | --- |
| **S1** | R10 G0 aprovado; debate R09 fechado | contracts graph skeleton; migrations 0000–0003; `ensureGraphSchema` idempotente; CI diff schema seed | S2 — contracts drift |
| **S2** | S1 completo | domain registry fail-fast; ports sem framework; traversal catalog types | S3 — ports instáveis |
| **S3** | S2 completo | Neo4j adapter isolado; constraints bootstrap; AR01 import test | S4 — sem store |
| **S4** | S3 completo; eventing NATS | `processWithInbox`; poison/DLQ; consumer organizations+identity smoke; G3-01/G3-07 | S5 — projeção não confiável |
| **S5** | S4 completo | full generation swap worker; ordem rebuild D-GR-026; G3-06 | S6/S7 — generation instável |
| **S6** | S5 completo; Redis opcional | L1 LRU + L2 Redis; invalidate pub/sub; T01 cache policy; G3-09 | S7 — stale ALLOW risk |
| **S7** | S6 completo; ANX-28 G7 wiring; RB-D04 F0 mínimo | HTTP GraphQuery T01/T03; node.get/batchGet; admin rebuild/DLQ manual; G3-02..05, G3-08, G3-10; G5-01..06 | ANX-32 não fecha G1 |
| **S8** | S7 completo | OpenAPI Scalar slice 2; `graphDlqReplayInputSchema`; partial rebuild spike go/no-go T07; bench T01 p99 | defer OK pós-G1 |

**Ordem operacional ratificada (Session L):** inbox+DLQ (S4) → rebuild (S5) → cache (S6) → HTTP GraphQuery (S7). S1–S3 são fundação pré-S4.

### Slice 1 — Contratos e schema PG

**AC:** enums/errors R04; seed schema T01–T20 refs; migrations 0000–0003; `ensureGraphSchema` idempotente; registry generation row.

### Slice 2 — Domínio e ports

**AC:** `registry.ts` lookup O(1); sub-plan registry interface; ports `GraphStore`, `ProjectionInbox`, `RebuildControl` sem framework.

### Slice 3 — Neo4j adapter + bootstrap

**AC:** adapter privado; constraints/indexes v1; graph-store port implementado; AR01 boundary test verde.

### Slice 4 — Inbox, DLQ e consumers (ANX-32 slice 1)

**AC:** `processWithInbox` transacional; poison `max_attempts=5`; DLQ redacted; consumers `graph:organizations:v1` + identity smoke; NATS ack pós-COMMIT.

### Slice 5 — Rebuild worker full swap

**AC:** pipeline drain→pause→N+1→replay→F0→swap→resume; ordem ownerDomain D-GR-026; pending >100k bloqueia novo rebuild.

### Slice 6 — Cache cross-pod

**AC:** Redis L2 + L1 LRU 30s; chave epoch-aware; T01 ALLOW never cache; DENY TTL 60s; pub/sub `graph:invalidate`.

### Slice 7 — HTTP GraphQuery + admin

**AC:** `/v1/graph/traversal/T01|T03`; `node.get`/`nodes.batchGet`; admin rebuild/DLQ manual PLATFORM-only; rate limit 60/min; matriz G3/G5 executada.

### Slice 8 — Deferências e spike (pós-G1)

**AC:** `npm run contracts:openapi` documentado; partial rebuild protótipo ou rejeição formal T07 cross-domain; `graphDlqReplayInputSchema`; auto-replay batch **não** implementado.

**Fixture registry (obrigatório):** `backend/tests/fixtures/graph-f0-minimal.json` — Agency, User, Membership, Grant mínimo para F0 T01/T03; IDs sanitizados.

---

## Spike partial rebuild — go/no-go (S8 / GK-R08-01)

| Critério | Go partial v2 | No-go (mantém full swap) |
| --- | --- | --- |
| T07 merge cross-domain mesma request | Isolamento provado com read fence | **Rejeitar** partial (Session L consenso) |
| F0 parcial governance-only | Oráculo verde sem drift T01 | Spike documenta limites |
| `graph_domain_generation` | Protótipo PG+Neo4j marker | Não operacional v1 |

**Decisão default v1:** full generation swap only (D-GR-037) até S8 emitir parecer formal.

---

## Mapa D-GR → arquivos (resumo)

| Decisão | Arquivo(s) |
| --- | --- |
| D-GR-001..007 | registry.ts, sub-plan-registry.ts, node-dispatcher.ts |
| D-GR-008..011 | schema/*, schema-registry-repository.ts, migrations/0000 |
| D-GR-012..017 | envelope.ts, queries.ts, traversals/*, handlers/nodes.ts |
| D-GR-018..022 | cache.ts, graph-cache.ts, redis-l2-cache.ts |
| D-GR-023..027 | process-with-inbox.ts, inbox-repository.ts, rebuild-worker.ts |
| D-GR-028..033 | poison handling, dlq-repository.ts, graph-rate-limit.ts |
| D-GR-034..035 | admin-rebuild.ts, admin-dlq.ts, require-platform-scope.ts |
| D-GR-036..039 | S8 spike doc; defer OpenAPI/auto-replay |
| D-GR-040..042 | defer P07/S8 |
| D-GR-043..044 | este plano; F0 fixtures; QA NOT_RUN até S7 |

---

## Top 5 arquivos a criar primeiro

1. `backend/packages/contracts/src/graph/errors.ts`
2. `backend/packages/contracts/src/graph/schema/node-types.ts`
3. `backend/modules/graph/src/infrastructure/persistence/schema.ts`
4. `backend/modules/graph/src/infrastructure/migrations/0000_graph_schema_registry.sql`
5. `backend/modules/graph/src/domain/schema/registry.ts`

---

## Dependências externas por slice

| Slice | Upstream | Downstream impactado |
| --- | --- | --- |
| S1–S3 | eventing, database packages | — |
| S4 | organizations events E003/E008/E009/E016; identity events | organizations R10 consumer spec |
| S5 | audit manifest (CAP-D04) | operations OP01 read-only lag |
| S6 | Redis infra | todos traversals cacheáveis |
| S7 | governance grants RB-D04; identity G7 | orchestration, agents SDK |
| S8 | Scalar/Elysia tooling | docs públicas API |

---

## Saída R9

✅ Plano aprovado para **R10** (pacote G0) e execução **ANX-32** pós-G0.

**RB-D09:** ✅ Fechado (dev-plan slices S1–S8, matriz testes, spike partial go/no-go, ordem inbox→rebuild→cache→HTTP).
