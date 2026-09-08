---
type: debate
---

# R01 — Contexto: `modules/market-data`

**Componente:** modules/market-data  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07 (expandido 2026-09-08)  
**Issue debate estrutura:** ANX-42 · **debate módulo:** ANX-87

## Propósito

Dono institucional de **identidade de mercado** e **observações temporais** — instrumentos, catálogos, feeds, qualidade de dados, calendários/sessões, corporate actions como eventos de mercado, e séries (ticks, candles, trades, order books, funding, métricas derivadas elegíveis). Fornece preços e metadados **asOf** para risk, strategies, portfolios e simulation, sem executar ordens nem registrar ledger financeiro.

Alinha spec 003 (R12 — Market Data) e [execution-modes](../../system-capabilities/execution-modes-and-asset-classes.md): stocks, cripto e multi-asset com políticas de freshness e replay.

## O que possui / não possui

### Possui (donos de estado ou composição)

| Agregado / artefato | Responsabilidade resumida |
| --- | --- |
| `Asset` / `Instrument` / `InstrumentSpec` | Identidade canônica venue+symbol+validity; lot/tick/settlement/calendar |
| `MarketConfigVersion` / domínios habilitados | Escopo stocks/crypto por agency (observação vs trading — DRAINING) |
| `MarketObservation` | sourceId, sequence, instrumentId, eventTime, qualityFlags, dedupe |
| Séries temporais | ticks, candles, trades, order books, funding, métricas em **TimescaleDB** |
| `MarketEvent` | macro, corporate action, funding, incident de feed — com proveniência |
| `FreshnessPolicy` | maxAge, clock skew, comportamento stale por operação/fonte |
| `CorrelationObservation` | método, janela, asOf — hipótese, não autorização |
| Replay datasets | ingestão fixada sem mercado live (SIMULATED) |
| Journal + outbox | `market_data.*.v1` com `ownerDomain: market-data` |

### Não possui (fronteiras ADR0002 / brain)

| Item | Dono correto |
| --- | --- |
| Posições, valuation, exposição consolidada | **portfolios** |
| Ordens, fills, permits, reconciliação venue | **execution** |
| Ledger, taxas, settlement, dividendos lançados | **accounting** |
| StrategyVersion, backtest state, Deployment | **strategies** |
| TradeIntent, Decision | **decisions** |
| Provider binding, credenciais feed, invoke adapter | **connections** (market-data consome normalizado) |
| Traversal kernel, projeção Neo4j | **graph** (market-data emite eventos) |
| P&L, atribuição | **performance** |

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | organizations (`marketScope`, DRAINING), governance (licenças/export), packages/database, **connections** (`MARKET_DATA` binding — leitura normalizada), graph (projeção Asset/Instrument/Venue) |
| **Downstream** | strategies, portfolios, decisions, risk, performance, simulation, audit |
| **Contratos transversais** | ANX-58 (ciclo P06 SIMULATED/PAPER), ANX-62 (evento `connections.market_data.observed.v1`) |

## Armazenamento (ADR0004)

| Camada | Conteúdo | Notas |
| --- | --- | --- |
| **PostgreSQL (OLTP)** | Instrument registry, specs versionadas, policies, licenses, journal/outbox, metadados de dataset replay | Fatos transacionais confirmados |
| **TimescaleDB** | Hypertables de observações e séries de alta frequência | Extensão PG; **não** ledger nem ordens |
| **Neo4j (projeção)** | Asset, Venue, Instrument, MarketEvent, janelas, sinais, qualidade — **referências**, não cada tick | graph projector `graph:market-data:v1` |
| **Object storage** | Payloads volumosos (book snapshots, arquivos replay) | Ref + hash em PG |
| **SQLite** | Fixture/replay local autorizado em dev/test | Nunca fonte institucional compartilhada |

Fonte: `brain/notes/anxionos-storage-ownership.md`, ADR0004.

## Política de ambiente (v1 debate)

| Modo | market-data |
| --- | --- |
| **SIMULATED** | Replay/histórico/backtest — dataset fixado; sem chamada live |
| **PAPER** | Feeds atuais via connections `MARKET_DATA` / simulação; sem ordem REAL |
| **REAL (live trading)** | **Fora do escopo v1** — sem paths de credencial venue, sem ingestão live homologada para execução REAL |

Conexão com connections: kind `MARKET_DATA` permitido; `REAL_EXECUTION` proibido (ANX-62 / CX-R02). market-data **não** abre socket broker/exchange direto — normalização entra por connections ou fixture autorizada.

## Estado do código atual

**Ausente.** Epic Wave P06 ANX-58 (contrato ciclo financeiro) referencia market-data como origem do pipeline integrado.

## Perguntas abertas para debate

| # | Pergunta | Rodada alvo |
| --- | --- | --- |
| 1 | Hypertables Timescale desde S1 ou fase posterior? | R05 |
| 2 | Símbolo canônico cross-venue — owner único e alias map? | R03 |
| 3 | Latência feed vs snapshot asOf para risk — contrato port? | R02/R04 |
| 4 | Licenciamento third-party — registro em market-data vs organizations? | R03 |
| 5 | `connections.market_data.observed.v1` vs reemissão `market_data.observation.recorded.v1` | R02/R04 |
| 6 | Corporate actions: evento market-data vs lançamento accounting | R02 |

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| Investment lifecycle (R12) | `brain/project-docs/specs/003-investment-lifecycle/spec.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| ADR0004 Timescale/pgvector | `brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md` |
| Modos SIMULATED/PAPER | `docs/orchestration/system-capabilities/execution-modes-and-asset-classes.md` |
| Contrato P06 integrado | `docs/orchestration/system-capabilities/p06-financial-cycle-simulated-paper-contract.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** ([R02-boundaries.md](./R02-boundaries.md)) — Timescale vs PG, connections vs inference, accounting vs market events, sem REAL/live.
