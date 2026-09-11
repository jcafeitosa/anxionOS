---
type: debate
---

# R03 — Esboço de domínio: `modules/knowledge`

**Componente:** modules/knowledge  
**Rodada:** R3 — Domain model  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-42 (debate estrutura) · **ANX-85** (R02–R10)  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md) · [R01-context.md](./R01-context.md) · `brain/project-docs/specs/002-agents-knowledge/spec.md`

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R3)

**In:** agregados Document/Chunk/Memory/Evidence. **Out:** `knowledge.*.v1` sem vetores brutos. **Não** duplicar Run nem Brain.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Domain sketch knowledge | **knowledge** |
| adapter-gateway | **KEEP** |
| pgvector | **knowledge** (ADR0004) |

## Objetivo da rodada

Esboçar o modelo de domínio de **knowledge** após [R02-boundaries.md](./R02-boundaries.md): agregados `KnowledgeSource`, `Document`, `Chunk`, `EmbeddingSpace`, `Memory`, `Evidence`, `ContextManifest`; ports `KnowledgeIndexer`, `RetrievalPort`, `EmbeddingPort`; invariantes `KN-R03-INV-*`; sketch de eventos `knowledge.*.v1` sem secrets nem vetores brutos; ownership pgvector conforme ADR0004; respostas às perguntas abertas de R02. Alinhar pipeline Graph RAG spec 002 sem duplicar Run (orchestration), Brain facade (agents) nem invoke MODEL (connections).

## Fontes aplicadas

| Fonte | Uso em R3 |
| --- | --- |
| [R02-boundaries.md](./R02-boundaries.md) | Fronteiras, KN-R02-INV-*, ownership EmbeddingSpace |
| [R01-context.md](./R01-context.md) | Propósito, armazenamento, perguntas abertas |
| `brain/project-docs/specs/002-agents-knowledge/spec.md` | Pipeline 10 passos, Memory states, ContextManifest, ingestion states |
| `brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md` | pgvector em PG; Neo4j projeção; Timescale fora de knowledge |
| `brain/notes/anxionos-storage-ownership.md` | Matriz knowledge: PG+pgvector metadados/embeddings; Neo4j claims |
| [agents/R03-domain-sketch.md](../agents/R03-domain-sketch.md) | BrainFacade chama ports knowledge; não persiste corpus |
| [connections/R03-domain-sketch.md](../connections/R03-domain-sketch.md) | CX-R03-05: EmbeddingSpace dono knowledge; MODEL offering em connections |
| [graph/R03-domain-sketch.md](../graph/R03-domain-sketch.md) | Projeção fonte→claim→evidence; traversal T05/T10 consumido via port |

## Debate R3 (síntese atribuída)

**Arquiteto:** Seis agregados/raízes v1 — `Document` (corpus versionado), `EmbeddingSpace` (coleção vetorial), `Memory` (memórias tipadas), `Evidence` (claim+proveniência), `ContextManifest` (montagem auditável), `KnowledgeSource` (origem de ingestão). Entidades satélite: `DocumentVersion`, `Chunk`, `IndexGeneration`, `EmbeddingRef`, `RetrievalSession`.

**Executor:** Ports application: `KnowledgeIndexer` (pipeline STAGED→INDEXED), `RetrievalPort` (ACL pré-filtro + vector + rerank slot), `EmbeddingPort` (delega compute a connections). Repositories + `KnowledgeUnitOfWork` para estado + journal + outbox atômico.

**Crítico:** `RetrievalSession` é efêmero — não substitui Run. Vetores nunca cruzam `embeddingSpaceId`. Eventos carregam refs/hashes, não embedding arrays.

**Security:** Conteúdo recuperado é não confiável; manifest redige chain-of-thought oculto. Blob bytes via `BlobStorePort`; eventos só `blobRef` + hash.

**Síntese Orquestrador:** Domain sketch v1 aprovado; R04 normaliza `@anxionos/contracts/knowledge/*` e catálogo `knowledge.*.v1`.

---

## Agregado: `KnowledgeSource`

Origem rastreável de material ingerível (upload, URL autorizada, sync de provider, artefato de Run). **Agregado raiz** para registro e política de ingestão; não armazena bytes inline.

```typescript
interface KnowledgeSource {
  id: KnowledgeSourceId;
  organizationId: string;
  agencyId?: string;
  sourceKind: KnowledgeSourceKind;
  displayName: string;
  uri?: string;
  connectionBindingRef?: ConnectionBindingRef;
  defaultClassification: DataClassification;
  defaultAclRef: AclRef;
  status: KnowledgeSourceStatus;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

type KnowledgeSourceKind =
  | "UPLOAD"
  | "URL"
  | "CONNECTION_SYNC"
  | "RUN_ARTIFACT"
  | "MANUAL_RESEARCH";

type KnowledgeSourceStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
```

### Invariantes (`KN-R03-INV-SRC-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-SRC-01 | `defaultAclRef` resolvido na criação — ingest fail-closed sem ACL (reforça KN-R02-INV-01) |
| KN-R03-INV-SRC-02 | `CONNECTION_SYNC` exige `connectionBindingRef` ACTIVE do kind KNOWLEDGE ou MODEL conforme offering |
| KN-R03-INV-SRC-03 | Suspensão impede novos `DocumentVersion`; versões publicadas permanecem consultáveis conforme ACL |

---

## Agregado: `Document`

Identidade estável de um documento no corpus; versões imutáveis por `DocumentVersion`.

```typescript
interface Document {
  id: DocumentId;
  organizationId: string;
  knowledgeSourceId: KnowledgeSourceId;
  title: string;
  classification: DataClassification;
  aclRef: AclRef;
  activeVersionId?: DocumentVersionId;
  licenseStatus: LicenseStatus;
  status: DocumentStatus;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentVersion {
  id: DocumentVersionId;
  documentId: DocumentId;
  versionNumber: number;
  contentHash: string;
  blobRef: BlobRef;
  mimeType: string;
  byteSize: number;
  extractionStatus: ExtractionStatus;
  publishedAt?: Date;
  createdAt: Date;
}

type DocumentStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "RETENTION_HOLD";
type ExtractionStatus =
  | "STAGED"
  | "EXTRACTED"
  | "CLASSIFIED"
  | "CHUNKED"
  | "EMBEDDED"
  | "INDEXED"
  | "FAILED";
```

### Invariantes (`KN-R03-INV-DOC-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-DOC-01 | Publicação atômica: `INDEXED` só após todos chunks da `IndexGeneration` EMBEDDED no espaço correto |
| KN-R03-INV-DOC-02 | `DocumentVersion` imutável após `publishedAt`; correção cria nova versão |
| KN-R03-INV-DOC-03 | Job falho não expõe versão parcial — estado `FAILED` sem `activeVersionId` switch |
| KN-R03-INV-DOC-04 | `licenseStatus` bloqueante impede indexação e retrieval |
| KN-R03-INV-DOC-05 | Mutações confirmam estado + journal + outbox na mesma transação PG |

---

## Entidade: `Chunk` e `IndexGeneration`

Unidade de recuperação; embeddings referenciados por `EmbeddingRef`, não inline no agregado.

```typescript
interface IndexGeneration {
  id: IndexGenerationId;
  documentVersionId: DocumentVersionId;
  embeddingSpaceId: EmbeddingSpaceId;
  modelOfferingRef: ModelOfferingRef;
  chunkingPolicyVersion: string;
  status: IndexGenerationStatus;
  chunkCount: number;
  publishedAt?: Date;
}

interface Chunk {
  id: ChunkId;
  indexGenerationId: IndexGenerationId;
  documentVersionId: DocumentVersionId;
  sequence: number;
  contentHash: string;
  tokenEstimate: number;
  spanStart?: number;
  spanEnd?: number;
  embeddingRef?: EmbeddingRef;
}

interface EmbeddingRef {
  chunkId: ChunkId;
  embeddingSpaceId: EmbeddingSpaceId;
  vectorId: string;
  dimensions: number;
  modelVersion: string;
}

type IndexGenerationStatus = "BUILDING" | "EMBEDDED" | "PUBLISHED" | "FAILED";
```

### Invariantes (`KN-R03-INV-CHK-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-CHK-01 | Todo `Chunk` pertence a exatamente uma `IndexGeneration` e um `embeddingSpaceId` |
| KN-R03-INV-CHK-02 | `EmbeddingRef.dimensions` deve coincidir com `EmbeddingSpace.dimensions` — mismatch erro tipado |
| KN-R03-INV-CHK-03 | Re-embed cria nova `IndexGeneration`; switch de coleção só após validação paralela (spec migration) |
| KN-R03-INV-CHK-04 | Eventos e DTOs públicos usam `EmbeddingRef` — **nunca** array de floats (KN-R02-INV-02) |

---

## Agregado: `EmbeddingSpace`

Coleção vetorial versionada — dono knowledge; modelo referenciado via `ModelOfferingRef` de connections.

```typescript
interface EmbeddingSpace {
  id: EmbeddingSpaceId;
  organizationId: string;
  agencyId?: string;
  collectionId: string;
  displayName: string;
  modelOfferingRef: ModelOfferingRef;
  modelVersion: string;
  dimensions: number;
  distanceMetric: "COSINE" | "L2" | "IP";
  status: EmbeddingSpaceStatus;
  revision: number;
  createdAt: Date;
}

type EmbeddingSpaceStatus = "DRAFT" | "ACTIVE" | "DEPRECATED" | "RETIRED";
```

### Invariantes (`KN-R03-INV-ESP-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-ESP-01 | Vector search só no `embeddingSpaceId` solicitado — nunca coalesce cross-space |
| KN-R03-INV-ESP-02 | `RETIRED` rejeita novos index; consultas existentes fail-closed após SLA de invalidação |
| KN-R03-INV-ESP-03 | Múltiplos spaces por agency permitidos — tenant boundary ≠ space boundary (R02 opção C rejeitada) |

**Decisão KN-R03-01:** Storage físico dos vetores em **pgvector** (PostgreSQL, ADR0004); knowledge module dono das tabelas `knowledge_*` + extensão pgvector. TimescaleDB **não** aplicável a knowledge — séries temporais de mercado permanecem em market-data.

---

## Agregado: `Memory`

Memórias tipadas com lifecycle CANDIDATE → VERIFIED/REJECTED → EXPIRED/REVOKED.

```typescript
interface Memory {
  id: MemoryId;
  organizationId: string;
  memoryKind: MemoryKind;
  subjectRef: SubjectRef;
  contentRef: ObjectRef;
  contentHash: string;
  aclRef: AclRef;
  status: MemoryStatus;
  sourceRunId?: string;
  sourceDecisionId?: string;
  evidenceRefs: EvidenceRef[];
  expiresAt?: Date;
  verifiedAt?: Date;
  revokedAt?: Date;
  revision: number;
  createdAt: Date;
}

type MemoryKind = "WORKING" | "EPISODIC" | "SEMANTIC" | "PROCEDURAL";

type MemoryStatus =
  | "CANDIDATE"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "REVOKED";
```

### Invariantes (`KN-R03-INV-MEM-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-MEM-01 | `VERIFIED` exige `evidenceRefs` não vazio + rubrica — não auto-verify LLM (KN-R02-INV-04) |
| KN-R03-INV-MEM-02 | `WORKING` TTL-bound; expiração exclui retrieval por padrão |
| KN-R03-INV-MEM-03 | `EPISODIC` referencia `sourceRunId` em orchestration — knowledge não cria Run |
| KN-R03-INV-MEM-04 | `PROCEDURAL` não promove SkillVersion — evaluation/evolution gate (DL-AG3) |
| KN-R03-INV-MEM-05 | Revogação emite evento; cache/índice invalidados antes de SLA (KN-R02-INV-06) |

**Decisão KN-R03-02 (R02 Q4):** Working memory **owner knowledge** com TTL; orchestration passa `runId`/session correlation — não duplica store de sessão produto.

---

## Agregado: `Evidence`

Claim institucional com proveniência ligada a documento, Run ou observação.

```typescript
interface Evidence {
  id: EvidenceId;
  organizationId: string;
  claimTextHash: string;
  claimSummary: string;
  provenanceKind: ProvenanceKind;
  documentVersionRef?: DocumentVersionRef;
  memoryRef?: MemoryRef;
  sourceRunId?: string;
  sourceDecisionId?: string;
  confidenceBand?: ConfidenceBand;
  status: EvidenceStatus;
  revision: number;
  createdAt: Date;
}

type ProvenanceKind =
  | "DOCUMENT"
  | "MEMORY"
  | "MARKET_OBSERVATION"
  | "RUN_OUTPUT"
  | "EXTERNAL_ATTESTATION";

type EvidenceStatus = "ACTIVE" | "SUPERSEDED" | "REVOKED";
```

### Invariantes (`KN-R03-INV-EVD-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-EVD-01 | Correção cria nova Evidence + link SUPERSEDED — histórico preservado |
| KN-R03-INV-EVD-02 | Projeção Neo4j via evento `knowledge.evidence.recorded.v1` — knowledge não escreve driver Neo4j |
| KN-R03-INV-EVD-03 | Contradição gera vínculo explícito; nenhuma merge silenciosa |

**Decisão KN-R03-03 (R02 Q2):** Promoção episódica→semântica via comando `PromoteMemory` + gate evaluation (P08) — **não** pipeline automático único; evaluation emite evidência/rubrica consumida por `verifyMemory`.

---

## Agregado: `ContextManifest`

Montagem auditável para inferência — snapshot imutável após `created`.

```typescript
interface ContextManifest {
  id: ContextManifestId;
  organizationId: string;
  principalId: string;
  scopeRef: ScopeRef;
  taskRef: TaskRef;
  runId?: string;
  assemblyVersion: string;
  validAt: Date;
  knownAt: Date;
  policyVersionHashes: Record<string, string>;
  bindingHashes: Record<string, string>;
  items: ContextManifestItem[];
  omittedReasons: OmittedReason[];
  tokenBudget: TokenBudget;
  totalTokenEstimate: number;
  status: ContextManifestStatus;
  createdAt: Date;
}

interface ContextManifestItem {
  itemId: string;
  sourceKind: "DOCUMENT_CHUNK" | "MEMORY" | "EVIDENCE" | "MARKET_OBS";
  sourceRef: string;
  contentHash: string;
  authorizedFields: string[];
  tokenEstimate: number;
  rank: number;
  truncation?: TruncationMeta;
}

type ContextManifestStatus = "DRAFT" | "FINALIZED" | "SUPERSEDED";
```

### Invariantes (`KN-R03-INV-CTX-*`)

| ID | Regra |
| --- | --- |
| KN-R03-INV-CTX-01 | Montagem só inclui itens ACL-autorizados no instante `knownAt` |
| KN-R03-INV-CTX-02 | Snapshot não inclui hidden chain-of-thought de provider (KN-R02-INV-05) |
| KN-R03-INV-CTX-03 | `FINALIZED` imutável; replanejamento cria novo manifest com `supersedesId` |
| KN-R03-INV-CTX-04 | Inferência downstream usa manifest hash — connections recebe refs, não corpus bruto expandido |

---

## Entidade efêmera: `RetrievalSession`

Correlaciona uma operação `queryKnowledge` / `buildContextManifest`; **não** agregado persistido além de audit mínimo.

```typescript
interface RetrievalSession {
  sessionId: RetrievalSessionId;
  principalId: string;
  embeddingSpaceId: EmbeddingSpaceId;
  aclSnapshotEpoch: number;
  queryHash: string;
  candidateChunkIds: ChunkId[];
  rerankBindingRef?: ConnectionBindingRef;
  startedAt: Date;
  completedAt?: Date;
}
```

**Decisão KN-R03-04:** `RetrievalSession` logado para observabilidade (AG06); TTL curto em PG ou append-only audit — detalhe storage em R05.

---

## Port: `KnowledgeIndexer` (application — export público)

Orquestra pipeline de ingestão STAGED → INDEXED delegando OCR/STT/embed a connections.

```typescript
export interface IngestDocumentInput {
  knowledgeSourceId: KnowledgeSourceId;
  blobRef: BlobRef;
  contentHash: string;
  mimeType: string;
  classification: DataClassification;
  aclRef: AclRef;
  embeddingSpaceId: EmbeddingSpaceId;
  idempotencyKey: string;
}

export interface KnowledgeIndexer {
  ingestDocument(input: IngestDocumentInput): Promise<DocumentVersionId>;
  publishIndexGeneration(indexGenerationId: IndexGenerationId): Promise<void>;
  reindexDocumentVersion(
    documentVersionId: DocumentVersionId,
    targetEmbeddingSpaceId: EmbeddingSpaceId,
  ): Promise<IndexGenerationId>;
}
```

| Aspecto | Decisão |
| --- | --- |
| Dono | `application/services/knowledge-indexer.ts` |
| OCR/STT/embed | Worker chama `EmbeddingPort` → connections MODEL binding |
| Falha | Estado `FAILED` sem publicação parcial |
| Blob | `BlobStorePort` em infra — bucket policy R04 (KN-R03-05) |

**Decisão KN-R03-05 (R02 Q1):** Port `BlobStorePort` definido em `@anxionos/contracts/storage` ou `packages/database`; adapter S3/minio em `knowledge/infrastructure` — **policy de bucket** documentada em R05; knowledge não implementa vendor SDK no domain.

**Decisão KN-R03-06 (R02 Q5):** Estados STAGED→INDEXED **owned by knowledge workers**; connections executa adapter only — job correlation via `indexGenerationId`.

---

## Port: `RetrievalPort` (application)

ACL pré-filtro, vector search, lexical opcional, rerank slot, dedupe — **antes** de montar manifest.

```typescript
export interface QueryKnowledgeInput {
  principalId: string;
  scopeRef: ScopeRef;
  queryText: string;
  embeddingSpaceId: EmbeddingSpaceId;
  collectionIds?: string[];
  taskRef?: TaskRef;
  validAt: Date;
  knownAt: Date;
  topK: number;
  rerankBindingRef?: ConnectionBindingRef;
  idempotencyKey: string;
}

export interface RetrievalCandidate {
  chunkId: ChunkId;
  documentVersionRef: DocumentVersionRef;
  score: number;
  scoreComponents: Record<string, number>;
}

export interface RetrievalPort {
  query(input: QueryKnowledgeInput): Promise<RetrievalSession>;
  buildContextManifest(
    session: RetrievalSession,
    budget: TokenBudget,
  ): Promise<ContextManifest>;
}
```

| Aspecto | Decisão |
| --- | --- |
| Graph híbrido | `GraphTraversalPort` read-only — expande document set **antes** vector (spec passo 3–4) |
| ACL | `GrantValidationPort` + `AclResolverPort` — filtro na query SQL/pgvector, não pós-topK |
| Erros | `EMBEDDING_SPACE_MISMATCH`, `PERMISSION_DENIED`, `ENTITY_AMBIGUOUS`, `INSUFFICIENT_EVIDENCE` |

**Decisão KN-R03-07 (R02 Q3):** Port `GraphTraversalPort` em domain; adapter HTTP interno ou SDK graph module no composition root — **não** import `graph/infrastructure` cross-module.

---

## Port: `EmbeddingPort` (domain/infrastructure boundary)

Delega compute de embedding a connections; persiste vetor via repositório pgvector interno.

```typescript
export interface EmbedChunksInput {
  chunks: Array<{ chunkId: ChunkId; text: string }>;
  embeddingSpace: EmbeddingSpace;
  bindingRef: ConnectionBindingRef;
  idempotencyKey: string;
}

export interface EmbeddingPort {
  embedChunks(input: EmbedChunksInput): Promise<EmbeddingRef[]>;
}
```

| Aspecto | Decisão |
| --- | --- |
| Invoke | connections `RuntimeAdapter` MODEL — usage registrado em connections |
| Persistência | knowledge infra grava `vectorId` + metadata em pgvector |
| Eventos | `knowledge.chunk.embedded.v1` carrega `EmbeddingRef`, não floats |

---

## Ports adicionais (domain/)

| Port | Responsabilidade |
| --- | --- |
| `DocumentRepository` | Document + DocumentVersion lifecycle |
| `ChunkRepository` | Chunks por IndexGeneration |
| `EmbeddingSpaceRepository` | Spaces + status |
| `MemoryRepository` | Memory CRUD + verify/revoke |
| `EvidenceRepository` | Evidence + supersede links |
| `ContextManifestRepository` | Persist finalized manifests |
| `KnowledgeUnitOfWork` | Transação estado + journal + outbox |
| `AclResolverPort` | Resolve ACL/grant snapshot (governance/organizations) |
| `GrantValidationPort` | Fail-closed grant check |
| `GraphTraversalPort` | T05/T10 allowlisted expansion |
| `BlobStorePort` | Object storage get/put by ref |
| `OrchestrationRunQueryPort` | Valida `sourceRunId` exists (read-only) |

---

## Comandos application (esboço)

| Comando | Agregado | Idempotência natural | Evento |
| --- | --- | --- | --- |
| `RegisterKnowledgeSource` | KnowledgeSource | `(organizationId, displayName, sourceKind)` | `knowledge.source.registered.v1` |
| `IngestDocument` | Document | `idempotencyKey` | `knowledge.document.ingested.v1` |
| `PublishDocumentVersion` | Document | `(documentId, versionNumber)` | `knowledge.document.versioned.v1` |
| `PublishIndexGeneration` | IndexGeneration | `(indexGenerationId)` | `knowledge.document.indexed.v1` |
| `RegisterEmbeddingSpace` | EmbeddingSpace | `(organizationId, collectionId)` | `knowledge.embedding_space.registered.v1` |
| `RecordEvidence` | Evidence | `(claimTextHash, provenanceKind, sourceRef)` | `knowledge.evidence.recorded.v1` |
| `VerifyMemory` | Memory | `(memoryId, expectedRevision)` | `knowledge.memory.verified.v1` |
| `RevokeMemory` | Memory | `(memoryId, reasonCode)` | `knowledge.memory.revoked.v1` |
| `BuildContextManifest` | ContextManifest | `(principalId, taskRef, queryHash, assemblyVersion)` | `context.manifest.created.v1` |
| `PromoteMemory` | Memory | `(memoryId, targetKind)` | `knowledge.memory.promotion_requested.v1` |

---

## Eventos de domínio (sketch — R04 normaliza schemas)

Envelope: `ownerDomain: "knowledge"`, `schemaVersion: "0.1.0"`. **Proibido** em payload: secrets, tokens, texto completo de documento, arrays de embedding, chain-of-thought oculto.

| eventType | aggregate | Payload principal (sem secrets/vetores) | Consumidores |
| --- | --- | --- | --- |
| `knowledge.source.registered.v1` | KnowledgeSource | `sourceId`, `sourceKind`, `defaultAclRef` | graph, audit |
| `knowledge.document.ingested.v1` | Document | `documentId`, `versionId`, `contentHash`, `blobRef`, `classification` | graph, audit |
| `knowledge.document.versioned.v1` | DocumentVersion | `documentId`, `versionNumber`, `contentHash`, `licenseStatus` | graph, agents |
| `knowledge.document.extracted.v1` | DocumentVersion | `versionId`, `extractionStatus`, `mimeType` | workers, audit |
| `knowledge.chunk.created.v1` | Chunk | `chunkId`, `indexGenerationId`, `contentHash`, `sequence` | audit |
| `knowledge.chunk.embedded.v1` | Chunk | `chunkId`, `embeddingRef` (ids only), `modelVersion` | graph, cache |
| `knowledge.document.indexed.v1` | IndexGeneration | `indexGenerationId`, `documentVersionId`, `embeddingSpaceId`, `chunkCount` | graph, agents |
| `knowledge.embedding_space.registered.v1` | EmbeddingSpace | `embeddingSpaceId`, `collectionId`, `dimensions`, `modelOfferingRef` | graph, connections |
| `knowledge.evidence.recorded.v1` | Evidence | `evidenceId`, `claimTextHash`, `provenanceKind`, `sourceRefs` | **graph**, decisions, audit |
| `knowledge.memory.candidate.v1` | Memory | `memoryId`, `memoryKind`, `contentHash`, `sourceRunId?` | graph, audit |
| `knowledge.memory.verified.v1` | Memory | `memoryId`, `evidenceRefs`, `verifiedAt` | graph, agents |
| `knowledge.memory.revoked.v1` | Memory | `memoryId`, `reasonCode`, `revokedAt` | graph, **cache invalidation** |
| `knowledge.memory.promotion_requested.v1` | Memory | `memoryId`, `targetKind`, `evaluationRef?` | evaluation, audit |
| `context.manifest.created.v1` | ContextManifest | `manifestId`, `principalId`, `taskRef`, `itemHashes[]`, `totalTokenEstimate` | agents, orchestration, audit |

### Exemplo `knowledge.document.indexed.v1`

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440030",
  "schemaVersion": "0.1.0",
  "ownerDomain": "knowledge",
  "eventType": "knowledge.document.indexed.v1",
  "occurredAt": "2026-09-08T09:00:00.000Z",
  "payload": {
    "indexGenerationId": "idx_01h2x",
    "documentVersionId": "dver_9k2",
    "documentId": "doc_7f1",
    "embeddingSpaceId": "esp_coll_a",
    "modelOfferingRef": { "offeringId": "off_embed_v3", "version": 2 },
    "chunkCount": 142,
    "contentHash": "sha256:…"
  }
}
```

### Exemplo `context.manifest.created.v1`

```json
{
  "eventType": "context.manifest.created.v1",
  "ownerDomain": "knowledge",
  "payload": {
    "manifestId": "ctx_01",
    "organizationId": "org_1",
    "principalId": "p_agent_ceo",
    "taskRef": { "taskId": "task_99", "runId": "run_42" },
    "assemblyVersion": "2026.09.08.1",
    "validAt": "2026-09-08T09:00:00.000Z",
    "knownAt": "2026-09-08T09:00:00.000Z",
    "itemCount": 12,
    "itemContentHashes": ["sha256:a", "sha256:b"],
    "totalTokenEstimate": 4800,
    "omittedReasons": [{ "code": "BUDGET", "count": 3 }]
  }
}
```

---

## Armazenamento — ADR0004 e matriz de ownership

| Papel | Tecnologia | Owner module | Conteúdo |
| --- | --- | --- | --- |
| Metadados corpus | PostgreSQL | **knowledge** | Document, Memory, Evidence, Manifest, ACL refs |
| Vetores semânticos | **pgvector** (ext. PG) | **knowledge** | Embeddings indexados por `EmbeddingSpace` |
| Blobs | Object storage + `blobRef` | infra adapter; refs em knowledge PG | PDF, áudio, imagens |
| Claims/evidências relacional | Neo4j (projeção) | **graph** projector consome eventos knowledge | Fonte→claim→evidence |
| Séries temporais mercado | TimescaleDB | **market-data** — **não** knowledge | Observações citadas via port, não armazenadas em knowledge |
| Scratch local | SQLite opcional | dev-only sanitizado | Cache descartável; ST06 isolation |

**Decisão KN-R03-08:** Nenhuma hypertable Timescale em knowledge v1; freshness de market obs consultada via port market-data no passo 6 do pipeline Graph RAG.

---

## Respostas às perguntas abertas (R02)

| # | Pergunta | Decisão R3 |
| --- | --- | --- |
| 1 | Blob storage port vs infra adapter | `BlobStorePort` em contracts; adapter S3/minio knowledge/infra; policy R05 (KN-R03-05) |
| 2 | Evidence vs Memory promoção | Comando `PromoteMemory` + evaluation gate — não auto-promote (KN-R03-03) |
| 3 | Graph RAG híbrido contrato | `GraphTraversalPort` domain; adapter composition root (KN-R03-07) |
| 4 | Working memory TTL owner | **knowledge** owner; orchestration correlaciona `runId` (KN-R03-02) |
| 5 | OCR/STT job states | knowledge workers own states; connections adapter only (KN-R03-06) |

---

## Decisões registradas

| ID | Decisão | Racional |
| --- | --- | --- |
| **KN-R03-01** | pgvector físico em PG sob ownership knowledge | ADR0004; ST06 tenant isolation |
| **KN-R03-02** | Working memory TTL em knowledge | R02 fronteira; spec Memory kinds |
| **KN-R03-03** | Promoção memory via evaluation, não pipeline único | DL-AG3; evita alucinação→Skill |
| **KN-R03-04** | `RetrievalSession` efêmera com audit | AG06 traceability sem duplicar Run |
| **KN-R03-05** | `BlobStorePort` shared contract | ADR0002; vendor em infra |
| **KN-R03-06** | Ingestion state machine owned by knowledge workers | R02 pipeline; connections só invoke |
| **KN-R03-07** | `GraphTraversalPort` sem import Neo4j cross-module | graph g0_ready; ADR0002 |
| **KN-R03-08** | Timescale fora de knowledge | ADR0004 matriz; market-data owner |

---

## Alternativas consideradas → R04

| ID | Alternativa | Veredito | Racional |
| --- | --- | --- | --- |
| **ALT-KN-R03-01** | Vetores em Neo4j | ❌ | ADR0004; pgvector dono knowledge |
| **ALT-KN-R03-02** | Embedding arrays em eventos | ❌ | Payload size + vazamento modelo; usar EmbeddingRef |
| **ALT-KN-R03-03** | ACL pós-topK vector | ❌ | KN-R02-INV-03; AG06 fail |
| **ALT-KN-R03-04** | ContextManifest em orchestration | ❌ | R02 — knowledge monta; orchestration consome |
| **ALT-KN-R03-05** | EmbeddingSpace em connections | ❌ | CX-R03-05 — connections só MODEL offering |
| **ALT-KN-R03-06** | `KnowledgeSource` merged into Document | ❌ | Múltiplos docs por source; políticas ingest distintas |

---

## Riscos (preview — detalhe R07)

| ID | Risco | Severidade | Mitigação R3 |
| --- | --- | --- | --- |
| **RK-KN-R03-01** | Cross-tenant vector leak | Crítica | KN-R03-INV-ESP-01 + ACL SQL pre-filter |
| **RK-KN-R03-02** | Stale ACL após revoke | Alta | KN-R02-INV-06 + `knownAt` revalidation |
| **RK-KN-R03-03** | Re-embed partial publish | Alta | KN-R03-INV-DOC-01 atomic IndexGeneration |
| **RK-KN-R03-04** | Prompt injection via retrieved doc | Alta | Content untrusted; manifest redaction KN-R02-INV-05 |
| **RK-KN-R03-05** | Dimension mismatch silent coalesce | Média | KN-R03-INV-CHK-02 typed error |

---

## Perguntas abertas → R04 (contratos/eventos)

1. Schemas Zod `@anxionos/contracts/knowledge/*` — normalização `context.manifest.*` vs prefixo `knowledge.`.
2. HTTP `/v1/knowledge/*` mapa comando ↔ handler; OpenAPI Scalar.
3. `GraphTraversalPort` — SDK `@anxionos/sdk/graph` vs HTTP interno; timeout/retry.
4. `BlobStorePort` — pacote `packages/storage` vs `@anxionos/database` extension.
5. Score retrieval 0.40/0.20/0.15/0.15/0.10 — config versionada em `RetrievalPolicy`.
6. Evento `knowledge.document.revoked.v1` vs reuse memory.revoked pattern para ACL document.

---

## Projeção Neo4j (referência)

Consumer: `graph:knowledge:v1` (módulo **graph**, P03). knowledge emite eventos; não importa Neo4j.

| Nó / aresta | Fonte evento | Propriedades (sem conteúdo bruto) |
| --- | --- | --- |
| `:KnowledgeSource` | `source.registered` | `sourceId`, `sourceKind` |
| `:Document` | `document.*` | `documentId`, `classification` |
| `:DocumentVersion` | `document.versioned/indexed` | `versionId`, `contentHash` |
| `:Evidence` | `evidence.recorded` | `evidenceId`, `claimTextHash` |
| `:Memory` | `memory.*` | `memoryId`, `memoryKind`, `status` |
| `SUPPORTED_BY` | evidence→document/memory | proveniência |
| `INDEXED_IN` | chunk→embeddingSpace | `embeddingSpaceId` via ref |

---

## Estrutura de pastas (referência R09)

```text
modules/knowledge/
├── domain/
│   ├── entities/document.ts
│   ├── entities/memory.ts
│   ├── entities/evidence.ts
│   ├── entities/embedding-space.ts
│   ├── entities/context-manifest.ts
│   ├── ports/knowledge-indexer.ts
│   ├── ports/retrieval-port.ts
│   ├── ports/embedding-port.ts
│   └── ports/*-repository.ts
├── application/
│   ├── commands/
│   ├── queries/
│   └── services/retrieval-service.ts
├── infrastructure/
│   ├── persistence/pgvector/
│   ├── adapters/blob-store/
│   └── adapters/graph-traversal/
├── api/
├── workers/ingestion-indexing/
└── index.ts
```

---

## Critérios de aceite — R03

| # | Critério | Status |
| --- | --- | --- |
| AC-R03-01 | Agregados core (Source, Document, Chunk/IndexGen, EmbeddingSpace, Memory, Evidence, ContextManifest) tipados | ✅ |
| AC-R03-02 | Ports `KnowledgeIndexer`, `RetrievalPort`, `EmbeddingPort` documentados | ✅ |
| AC-R03-03 | Invariantes domínio `KN-R03-INV-*` (SRC, DOC, CHK, ESP, MEM, EVD, CTX) | ✅ |
| AC-R03-04 | Sketch eventos `knowledge.*.v1` + `context.manifest.created.v1` sem secrets/vetores | ✅ |
| AC-R03-05 | Ownership pgvector/Timescale conforme ADR0004 documentado | ✅ |
| AC-R03-06 | Cinco perguntas R02 respondidas (KN-R03-01..08) | ✅ |
| AC-R03-07 | Alternativas, riscos preview, perguntas encaminhadas R04 | ✅ |
| AC-R03-08 | Alinhamento spec 002 e R02; sem contradição agents/connections/graph | ✅ |
| AC-R03-09 | `RetrievalSession` e `EmbeddingRef` modelados como entidades de suporte | ✅ |

---

## Saída R3

✅ Domain sketch v1 aprovado para **R04 — Contratos e eventos** (`R04-contracts-events.md`).

**Próximo:** schemas `@anxionos/contracts/knowledge/*`, catálogo HTTP `/v1/knowledge/*`, envelopes Zod, testes contrato KN-R02-INV-* e AG06 retrieval E2E spec.
