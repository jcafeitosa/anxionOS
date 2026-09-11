---
type: debate
---
# R06 — Dependências: `modules/simulation`

**Rodada:** R6 · ANX-389 · ANX-115  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md).

SIM-R06-01 Backtest via evento strategies — sem import strategies/infra  
SIM-R06-02 fixtures market-data (hashes)  
SIM-R06-03 T01 start run  
SIM-R06-04 graph:simulation:v1  
SIM-R06-05 D-GOV-010 = risk P06  
SIM-R06-06 sem pasta experiments/

Upstream: strategies events, market-data fixtures, governance sandbox scope, identity, organizations, eventing.

Downstream: evaluation (`run.completed`), strategies (resultRef), audit, graph.

Imports proibidos: `execution/infrastructure/**`, `neo4j-driver`, LLM SDK em domain.

## Saída R6

Mapa v1.
