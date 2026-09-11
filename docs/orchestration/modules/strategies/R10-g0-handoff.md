---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/strategies`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issues:** ANX-389 (pack P1) · ANX-89 (debate histórico) · ANX-58 · **ANX-90** (impl — **não** executada aqui)  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).

## G0 — Escopo documental / G1 futuro

### In scope

| Área | Entrega |
| --- | --- |
| Domínio | Strategy, StrategyVersion, BacktestRun, Deployment, Signal |
| Contratos | `@anxionos/contracts/strategies/*` + eventos v1 R04 |
| Persistência | PostgreSQL strategies_* + journal + outbox (ADR0004) |
| Ports | MarketDataPort, BacktestRunnerPort, TraversalEvaluator |
| API | `/v1/strategies` esboço R04 |
| Testes | G3-ST-* ; G5-ST-01..05 |

### Out of scope

| Item | Destino |
| --- | --- |
| TradeIntent / Order | decisions / execution |
| P&L / Timescale | performance |
| Ticks | market-data |
| Certification | evaluation |
| Neo4j driver | graph |

## Non-goals

- Nenhuma migration ST08 neste pack.
- Specs 001–005 **draft**; ANX-342 `todo`; D-GOV-010 = risk P06.
- Strategies não emite Order/TradeIntent.
| Pasta products/ | PC 10 — não criar |
| D-GOV-010 | risk P06 |
| Spec 003 accepted | Owner + checklist (ST08 0/23) |
| ANX-342 G7 | Owner — **não** marcar done |
| G7 código | Owner + ANX-90 |

## PC-G0 avaliação (debate)

| ID | Status |
| --- | --- |
| PC-G0-01..03 | R1–R10 fat neste diretório |
| PC-G0-04 | spec 003 Strategy Factory **draft** |
| PC-G0-05 | R06–R08 sem bloqueio documental |
| PC-G0-06 | ANX-58 contrato P06 |
| PC-G0-07 | Top 5 riscos R07 |
| PC-G0-08 | graph:strategies:v1 |
| PC-G0-09 | RLS application-only D-ST-015 |
| PC-G0-10 | Impl issue ANX-90 existe — **não** é este slice |

**Veredito P1:** pack G0 **documental completo** (profundidade agents-like). **Não** autoriza G1. Spec 003 `draft`. Próximo serial: [performance](../performance/ROUNDS.md).

## Saída R10

G0 debate P1. ANX-389 permanece evidência — não G7 de produto. ANX-342 permanece `todo`.
