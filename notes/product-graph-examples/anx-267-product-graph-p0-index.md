---
type: example
title: Product Graph — exemplo ANX-267 P0 indexação
description: Instância P0 planejada para indexação OKF + issues do Product Graph.
status: draft
owner: Produto
created: 2026-09-10
tags:
  - product-graph
  - ANX-267
---
# Product Graph — ANX-267 P0 indexação (planejado)

## Nós

| id | type | Campos |
| --- | --- | --- |
| prob:product-traceability-gap | Problem | Features sem rastreio problema→código→teste em P0 |
| req:product-graph-p0-index | Requirement | OKF SHALL indexar nós/arestas Product Graph por issue |
| feat:product-graph-p0-cli | Feature | CLI orchestration:product-graph query (proposed) |
| cap:orchestration-product-graph | Capability | ownerDomain=cursor-orchestration |
| svc:orchestration-cli | Service | .cursor/orchestration/bin/ |
| wi:ANX-267 | WorkItem | identifier=ANX-267, status=todo |

## Arestas

```text
feat:product-graph-p0-cli ADDRESSES prob:product-traceability-gap
feat:product-graph-p0-cli IMPLEMENTS req:product-graph-p0-index
cap:orchestration-product-graph ENABLES feat:product-graph-p0-cli
feat:product-graph-p0-cli TRACKED_IN wi:ANX-267
```

## Critérios de aceite ANX-267

- [x] 3 instâncias de exemplo em brain/notes/product-graph-examples/
- [ ] Queries P0 executáveis via OKF search
- [ ] Frontmatter productGraph em specs (proposed P1)