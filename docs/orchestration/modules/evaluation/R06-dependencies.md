---
type: debate
---
# R06 — Dependências: `modules/evaluation`

**Rodada:** R6 · ANX-389 · ANX-109  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md).

EVL-R06-01 não importa simulation/infra · EVL-R06-02 T01 cert · EVL-R06-03 graph:evaluation:v1 · EVL-R06-04 D-GOV-010 = risk P06 · EVL-R06-05 sem pasta testing/

Upstream: strategies (subject ids), agents, simulation events, performance events, knowledge (evidence refs), identity, organizations, governance, eventing.

Downstream: strategies (certification.issued), governance (recommendation), agents (reputation), graph, audit.

Imports proibidos: `strategies/infrastructure/**`, `simulation/infrastructure/**`, `neo4j-driver`.

## Saída R6

Mapa v1.
