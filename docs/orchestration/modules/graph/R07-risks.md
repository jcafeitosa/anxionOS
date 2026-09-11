---
type: debate
---
# R07 — Riscos: `modules/graph`

**Rodada:** R7  
**Data:** 2026-09-11

| ID | Risco | Mitigação |
| --- | --- | --- |
| R-GRP-01 | ALLOW só do grafo stale | revalidar epoch PG |
| R-GRP-02 | Cypher injection | traversalId only |
| R-GRP-03 | Credencial Neo4j em agente | adapter exclusivo |
| R-GRP-04 | Inbox poison pill | quarentena + rebuild (structure R07) |
| R-GRP-05 | Cache T01 pós-revogação | epoch na chave |
| R-GRP-06 | 24º módulo gateway | proibido |

Oráculos: G5-GRP-01 zero credencial; G5-GRP-02 FORBIDDEN sem leak; G3-GRP-01 inbox idempotente.

## Saída R7

Para R8.
