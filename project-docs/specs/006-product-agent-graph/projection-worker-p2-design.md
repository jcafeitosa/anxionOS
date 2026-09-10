---
type: design
title: Product Graph projection worker — design P2 (sandbox)
description: Design pré-implementação ANX-277. Bloqueado até greenlight ANX-276.
status: draft
decision_status: proposed
owner: Graph module
created: 2026-09-10
version: "0.1"
tags:
  - graph
  - neo4j
  - ANX-277
  - p2
---
# Product Graph projection worker — design P2

**Issue:** ANX-277 · **Bloqueio:** ANX-276 Owner greenlight · **ADR:** 0005 proposed

## Objetivo

Projetar nós/arestas Product+Agent Graph em Neo4j **read-only**, reconstruível a partir de eventos com `eventId`, `checkpoint`, `ownerDomain`.

## Reuso do módulo graph existente

| Componente existente | Uso ANX-277 |
| --- | --- |
| `projection-consumer.ts` | Padrão inbox idempotency |
| `process-with-inbox.ts` | ACK após COMMIT |
| `createProductAgentGraphSchemaRegistry()` | Allowlist nodes/edges |
| `graph-store-adapter.ts` (Neo4j) | Writer read-model |
| `rebuild-worker.ts` | Full generation swap |

## Novo (escopo ANX-277)

```mermaid
flowchart LR
  EVT[Domain events product/agents] --> OUT[outbox relay]
  OUT --> PC[product-graph-projector]
  PC --> INBOX[projection inbox]
  INBOX --> NEO[(Neo4j product domain)]
  OKF[brain/ OKF index] -. manual seed .-> NEO
```

### Projector `product-graph-projector`

- `ownerDomain`: `product` | `agents`
- Eventos mapeados (v1):
  - `WorkItemStatusChanged` → WorkItem node + TRACKED_IN
  - `DecisionRecorded` → Decision node + APPROVED edge
  - `FeatureDelivered` → Feature + IMPLEMENTS (manual/event futuro)

### Constraints Neo4j

- Labels prefixados: `ProductGraph_*`, `AgentGraph_*`
- Separado de labels institucionais (`Agency`, `Grant`, …)
- Tombstone events — sem DELETE silencioso

## Não escopo ANX-277

- Produção Neo4j homologada
- Pipeline OKF→Neo4j automático (issue futura)
- Escrita direta por agentes

## Critérios aceite implementação

- [ ] Sandbox Neo4j up via docker profile
- [ ] 1 evento → 1 nó projetado idempotente
- [ ] Rebuild from inbox passa
- [ ] `bun test` graph module green
- [ ] G2 arquitetura PASS

## Dependências

1. ANX-276 greenlight
2. ADR0005 `decision_status: accepted`
3. Schema registry ANX-271 (done)
