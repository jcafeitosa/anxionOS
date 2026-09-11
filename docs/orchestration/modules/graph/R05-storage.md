---
type: debate
---
# R05 — Armazenamento: `modules/graph`

**Rodada:** R5  
**Data:** 2026-09-11  
**ADR0004:** Neo4j = kernel de grafo; PostgreSQL = catálogo Txx, inbox, rebuild; **não** Timescale; **não** pgvector neste módulo (embeddings em knowledge).

| Store | Uso |
| --- | --- |
| PostgreSQL graph_* | catálogo, inbox, rebuild jobs, command journal admin |
| Neo4j | nós/arestas projetados |
| SQLite | **proibido** para T01/grants |

Cache T01: chave inclui authorityEpoch, riskEpoch, intentHash — invalidação pós-revogação (structure R05).

Sem FK para organizations_*/governance_*.

## Saída R5

Para R6.
