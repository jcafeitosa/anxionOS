---
type: debate
---
# R06 — Dependências: `modules/operations`

**Rodada:** R6 · 2026-09-11 · ANX-389 · ANX-111  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md). Sem API runtime.

## Decisões

OPS-R06-01 health via eventos/probes — sem import infra alheia  
OPS-R06-02 graph SDK leitura  
OPS-R06-03 T01 export/incident  
OPS-R06-04 D-GOV-010 = risk P06  
OPS-R06-05 PC 17/18/20 sem pastas novas

## Upstream

audit, observability, graph, identity, organizations, governance, eventing.

## Downstream

apps/api health, Platform console, deploy pipelines (procedimento), audit subscriber.

## Imports proibidos

`audit/infrastructure/**`, `neo4j-driver`, secret plaintext em domain.

## Saída R6

Mapa v1.
