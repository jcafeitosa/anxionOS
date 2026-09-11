---
type: debate
---
# R06 — Dependências: `modules/partners`

**Rodada:** R6  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-113 · gate billing ANX-103  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md). Sem API runtime.

## In / Out (R6)

**In:** billing events paid/refund; PrincipalLookup; AgencyScopePort; TraversalEvaluator T01; eventing.

**Out:** `partners.*` para accounting/operations/graph/audit; projector `graph:partners:v1`. Sem mutate de invoice ou journal alheio.

## Non-goals

D-GOV-010 = **risk P06**. Sem pasta marketplace. Sem neo4j-driver neste módulo. Sem import `billing/infrastructure/**`.

## Ownership de ports

| Port | Dono |
| --- | --- |
| EventConsumer billing | **partners** application |
| AgencyScopePort | **organizations** |
| TraversalEvaluator | **governance** |
| Projector | **graph** |

**KEEP adapter-gateway**.

## Decisões

| ID | Decisão |
| --- | --- |
| PTR-R06-01 | Accrual só evento billing — sem import billing/infra |
| PTR-R06-02 | AgencyScopePort sem FK |
| PTR-R06-03 | T01 fail-closed |
| PTR-R06-04 | graph:partners:v1 no módulo **graph** |
| PTR-R06-05 | Não emite journal accounting |
| PTR-R06-06 | D-GOV-010 = risk P06 |
| PTR-R06-07 | Sem pasta marketplace |

## Upstream

identity, organizations, governance T01, billing events, eventing, contracts.

## Downstream

accounting, operations, graph, audit, Partner console.

## Imports proibidos

`billing/infrastructure/**`, `accounting/infrastructure/**`, `neo4j-driver`, rails de pagamento em `domain/`.

```mermaid
flowchart TB
  bil[billing] --> ptr[partners]
  gov[governance T01] --> ptr
  ptr --> acc[accounting]
  ptr --> ops[operations]
  ptr --> grp[graph]
```

## Saída R6

Mapa v1 para R7.
