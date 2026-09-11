---
type: debate
---

# R02 — Fronteiras: `modules/portfolios`

**Componente:** modules/portfolios  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-95** · contrato P06: **ANX-58**

## In / Out (R2)

**In:** posição canônica e ValuationSnapshot.

**Out:** Allocation/reserva (`capital`). Ledger (`accounting`). Mandate (`governance`). SQLite posição.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Portfolio / Position / ValuationSnapshot | **portfolios** |
| adapter-gateway | **KEEP** |

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre portfolios e vizinhos (**capital**, **accounting**, **strategies**, **organizations**, **market-data**, **execution**, **decisions**, **risk**, **performance**, **graph**); ratificar **PostgreSQL** como único dono de **posição canônica** e **ValuationSnapshot** autoritativa; separar posição de alocação/reserva, ledger e mandato; proibir SQLite para estado de posição; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido |
| spec 003 § Position, Valuation, Reconciliação | Position key, lotes, ValuationSnapshot, NAV |
| spec 001 | Conta/reserva/intenção — owners por domínio |
| [capital/R02-boundaries.md](../capital/R02-boundaries.md) | Allocation vs Position; FI02 shared account |
| [accounting/R02-boundaries.md](../accounting/R02-boundaries.md) | Ledger vs posição read model |
| [strategies/R02-boundaries.md](../strategies/R02-boundaries.md) | Deployment/mandato vs portfolio container |
| [market-data/R02-boundaries.md](../market-data/R02-boundaries.md) | Preço observado vs marcação oficial |
| [execution/R01-context.md](../execution/R01-context.md) | Fill como gatilho de posição |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Debate R2 (diálogo atribuído)

**Arquiteto:** portfolios é dono de **Portfolio** (container), **Position** canônica, **Holding** (lote atribuído), **ValuationSnapshot** e **RebalancePlan** — o que está investido, como está marcado e planos de realocação **dentro** do mandato. capital reserva **disponível**; accounting confirma **ledger**; execution confirma **fills**.

**Crítico (capital):** Allocation limita portfolio — quem persiste?

**Arquiteto:** **capital** persiste `Allocation` e `CapitalReservation` com `portfolioId` referenciado. **portfolios** persiste metadados do Portfolio (`capitalAccountId`, `baseCurrency`, `status`) e **valida** que `portfolioId` existe antes de aceitar posição — não reescreve limites nem reservas.

**Crítico (accounting):** Posição cash vs ledger — duplicata?

**Arquiteto:** **accounting** é fonte de **ledger confirmado** (caixa settled). **portfolios** mantém **Position** e cash position lines derivadas de `execution.fill.confirmed.v1` + `accounting.ledger.posted.v1` — reconciliação explícita via `ReconciliationCase` (portfolios owner) sem inventar lançamento contábil.

**Crítico (strategies):** Mandato de deployment — strategies ou portfolios?

**Arquiteto:** **strategies** dono de `StrategyVersion`, `Deployment`, `Signal`. **portfolios** referencia `deploymentId`/`strategyDeploymentId` em **Holding** attribution — não publica estratégia nem emite sinal.

**Crítico (organizations):** Tenancy — Agency mistura portfolios?

**Arquiteto:** Todo comando/query escopado `organizationId` + validação Owner via **organizations** port. Portfolio só vincula `capitalAccountId` cujo `ownerUserId` pertence à mesma org — cross-tenant = bloqueador G4.

**Crítico (market-data):** Valuation asOf — fonte de verdade?

**Arquiteto:** **market-data** dono de observações e `MarketEvent`. **portfolios** materializa **ValuationSnapshot** referenciando `observationId`/`valuationVersion` — não replica série de ticks; snapshot imutável após `CONFIRMED`.

**Security:** Posições e NAV sempre escopados `organizationId`; segredos venue nunca em payloads de posição.

**Executor:** v1 alinha ANX-58: portfolios SIMULATED/PAPER; sem posição REAL venue homologada.

**Síntese Orquestrador:** Fronteira aceita; PG posição autoritativa; quatro domínios separados (position / allocation / ledger / mandate); proibição REAL/live e SQLite posição fechadas para R03/R05.

---

## Decisão: quatro domínios de exposição (R02 núcleo)

| Domínio | Dono | O que persiste | O que **não** persiste |
| --- | --- | --- | --- |
| **Posição / valuation** | **portfolios** | Portfolio, Position, Holding, ValuationSnapshot, RebalancePlan | Reserva, Allocation, ledger entry |
| **Alocação / reserva** | **capital** | CapitalAccount, Allocation, CapitalReservation, BalanceView | Position quantity, NAV oficial |
| **Ledger institucional** | **accounting** | JournalEntry, LedgerPosting, FeePosting | Position canônica, exposure gross/net |
| **Mandato / sinal** | **strategies** | StrategyVersion, Deployment, Signal | Portfolio container, rebalance execution |

## Decisão: possui / não possui (completo)

| Dado / comportamento | Dono |
| --- | --- |
| Portfolio, Position, Holding, ValuationSnapshot, RebalancePlan | **portfolios** |
| PositionReconciliationCase (qty/cost vs fill/ledger) | **portfolios** |
| CapitalAccount, Allocation, CapitalReservation | **capital** |
| BalanceView (`available`, encumbrances) | **capital** (derivado) |
| JournalEntry, LedgerPosting, ReconciliationCase financeiro | **accounting** |
| StrategyVersion, Deployment, Signal | **strategies** |
| Order, Fill, venue reconciliation protocol | **execution** |
| Instrument, PriceObservation, MarketEvent | **market-data** |
| TradeIntent, Decision | **decisions** |
| RiskCheck, PolicyVersion, kill switch | **risk** |
| P&L, attribution, performance metrics | **performance** (derivado) |
| Owner, Agency membership | **organizations** |
| Nó portfolio→posição→instrumento | **graph** (projeção) |

## Invariantes R02 (`PF-R02-INV-*`)

| ID | Regra |
| --- | --- |
| PF-R02-INV-01 | Position key única: `(capitalAccountId, instrumentId, positionSide, book)` — sem duplicata por deployment |
| PF-R02-INV-02 | portfolios não persiste Allocation nem CapitalReservation |
| PF-R02-INV-03 | portfolios não persiste JournalEntry/LedgerPosting — só consome eventos accounting |
| PF-R02-INV-04 | portfolios não publica StrategyVersion/Signal — só referencia deploymentId em Holding |
| PF-R02-INV-05 | Fill→position: idempotente por `(fillId, positionSide)` ou `idempotencyKey` |
| PF-R02-INV-06 | ValuationSnapshot referencia observationId/asOf — não copia série market-data |
| PF-R02-INV-07 | capital não emite `portfolios.position.updated` — só portfolios confirma posição |
| PF-R02-INV-08 | SQLite **proibido** para Position/Holding/ValuationSnapshot autoritativos |
| PF-R02-INV-09 | `executionMode=REAL` posição venue REAL → rejeitado v1 |
| PF-R02-INV-10 | Portfolio `capitalAccountId` deve ter mesmo `ownerUserId` (organizations) |
| PF-R02-INV-11 | RebalancePlan não executa ordem — emite plano; decisions/execution executam |
| PF-R02-INV-12 | Cross-portfolio exposure query usa portfolios read API — risk não reescreve Position |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui completa | ✅ |
| AC-R02-02 | Position ≠ capital allocation separados | ✅ |
| AC-R02-03 | Position ≠ accounting ledger separados | ✅ |
| AC-R02-04 | Portfolio ≠ strategies mandate separados | ✅ |
| AC-R02-05 | PG posição autoritativa; zero SQLite | ✅ |
| AC-R02-06 | organizations tenancy explícito | ✅ |
| AC-R02-07 | REAL/live proibido v1 | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
