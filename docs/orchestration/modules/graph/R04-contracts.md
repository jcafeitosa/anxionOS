---
type: debate
---
# R04 — Contratos: `modules/graph`

**Rodada:** R4 · 2026-09-11 · ANX-389  
**Callers:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R05-storage.md](./R05-storage.md) · [ROUNDS.md](./ROUNDS.md)  
**Histórico:** [GraphQuery contracts](../../structure-debate/graph/R04-graphquery-contracts.md)  
**ownerDomain:** `graph` só para eventos de rebuild/inbox/quarentena — **não** substitui eventos dos donos.

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R4)

**In:** GraphQuery envelope T01–T20. **Out:** `/v1/graph/query`. Sem substituir eventos dos donos.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Contratos graph | **graph** |
| adapter-gateway | **KEEP** |

## Superfície de leitura (GraphQuery)

Envelope: `traversalId`, `actorPrincipalId` da sessão, `authorityEpoch`, budgets, `queryVersion`.  
HTTP: `/v1/graph/query`, `/v1/graph/nodes/:id` ([node.get](./node-get-neighbors-api-v1.md) — draft).  
Poll: `minProjectionGeneration` primário; etag `W/"pg:{checkpoint}:neo:{projectionGeneration}"`.  
Layout alvo: `@anxionos/contracts/graph/` (`envelope`, `errors`, `traversals/T01`…`T20`).

GraphQuery **nunca muta**. Mutations: dispatcher `node.create`/`update` → `CommandAccepted` + `projectionPending` (default **async**). Sync wait `X-Graph-Wait-Projection` só PLATFORM, timeout ≤5s.

## Códigos de domínio

| Código | HTTP | Quando |
| --- | --- | --- |
| GRP_TRAVERSAL_UNKNOWN / TRAVERSAL_NOT_FOUND | 404 | catálogo |
| GRP_TYPE_UNREGISTERED | 422 | nodeType fora do registry |
| NODE_NOT_FOUND | 404 | nó inexistente após projeção estável |
| NODE_NOT_PROJECTED | 409 | comando aceito, generation abaixo do pedido |
| GRP_STALE / STALE_BASELINE | 409 | epoch/checkpoint desatualizado |
| GRP_FORBIDDEN / FORBIDDEN_SCOPE | 403 | sem visibilidade — **sem leak de contagem** |
| GRP_BUDGET_EXCEEDED / QUERY_LIMIT | 200 + `complete:false` | budget |
| MERGE_CONFLICT | 409 | T07 `conflicts[]` |
| PROJECTION_TIMEOUT | 504 | sync wait |
| GRAPH_UNAVAILABLE | 503 | Neo4j/PG catálogo |

## Eventos operacionais (não negócio)

`graph.projection.acked.v1` · `graph.rebuild.started.v1` · `graph.rebuild.completed.v1` · `graph.quarantine.v1`. Status operacional também via audit/operations.

## Oráculos

| ID | Prova |
| --- | --- |
| G3-GRP-01 | Inbox replay não duplica nó |
| G3-GRP-02 | Cypher string no client → rejeitado |
| G3-GRP-03 | `NODE_NOT_PROJECTED` ≠ 404 |
| G5-GRP-01 | Agente sem credencial Neo4j |
| G5-GRP-02 | T01 DENY não vaza contagem privada |

## Alternativas rejeitadas

minCheckpoint sozinho como prova de Neo4j; 404 genérico para projeção pendente; Cypher DSL pública; GraphQuery mutável.

## Non-goals

OpenAPI Scalar público (defer); D-GOV-010; pasta approvals; ST08 migrations neste pack.

## Saída R4

Para [R05](./R05-storage.md).
