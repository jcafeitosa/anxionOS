---
type: debate
---

# R05 — Armazenamento: `modules/knowledge`

**Componente:** modules/knowledge  
**Rodada:** R5 — PostgreSQL, pgvector, journal/outbox, Neo4j, SQLite cache  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-85 · gate: ANX-36 · graph consumer: ANX-32  
**Pré-requisito:** [R04-contracts-events.md](./R04-contracts-events.md) · ADR0004 · `brain/notes/anxionos-storage-ownership.md`

## Princípios

| Princípio | Decisão |
| --- | --- |
| Fonte transacional | PostgreSQL `knowledge_*` |
| Vetores | **pgvector** extensão PG — owner knowledge |
| Grafo | Neo4j projeção `graph:knowledge:v1` |
| Journal/outbox | `ownerDomain: "knowledge"` mesma TX UoW |
| SQLite | Cache retrieval ACL snapshot descartável only |
| Timescale | **Fora** de knowledge (market-data owner) |

## Tabelas PG (inventário)

| Tabela | Papel |
| --- | --- |
| `knowledge_sources` | KnowledgeSource agregado |
| `knowledge_documents` | Document |
| `knowledge_document_versions` | DocumentVersion + blobRef |
| `knowledge_index_generations` | IndexGeneration |
| `knowledge_chunks` | Chunk metadata |
| `knowledge_embeddings` | pgvector — `vector(d)` + `embedding_space_id` |
| `knowledge_embedding_spaces` | EmbeddingSpace |
| `knowledge_memories` | Memory lifecycle |
| `knowledge_evidence` | Evidence + supersede links |
| `knowledge_context_manifests` | ContextManifest snapshots |
| `knowledge_retrieval_sessions` | Audit efêmero RetrievalSession |
| `knowledge_command_journal` | Idempotência HTTP |

## pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- knowledge_embeddings: vector_id, chunk_id, embedding_space_id, embedding vector(1536)
CREATE INDEX knowledge_embeddings_hnsw_idx ON knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding_space_id = $space;
```

**KN-R05-01:** Busca sempre filtra `organization_id` + ACL pré-query + `embedding_space_id` — nunca cross-space coalesce.

## Journal/outbox

`KnowledgeUnitOfWork`: BEGIN → mutação → command_journal → appendJournal + enqueueOutbox (`ownerDomain=knowledge`) → COMMIT.

| eventType | Tabelas |
| --- | --- |
| `knowledge.document.indexed.v1` | UPDATE index_generations, documents |
| `knowledge.chunk.embedded.v1` | INSERT embeddings pgvector |
| `knowledge.memory.revoked.v1` | UPDATE memories + cache invalidation flag |

## Neo4j — `graph:knowledge:v1`

Projector no módulo **graph** (ANX-32). Async inbox dedup `eventId`.

| Nó | evento |
| --- | --- |
| `:KnowledgeSource` | source.registered |
| `:Document` / `:DocumentVersion` | document.* |
| `:Evidence` | evidence.recorded |
| `:Memory` | memory.* |
| `SUPPORTED_BY`, `INDEXED_IN` | proveniência |

**Proibido:** texto bruto, vetores, secrets em propriedades Neo4j.

## SQLite cache (opcional dev/staging)

Arquivo: `{KNOWLEDGE_CACHE_DIR}/retrieval-acl.sqlite`

| Tabela | Conteúdo |
| --- | --- |
| `acl_snapshot` | `(principal_id, epoch, allowed_chunk_ids_json, cached_at)` |
| TTL | 60s default; invalidação em memory.revoked / document.revoked |

**KN-R05-02:** SQLite **proibido** para embeddings, memories autoritativas, manifest finalized.

## Migração P04 slices

| Slice | Escopo |
| --- | --- |
| P04-S1 | enums, sources, documents, command_journal |
| P04-S2 | chunks, index_generations, pgvector embeddings |
| P04-S3 | memories, evidence, embedding_spaces |
| P04-S4 | context_manifests, retrieval_sessions |
| P04-S5 | workers ingestion + memory-expiry |

Bootstrap: eventing → identity → organizations → governance → graph → **connections stub** → knowledge.

## Decisões

| ID | Decisão |
| --- | --- |
| KN-R05-01 | pgvector físico PG sob knowledge |
| KN-R05-02 | SQLite só ACL cache descartável |
| KN-R05-03 | command_journal obrigatório v1 |
| KN-R05-04 | Neo4j async inbox graph:knowledge:v1 |
| KN-R05-05 | Blob bytes object storage — refs PG only |

## Critérios de aceite — R05

| # | Critério | Status |
| --- | --- | --- |
| AC-R05-01 | Inventário tabelas `knowledge_*` | ✅ |
| AC-R05-02 | pgvector + índices tenancy/space | ✅ |
| AC-R05-03 | journal/outbox ownerDomain=knowledge | ✅ |
| AC-R05-04 | Projeção Neo4j graph:knowledge:v1 | ✅ |
| AC-R05-05 | SQLite escopo + exclusões | ✅ |
| AC-R05-06 | Migração slices P04-S1–S5 | ✅ |

## Saída R5

✅ → [R06-dependencies.md](./R06-dependencies.md)
