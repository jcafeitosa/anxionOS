---
type: debate
---

# Slack transcripts — `modules/graph`

Transcrições de debates multi-persona conforme [DEBATE-FORMAT.md](../../DEBATE-FORMAT.md) e [DEBATE-ROSTER.md](../../DEBATE-ROSTER.md).

---

## Session E — R02 boundaries {#session-e--r02-boundaries}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R02 fronteiras  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D01 (kernel vs domínio, dispatcher) — resolução parcial  
**Contexto:** Session D (CAP-D01..D04) · organizations R10 `graph:organizations:v1` especificado

---

**Orquestrador (CTO)** · 21:05  
@channel retomamos graph após Session D. Hoje: fechar **R02 boundaries** — possui/não possui vs todos os módulos, isolamento Neo4j, dispatcher `node.create`, classificação T01–T20. RB-D01 é o alvo. organizations já tem consumer `graph:organizations:v1` em R06 — graph precisa assumir ownership do projector. @arquiteto abre com matriz kernel vs registrado.

_(reação: 👀 7 — roster completo)_

---

**Arquiteto** · 21:07  
@Orquestrador três camadas: (1) Kernel = registry + scope + authorization envelope + dispatch; (2) domínios registram **sub-planos** via interface pública — nunca repository cross-module; (3) Neo4j só no adapter privado. T01–T03 **kernel puro** — não negociável desde Session D. T08/T16/T18/T20 = híbridos: strategies/connections/execution/partners registram plano; Kernel executa com `visible()` em todo anchor.

---

**Crítico** · 21:09  
@Arquiteto cuidado com T07 "kernel composto". Se capital importa portfolios repo para montar T07, violamos regra 4. Minha exigência: composição **declarativa** no catálogo T07 — `CapitalUnderAgentPlan` + `CanonicalPositionsPlan` registrados separadamente; Kernel faz merge/dedup. Quem violar isso em código é bloqueante AR01.

↳ **thread**

---

**Executor (Dev)** · 21:11  
@Crítico anotado. Wiring P03: cada módulo exporta `registerXxxSubPlan()` chamado no bootstrap do composition root — não import circular em runtime. Consumer organizations já especificado:

```typescript
export const ORGANIZATIONS_GRAPH_CONSUMER = "graph:organizations:v1";
```

Projector vive em `graph/application/projections/organizations/` — organizations continua **zero** Neo4j. Idempotência `processWithInbox(eventId, consumerName)` como R05 organizations.

---

**Security (Kai)** · 21:13  
@Executor +1 no consumer, mas o risco maior é vazamento de adapter. Proposta GK-R02-02: **proibido** qualquer módulo importar `graph/infrastructure/adapters/neo4j/**`. Credenciais Neo4j só via secrets port injetado no graph worker. Agentes: traversals via `/v1/graph` — CAP-D01 e ADR0002 #7 sem exceção. Service principal `graph-projection-consumer` autentica Neo4j; Exec_A não.

_(reação: ✅ Arquiteto · ✅ Code Review)_

---

**Code Review** · 21:15  
@Security concordo. R02 precisa tabela "não exportar" no `index.ts` futuro: zero Cypher strings, zero driver. Dispatcher CAP-D02: entrada `nodeType` + `ownerDomain` + `expectedRevision`; saída `commandId` + `projectionPending`. Kernel **rejeita** tipo não registrado — GK02. Anti-pattern: `node.create` escrever Neo4j antes do evento do owner.

---

**Red Team (Ryn)** · 21:17  
@Code Review vetor Session D: falsa `node.update` contornando governance. Teste G5: API graph aceita update em Grant — dispatcher deve rotear `ownerDomain: governance`, não mutar aresta direto. Segundo vetor: módulo connections importa neo4j client "só para debug" — dependency test AR01 deve falhar build. Terceiro: prompt injection pedindo Cypher em T05 — traversalId fixo, sem DSL livre.

---

**QA** · 21:19  
@Red Team evidência P03: antes de código, R02 define oráculos de fronteira — (1) dependency graph sem aresta module→neo4j adapter; (2) fixture F0 T01 só útil após RB-D04 governance grant events; (3) consumer organizations replay `eventId` duplicado não duplica nó Agency. Marcar QA NOT_RUN até ANX-32 scaffold; R02 é gate documental aceito.

---

**Arquiteto** · 21:21  
@channel matriz possui/não possui: graph **possui** catálogo Txx, inbox projeção, rebuild control PG, Neo4j projeção, dispatcher. **Não possui** grants, capital, tasks, journal de domínio, credencial Neo4j para agentes, eventos fake `graph.*` rebuild (CAP-D04 → audit/operations). Stale leitura OK; mutável revalida epoch PG — CAP-D03.

---

**Crítico** · 21:23  
@Arquiteto discordância registrada e resolvida: T04 descoberta de agentes — ranking **não** é autorização. Kernel retorna candidatos; orchestration resolve lease transacional. Isso entra R02 como invariante, não R04. Aceito?

_(reação: ✅ Executor · ✅ Arquiteto)_

---

**Executor (Dev)** · 21:25  
@Crítico aceito. Sobre RB-D01 parcial: fechamos split kernel/registrado + Neo4j isolation + dispatcher routing. **Aberto** para R04: `projectionPending` sync vs async no HTTP envelope. Minha preferência: default **async** — cliente poll `node.get` com `checkpoint`; sync só admin/internal. Não bloqueia R03 schema registry.

---

**Security (Kai)** · 21:27  
@Executor async default reduz janela de TOCTOU falsa — agente não assume nó visível antes do commit Neo4j. Cache T01/T03/T15: chave com epochs — invalidação cross-pod fica RB-D02/R05, não R02. Admin rebuild: PLATFORM + audit manifest — não OP shell universal (Session D Security).

---

**Code Review** · 21:29  
@Executor proposta GK-R02-05 anotada como proposta R04. Em R02 fechamos GK-R02-01..04. Verificar `packages/contracts` não importa modules — GraphQuery v1 schemas RB-D05 paralelo a R04 graph. Sub-planos: tipos em contracts, implementação no módulo dono.

---

**Red Team (Ryn)** · 21:31  
@Security cenário stale ALLOW: T01 read com `authorityEpoch=7` → UI mostra ALLOW → execution submit com epoch 8 após revogação → PG DENY. Grafo nunca é fonte única para mutável. Segundo: cursor T09 reutilizado por outro principal → `CURSOR_EXPIRED` — deve estar no output schema R04, mas invariante já em R02.

---

**QA** · 21:33  
@Red Team paridade AP01: mesmo envelope T03 humano (explain panel) e agente (`graph.authorization.explain`). UI badge `stale` quando `projectionGeneration` atrás do journal. Regression mínima: 20 oracles F0 + 5 adversariais Session D antes de prod — referência traversals L143.

---

**Arquiteto** · 21:35  
Impacto organizations R10: PC-G0-08 consumer especificado — graph **assume** projector P03. organizations G0 não bloqueia por grafo atrasado; PG autoritativo. Eventos E003/E008/E009/E016 conforme R05 organizations. Sem FK, sem import síncrono — ratificado.

---

**Crítico** · 21:37  
@Orquestrador RB-D01 status: **parcialmente resolvido**. Fechado: classificação T01–T20, composição T07 declarativa, Neo4j adapter isolation, dispatcher ownerDomain routing, consumer organizations. Aberto: projectionPending HTTP contract (R04), cache invalidation (R05), GraphQuery schemas (R04/RB-D05). Algum bloqueante para publicar R02?

---

**Executor (Dev)** · 21:39  
@Crítico sem bloqueante documental. Próximo R03: schema registry `nodeType`/`edgeType`, nó Principal vs User no Neo4j, bootstrap sub-planos. Dependência externa: RB-D04 governance grant events mínimos para T01 F0.

---

**Code Review** · 21:41  
@Executor imports proibidos: `graph/domain` sem módulos físicos; qualquer módulo sem `neo4j/adapter`; domínios sem tabelas `graph_*`. Permitido: eventos → graph, leitura `/v1/graph`. AR01 dependency test quando ANX-32 abrir.

---

**Security (Kai)** · 21:43  
T16 fieldMask: usuário AGENCY não vê traces PlatformAnalyst — output schema R04, mas fronteira R02: graph aplica mask no envelope antes de SDK. T15 SYSTEM_FREE é oferta publicada, não permissão de ver conta alheia — invariante GK.

---

**Red Team (Ryn)** · 21:45  
@Security inflar `maxVisited` via tool argument — limites versionados no catálogo Txx; aumento só política admin, nunca LLM (SDD L128). Dispatcher rejeita edge não allowlisted mesmo se payload JSON "criativo".

---

**QA** · 21:47  
Checklist R02 aceite: matriz possui/não possui ✅, Neo4j isolation ✅, dispatcher ✅, T01–T20 class ✅, organizations consumer ✅, RB-D01 partial ✅. Ready para INDEX update e comentário ANX-41.

---

**Orquestrador (CTO)** · 21:49  
Consolidando Session E:

| ID | Decisão |
| --- | --- |
| **GK-R02-01** | Registry único; T01–T03 kernel puro; T08/T16/T18/T20 híbridos; T04/T07/T17 compostos no Kernel |
| **GK-R02-02** | Neo4j adapter isolado; proibido import cross-module |
| **GK-R02-03** | Dispatcher roteia `node.create/update` por `ownerDomain`; Kernel não persiste negócio |
| **GK-R02-04** | `graph:organizations:v1` ownership em graph P03 |
| **GK-R02-05** | `projectionPending` async default → R04 |

Artefato: [R02-boundaries.md](./R02-boundaries.md). RB-D01 parcial. Próximo: R03 domain sketch. @channel objeções finais?

---

**Arquiteto** · 21:51  
@Orquestrador sem objeção. P03 não substitui Neo4j por SQL — ADR0004. Graph Explorer P07 consome read API — fora escopo R02.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 21:53  
Session E encerrada. Comentário ANX-41 com link R02 + RB-D01 partial. Handoff R03 schema registry. Thread `#module-graph` arquivada até R03 prep.

### Consenso — Session E

- Matriz possui/não possui fechada contra 23 módulos + apps.
- Neo4j adapter exclusivo graph; agentes zero credencial.
- Dispatcher mutável sempre roteia ao owner; projeção via eventos.
- RB-D01 parcial: split kernel/registrado fechado; HTTP async pending → R04.


---

## Session F — R03 schema registry {#session-f--r03-schema-registry}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R03 schema registry  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** GK-R02-05 (`projectionPending` async) — **fechado** · RB-D03 parcial  
**Contexto:** Session E · [R02-boundaries.md](./R02-boundaries.md) · brain schema v1 + traversals v1

---

**Orquestrador (CTO)** · 22:05  
@channel R03 hoje: **schema registry** — `nodeType`/`edgeType` versionados, `ownerDomain` por tipo, mapeamento T01–T20, fechar GK-R02-05. R02 deixou cinco perguntas abertas; Session F precisa consenso nas três bloqueantes para R04 contracts. @Executor abre com registry PG vs código.

_(reação: 👀 8 — roster completo)_

---

**Executor (Dev)** · 22:07  
@Orquestrador proposta GK-R03-01: **híbrido**. Definições em `packages/contracts/graph/schema/`; seed migrations populam `graph_schema_node_types` e `graph_schema_edge_types`. Runtime em `graph/domain/schema/registry.ts` — lookup por `(nodeType, schemaVersion)`. Sub-plano T08 registra allowlist no bootstrap; edge não catalogada → **fail-fast no deploy**, não em query.

```typescript
// sketch — não é código instalado
registerTraversalSubPlan({
  traversalId: "T08",
  planId: "StrategyDeploymentPlan",
  edgeAllowlist: ["HAS_DEPLOYMENT", "USES_STRATEGY_VERSION", "EXECUTED_BY_AGENT"],
});
```

---

**Arquiteto** · 22:09  
@Executor +1 no híbrido. ADR0002 regra 10: evento tem `ownerDomain` único — registry espelha isso na coluna `owner_domain` do catálogo. **Agency** escrita por `organizations` (eventos E003+); identity projeta `User`/`Platform`. Duplicar tipo no grafo com dois escritores é bloqueante — GK-R03-03.

---

**Crítico** · 22:11  
@Arquiteto pergunta R02 #3 ainda confunde equipes: **Principal** em PG identity vs **User** no Neo4j. Minha exigência: `Principal` **não** é `nodeType` v1. Projeção `User` com `identitySubject = principalId`. Membership E009 aponta para `User`, não para nó fantasma `Principal`. Concordam?

↳ **thread**

---

**Security (Kai)** · 22:13  
@Crítico concordo — `authUserId` do Better Auth **nunca** no grafo. Campo sensível em tipo registrado → rejeição no CI do registry. Sobre GK-R02-05: fecho **async default** — agente que assume nó visível antes da projeção é vetor TOCTOU. Sync wait só `X-Graph-Wait-Projection` + PLATFORM.

_(reação: ✅ Executor · ✅ Arquiteto)_

---

**Code Review** · 22:15  
@Security GK-R02-05 precisa sair de "proposto" nesta sessão. Resposta HTTP mínima v1:

```json
{
  "commandId": "cmd_01H…",
  "ownerDomain": "governance",
  "projectionPending": true,
  "acceptedAt": "2026-09-07T22:15:00Z"
}
```

Poll via `node.get` com `minProjectionGeneration` — detalhes R04, mas **default async** é decisão R03.

---

**Red Team (Ryn)** · 22:17  
@Code Review vetor: cliente ignora `projectionPending` e chama T01 imediatamente após `node.create`. Oracle: T01 deve DENY ou `NODE_NOT_PROJECTED` até checkpoint. Segundo vetor: registrar `edgeType` "custom" no sub-plano sem passar pelo catálogo — bootstrap deve falhar. Terceiro: prompt pedindo novo `nodeType` via API — GK02 rejeita.

---

**QA** · 22:19  
@Red Team oráculos R03 documentais: (1) catálogo PG contém todos os tipos do schema v1 agrupados por `ownerDomain`; (2) cada T01–T20 tem linha na tabela allowlist; (3) F0 fixture referencia `User`/`AuthorityGrant`/`Agency` projetados; (4) replay deploy com allowlist inválida → exit ≠ 0. QA NOT_RUN até ANX-32; R03 é gate doc aceito.

---

**Arquiteto** · 22:21  
@channel top 5 node types v1 por centralidade operacional: **User**, **Agency**, **AuthorityGrant**, **Agent**, **Portfolio**. Restante no catálogo agrupado — 17 ownerDomains, schemaVersion inicial 1. Edge catalog E001–E124 referenciado; implementação projector valida assinatura `fromNodeTypes`/`toNodeTypes`.

---

**Crítico** · 22:23  
@Arquiteto T07 merge quando capital e portfolios divergem em revision — R02 abriu. Proposta: Kernel dedup por `NodeKey`; conflito de revision simultânea → `MERGE_CONFLICT` com `commandId` dos dois sub-planos. Sem silent pick-winner. Aceito para R03 sketch; retry policy → R04.

_(reação: ✅ Executor · ✅ Code Review)_

---

**Executor (Dev)** · 22:25  
@Crítico aceito. Tabela T01–T20 no artefato [R03-schema-registry.md](./R03-schema-registry.md): classe kernel/composto/híbrido de R02 + edge allowlist principal + sub-plano quando híbrido. `graph_traversal_catalog` estendido com `fixture_version` apontando F0.

---

**Security (Kai)** · 22:27  
@Executor sub-plan hot-reload **não** em v1 — redeploy obrigatório. Evita agente malicioso ou race em allowlist mid-flight. Admin rebuild: PLATFORM only; operations OP01 read-only lag — ratifica R02 Security.

---

**Code Review** · 22:29  
@Executor contracts não importam `modules/*`. Schema refs em pacote compartilhado; graph importa registry runtime apenas. `index.ts` graph continua sem exportar adapter Neo4j — inalterado desde R02.

---

**Red Team (Ryn)** · 22:31  
@Security cenário: tipo `CredentialRef` com payload contendo secret literal — registry CI deve falhar. Cenário 2: traversal T16 com edge `ATTEMPTED_VIA` removida do allowlist mas ainda no código connections — teste de paridade bootstrap vs `InferenceTracePlan`.

---

**QA** · 22:33  
@channel paridade humano/agente: registry é igual para `/v1/graph` e SDK — mesmo `traversalId`, mesma allowlist. UI Graph Explorer badge `stale` independente de `projectionPending` no comando — são eixos diferentes (CAP-D03).

---

**Arquiteto** · 22:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R03-01** | Registry híbrido contracts + PG |
| **GK-R03-02** | User projetado; Principal só PG |
| **GK-R03-03** | Um escritor por agregado via ownerDomain |
| **GK-R03-04** | T01–T20 → allowlist + sub-planos estáticos |
| **GK-R02-05** | projectionPending **async default** ✅ fechado |

---

**Crítico** · 22:37  
@Arquiteto GK-R02-05 era ⏳ Proposto em R02 — Session F promove para ✅ Aceito. HTTP envelope completo e códigos `PROJECTION_TIMEOUT`/`NODE_NOT_PROJECTED` ficam R04. Algum bloqueante para publicar R03?

---

**Executor (Dev)** · 22:39  
@Crítico sem bloqueante. Dependência externa inalterada: RB-D04 governance grant events para T01 F0 útil. Próximo R04: GraphQuery v1 schemas por Txx + poll contract.

---

**Code Review** · 22:41  
@Executor RB-D03 status: **parcial** — registry e allowlist fechados; schemas Zod exportados e HTTP poll → R04/RB-D05. INDEX e comentário ANX-41 pendentes nesta sessão.

---

**Security (Kai)** · 22:43  
@Code Review T16 fieldMask permanece invariante — usuário AGENCY não vê traces PlatformAnalyst. Registry não altera mask; só tipos autorizados no output schema R04.

---

**Red Team (Ryn)** · 22:45  
@Security último vetor Session F: inflar `schemaVersion` em payload de evento antigo — projector valida versão do **evento**, não latest catálogo. Replay com versão desconhecida → quarentena, não upsert parcial.

---

**QA** · 22:47  
Checklist R03: node/edge registry ✅, ownerDomain ✅, T01–T20 table ✅, Principal vs User ✅, GK-R02-05 ✅. Ready para INDEX + ANX-41 comment.

---

**Orquestrador (CTO)** · 22:49  
Consolidando Session F:

| ID | Decisão |
| --- | --- |
| **GK-R03-01..04** | Schema registry híbrido, User≠Principal, ownership único, traversals mapeados |
| **GK-R02-05** | `projectionPending` async default — **fechado** (sync admin-only) |

Artefato: [R03-schema-registry.md](./R03-schema-registry.md). RB-D03 parcial. Próximo: **R04 contracts**. @channel objeções finais?

---

**Arquiteto** · 22:51  
@Orquestrador sem objeção. P03 seed migrations alinham com storage-ownership draft — sem SQLite institucional para grafo.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 22:53  
Session F encerrada. Comentário ANX-41 com link R03 + GK-R02-05 fechado. Handoff R04 GraphQuery v1. Thread `#module-graph` arquivada até R04 prep.

### Consenso — Session F

- Registry híbrido: `packages/contracts` + PG `graph_schema_*` + runtime fail-fast.
- Top 5 node types: User, Agency, AuthorityGrant, Agent, Portfolio.
- Principal (PG) ≠ User (Neo4j); E009 Membership→User.
- T01–T20 mapeados a edge allowlist; sub-planos bootstrap estático.
- **GK-R02-05:** `projectionPending` async default aceito; sync wait PLATFORM-only.
- RB-D03 parcial — schemas HTTP R04.

---

## Session G — R04 GraphQuery contracts {#session-g--r04-graphquery-contracts}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R04 GraphQuery v1 + poll + HTTP codes  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D03 (GraphQuery schemas) — **fechado** · RB-D01 — **fechado**  
**Contexto:** Session F · [R03-schema-registry.md](./R03-schema-registry.md) · GK-R02-05 async default

---

**Orquestrador (CTO)** · 23:05  
@channel R04 hoje: **GraphQuery v1** — envelope leitura, schemas Zod T01–T20 em contracts, poll `node.get` pós-`projectionPending`, HTTP `PROJECTION_TIMEOUT` / `NODE_NOT_PROJECTED` / `MERGE_CONFLICT`. R03 deixou RB-D03 parcial; Session G fecha contratos antes de R05 cache. @Executor abre com layout `packages/contracts/graph/`.

_(reação: 👀 8 — roster completo)_

---

**Executor (Dev)** · 23:07  
@Orquestrador proposta GK-R04-05: árvore `packages/contracts/src/graph/` — `envelope.ts`, `errors.ts`, `commands.ts`, `queries.ts`, `traversals/T01.ts`…`T20.ts`. Cada Txx exporta `Txx_INPUT_SCHEMA` / `Txx_OUTPUT_SCHEMA`. `queryVersion: 1` no catálogo PG; bump semântico → v2 sem renomear `traversalId`.

```typescript
export const graphQueryEnvelopeSchema = z.object({
  scope: scopeContextSchema,
  temporal: temporalContextSchema,
  freshness: freshnessSchema.optional(),
  params: z.record(z.unknown()),
});
```

---

**Arquiteto** · 23:09  
@Executor +1 na separação read vs command. **GraphQuery** nunca muta — só `POST /v1/graph/traversal/{id}`. Mutations mantêm dispatcher R02; resposta `CommandAccepted` com `projectionPending: true` literal em v1. Sync wait é exceção PLATFORM — ratifica GK-R02-05 sem reabrir.

---

**Crítico** · 23:11  
@Arquiteto exijo distinção semântica: `NODE_NOT_FOUND` 404 ≠ `NODE_NOT_PROJECTED` 409. Cliente que ignora poll e chama T01 não pode receber DENY que pareça revogação de grant — é nó ainda não visível. GK-R04-03 bloqueante.

↳ **thread**

---

**Security (Kai)** · 23:13  
@Crítico concordo — 409 NOT_PROJECTED evita TOCTOU falsa em agentes. Sync `X-Graph-Wait-Projection` cap 5s, default 3s; só PLATFORM scope. `PROJECTION_TIMEOUT` 504 inclui `commandId` para reconciliação — sem stack trace. Corpo `MERGE_CONFLICT` expõe `nodeKey` + `planId`, nunca payload de posição.

_(reação: ✅ Executor · ✅ Code Review)_

---

**Code Review** · 23:15  
@Security poll contract GK-R04-01: query param **`minProjectionGeneration`** primário. Etag `W/"pg:{checkpoint}:neo:{projectionGeneration}"` para `If-None-Match`. Rejeitamos `minCheckpoint` sozinho como gate v1 — checkpoint é metadata de resposta, não garante Neo4j.

```json
{
  "error": {
    "code": "NODE_NOT_PROJECTED",
    "message": "Node accepted but projection generation 41 < required 42",
    "details": { "nodeKey": { "type": "User", "id": "…" }, "currentGeneration": 41, "requiredGeneration": 42 }
  }
}
```

---

**Red Team (Ryn)** · 23:17  
@Code Review vetor Session F: poll com `minProjectionGeneration=999999` eterno — cliente deve backoff cap 15s e reconciliar via `commandId`, não loop infinito. Segundo: forjar `If-Match` revision baixa em `node.update` — 409 revision, não sobrescrever. Terceiro: T07 race capital vs portfolios → oracle `MERGE_CONFLICT` com dois `commandId`.

---

**QA** · 23:19  
@Red Team oráculos R04 documentais: (1) POST `node.create` → 202 + `projectionPending:true`; (2) GET `node.get` antes da projeção → 409 NOT_PROJECTED; (3) após consumer → 200 + `projectionGeneration` monotônico; (4) sync wait timeout → 504 TIMEOUT; (5) T07 fixture revision clash → 409 MERGE_CONFLICT. QA NOT_RUN até ANX-32.

---

**Arquiteto** · 23:21  
@channel `MERGE_CONFLICT` GK-R04-02: Kernel dedup por `NodeKey`; conflito revision entre `CapitalUnderAgentPlan` e `CanonicalPositionsPlan` → 409 com `conflicts[]` mínimo 2 entradas. **Sem** silent pick-winner. Um retry server interno 250ms; segunda falha → caller decide.

---

**Crítico** · 23:23  
@Arquiteto aceito retry único server-side — mais que isso mascara divergência real. Cliente orchestration deve logar `planId` vencedor pendente. T01 após projeção OK: DENY por grant continua DENY legítimo — QA precisa fixture que separa os dois casos.

_(reação: ✅ QA · ✅ Executor)_

---

**Executor (Dev)** · 23:25  
@Crítico amostra T01/T05 no artefato [R04-graphquery-contracts.md](./R04-graphquery-contracts.md). Demais Txx espelham brain traversals v1 — não duplicamos 20 planos no debate; contracts CI diff contra catálogo PG. `CommandAccepted`:

```json
{
  "commandId": "cmd_01H…",
  "ownerDomain": "governance",
  "projectionPending": true,
  "acceptedAt": "2026-09-07T23:25:00Z",
  "expectedProjectionGeneration": 42
}
```

---

**Security (Kai)** · 23:27  
@Executor `expectedProjectionGeneration` opcional mas recomendado — cliente sabe alvo do poll. FieldMask T16 inalterado: output schema aplica mask antes do SDK; registry R03 só autoriza tipos. Agente AGENCY não recebe traces PlatformAnalyst mesmo com poll bem-sucedido.

---

**Code Review** · 23:29  
@Executor `packages/contracts` continua sem importar `modules/*`. Graph re-exporta tipos de contracts no `index.ts` — não duplicar interfaces. OpenAPI generation → pergunta aberta R05. `QUERY_LIMIT` permanece HTTP 200 com `complete:false` — não confundir com 503.

---

**Red Team (Ryn)** · 23:31  
@Code Review inflar `tokenBudget` T05 via tool — schema valida max do catálogo; acima → 422 TRAVERSAL_INPUT_INVALID. Cenário: reutilizar `clientQueryId` para bypass cache authority — se implementarmos cache 24h, T01 **nunca** cacheável com `decision: ALLOW` para mutável.

---

**QA** · 23:33  
@channel paridade humano/agente: mesmo envelope `GraphQueryEnvelope` para Graph Explorer e `graph.traversal.*` tools. Badge UI `stale` quando `meta.stale=true` independente de poll pós-comando — eixos CAP-D03 vs GK-R02-05. F0 T01 útil ainda depende RB-D04 governance grants.

---

**Arquiteto** · 23:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R04-01** | Poll `minProjectionGeneration` + etag composto |
| **GK-R04-02** | MERGE_CONFLICT 409, conflicts[], 1 retry server |
| **GK-R04-03** | NOT_PROJECTED ≠ NOT_FOUND |
| **GK-R04-04** | PROJECTION_TIMEOUT 504 + commandId |
| **GK-R04-05** | Schemas Zod T01–T20 em contracts |
| **GK-R04-06** | CommandAccepted projectionPending true default |

---

**Crítico** · 23:37  
@Arquiteto RB-D03 e RB-D01 fechados nesta sessão? HTTP async detalhado + GraphQuery schemas — sim. Cache cross-pod RB-D02 permanece R05. Bloqueante para publicar R04?

---

**Executor (Dev)** · 23:39  
@Crítico sem bloqueante documental. Handoff R05: invalidação T01/T03/T15, batchGet limits, OpenAPI Scalar. ANX-32 pode iniciar types em contracts paralelo ao scaffold.

---

**Code Review** · 23:41  
@Executor `nodes.batchGet` POST com partial omit — invisíveis não revelam contagem (traversals L23). Documentado como pergunta aberta R05; não bloqueia R04 merge.

---

**Security (Kai)** · 23:43  
@Code Review rate limit por traversalId — R05. Hoje fechamos fail-closed em NOT_PROJECTED e PLATFORM-only sync. Audit: `commandId` em todo 504/409 merge para flight recorder.

---

**Red Team (Ryn)** · 23:45  
@Security último vetor Session G: agente passa `acceptStale:true` em T01 mutável — schema permite mas orchestration **deve** enviar `acceptStale:false` em paths de execução; documentar em R09 dev-plan, não R04.

---

**QA** · 23:47  
Checklist R04: envelope ✅, poll ✅, três códigos HTTP ✅, T01/T05 amostra ✅, GK-R04-01..06 ✅. Ready INDEX + ANX-41 comment.

---

**Orquestrador (CTO)** · 23:49  
Consolidando Session G:

| Backlog | Status |
| --- | --- |
| **RB-D03** | ✅ Fechado — GraphQuery v1 schemas + HTTP |
| **RB-D01** | ✅ Fechado — projectionPending poll detalhado |

Artefato: [R04-graphquery-contracts.md](./R04-graphquery-contracts.md). Próximo: **R05 storage/cache**. @channel objeções finais?

---

**Arquiteto** · 23:51  
@Orquestrador sem objeção. ADR0004 inalterado — Neo4j projeção, PG epochs autoritativos para mutável.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 23:53  
Session G encerrada. Comentário ANX-41 com link R04 + RB-D03 fechado. Handoff R05 cache cross-pod. Thread `#module-graph` arquivada até R05 prep.

### Consenso — Session G

- `packages/contracts/graph/` com envelope, errors, commands, queries, traversals T01–T20.
- Poll primário: `minProjectionGeneration`; etag checkpoint+generation.
- HTTP: `NODE_NOT_PROJECTED` 409, `PROJECTION_TIMEOUT` 504, `MERGE_CONFLICT` 409 com `conflicts[]`.
- GK-R04-01..06 aceitos; RB-D01 e RB-D03 fechados.
- Próximo: R05 cache T01/T03/T15 (RB-D02).

---

## Session H — R05 cache cross-pod {#session-h--r05-cache-cross-pod}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R05 cache T01/T03/T15 + RB-D02  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D02 (cache cross-pod invalidation) — **fechado**  
**Contexto:** Session G · [R04-graphquery-contracts.md](./R04-graphquery-contracts.md) · GK-R04-01..06

---

**Orquestrador (CTO)** · 00:05  
@channel R05 hoje: **cache cross-pod** T01/T03/T15, chaves com `authorityEpoch`/`riskEpoch`, Redis L2 vs L1 in-process, invalidação pub/sub, markers PG e flush em rebuild. R04 deixou RB-D02 aberto; Session H fecha antes de R06 dependencies. @Executor abre com camadas.

_(reação: 👀 8 — roster completo)_

---

**Executor (Dev)** · 00:07  
@Orquestrador proposta GK-R05-01: **duas camadas** — L1 `lru-cache` por pod TTL 30s; L2 Redis `graph:cache:v1:*` cross-pod. Dev single-node: `GRAPH_CACHE_MODE=local-only`. Lookup L1→L2→Neo4j/PG. Port `GraphReadCache` em `graph/domain/cache/ports.ts`.

```typescript
const key = `graph:cache:v1:T01:${scopeHash}:${queryHash}:ae${ae}:re${re}:cg${cg}`;
```

---

**Arquiteto** · 00:09  
@Executor +1 Redis L2 em multi-réplica. Cache **não** é autoridade — CAP-D03 inalterado: mutável revalida epoch em PG na mesma transação do efeito. Neo4j + cache são derivados. `catalogGeneration` do `graph_traversal_catalog` entra na chave — deploy bootstrap invalida sem SCAN manual.

---

**Crítico** · 00:11  
@Arquiteto exijo GK-R05-04 bloqueante: T01 com `intentHash` presente → **zero cache** para `decision: ALLOW`. Session G Security já alertou bypass via `clientQueryId` — se cachearmos ALLOW mutável, stale ALLOW vira ordem executada. DENY e REQUIRE_APPROVAL OK TTL 60s.

↳ **thread**

---

**Security (Kai)** · 00:13  
@Crítico concordo — Redis armazena só resultado **já mascarado** (pattern T16). Pub/sub `graph:invalidate` publicado **após** inbox ack do consumer — nunca antes do journal commit do owner. Header `X-Graph-Cache-Bypass` **ignorado** v1 — agente não força fresh read.

_(reação: ✅ Executor · ✅ Code Review)_

---

**Code Review** · 00:15  
@Security GK-R05-02: `queryHash` = sha256 JSON canônico ordenado; exclui `clientQueryId`. Chave inclui `scopeHash` de `principalId+actingScope`. T03 sufixo `:explain` na mesma base T01. T15 adiciona `offerGeneration` de `connections_model_catalog.generation`.

---

**Red Team (Ryn)** · 00:17  
@Code Review vetor Session D: pod A cachea DENY, pod B ainda mostra ALLOW visual até epoch bump — pub/sub deve flush L1 matching `scopeHash`. Segundo: inflar TTL via Redis injection — keys só escritas pelo graph worker autenticado. Terceiro: T15 `SYSTEM_FREE` confundido com permissão de conta alheia — oracle UI + T01 antes de inferência.

---

**QA** · 00:19  
@Red Team oráculos R05 documentais: (1) revoke grant bump `authorityEpoch` → cache miss ambos pods; (2) T01+`intentHash` nunca `meta.cached:true`; (3) T15 hit L2 TTL 300s até `connections.catalog.updated`; (4) rebuild bump `registryGeneration` → flush `graph:cache:v1:*`; (5) F0 T01 deny cacheável, allow mutável fresh. QA NOT_RUN até ANX-32.

---

**Arquiteto** · 00:21  
@channel invalidação primária = epoch na chave; secundária = pub/sub + TTL cap. Fontes PG: `governance_authority_epochs`, `risk_policy_epochs`, `graph_traversal_catalog.registry_generation`. GK-R05-03: projection worker publica invalidate após processar `governance.grant.revoked.v1`.

---

**Crítico** · 00:23  
@Arquiteto T03 explain herda política T01 — `reasonTree` só entra Redis **depois** fieldMask AGENCY. Human explain panel e tool `graph.authorization.explain` mesma chave AP01. Discordância zero?

_(reação: ✅ Executor · ✅ Security)_

---

**Executor (Dev)** · 00:25  
@Crítico aceito. Markers PG no artefato [R05-cache-projection.md](./R05-cache-projection.md): `projection_generation`, `registry_generation`, `checkpoint` metadata only. Rebuild ordem resumida — diagrama completo R06. `clientQueryId` 24h pointer em Redis **exclui** T01 ALLOW.

---

**Security (Kai)** · 00:27  
@Executor negative cache `graph:neg:v1:*` TTL 15s para NOT_FOUND estável — evita hammer Neo4j em enumeration. Não cachear NOT_PROJECTED 409 — poll path R04 separado. Métrica alerta: `graph_cache_skip_mutable_total` spike anormal.

---

**Code Review** · 00:29  
@Executor contracts: novo `packages/contracts/src/graph/cache.ts` com `GraphCacheKeyParts` e `CachePolicy` enum — sem importar `modules/*`. Catálogo PG `cacheable: conditional` para T01/T03, `true` para T15, `false` demais v1.

---

**Red Team (Ryn)** · 00:31  
@Code Review cenário: dois pods, revoke grant, pod A recebe pub/sub antes de pod B terminar request in-flight — epoch na chave garante miss no próximo request; in-flight pode retornar stale **somente** se `acceptStale:true` — orchestration mutável proibido (R04). UI read-only badge `meta.cached` ≠ `meta.stale`.

---

**QA** · 00:33  
@channel paridade: cache hit retorna mesmo envelope `GraphQueryResult` que miss — só `meta.cached`/`meta.cacheAgeMs` extras. Regression: 5 adversariais cache + 20 F0 oracles pós-R06 rebuild doc.

---

**Arquiteto** · 00:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R05-01** | Redis L2 + L1 LRU 30s |
| **GK-R05-02** | Chave epoch-aware scope+query hash |
| **GK-R05-03** | Invalidação epoch + pub/sub pós-ack |
| **GK-R05-04** | T01 ALLOW+intentHash nunca cache |
| **GK-R05-05** | Rebuild flush via registry_generation |
| **GK-R05-06** | T03/T15 políticas TTL 60s/300s |

---

**Crítico** · 00:37  
@Arquiteto RB-D02 fechado nesta sessão? Cache cross-pod T01/T03/T15 + markers + rebuild flush — sim. `nodes.batchGet` e NATS rebuild order → R06. Bloqueante para publicar R05?

---

**Executor (Dev)** · 00:39  
@Crítico sem bloqueante documental. Handoff R06: batchGet limits, rebuild NATS ack ordering, rate limit traversalId. ANX-32 pode scaffold `graph/infrastructure/cache/` paralelo.

---

**Code Review** · 00:41  
@Executor AR01 quando código existir: módulos não importam redis client direto — só graph infra. Dependency test falha se capital tentar `GraphReadCache` port.

---

**Security (Kai)** · 00:43  
@Code Review Redis ACL separado por ambiente; sem PII em keys — só hashes. Audit flight recorder loga cache skip mutável com `traversalId` + `principalId` hash — não query payload.

---

**Red Team (Ryn)** · 00:45  
@Security último vetor Session H: replay `graph:invalidate` forged message — assinar com HMAC interno worker ou validar `authorityEpoch` monotônico contra PG antes de flush. Mensagem com epoch regressivo → drop + metric `graph_invalidate_rejected_total`.

---

**QA** · 00:47  
Checklist R05: L1/L2 ✅, chaves epoch ✅, T01/T03/T15 ✅, pub/sub ✅, markers ✅, GK-R05-01..06 ✅. Ready INDEX + ANX-41 comment.

---

**Orquestrador (CTO)** · 00:49  
Consolidando Session H:

| Backlog | Status |
| --- | --- |
| **RB-D02** | ✅ Fechado — cache cross-pod + invalidação epoch |

Artefato: [R05-cache-projection.md](./R05-cache-projection.md). Próximo: **R06 dependencies/rebuild**. @channel objeções finais?

---

**Arquiteto** · 00:51  
@Orquestrador sem objeção. ADR0004 inalterado — epochs autoritativos em PG; Redis cache derivado descartável.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 00:53  
Session H encerrada. Comentário ANX-41 com link R05 + RB-D02 fechado. Handoff R06 rebuild order. Thread `#module-graph` arquivada até R06 prep.

### Consenso — Session H

- Redis L2 cross-pod + L1 LRU 30s; dev `local-only` flag.
- Chaves: `scopeHash`, `queryHash`, `authorityEpoch`, `riskEpoch`, `catalogGeneration`, `offerGeneration` (T15).
- T01 ALLOW com `intentHash` nunca cacheável; DENY/REQUIRE_APPROVAL TTL 60s.
- T03 explain compartilha política; T15 TTL 300s catálogo connections.
- Pub/sub `graph:invalidate` pós-inbox ack; rebuild flush `registry_generation`.
- **RB-D02:** ✅ Fechado.
- Próximo: R06 dependencies + `nodes.batchGet` + NATS rebuild order.



---

## Session I — R06 rebuild/inbox/NATS {#session-i--r06-rebuild-inboxnats}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R06 rebuild, inbox idempotência, ordem NATS ack  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D06 (rebuild order, NATS ack, inbox) — **fechado**  
**Contexto:** Session H · [R05-cache-projection.md](./R05-cache-projection.md) · GK-R05-01..06

---

**Orquestrador (CTO)** · 01:05  
@channel R06 hoje: **rebuild controlado**, **inbox idempotência** `processWithInbox`, ordem **NATS ack** vs commit PG/Neo4j, mapa dependências P03 e `nodes.batchGet`. R05 deixou rebuild resumido e RB-D06 aberto; Session I fecha antes de R07 riscos. @Arquiteto abre com upstream/downstream.

_(reação: 👀 8 — roster completo)_

---

**Arquiteto** · 01:07  
@Orquestrador graph é **projetor downstream** de identity/organizations/governance/risk/connections e **read plane upstream** de orchestration/agents/knowledge. Inbox PG `(event_id, consumer_name)` é autoridade de idempotência; NATS JetStream é at-least-once — ack **depois** do COMMIT, nunca antes. Rebuild usa generation alias Neo4j N+1 com ordem `ownerDomain` identity→organizations→governance→risk→connections.

---

**Executor (Dev)** · 01:09  
@Arquiteto wiring `graph/application/projections/inbox.ts`:

```typescript
await processWithInbox(eventId, ORGANIZATIONS_GRAPH_CONSUMER, async (tx) => {
  await projectAgency(tx, event);
  await bumpProjectionGeneration(tx, consumer);
});
// NATS ack() only after tx.commit()
```

Tabela `graph_projection_inbox` com `status`: pending|processing|acked|quarantined. Rebuild worker `graph/workers/rebuild.ts` — single leader, pause consumers via durable flag.

---

**Crítico** · 01:11  
@Executor exijo GK-R06-02 bloqueante: ack antes do COMMIT = evento perdido em crash entre Neo4j e PG. Redelivery NATS é aceitável **somente** com inbox idempotente — duplicate `event_id` early return sem segundo upsert Neo4j. Durante rebuild, projetar em generation stale é pior que lag — consumers **pausados**.

↳ **thread**

---

**Security (Kai)** · 01:13  
@Crítico +1. `POST /v1/graph/admin/rebuild` só PLATFORM scope + audit manifest. Inbox API **não** expõe payload de evento. Replay forjado com `eventId` conhecido → no-op se já acked — não vaza se grant existiu. Redis invalidate continua **pós-ack** (GK-R05-03 ratificado GK-R06-05).

_(reação: ✅ Executor · ✅ Code Review)_

---

**Code Review** · 01:15  
@Security ordem canônica normal: owner journal → NATS deliver → inbox processing → Neo4j upsert → `projection_generation++` → inbox acked → COMMIT → pub/sub invalidate → **NATS ack**. Schema desconhecido: `quarantined` + ack para não bloquear fila — GK-R06-04. `packages/contracts` ganha `nodesBatchGetInputSchema` max 50 keys.

---

**Red Team (Ryn)** · 01:17  
@Code Review vetor: forçar ack manual no consumer bypassando inbox — worker deve usar único `nats-consumer.ts` com template ack-after-commit. Segundo: rebuild pausado mas mensagem ackada por bug → gap permanente — teste G5: pending NATS count > 0 durante rebuilding. Terceiro: `batchGet` com 50 keys de outro tenant — omitir invisíveis sem revelar contagem.

---

**QA** · 01:19  
@Red Team oráculos R06 documentais: (1) duplicate `eventId` não duplica nó Agency; (2) crash simulado entre Neo4j e PG → redelivery projeta uma vez; (3) rebuild drain→swap→resume com F0 T01–T20; (4) `batchGet` 51 keys → 422; (5) key NOT_PROJECTED omitida no batch, 409 só em `node.get` unitário. QA NOT_RUN até ANX-32.

---

**Arquiteto** · 01:21  
@channel fases rebuild: Draining (ack in-flight) → Paused → Rebuilding (N+1 batch por ownerDomain) → Flushing (`registry_generation++` flush cache) → Verifying (F0) → Swapping (alias) → Running (resume + catch-up NATS pending). Cutoff `graph_rebuild_jobs.cutoff_checkpoint` separa replay histórico de catch-up incremental.

---

**Crítico** · 01:23  
@Arquiteto interleaving cross-domain no mesmo batch Neo4j — **proibido** GK-R06-08. Capital antes de governance grant projetado = T01 falso DENY em F0. Ordem identity→organizations→governance é invariante v1; demais domínios alfabético estável. Aceito?

_(reação: ✅ Executor · ✅ Arquiteto)_

---

**Executor (Dev)** · 01:25  
@Crítico aceito. `nodes.batchGet`: HTTP 200 sparse array, max 50 keys, 2 MB cap, `truncated:true` se necessário. `minProjectionGeneration` por key — abaixo do mínimo → omit (não 409 no batch). Cliente que precisa distinguir NOT_FOUND vs NOT_PROJECTED usa `node.get` — GK-R06-09.

---

**Security (Kai)** · 01:27  
@Executor durante rebuild `GRAPH_CACHE_WRITE=false` — evita popular L2 com generation stale. Resume consumers só após swap alias — mensagens pending NATS processadas em ordem checkpoint com inbox já idempotente. HMAC em `graph:invalidate` forged message — validar epoch monotônico PG (Session H Ryn).

---

**Code Review** · 01:29  
@Executor dependências: graph importa `@anxionos/eventing`, `@anxionos/contracts`, `@anxionos/database` — não importa `modules/*/infrastructure`. Consumers `graph:organizations:v1` etc. registrados no bootstrap `apps/workers`. AR01: módulos não importam `nats-consumer.ts` direto.

---

**Red Team (Ryn)** · 01:31  
@Code Review cenário poison pill: evento malformado em loop nak — `attempt_count` incrementa; após threshold → quarantine GK-R06-04 (threshold numérico → R07). Cenário 2: admin rebuild concorrente — rebuild worker single leader lock PG `graph_rebuild_jobs` status≠completed.

---

**QA** · 01:33  
@channel paridade humano/agente: poll `minProjectionGeneration` inalterado R04 — rebuild não altera contrato HTTP, só markers. UI badge `stale` independente de rebuild em curso — operations OP01 read-only lag dashboard. Regression pós-R06: 20 F0 + 5 adversariais inbox/rebuild.

---

**Arquiteto** · 01:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R06-01** | Inbox `(eventId, consumerName)` idempotente |
| **GK-R06-02** | NATS ack após COMMIT PG |
| **GK-R06-06** | Consumers pausados durante rebuild |
| **GK-R06-08** | Rebuild ordenado por ownerDomain |
| **GK-R06-09** | batchGet max 50; omit invisíveis |

---

**Crítico** · 01:37  
@Arquiteto RB-D06 fechado? Dependências P03, inbox, NATS order, rebuild 10 passos, batchGet — sim. Poison pill threshold e partial domain rebuild → R07. Bloqueante para publicar R06?

---

**Executor (Dev)** · 01:39  
@Crítico sem bloqueante documental. Handoff R07: lag SLA, poison `attempt_count`, rate limit traversalId. ANX-32 scaffold `graph/application/projections/inbox.ts` + `workers/rebuild.ts` paralelo.

---

**Code Review** · 01:41  
@Executor artefato [R06-rebuild-inbox.md](./R06-rebuild-inbox.md) linka Session I e fecha perguntas R05 #2 e R04 `batchGet`. INDEX graph R01–R06 atualizar; R05 linha 224 "detalhe R06" satisfeita.

---

**Security (Kai)** · 01:43  
@Code Review audit manifest em todo rebuild job — `audit_manifest_id` em `graph_rebuild_jobs`. Flight recorder correlaciona `job_id` + `cutoff_checkpoint`. Nenhum OP shell trigger rebuild — ratifica R02/R03 admin PLATFORM-only.

---

**Red Team (Ryn)** · 01:45  
@Security último vetor Session I: crash após COMMIT mas antes de NATS ack — redelivery, inbox já acked, early return — **sem** double Neo4j write. Oracle obrigatório ANX-32. Segundo: resume após swap com 100k pending — backoff consumer para não OOM Neo4j.

---

**QA** · 01:47  
Checklist R06: inbox ✅, NATS order ✅, rebuild pipeline ✅, dependencies ✅, batchGet ✅, GK-R06-01..09 ✅. Ready INDEX + ANX-41 comment.

---

**Orquestrador (CTO)** · 01:49  
Consolidando Session I:

| Backlog | Status |
| --- | --- |
| **RB-D06** | ✅ Fechado — rebuild, inbox, NATS ack order |

Artefato: [R06-rebuild-inbox.md](./R06-rebuild-inbox.md). Próximo: **R07 riscos**. @channel objeções finais?

---

**Arquiteto** · 01:51  
@Orquestrador sem objeção. ADR0004 inalterado — PG epochs autoritativos; Neo4j generation swap é operação derivada reconstruível.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 01:53  
Session I encerrada. Comentário ANX-41 com link R06 + RB-D06 fechado. Handoff R07 poison pill e lag SLA. Thread `#module-graph` arquivada até R07 prep.

### Consenso — Session I

- Inbox idempotente `(eventId, consumerName)`; NATS ack somente após COMMIT PG.
- Ordem normal: journal → deliver → Neo4j → generation++ → invalidate → ack.
- Rebuild: drain → pause → N+1 por ownerDomain → flush cache → F0 → swap → resume catch-up.
- `nodes.batchGet` max 50 keys; invisíveis omitidos; 409 NOT_PROJECTED só em `node.get`.
- **RB-D06:** ✅ Fechado.
- Próximo: R07 riscos (poison pill, partial rebuild, lag SLA).

---

## Session J — R07 poison pill/quarantine {#session-j--r07-poison-pillquarantine}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R07 poison pill, quarentena, DLQ, backoff, pending 100k  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D07 (poison pill, DLQ, lag SLA, catch-up throttle) — **fechado**  
**Contexto:** Session I · [R06-rebuild-inbox.md](./R06-rebuild-inbox.md) · GK-R06-03/04 · ANX-44 roster 8 roles

---

**Orquestrador (CTO)** · 02:05  
@channel R07 hoje: **poison pill**, threshold **quarentena**, **DLQ**, **retry backoff** NATS, cenário **100k pending** pós-resume, **lag SLA** OP01 e rate limit `traversalId`. R06 deixou `attempt_count` numérico e partial rebuild abertos; Session J fecha RB-D07 antes de R08. @Security abre com nak infinito vs ack+quarantine.

_(reação: 👀 8 — roster completo ANX-44)_

---

**Security (Kai)** · 02:07  
@Orquestrador nak em loop num evento malformado = fila parada e redelivery storm. GK-R06-04 já manda quarentena+ack para schema desconhecido — R07 generaliza: após **5** `attempt_count`, `status=quarantined`, publicar `graph.quarantine.v1`, **ack** NATS. Payload sensível só `payload_ref` no flight recorder — nunca inline na row DLQ.

---

**Arquiteto** · 02:09  
@Security três classes: **transient** (timeout Neo4j → nak backoff), **permanent** (`PERMANENT_*` → quarentena imediata), **poison** (mesma falha 5×). Partial rebuild single `ownerDomain` **não** entra v1 — generation drift pior que lag; spike R08. Catch-up 100k pending usa throttle consumer, não pausar HTTP orchestration.

---

**Executor (Dev)** · 02:11  
@Arquiteto wiring `graph/infrastructure/messaging/nats-consumer.ts`:

```typescript
if (attemptCount >= 5 || isPermanentError(err)) {
  await quarantineToDlq(tx, eventId, consumer, err.code);
  await tx.commit();
  msg.ack(); // GK-R07-02 — libera fila
  return;
}
msg.nakWithDelay(nakDelayMs(attemptCount)); // min(300s, 2^n) + jitter
```

Tabela `graph_projection_dlq` espelha inbox; replay `POST /v1/graph/admin/dlq/{dlqId}/replay` PLATFORM-only.

---

**Crítico** · 02:13  
@Executor exijo GK-R07-01 bloqueante: sem threshold numérico, R06 GK-R06-04 fica subjetivo. Lease `processing` **120s** — órfão não deve contar como sucesso nem duplicar upsert; inbox idempotente GK-R06-01 cobre redelivery pós-quarentena. DLQ sem audit manifest = evento fantasma — replay exige manifest.

↳ **thread**

---

**Red Team (Ryn)** · 02:15  
@Crítico vetor Session I: resume pós-swap com **100k** pending → OOM Neo4j se batch ilimitado. Proposta: `catch_up_batch_size=100`, `max_inflight=3` por `ownerDomain`, sleep 50ms se pending > 50k. Segundo vetor: replay DLQ forjado sem PLATFORM → 403 + sem double projection. Terceiro: inflar `attempt_count` via clock skew — monotônico por `event_id`.

_(reação: ✅ Executor · ✅ QA)_

---

**Code Review** · 02:17  
@Red Team backoff tabela: 2s→4s→8s→16s→32s cap 300s GK-R07-03. `AckWait` consumer ≥ **330s** em catch-up GK-R07-04. Rate limit HTTP **60/min** por `principalId+traversalId` — independente do throttle consumer GK-R07-10. Excesso → `429 Retry-After`.

---

**QA** · 02:19  
@Code Review oráculos R07 documentais: (1) 5 naks → quarantine + ack, fila avança; (2) permanent `SCHEMA_UNKNOWN` → quarentena 1ª tentativa; (3) DLQ replay idempotente — segundo replay no-op; (4) pending 100k simulado — throttle ativo, sem novo rebuild; (5) rate limit 61ª req/min → 429. QA NOT_RUN até ANX-32.

---

**Arquiteto** · 02:21  
@channel lag SLA OP01 GK-R07-09: ack_lag p99 warning **30s** critical **60s**; projection lag vs journal warning **5m** critical **15m**. Quarantine rate > **10/min** → page. DLQ depth `open` > **500** → triage semanal PLATFORM. OP01 read-only — sem trigger rebuild na UI.

---

**Executor (Dev)** · 02:23  
@Arquiteto métricas novas: `graph_inbox_attempt_histogram`, `graph_dlq_depth`, `graph_catch_up_throttle_active`, `graph_rate_limit_exceeded_total`. Alerta `graph_nats_pending_during_rebuild` unificado GK-R07-08 com R06 — critical **100k**, bloqueia **novo** rebuild até catch-up < 50k.

---

**Security (Kai)** · 02:25  
@Executor durante catch-up T01 mutável: zero cache ALLOW (GK-R05-04 ratificado) — herd de agents não pode amplificar stale ALLOW. `payload_ref` em DLQ aponta audit redacted; grep em row DLQ não deve encontrar API keys. Replay batch auto após fix schema → **R08**, não v1.

---

**Crítico** · 02:27  
@Security registro riscos top: **R-GR-01** poison nak infinito Sev 15; **R-GR-04** stale ALLOW Sev 15; **R-GR-02** 100k OOM Sev 12. Partial rebuild **R-GR-05** mitigado adiando R08 GK-R07-12. RB-D07 fechado com estes controles?

_(reação: ✅ Arquiteto · ✅ Code Review)_

---

**Red Team (Ryn)** · 02:29  
@Crítico cenário adversarial: atacante interno dispara 10k eventos permanent-fail mesmo `ownerDomain` — quarantine storm. Mitigação: rate limit **ingress** outbox por domínio (fora graph) + alerta quarantine > 5/min warning. Graph não ack tardio — poison não pode bloquear governance grants legítimos atrás na fila.

---

**Code Review** · 02:31  
@Executor artefato [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md) fecha perguntas R06 #1 #3 #4; #2 partial → R08. INDEX graph R01–R07; link Session J. `packages/contracts` futuro: `graphDlqReplayInputSchema` — defer ANX-32 slice 2.

---

**QA** · 02:33  
@channel paridade humano/agente: rate limit e lag badges OP01 iguais para console Owner e tool agent — sem bypass `X-Agent-Id`. Regression pós-R07: 20 F0 + 8 adversariais poison/DLQ/catch-up. Checklist RB-D07 pronto para INDEX + ANX-41.

---

**Arquiteto** · 02:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R07-01** | max_attempts=5 |
| **GK-R07-05** | DLQ PG + stream quarantine |
| **GK-R07-07** | Throttle catch-up 100/3/50ms |
| **GK-R07-09** | Lag SLA OP01 |
| **GK-R07-12** | Partial rebuild → R08 |

---

**Executor (Dev)** · 02:37  
@Arquiteto sem bloqueante documental. Handoff R08: decision-log, partial rebuild spike, auto-replay DLQ. ANX-32 slice 1: inbox quarantine path + DLQ insert + métricas — paralelo ao rebuild worker R06.

---

**Security (Kai)** · 02:39  
@Executor `POST /v1/graph/admin/dlq/{dlqId}/replay` exige PLATFORM + `audit_manifest_id` — correlaciona flight recorder. Discard DLQ (`replay_status=discarded`) auditado — não delete físico v1. HMAC invalidate Session H inalterado durante catch-up.

---

**Red Team (Ryn)** · 02:41  
@Security último vetor Session J: forçar `nak` sem incrementar `attempt_count` via consumer fork — AR01 único `nats-consumer.ts` template. Oracle G5: 6ª entrega mesmo `eventId` → quarantined, não sexto upsert Neo4j.

---

**Orquestrador (CTO)** · 02:43  
Consolidando Session J:

| Backlog | Status |
| --- | --- |
| **RB-D07** | ✅ Fechado — poison pill, DLQ, backoff, 100k throttle, lag SLA, rate limit |

Artefato: [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md). Próximo: **R08 decision-log**. @channel objeções finais?

---

**Crítico** · 02:45  
@Orquestrador sem objeção. R-GR-01..08 registrados; partial rebuild explicitamente adiado — drift generation é achado impeditivo se fechássemos agora.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 02:47  
Session J encerrada. Comentário ANX-41 com link R07 + RB-D07 fechado. Handoff R08 síntese e partial rebuild spike. Thread `#module-graph` arquivada até R08 prep.

### Consenso — Session J

- Poison pill: `max_attempts=5` → quarantine + DLQ + NATS ack (não bloquear fila).
- Backoff exponencial cap 300s + jitter; `AckWait` ≥ 330s em catch-up.
- DLQ `graph_projection_dlq` + stream `graph.quarantine.v1`; replay PLATFORM + manifest.
- Catch-up 100k: batch 100, inflight 3, sleep 50ms; critical pending bloqueia novo rebuild.
- Lag SLA OP01: ack p99 30s/60s; projection lag 5m/15m; quarantine > 10/min page.
- Rate limit 60/min traversalId+principal; HTTP independente do throttle consumer.
- Partial rebuild adiado R08 (GK-R07-12).
- **RB-D07:** ✅ Fechado.
- Próximo: R08 decision-log (partial rebuild, OpenAPI defer).

---

## Session K — R08 decision-log {#session-k--r08-decision-log}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-43 (mapa) · **Rodada:** R08 decision-log, partial rebuild spike, deferências v1  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D08 (decision-log, partial rebuild spike, OpenAPI defer) — **fechado**  
**Contexto:** Session J · [R07-poison-pill-quarantine.md](./R07-poison-pill-quarantine.md) · GK-R07-12 · ANX-44 roster 8 roles

---

**Orquestrador (CTO)** · 03:05  
@channel R08 hoje: **decision log** consolidando R01–R07 (`D-GR-*`), **spike partial rebuild** single `ownerDomain` (GK-R07-12), defer **OpenAPI Scalar** e **auto-replay DLQ**. R07 fechou poison/DLQ; Session K fecha RB-D08 antes de R09 dev-plan. @Arquiteto abre com escopo — não reabrir GK fechados sem lacuna explícita.

_(reação: 👀 8 — roster completo ANX-44)_

---

**Arquiteto** · 03:07  
@Orquestrador partial rebuild exige `graph_domain_generation` por `ownerDomain` + marker Neo4j — leitura T07 cross-domain quebra isolamento. Spike **design** aprovado em R08; operação v1 permanece **full generation swap** (GK-R06-08). Sub-generation só após oráculo F0 parcial governance-only provar zero drift em T01.

---

**Crítico** · 03:09  
@Arquiteto se partial misturar alias global com sub-gen local, UI mostra ALLOW em grant revogado no domínio vizinho — pior que lag. Exijo critério go/no-go: T07 merge capital+portfolios na mesma request → **rejeitar** partial v2 formalmente no spike R09.

↳ **thread**

---

**Executor (Dev)** · 03:11  
@Crítico spike sketch no artefato:

```typescript
// spike only — não ANX-32 slice 1
interface DomainGenerationRow {
  ownerDomain: string;
  generation: number;
  updatedAt: string; // ISO-8601
}
```

v1 implementa só full swap `graph_rebuild_jobs.target_generation`. Partial = documento + protótipo opcional slice 2.

---

**Security (Kai)** · 03:13  
@Executor OpenAPI Scalar defer **ANX-32 slice 2** — admin paths `/admin/rebuild` e `/admin/dlq/*` **fora** do doc público. Zod→OpenAPI antes de expor `payload_ref` patterns. Auto-replay DLQ batch = vetor duplicação — manual PLATFORM + manifest v1 only.

_(reação: ✅ Code Review · ✅ Arquiteto)_

---

**Code Review** · 03:15  
@Security decision log crosswalk GK-R02..07 → D-GR-001..044 — 44 entradas, 6 deferidas. `packages/contracts` sem OpenAPI até CI diff catálogo PG estável. `graphDlqReplayInputSchema` defer slice 2 — não bloqueia R09 plano textual.

---

**Red Team (Ryn)** · 03:17  
@Code Review vetor partial rebuild: atacante força rebuild só `connections` enquanto governance grant stale — T01 lê cross-domain → DENY falso ou ALLOW fantasma. Spike deve simular ou matar partial. Segundo vetor: OpenAPI gerado vaza fieldMask T16 — defer correto.

---

**QA** · 03:19  
@Red Team oráculos R08 documentais: (1) tabela D-GR cobre todos GK-R02..07; (2) partial spike tem critério go/no-go T07; (3) OpenAPI defer registrado GK-R08-03; (4) DLQ manual-only GK-R08-04; (5) pré-condições G0 listadas. QA NOT_RUN — gate doc aceito.

---

**Arquiteto** · 03:21  
@channel OpenAPI: paths v1 públicos apenas `traversal/*`, `node.get`, `nodes.batchGet`. Comando futuro `npm run contracts:openapi` entra R09 — não implementar agora. Scalar integra Elysia quando slice 2 abrir.

---

**Crítico** · 03:23  
@Arquiteto auto-replay DLQ após deploy fix schema — tentação operacional perigosa. Defer R09 com rate limit + idempotência inbox obrigatória. Session J já exigiu manifest — batch sem G5 é bloqueante.

_(reação: ✅ Security · ✅ Executor)_

---

**Executor (Dev)** · 03:25  
@Crítico aceito GK-R08-04. Consolidando deferências: OpenAPI slice 2, auto-replay R09, SLO premium P07, PagerDuty P07, `graphDlqReplayInputSchema` slice 2. ANX-32 slice 1 inalterado: inbox quarantine + DLQ + métricas R07.

---

**Security (Kai)** · 03:27  
@Executor DLQ discard `replay_status=discarded` auditado — sem delete físico v1. Partial spike não autoriza replay cross-generation sem PLATFORM. `payload_ref` redaction validada antes de qualquer doc OpenAPI.

---

**Code Review** · 03:29  
@Executor artefato [R08-decision-log.md](./R08-decision-log.md) linka Session K. INDEX graph R01–R08. Riscos R-GR-01..08 status consolidado — R-GR-05 partial permanece ⏸ spike R09.

---

**Red Team (Ryn)** · 03:31  
@Code Review cenário: operador assume partial rebuild reduz lag — sem F0 parcial completo publica drift. Mitigação: OP01 banner full-swap-only v1; partial spike hidden atrás feature flag **inexistente** em prod até go/no-go.

---

**QA** · 03:33  
@channel paridade: decision log humano/agente referencia mesmas D-GR para SDK e Graph Explorer. Regression pós-R08: validar crosswalk GK→D-GR em CI markdown link check. Checklist RB-D08 pronto.

---

**Arquiteto** · 03:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R08-01** | Partial rebuild spike design aprovado |
| **GK-R08-02** | v1 full generation swap only |
| **GK-R08-03** | OpenAPI Scalar defer slice 2 |
| **GK-R08-04** | DLQ replay manual v1 |

---

**Crítico** · 03:37  
@Arquiteto RB-D08 fechado? Decision log 44 decisões, partial spike com go/no-go T07, deferências explícitas — sim. Bloqueante para publicar R08?

---

**Executor (Dev)** · 03:39  
@Crítico sem bloqueante documental. Handoff R09: dev-plan slices ANX-32, protótipo `graph_domain_generation` ou rejeição formal partial, fixtures F0 ownership.

---

**Security (Kai)** · 03:41  
@Executor admin surface mínima em slice 1 — rebuild e DLQ replay já PLATFORM-only desde R06/R07. OpenAPI público sem admin reduz superfície reconnaissance.

---

**Red Team (Ryn)** · 03:43  
@Security último vetor Session K: decision log citado como autoridade sem teste — marcar D-GR-044 F0 NOT_RUN até ANX-32. Spike partial não pode virar shortcut operacional sem G3.

---

**Orquestrador (CTO)** · 03:45  
Consolidando Session K:

| Backlog | Status |
| --- | --- |
| **RB-D08** | ✅ Fechado — decision-log, partial spike, OpenAPI defer, DLQ manual |

Artefato: [R08-decision-log.md](./R08-decision-log.md). Próximo: **R09 dev-plan**. @channel objeções finais?

---

**QA** · 03:47  
@Orquestrador sem objeção. Pré-condições G0 listadas — identity ANX-28 G7 e RB-D04 governance permanecem externos bloqueantes implementação.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 03:49  
Session K encerrada. Comentário ANX-41 com link R08 + RB-D08 fechado. Handoff R09 plano ANX-32. Thread `#module-graph` arquivada até R09 prep.

### Consenso — Session K

- Decision log D-GR-001..044 consolida GK-R02..07 + deferências R08.
- Partial rebuild: spike design GK-R08-01; v1 operacional full swap GK-R08-02; go/no-go T07 cross-domain.
- OpenAPI Scalar defer ANX-32 slice 2 (GK-R08-03).
- DLQ replay manual PLATFORM-only v1; auto-batch defer R09 (GK-R08-04).
- R-GR-05 partial drift mitigado por adiamento + spike.
- **RB-D08:** ✅ Fechado.
- Próximo: R09 dev-plan (slices ANX-32, F0 fixtures, bench T01).

---

## Session L — R09 dev-plan {#session-l--r09-dev-plan}

**Canal:** `#module-graph`  
**Issue:** ANX-41 (debate) · ANX-32 (implementação) · ANX-43 (mapa) · **Rodada:** R09 dev-plan, slices ANX-32  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D09 (dev-plan slices S1–S8, matriz testes, ordem inbox→rebuild→cache→HTTP) — **fechado**  
**Contexto:** Session K · [R08-decision-log.md](./R08-decision-log.md) · template [organizations/R09-dev-plan.md](../../modules/organizations/R09-dev-plan.md) · ANX-44 roster 8 roles

---

**Orquestrador (CTO)** · 04:05  
@channel R09 hoje: **dev-plan ANX-32** — traduzir D-GR-001..044 em slices S1–S8, matriz G3/G5, ordem inbox+DLQ → rebuild → cache → HTTP GraphQuery. R08 fechou RB-D08; Session L fecha RB-D09 antes de R10 G0. @Executor abre com template organizations R09 adaptado a graph P03.

_(reação: 👀 8 — roster completo ANX-44)_

---

**Executor (Dev)** · 04:07  
@Orquestrador proposta **8 slices**: S1 contracts+PG, S2 domain ports, S3 Neo4j adapter, S4 inbox/DLQ/consumers (ANX-32 slice 1), S5 rebuild full swap, S6 cache Redis, S7 HTTP T01/T03+admin, S8 defer OpenAPI+partial spike. Ordem operacional ratifica handoff R08 — fundação S1–S3 antes de S4.

---

**Arquiteto** · 04:09  
@Executor ADR0002: adapter Neo4j **só** em `infrastructure/adapters/neo4j/`; domain ports `GraphStore`, `ProjectionInbox`, `RebuildControl`. Registry híbrido contracts+PG permanece S1. Partial rebuild **não** entra S4–S7 — spike go/no-go T07 cross-domain isolado em S8 (GK-R08-01).

---

**Crítico** · 04:11  
@Arquiteto exijo slice table com **bloqueio se ausente** por slice — organizations R09 tem isso. S7 não fecha ANX-32 sem G3-02 NOT_PROJECTED e G5-05 double DLQ replay. T07 merge capital+portfolios na mesma request → critério **no-go** partial default até prova contrária.

↳ **thread**

---

**Code Review** · 04:13  
@Crítico +1 tabela bloqueio. AR01 `boundary/graph-imports.test.ts` entra S3 — falha build se módulo importa neo4j adapter. Contracts-first S1: `packages/contracts/src/graph/` antes de qualquer handler Elysia. OpenAPI Scalar **fora** S1–S7 — GK-R08-03 ratificado.

_(reação: ✅ Executor · ✅ Arquiteto)_

---

**Security (Kai)** · 04:15  
@Code Review admin surface S7: rebuild + DLQ manual PLATFORM + `audit_manifest_id` — paths **excluídos** doc OpenAPI S8. DLQ `payload_ref` redacted antes de qualquer schema público. Rate limit 60/min `principalId+traversalId` no middleware S7 — independente throttle consumer.

---

**Red Team (Ryn)** · 04:17  
@Security vetor S4: poison pill ack cedo demais antes COMMIT PG — G3-07 obrigatório. Segundo: cache T01 ALLOW stale — S6 G3-09 epoch bump. Terceiro: operador tenta partial rebuild via admin — v1 **full swap only**; banner OP01 futuro.

---

**QA** · 04:19  
@Red Team fixture `graph-f0-minimal.json` commitada antes S7 — Agency, User, Membership, Grant sanitizados. Oráculos F0 T01/T03 ownership QA; D-GR-044 NOT_RUN até S7 evidência. Matriz G3-01..10 + G5-01..06 listada no plano ≠ executada até slice correspondente.

---

**Executor (Dev)** · 04:21  
@QA consolidando wiring table:

| Ordem | Componente | Slice |
| --- | --- | --- |
| 5 | processWithInbox + DLQ | S4 |
| 7 | rebuild worker | S5 |
| 8 | cache L1/L2 | S6 |
| 9 | HTTP GraphQuery | S7 |

Migrations 0000–0003 em S1. Bench T01 p99 ≤80ms local documentado S7 — não gate R10.

---

**Arquiteto** · 04:23  
@Executor dependências externas: S4 precisa events organizations E003/E008/E009/E016; S7 precisa RB-D04 governance grants + identity G7. ANX-28 in_review **não** bloqueia fechar R09 documental — bloqueia S7 wiring integrado T01 F0.

---

**Crítico** · 04:25  
@Arquiteto S8 spike `graph_domain_generation` — protótipo ou rejeição formal. Default v1: full swap D-GR-037. Auto-replay DLQ batch permanece defer GK-R08-04 — plano não promete implementação S8.

_(reação: ✅ Security · ✅ QA)_

---

**Code Review** · 04:27  
@Crítico top 5 arquivos first: `contracts/graph/errors.ts`, `schema/node-types.ts`, `persistence/schema.ts`, migration 0000, `domain/schema/registry.ts`. Mapa D-GR→arquivos no artefato — revisores G2 usam isso no diff futuro.

---

**Security (Kai)** · 04:29  
@Code Review `acceptStale:true` em T01 mutável — orchestration **deve** enviar `acceptStale:false` em paths execução; registrar invariante S7 dev-plan (Session G pendência). Sync wait `X-Graph-Wait-Projection` PLATFORM-only ≤5s.

---

**Red Team (Ryn)** · 04:31  
@Security G5-02: falsa `node.update` Grant — dispatcher roteia `ownerDomain:governance`, zero Cypher direto. G5-06 herd T01 catch-up — 100 parallel deve bater rate limit. Cleanup sandbox: truncate graph_* + Neo4j detach fixture dedicada.

---

**QA** · 04:33  
@channel checklist RB-D09: (1) 8 slices com AC; (2) ordem inbox→rebuild→cache→HTTP; (3) matriz G3/G5; (4) spike partial go/no-go; (5) defer OpenAPI/auto-replay explícitos. Ready para INDEX R01–R09 e comentário ANX-41.

---

**Arquiteto** · 04:35  
@Orquestrador decisões consolidadas:

| ID | Decisão |
| --- | --- |
| **GK-R09-01** | 8 slices S1–S8; ordem operacional S4→S5→S6→S7 após fundação |
| **GK-R09-02** | Fixture F0 `graph-f0-minimal.json` obrigatória S7 |
| **GK-R09-03** | Partial spike S8 go/no-go T07; v1 full swap default |
| **GK-R09-04** | OpenAPI Scalar + auto-replay DLQ defer S8 |

---

**Crítico** · 04:37  
@Arquiteto RB-D09 fechado? Plano 8 slices, bloqueios, G3/G5, mapa D-GR, bench targets — sim. Bloqueante publicar R09?

---

**Executor (Dev)** · 04:39  
@Crítico sem bloqueante documental. Artefato [R09-dev-plan.md](./R09-dev-plan.md). Handoff R10 G0 package — pré-condição PC-G0-02 satisfeita para graph.

---

**Security (Kai)** · 04:41  
@Executor admin mínimo S7 — rebuild/DLQ já PLATFORM desde R06/R07. S8 OpenAPI público sem admin reduz reconnaissance — ratificado.

---

**Red Team (Ryn)** · 04:43  
@Security plano citado como autoridade sem teste — marcar slices G3/G5 NOT_RUN até evidência por slice. Spike partial feature flag **inexistente** prod v1.

---

**Orquestrador (CTO)** · 04:45  
Consolidando Session L:

| Backlog | Status |
| --- | --- |
| **RB-D09** | ✅ Fechado — dev-plan S1–S8, matriz testes, ordem implementação |

Artefato: [R09-dev-plan.md](./R09-dev-plan.md). Próximo: **R10 G0 package**. @channel objeções finais?

---

**QA** · 04:47  
@Orquestrador sem objeção. ANX-32 permanece `todo` até R10 G0 + P02 gates. Identity ANX-28 G7 e RB-D04 externos documentados.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 04:49  
Session L encerrada. Comentário ANX-41 com link R09 + RB-D09 fechado. INDEX graph R01–R09. Handoff R10 pacote G0 graph.

### Consenso — Session L

- Dev-plan 8 slices S1–S8 com deps, arquivos, testes e gates G3/G5.
- Ordem operacional: inbox+DLQ (S4) → rebuild (S5) → cache (S6) → HTTP (S7).
- Fixture F0 `graph-f0-minimal.json` obrigatória antes S7.
- Partial rebuild spike S8 go/no-go T07; v1 full swap default.
- OpenAPI Scalar + auto-replay DLQ defer S8 (GK-R08-03/04).
- **RB-D09:** ✅ Fechado.
- Próximo: R10 G0 package (graph).


---

## Session M — R10 G0 ratificação {#session-m--r10-g0-ratificação}

**Canal:** `#module-graph`  
**Issue:** ANX-41 · ANX-32 · **Rodada:** R10  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)  
**Backlog:** RB-D10 (pacote G0 handoff ANX-32) — **fechado**  
**Contexto:** Session L · [R09-dev-plan.md](./R09-dev-plan.md) · template [organizations/R10-g0-handoff.md](../../modules/organizations/R10-g0-handoff.md) · ANX-44 roster 8 roles

---

**Orquestrador (CTO)** · 05:05  
@channel fechamos **R10** — última rodada do debate ANX-41. R01–R09 entregaram contexto, 44 decisões `D-GR-*`, plano S1–S8. Hoje ratificamos o pacote G0 em [R10-g0-handoff.md](./R10-g0-handoff.md): escopo ANX-32, PC-G0-01..10, executor/crítico nominal e handoff. ANX-28 continua `in_review` — bloqueia G1 S7, não o encerramento do debate.

_(reação: 👀 8 — roster completo ANX-44)_

---

**Arquiteto** · 05:07  
@Orquestrador escopo v1 fechado: Graph Kernel + inbox/DLQ + rebuild full swap + cache epoch-aware + HTTP GraphQuery T01/T03. Partial rebuild operacional, OpenAPI Scalar público e auto-replay DLQ batch ficam **fora** — D-GR-036..039 explícitos no handoff. Bootstrap: eventing → identity → graph (D-GR-008).

---

**Executor (Dev)** · 05:09  
Confirmo nominação como executor G1. Plano R09: 8 slices, ordem inbox→rebuild→cache→HTTP. Posso claimar ANX-32 e iniciar S1–S4 (contratos, ports, Neo4j adapter, inbox/consumers) com mock identity/governance; S7 wiring T01 F0 real só após ANX-28 G7 + RB-D04. Top 5: `errors.ts`, `node-types.ts`, `schema.ts`, `0000_graph_schema_registry.sql`, `registry.ts`.

---

**Crítico** · 05:11  
@Executor aceito como executor **somente** com crítico independente — sou eu (critic-reviewer), PC-G0-10 satisfeito. Minha barra G1→G2: NATS ack **após** COMMIT PG (D-GR-024); T01 ALLOW+intentHash zero cache (D-GR-020); partial rebuild **não** entra S4–S7. Debate G0 aprovado; implementação S7 ainda **não** — identity + governance pendentes.

↳ **thread**

_(reação: ✅ Orquestrador)_

---

**Code Review** · 05:13  
@Crítico +1. Handoff lista evidências G2: AR01 `boundary/graph-imports.test.ts`, contracts round-trip, inbox+Neo4j transacional S4. Bloqueio merge S7 sem export identity + RB-D04 — documentado em B-01..B-03 do R10. `NODE_NOT_PROJECTED` 409 vs `NODE_NOT_FOUND` 404 entram no slice S7 (`node-get.ts`), não depois.

---

**Security (Kai)** · 05:15  
PC-G0-07 ✅ — Top 5 riscos mapeados. R-GR-01 poison nak Sev 15; R-GR-04 stale ALLOW Sev 15. Compensação: quarantine `max_attempts=5` + zero cache ALLOW mutável. Neo4j credenciais só via secrets port — módulos zero import adapter (D-GR-005). Admin rebuild/DLQ PLATFORM + `audit_manifest_id` (D-GR-034).

---

**QA** · 05:17  
Matriz G3-01..10 do R09 é critério de sign-off S7. Destaco G3-02 NOT_PROJECTED, G3-07 poison pill, G3-09 cache DENY TTL, G3-10 rate limit — obrigatórios antes de `in_review` ANX-32. Fixture `graph-f0-minimal.json` commitada antes S7 — Agency, User, Membership, Grant sanitizados.

---

**Red Team (Ryn)** · 05:19  
@QA fixtures alinhadas. Checklist G5-01..06 permanece: import cross-module neo4j, falsa `node.update` Grant, DLQ redaction, rebuild sem PLATFORM, double DLQ replay, herd T01 catch-up. G5-02: dispatcher roteia `ownerDomain:governance` — zero Cypher direto em Grant.

---

**Arquiteto** · 05:21  
PC-G0 tabela: 9/10 ✅. Único pendente PC-G0-04 — ANX-28 G7. Isso **não** impede claim ANX-32 nem encerramento ANX-41; impede wiring integrado S7. Consumer `graph:organizations:v1` especificado (PC-G0-08) — events E003/E008/E009/E016 de organizations R10 downstream.

---

**Executor (Dev)** · 05:23  
@Arquiteto entendido. Claim ANX-32 após ANX-41 `in_review`: começo S1 imediatamente. `NEO4J_URI` fail-fast startup; `GRAPH_CACHE_MODE=local-only` aceito em dev sem Redis. Integração identity projector smoke S4 — mock port até PC-G0-04.

---

**Crítico** · 05:25  
@Executor "claim imediato" ≠ "merge G1 completo". Se ANX-28 ou RB-D04 demorarem, PR graph fica em draft até S7. Não mockar governance grants em testes integração S7 — só unit com port fake. Spike partial S8: go/no-go T07 cross-domain ou rejeição formal.

---

**Code Review** · 05:27  
@Crítico concordo. Inbox idempotente `(eventId, consumerName)` mesma transação que marker Neo4j — evidência `inbox-neo4j-pg-tx.test.ts` no S4, não adiar. Contracts-first S1 antes de qualquer handler Elysia `/v1/graph`.

---

**Security (Kai)** · 05:29  
Rate limit 60/min `principalId+traversalId` no middleware S7 — independente throttle consumer catch-up (D-GR-033). `payload_ref` DLQ redacted — grep em row não deve encontrar API keys. Sync wait `X-Graph-Wait-Projection` PLATFORM-only ≤5s (D-GR-012).

---

**QA** · 05:31  
Registro AC-G0-06: esta sessão cobre 8 papéis ANX-44. Evidência anexada ao comentário ANX-41. Após G1, relatório G3 com comandos reproduzíveis — bench T01 p99 ≤80ms local documentado, não gate R10.

---

**Red Team (Ryn)** · 05:33  
@Security aceito redaction DLQ. Cenário pós-R8: operador tenta partial rebuild via admin — v1 **full swap only**; banner OP01 futuro. Oracle G5: 6ª entrega mesmo `eventId` → quarantined, não sexto upsert Neo4j.

---

**Orquestrador (CTO)** · 05:35  
@channel síntese PC-G0:

| # | Status |
| --- | --- |
| PC-G0-01..03, 05..10 | ✅ |
| PC-G0-04 identity G7 | ⏳ |
| RB-D04 governance grants | ⏳ (bloqueia S7, não debate) |

**Veredito:** G0 debate **aprovado**. Debate status **`g0_ready`**. ANX-41 → `in_review`. ANX-32 **claimável**. G1 S7 **bloqueado** até ANX-28 `done` + RB-D04.

_(reação: ✅ 8 — consenso registrado; não é PASS de gate G1)_

---

**Crítico** · 05:37  
Ratifico: pacote G0 completo para fins de debate. Meu parecer pré-G1: CHANGES_REQUIRED zero no documental; implementação S7 aguarda PC-G0-04 + RB-D04. Handoff [R10-g0-handoff.md](./R10-g0-handoff.md) é fonte de verdade para claim.

---

**Arquiteto** · 05:39  
@Crítico RB-D10 fechado. INDEX graph R01–R10 ✅. Próximo humano: aceite ANX-28 G7, fechar RB-D04 governance, depois executor claim ANX-32 slice S1. organizations consumer downstream não bloqueia graph G0.

---

**Orquestrador (CTO)** · 05:41  
@todos debate graph **encerrado** R1–R10. Handoff ANX-32 autorizado. Fila: `g0_ready`. Obrigado às oito personas — evidência preservada em SLACK-TRANSCRIPTS Session M.

_(reação: 🎉 7 — fim do debate ANX-41)_

### Consenso — Session M

- Pacote G0 [R10-g0-handoff.md](./R10-g0-handoff.md) aprovado — escopo ANX-32 in/out fechado, PC-G0 9/10, checklist evidências G1.
- Equipe G1: executor code-architect; crítico critic-reviewer (PC-G0-10).
- Claim ANX-32: autorizado após ANX-41 `in_review`; S1–S4 podem iniciar com mock ports.
- Bloqueio G1 S7: PC-G0-04 (ANX-28 G7) + RB-D04 governance grant events.
- Debate status: **`g0_ready`** — debate ANX-41 encerrado; handoff implementação ANX-32.
- **RB-D10:** ✅ Fechado.

