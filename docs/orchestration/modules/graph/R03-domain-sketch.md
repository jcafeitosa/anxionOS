---
type: debate
---
# R03 — Esboço de domínio: `modules/graph`

**Rodada:** R3  
**Data:** 2026-09-11  
Histórico: [schema registry](../../structure-debate/graph/R03-schema-registry.md).

## Agregados operacionais (não ledger de negócio)

- TraversalCatalogEntry (traversalId, queryVersion, class: kernel_puro|composto|híbrido)
- ProjectionInboxRecord (eventId, consumerName, checkpoint, generation)
- RebuildJob (ownerDomain order, cutoff, alias)
- GraphNode/Edge **projetados** (Neo4j) com marcadores eventId/checkpoint/ownerDomain

## Classificação T01–T20 (v1)

| Classe | Traversals |
| --- | --- |
| Kernel puro | T01 T02 T03 T05 T06 T09 T10 T11 T12 T13 T14 T15 T19 |
| Kernel composto | T04 T07 T17 |
| Híbrido registrado | T08 T16 T18 T20 |

INV-GRP-01: T01 ALLOW mutável nunca cacheado com intentHash ativo.  
INV-GRP-02: inbox idempotente (eventId, consumerName).  
INV-GRP-03: rebuild não escreve PG dos donos.

Ports: TraversalCatalog, ProjectionInbox, Neo4jProjectionPort, RebuildScheduler, GraphQueryDispatcher.

## Saída R3

Para R4.
