---
type: debate
---
# R04 — Contratos: `modules/graph`

**Rodada:** R4  
**Data:** 2026-09-11  
**ownerDomain:** `graph` só para eventos de rebuild/inbox — **não** substitui eventos dos donos.

## Superfície

- GraphQuery envelope: traversalId, actorPrincipalId da sessão, authorityEpoch, budgets.
- HTTP `/v1/graph/query`, `/v1/graph/nodes/:id` ([node.get](./node-get-neighbors-api-v1.md)).
- Dispatcher `node.create/update` → commandId + projectionPending (default async).

Códigos: GRP_TRAVERSAL_UNKNOWN, GRP_TYPE_UNREGISTERED, GRP_STALE, GRP_FORBIDDEN, GRP_BUDGET_EXCEEDED.

Eventos operacionais (não negócio): `graph.projection.acked.v1`, `graph.rebuild.started.v1`, `graph.rebuild.completed.v1` — status também via audit/operations.

## Oráculos

G3-GRP-01 inbox replay não duplica nó.  
G3-GRP-02 Cypher string no client → rejeitado.  
G5-GRP-01 agente sem credencial Neo4j.  
G5-GRP-02 T01 DENY não vaza contagem privada.

## Saída R4

Para R5.
