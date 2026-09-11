---
type: debate
---

# R02 — Fronteiras: `modules/knowledge`

**Componente:** modules/knowledge  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-85**

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R2)

**In:** Document/Memory/Evidence/ContextManifest/EmbeddingSpace. **Out:** não dono de Run, Brain, MODEL invoke, nós Neo4j autoritativos.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| RAG / evidências | **knowledge** |
| adapter-gateway | **KEEP** |
| Traverse Neo4j | **graph** |

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre knowledge e vizinhos (agents, orchestration, graph, connections, decisions, audit); definir ownership de Document/Memory/Evidence/ContextManifest/EmbeddingSpace; proibir vazamento de ACL em retrieval; ratificar ADR0002 e spec 002.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário e perguntas abertas |
| `brain/project-docs/specs/002-agents-knowledge/spec.md` | Graph RAG pipeline, memória, ContextManifest, API `/v1/knowledge/*` |
| `brain/notes/anxionos-backend-structure.md` | Tabela fronteiras L199–200 (Brain vs Memory) |
| `brain/notes/anxionos-storage-ownership.md` | PG+pgvector, Neo4j claims, SQLite scratch |
| [agents/R02-boundaries.md](../agents/R02-boundaries.md) | Brain facade vs memória longa |
| [graph/R02-boundaries.md](../graph/R02-boundaries.md) | Traversal T05/T10 vs vector retrieval |
| [connections/R02-boundaries.md](../../modules/connections/R02-boundaries.md) | Embedding MODEL binding vs EmbeddingSpace owner |

## Debate R2 (diálogo atribuído)

**Arquiteto:** knowledge é dono do **corpus autorizado** — ingestão, versionamento, classificação, chunking, embeddings, memórias tipadas, evidências com proveniência e montagem de **ContextManifest** para consumo governado.

**Crítico:** agents monta Brain; graph faz traversal; connections infere. Onde termina knowledge?

**Arquiteto:** agents expõe **fachada Brain** (config + ports) mas **não** persiste Document/Memory/Evidence. graph **projeta** relações fonte→claim→evidência no Neo4j; knowledge **emite** fatos e mantém metadados/embeddings autoritativos em PG. connections fornece **modelo de embedding** via binding MODEL — knowledge define **EmbeddingSpace** e índice pgvector.

**Security:** Retrieval nunca promove permissão — ACL/grant filtra **antes** de topK vetorial. Conteúdo recuperado é não confiável (prompt injection); instruções embutidas não alteram grants.

**Executor:** Pipeline normativo spec 002 (10 passos): auth → entidades → traverse allowlist → documentos elegíveis → vector no espaço correto → rerank → ContextManifest → inferência via connections.

**Crítico (orchestration):** Run/outcome e checkpoint de tarefa ficam em orchestration; knowledge só recebe referências (`runId`, hashes) em Evidence/Memory episódica.

**Síntese Orquestrador:** Fronteira aceita; invariantes ACL e embedding space fechados para R03/R04.

---

## Decisão: ACL e isolamento de embedding

| Opção | Veredito | Racional |
| --- | --- | --- |
| **A — Tenant + grant na camada application (v1)** | ✅ **Adotado** | Alinha governance + organizations; vector search em partição pré-filtrada por ACL |
| B — RLS PostgreSQL em knowledge | ❌ Defer P09 | D-CX-062 pattern connections; knowledge segue application-only tenancy v1 |
| C — Embedding space = tenant boundary único | ❌ Rejeitado | Spec exige múltiplas coleções/spaces por agency com grants distintos |

**Consequências:**

1. `POST /knowledge/query` revalida grant + scope **antes** de consultar pgvector.
2. Revogação (`knowledge.memory.revoked`) invalida cache/índice; consulta fail-closed.
3. Misturar dimensões/espaços de embedding é erro tipado — nunca coalesce silencioso.

---

## O módulo POSSUI (estado autoritativo)

| Agregado / artefato | Responsabilidade | Storage |
| --- | --- | --- |
| `Document` / `DocumentVersion` | Fonte versionada, hash, classificação, license | PG + object storage blob ref |
| `Chunk` / `IndexGeneration` | Chunking, publish atômico pós-EMBEDDED | PG + pgvector |
| `EmbeddingSpace` | modelVersion, dimensões, collectionId | PG metadata; vectors pgvector |
| `Memory` | working/episodic/semantic/procedural estados | PG (+ política retenção) |
| `Evidence` | Claim + proveniência + ligação a Run/Decision | PG; claims/arestas Neo4j via eventos |
| `ContextManifest` | Montagem auditável para inferência | PG snapshot + evento |
| Journal + outbox | `knowledge.document.*`, `knowledge.memory.*`, `context.manifest.*` | PG via `@anxionos/eventing` |
| Workers | ingestion, chunk/embed/index, memory-expiry | `knowledge/workers/` |

## O módulo NÃO POSSUI

| Item | Dono correto | Notas |
| --- | --- | --- |
| Agent, AgentVersion, Skill, BrainFacade runtime | **agents** | Invoca ports knowledge; não duplica memória |
| Goal, Task, Run, lease, heartbeat | **orchestration** | knowledge referencia `runId` em Evidence |
| Traversal kernel T01–T20, GraphQuery | **graph** | knowledge consome ports; não escreve Neo4j |
| Provider invoke, usage record, MODEL adapter | **connections** | Embedding/inferência; binding referencia offering |
| Grant, mandate, authorityEpoch | **governance** | knowledge valida via port; não emite grant |
| Decision, investment intent | **decisions** | knowledge fornece evidência; não decide |
| Flight recorder linhagem cross-módulo | **audit** | knowledge emite eventos; audit agrega |
| Object storage driver (S3/minio) | **infra / packages** | knowledge usa port `BlobStore`; não implementa vendor |

---

## Fronteira explícita: knowledge × agents × orchestration × graph × connections

| Fronteira | knowledge | agents | orchestration | graph | connections |
| --- | --- | --- | --- | --- | --- |
| Ingerir documento | ✅ | ❌ | ❌ | ❌ | ❌ |
| Montar ContextManifest | ✅ | ❌ (chama port) | ❌ | ❌ | ❌ |
| Persistir Memory/Evidence | ✅ | ❌ | ❌ | ❌ | ❌ |
| Registrar Run/checkpoint | ❌ | ❌ | ✅ | ❌ | ❌ |
| Traversal autorizado | ❌ (consome) | ❌ | ❌ | ✅ | ❌ |
| Invoke LLM/embedding adapter | ❌ | ❌ | ❌ | ❌ | ✅ |
| Definir EmbeddingSpace | ✅ | ❌ | ❌ | ❌ | ❌ (offering MODEL) |
| Projetar nó Evidence no grafo | ❌ emite evento | ❌ | ❌ | ✅ projector | ❌ |

---

## Invariantes de fronteira (propostas)

| ID | Invariante | Verificação (R04/R09) |
| --- | --- | --- |
| **KN-R02-INV-01** | Nenhum chunk/embed indexado sem ACL resolvida na ingestão | Teste ingest fail-closed |
| **KN-R02-INV-02** | Query vector só no `embeddingSpaceId` da coleção solicitada | Contract test mismatch error |
| **KN-R02-INV-03** | Documento privado mais similar **nunca** aparece em resultado (AG06) | Retrieval E2E negativo |
| **KN-R02-INV-04** | Memory `VERIFIED` exige evidência/rubrica — não auto-verify LLM | Application test |
| **KN-R02-INV-05** | ContextManifest não inclui chain-of-thought oculto de provider | Redaction snapshot test |
| **KN-R02-INV-06** | Revogação memory/document invalida cache antes de SLA monitorado | Event consumer test |

---

## Contrato público — `index.ts` (sketch R02)

### Export recomendado (R04 detalha)

| Export | Consumidor |
| --- | --- |
| `ingestDocument`, `publishDocumentVersion` | apps/api, workers |
| `queryKnowledge`, `buildContextManifest` | agents BrainFacade, orchestration context-builder |
| `verifyMemory`, `revokeMemory` | governance workflows |
| `KnowledgeModuleDeps`, `ensureKnowledgeSchema` | composition root |

### O que **não** exportar

| Proibido | Motivo |
| --- | --- |
| Repositórios concretos persistence | ADR0002 — só `index.ts` |
| Client Neo4j / pgvector direto | Infra interna |
| Handlers Elysia | `knowledge/api/` montado em apps/api |
| Resolução de grants | governance port adapter |

---

## Imports proibidos (cross-module)

| Origem (knowledge) | Destino | Veredito |
| --- | --- | --- |
| `domain/*` | Drizzle, pg, Neo4j driver, OpenAI SDK | ❌ |
| `application/*` | `agents/*`, `orchestration/*` repositórios | ❌ |
| `knowledge` | tabelas `connections_*` / `graph_*` | ❌ |
| `agents` | `knowledge/infrastructure/**` | ❌ — só `index.ts` |

**Permitido:** `@anxionos/contracts`, `@anxionos/eventing`, `@anxionos/database`, ports graph/governance/connections via adapters no composition root.

---

## Perguntas abertas para R03 (domain sketch)

1. **Blob storage:** port em `packages/` vs adapter `knowledge/infrastructure` — quem dona bucket policy?
2. **Evidence vs Memory:** promoção episódica→semântica — comando único ou pipeline evaluation?
3. **Graph RAG híbrido:** contrato port `GraphTraversalPort` vs HTTP graph module?
4. **Working memory:** TTL Session — owner knowledge ou orchestration session store?
5. **OCR/STT:** job states STAGED→INDEXED — worker knowledge ou connections adapter only?

---

## Saída R2

✅ Boundary doc aprovado — **R03 domain sketch** entregue em [R03-domain-sketch.md](./R03-domain-sketch.md).

**Issue:** ANX-85 (debate R02–R10) · estrutura R01 permanece em ANX-42.
