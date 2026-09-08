---
type: debate
---

# R04 — Contratos, eventos e superfície pública: `modules/knowledge`

**Componente:** modules/knowledge  
**Rodada:** R4 — Contratos, eventos e exports  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-85 (debate) · spec 002 · gate implementação: ANX-36  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R02-boundaries.md](./R02-boundaries.md) · `brain/project-docs/specs/002-agents-knowledge/spec.md`

## Objetivo da rodada

Definir schemas Zod `@anxionos/contracts/knowledge/*`, HTTP `/v1/knowledge/*`, catálogo `knowledge.*.v1`, ports `BlobStorePort` e `GraphTraversalPort`, testes contrato KN-R02/KN-R03.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| `ownerDomain` | `"knowledge"` |
| `eventType` | `knowledge.<aggregate>.<action>.v1` · manifest: `context.manifest.created.v1` |
| Idempotência | Header `Idempotency-Key` → `commandId` |

## Layout contracts

```text
packages/contracts/src/knowledge/   # types, commands, queries, events
packages/contracts/src/storage/     # BlobStorePort
packages/contracts/src/graph/       # GraphTraversalPort DTOs
```

## Ports compartilhados

**KN-R04-01:** `BlobStorePort` em `@anxionos/contracts/storage` — put/get/head/delete por `BlobRef`; eventos só ref+hash.

**KN-R04-02:** `GraphTraversalPort` in-process via `@anxionos/graph` SDK v1; T05/T10 allowlist; timeout 2s interactive.

## HTTP `/v1/knowledge/*`

| Método | Path | Operação |
| --- | --- | --- |
| POST | `/v1/knowledge/documents:ingest` | IngestDocument |
| POST | `/v1/knowledge/query` | QueryKnowledge |
| POST | `/v1/knowledge/context-manifests` | BuildContextManifest |
| GET/POST | `/v1/knowledge/memories*` | Memory lifecycle |
| POST | `/v1/knowledge/evidence` | RecordEvidence |
| GET/POST | `/v1/knowledge/embedding-spaces` | EmbeddingSpace admin |

Grant mínimo: `knowledge.read` / `knowledge.write` / `knowledge.admin` / `knowledge.verify`.

## Eventos v1

| eventType | Consumidores |
| --- | --- |
| `knowledge.document.indexed.v1` | graph, agents |
| `knowledge.chunk.embedded.v1` | graph, cache |
| `knowledge.evidence.recorded.v1` | graph, decisions |
| `knowledge.memory.revoked.v1` | graph, cache invalidation |
| `knowledge.document.revoked.v1` | graph, cache (KN-R04-03) |
| `context.manifest.created.v1` | agents, orchestration |

Payloads **proibidos:** arrays embedding, texto documento completo, chain-of-thought, secrets.

## Testes contrato (G1)

`backend/tests/contracts/knowledge-contracts.test.ts` — KN-R02-INV-02/03, KN-R03-INV-CHK-02, forbidden payload keys.

## Decisões

| ID | Decisão |
| --- | --- |
| KN-R04-01 | BlobStorePort shared contracts |
| KN-R04-02 | GraphTraversalPort SDK in-process |
| KN-R04-03 | `knowledge.document.revoked.v1` distinto memory.revoked |
| KN-R04-04 | HTTP mapa spec 002 |
| KN-R04-05 | `context.manifest.*` prefixo spec 002 |
| KN-R04-06 | Lint CI proíbe vetores em eventos |

## Critérios de aceite — R04

| # | Critério | Status |
| --- | --- | --- |
| AC-R04-01 | Layout contracts + ports | ✅ |
| AC-R04-02 | Catálogo eventos v1 | ✅ |
| AC-R04-03 | HTTP mapa + grants | ✅ |
| AC-R04-04 | BlobStorePort + GraphTraversalPort | ✅ |
| AC-R04-05 | Plano testes contrato | ✅ |
| AC-R04-06 | Sem secrets/vetores payloads | ✅ |

## Saída R4

✅ → [R05-storage-pg.md](./R05-storage-pg.md)
