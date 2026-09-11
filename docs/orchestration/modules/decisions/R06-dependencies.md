---
type: debate
---
# R06 — Dependências: `modules/decisions`

**Rodada:** R6  
**Data:** 2026-09-11  
**Issues:** ANX-97 · ANX-85 · ANX-95 · ANX-91 · ANX-89 · ANX-58 · pack ANX-389  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md) · [ROUNDS.md](./ROUNDS.md). Sem API runtime neste artefato.

## In / Out (R6)

**In:** ports de Grant/epoch (governance), Evidence refs (knowledge), T01 (graph), signal (strategies), position bounds (portfolios), reservation/available (capital), price asOf (market-data), AgentVersion metadata (agents), `risk.check.completed.v1`, packages/contracts + eventing P02.

**Out:** `decisions.intent.submitted.v1` → execution; `decision.recorded` → audit; WAITING_HUMAN hook → orchestration; projector `graph:decisions:v1`. Sem mutate de Grant, Permit, Reservation, Order ou Neo4j driver.

## Non-goals

Não D-GOV-010 neste módulo (risk P06). Não import de `governance/infrastructure` nem `risk/infrastructure`. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (dependências)

| Superfície | Dono |
| --- | --- |
| DecisionRecord / TradeIntent | **decisions** |
| Grant / Policy | **governance** |
| RiskCheck | **risk** |
| Reservation | **capital** |
| Order | **execution** |
| adapter-gateway | **KEEP** |

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

- **risk** not_started — S2 usa fixture `risk.check.completed.v1`
- **execution** not_started — submit emite evento; execution consumer defer

→ **R07** ([R07-risks.md](./R07-risks.md))
