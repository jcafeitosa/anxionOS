---
type: debate
---

# R06 — Dependências: `modules/decisions`

**Issues:** ANX-97 · ANX-85 · ANX-95 · ANX-91 · ANX-89 · ANX-58

## Upstream

| Componente | Contrato |
| --- | --- |
| **knowledge** | Evidence, ContextManifest refs |
| **governance** | Grant validate, authorityEpoch |
| **graph** | T01 traversal read |
| **strategies** | signal.emitted.v1 |
| **portfolios** | position/valuation bounds |
| **capital** | reservation, available |
| **market-data** | price asOf |
| **agents** | AgentVersion metadata |
| **risk** | check.completed.v1 |
| packages/contracts, eventing | P02 |

## Downstream

| Componente | Evento |
| --- | --- |
| **execution** | decisions.intent.submitted.v1 |
| **risk** | intent created for check |
| **audit** | decision.recorded + manifestHash |
| **orchestration** | approval.requested (WAITING_HUMAN) |
| **graph** | decisions.* projeção |

## Ordem bootstrap S1–S2 (ANX-98)

1. governance grant stub (ANX-30)
2. knowledge evidence fixture (ANX-86 após ANX-85 G7)
3. portfolios position stub (ANX-96 após ANX-95 G7)
4. decisions S1: schema + contracts skeleton
5. decisions S2: propose + submit + intent.submitted.v1

## Bloqueadores

- **risk** not_started — S2 usa fixture risk.check.completed.v1
- **execution** not_started — submit emite evento; execution consumer defer

→ **R07** ([R07-risks.md](./R07-risks.md))
