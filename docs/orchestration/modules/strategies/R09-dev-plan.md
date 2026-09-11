---
type: debate
status: draft
---
# R09 — Plano de implementação: `modules/strategies`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue debate:** ANX-389 / ANX-89 · impl futura **ANX-90** (não neste pack)  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R9)

**In:** plano G1 futuro (ANX-90). **Out:** slices documentais. Zero código neste pack.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Plano strategies | **strategies** |
| adapter-gateway | **KEEP** |

## Pré-requisitos G1 futuro

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 documental | este pack |
| 2 | eventing + outbox | packages/eventing |
| 3 | graph consumer graph:strategies:v1 | graph |
| 4 | market-data MarketDataPort | ANX-88 |
| 5 | agents AgentBindingLookup | agents pack |

## Árvore ADR0002 (alvo G1)

```text
backend/modules/strategies/src/
  domain/entities/  domain/ports/
  application/commands/
  infrastructure/persistence/
  api/
  index.ts
```

Não scaffoldar 23 módulos. Não criar `products/` nem `approvals/`.

## Fatias P06 (pós-greenlight Owner)

| Slice | Entrega | Critério |
| --- | --- | --- |
| P06-S1 | schema strategies_* + contracts skeleton | G2 G4 |
| P06-S2 | StrategyVersion publish + UoW/outbox | G3 G4 |
| P06-S3 | BacktestRun + BacktestRunnerPort | G3 G5 parcial |
| P06-S4 | Deployment + binding snapshot | G3 G4 |
| P06-S5 | Signal emit + HTTP | G3 G5 |

## Matriz testes

| ID | Caso |
| --- | --- |
| G3-ST-S1-01 | publish idempotente |
| G3-ST-S2-01 | lifecycle inválido rejeitado |
| G3-ST-S3-01 | stale signal rejeitado |
| G3-ST-S4-01 | binding mismatch |
| G5-ST-01..05 | ver R07 |

## Defer

REAL/live; OpenAPI Scalar público; D-GOV-010; research-python protocol (ANX-90 S3); RLS P09.

P1 **só** fecha o pack G0 documental. **Nenhuma migration ST08.**

## Saída R9

Plano documental aprovado para R10.
