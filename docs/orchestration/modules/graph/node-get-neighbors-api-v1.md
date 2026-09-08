---
title: node.get e traversal.neighbors API v1
description: Endpoints GraphQuery read — ANX-34
type: specification
status: draft
issue: ANX-34
---
# node.get + traversal.neighbors v1

## node.get

`GET /v1/graph/nodes/{nodeKey}` — poll de projeção (`nodeGetQuerySchema`).

## traversal.neighbors

`POST /v1/graph/traversal/neighbors` — envelope GraphQuery + `neighborsTraversalInputSchema`.

**Resposta:** `GraphQueryResult` com `meta.traversalId = "neighbors"` e `data.neighbors[]`.

## Evidência

```
bun test backend/tests/graph/unit/neighbors-traversal.test.ts
bun test backend/tests/contracts/graph.test.ts
```
