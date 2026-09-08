---
type: debate
---

# R02 — Fronteiras: `modules/market-data`

**Componente:** modules/market-data  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-87** · contrato P06: **ANX-58**

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre market-data e vizinhos (**connections**, **accounting**, **strategies**, **graph**, **portfolios**, **execution**, **risk**); ratificar **TimescaleDB** como dono de séries vs **PostgreSQL transacional** para registry/journal; proibir paths **REAL/live trading** em v1; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido e perguntas abertas |
| `brain/project-docs/specs/003-investment-lifecycle/spec.md` | Market observation, instrument identity, freshness, replay |
| `brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md` | Timescale como extensão PG; ticks não viram nós |
| `brain/notes/anxionos-storage-ownership.md` | Matriz market-data L35 |
| [connections/R02-boundaries.md](../../modules/connections/R02-boundaries.md) | `MARKET_DATA` kind; `REAL_EXECUTION` proibido; `connections.market_data.observed.v1` |
| [accounting/R01-context.md](../accounting/R01-context.md) | Ledger vs observação de mercado |
| [strategies/R01-context.md](../strategies/R01-context.md) | StrategyVersion vs preço autoritativo |
| [graph/R02-boundaries.md](../graph/R02-boundaries.md) | Projeção vs autoridade PG |
| [execution-modes](../../system-capabilities/execution-modes-and-asset-classes.md) | SIMULATED/PAPER/REAL; pipeline comum |
| ANX-58 | Ciclo financeiro sem REAL/live |

## Debate R2 (diálogo atribuído)

**Arquiteto:** market-data é dono do **registry de instrumentos** e das **observações temporais confirmadas** — identidade, qualidade, séries e eventos de mercado com proveniência. Risk e strategies **consumem** preços asOf via ports; não replicam catálogo.

**Crítico:** connections já emite `MarketDataObserved`. Onde termina connections e começa market-data?

**Arquiteto:** connections executa **binding governado** — credencial, adapter, normalização bruta, health. market-data **confirma** observação institucional: dedupe por source/sequence, política de qualidade, persistência Timescale, emissão `market_data.observation.recorded.v1` e metadados para graph. Uma leitura connections pode gerar zero ou uma observação confirmada; market-data nunca infere LLM.

**Crítico (accounting):** Dividendo/split aparece onde?

**Arquiteto:** **MarketEvent** (anúncio/corporate action) é market-data com evidência e revision. **Lançamento contábil** (crédito caixa, ajuste posição) é **accounting** após execution/reconciliação — nunca inferido só de mudança de preço (spec 003).

**Security:** Sem credenciais venue em market-data DTOs/eventos. Feed live em v1 só via connections `MARKET_DATA` ou fixture replay — nunca adapter REAL_EXECUTION.

**Executor:** v1 debate alinha ANX-58: SIMULATED + PAPER apenas; ingestão REAL homologada para trading live **deferida**.

**Síntese Orquestrador:** Fronteira aceita; split PG/Timescale e proibição REAL/live fechados para R03/R05.

---

## Decisão: PostgreSQL transacional vs TimescaleDB

| Opção | Veredito | Racional |
| --- | --- | --- |
| **A — PG OLTP + Timescale hypertables no mesmo cluster (v1)** | ✅ **Adotado** | ADR0004: Timescale estende PG; market-data owner único; journal/outbox no PG relacional |
| B — Timescale como silo sem journal compartilhado | ❌ Rejeitado | Viola ownerDomain + outbox atômico com registry |
| C — Ticks só em object storage, PG só metadata | ❌ Rejeitado para séries quentes | Aceitável para cold archive **em complemento**, não substituto de hypertable |

**Split de ownership:**

| Dado | Engine | Dono write |
| --- | --- | --- |
| Instrument, InstrumentSpec, FreshnessPolicy, licenses, dataset manifest | PostgreSQL (tabelas relacionais) | market-data |
| MarketObservation time-series, candles, trades, funding rates | TimescaleDB (hypertables) | market-data |
| Journal + outbox `market_data.*.v1` | PostgreSQL (transacional) | market-data via eventing |
| Payload grande (snapshot book, arquivo replay) | Object storage + ref PG | market-data metadata; blob port infra |
| Asset/Venue/Instrument node, MarketEvent ref, janelas | Neo4j projeção | graph projector consome eventos |
| Ledger entry, fee, settlement | PostgreSQL accounting | **accounting** — nunca hypertable de preço |

**Consequências:**

1. Nenhuma hypertable armazena saldo, ordem, fill ou lançamento contábil.
2. Séries derivadas (ex.: candle agregado) são **derivadas**, não fonte de NAV — portfolios/performance declaram asOf explícito.
3. Retenção/compressão Timescale é política market-data; não apaga journal PG.

---

## Decisão: ambiente e paths de dados (sem REAL/live v1)

| Opção | Veredito | Racional |
| --- | --- | --- |
| **A — SIMULATED + PAPER apenas (v1 debate)** | ✅ **Adotado** | ANX-58, connections CX-R02, execution-modes: sem capital REAL |
| B — Ingestão REAL com flag | ❌ Rejeitado para v1 | Exige ADR + homologação venue + epic execution REAL separado |
| C — market-data abre feed broker direto | ❌ Rejeitado | ADR0002: integração externa via connections binding |

**Consequências:**

1. Nenhum worker `market-data` persiste observação com `effectClass=LIVE_TRADING` ou `executionMode=REAL`.
2. Adapters venue/broker **não** residem em `market-data/infrastructure/adapters/` — apenas normalizers internos pós-connections ou replay fixtures.
3. Replay SIMULATED usa dataset com `datasetId` fixo; chamadas live bloqueadas em modo backtest.
4. PAPER consome feed via connections `MARKET_DATA`; accounting e execution permanecem simulados.

---

## O módulo POSSUI (estado autoritativo)

| Agregado / artefato | Responsabilidade | Storage |
| --- | --- | --- |
| `Asset` / `Venue` registry (lógico) | Identidade econômica e venue | PG; projeção Neo4j |
| `Instrument` / `InstrumentSpec` | Contrato negociável versionado | PG |
| `MarketObservation` | Dedupe, quality, time axis | TimescaleDB + PG header |
| Candles / trades / books / funding | Séries e snapshots referenciados | TimescaleDB + object storage |
| `MarketEvent` | Corporate action, macro, incident feed | PG + evento; projeção graph |
| `FreshnessPolicy` | Stale rules por consumer/op | PG |
| `MarketDataset` / replay manifest | SIMULATED ingestão fixada | PG + object storage |
| `CorrelationObservation` | Método, janela, asOf (hipótese) | PG / série derivada |
| Journal + outbox | `market_data.instrument.*`, `market_data.observation.*`, … | PG eventing |
| Workers | ingest confirm, rollup, quality monitor, replay loader | `market-data/workers/` |

## O módulo NÃO POSSUI

| Item | Dono correto | Notas |
| --- | --- | --- |
| ConnectionBinding, secret ref, adapter invoke | **connections** | market-data consome payload normalizado |
| Inferência LLM, embedding, ContextManifest | **connections** / **knowledge** | market-data não interpreta texto |
| StrategyVersion, signal, backtest run | **strategies** | consome preços; não publica instrument |
| TradeIntent, Decision, RiskCheck | **decisions** / **risk** | usam snapshot asOf de market-data |
| Order, Fill, ExecutionPermit | **execution** | preço de mercado ≠ ordem |
| Ledger, tax, settlement posting | **accounting** | MarketEvent ≠ lançamento |
| Position, NAV, valuation | **portfolios** | marca com preço autoritativo asOf |
| Traversal T09 exposição | **graph** kernel + portfolios | market-data não calcula exposição |
| Grant, mandate, market enablement write | **governance** / **organizations** | market-data reage a `markets_updated` |

---

## Matriz fronteira: market-data × módulos alvo

### vs **connections** (P05)

| Tema | market-data | connections |
| --- | --- | --- |
| Provider binding / credencial | ❌ | ✅ |
| Adapter HTTP/WebSocket feed | ❌ (consome resultado) | ✅ invoke `MARKET_DATA` |
| Normalização bruta vendor-specific | ❌ | ✅ adapter |
| Dedupe institucional source+sequence | ✅ | ❌ (emite observed bruto) |
| Instrument registry canônico | ✅ | ❌ |
| Persistência série Timescale | ✅ | ❌ |
| Evento `connections.market_data.observed.v1` | consome | emite |
| Evento `market_data.observation.recorded.v1` | emite | ❌ |
| `REAL_EXECUTION` / live trading adapter | ❌ proibido | ❌ proibido (CX-R02) |

### vs **accounting** (P06)

| Tema | market-data | accounting |
| --- | --- | --- |
| Preço / candle / tick | ✅ | ❌ (usa snapshot para marcação) |
| Corporate action **anúncio** | ✅ MarketEvent | ❌ |
| Dividendo/split **lançado** | ❌ | ✅ ledger entry |
| Fee de trading | ❌ | ✅ pós-fill execution |
| Reconciliação cash/position | ❌ | ✅ com execution |

### vs **strategies** (P06)

| Tema | market-data | strategies |
| --- | --- | --- |
| Universe / data requirements declarados | ❌ (strategies referencia instrumentIds) | ✅ StrategyVersion |
| Preço histórico autoritativo | ✅ | consome |
| Sinal / alpha / deployment | ❌ | ✅ |
| Backtest dataset pinning | ✅ fornece datasetId/revision | ✅ fixa no BacktestRun |

### vs **graph** (P03)

| Tema | market-data | graph |
| --- | --- | --- |
| Escrever Neo4j diretamente | ❌ | ✅ projector |
| Emitir evento com instrumentId/edges | ✅ | consome |
| Armazenar cada tick como nó | ❌ proibido | ❌ proibido (ADR0004) |
| Traversal com preços embutidos | ❌ | ❌ — risk/portfolios passam asOf |

---

## Invariantes de fronteira (propostas)

| ID | Invariante | Verificação (R04/R09) |
| --- | --- | --- |
| **MD-R02-INV-01** | Observação persistida exige `instrumentId` resolvido no registry PG | Ingest test fail-closed |
| **MD-R02-INV-02** | Dedupe por `(sourceId, sourceEventId)` ou hash canônico — sem duplicata silenciosa | Contract test |
| **MD-R02-INV-03** | Nenhuma tabela Timescale contém colunas de saldo, ordem ou ledger | Schema lint |
| **MD-R02-INV-04** | Dado stale segundo FreshnessPolicy bloqueia **nova** exposição downstream (risk port) — não apaga série | Integration test c/ risk mock |
| **MD-R02-INV-05** | `executionMode=REAL` rejeitado em comandos ingestão/API v1 | API contract test |
| **MD-R02-INV-06** | Corporate action contábil exige evento accounting separado — preço sozinho não gera lançamento | Application test |
| **MD-R02-INV-07** | Secrets/URLs credenciais ausentes em DTOs/eventos `market_data.*.v1` | Redaction test |
| **MD-R02-INV-08** | Gap orderbook invalida book até snapshot compatível (spec 003) | Worker test |

---

## Contrato público — `index.ts` (sketch R02)

### Export recomendado (R04 detalha)

| Export | Consumidor |
| --- | --- |
| `resolveInstrument`, `getInstrumentSpec` | strategies, execution, risk |
| `recordObservation`, `getObservations` | workers, replay loader |
| `getPriceAsOf`, `getFreshnessStatus` | risk, portfolios, decisions |
| `registerMarketEvent` | corporate action pipeline |
| `MarketDataModuleDeps`, `ensureMarketDataSchema` | composition root |

### O que **não** exportar

| Proibido | Motivo |
| --- | --- |
| Repositórios Timescale/Drizzle concretos | ADR0002 |
| Client connections adapter | composition root only |
| Handlers Elysia | `market-data/api/` |
| Cálculo NAV/PnL | portfolios / performance |

---

## Imports proibidos (cross-module)

| Origem (market-data) | Destino | Veredito |
| --- | --- | --- |
| `domain/*` | Drizzle, driver Timescale direto sem port | ❌ |
| `application/*` | `accounting/*`, `execution/*`, `strategies/*` repos | ❌ |
| `market-data` | tabelas `connections_*`, `accounting_*` | ❌ |
| `strategies` | `market-data/infrastructure/**` | ❌ — só `index.ts` |

**Permitido:** `@anxionos/contracts`, `@anxionos/eventing`, `@anxionos/database`, port connections (read normalized), organizations market scope via evento.

---

## Perguntas abertas para R03 (domain sketch)

1. **InstrumentSpec versioning:** immutable hash vs revision incremental — impacto backtest?
2. **Alias map:** venue symbol → instrumentId — tabela única ou por source?
3. **Order book snapshot:** object storage vs Timescale JSONB — limites de tamanho?
4. **MarketConfigVersion DRAINING:** drain observação only vs block ingest new instruments?
5. **Quality flags:** enum compartilhado em contracts vs domínio market-data only?

---

## Saída R2

✅ Boundary doc aprovado para continuação — **R03 domain sketch** (entidades, invariantes, ports).

**Issues:** ANX-87 (debate R02–R10) · ANX-42 (R01 estrutural) · ANX-58 (contrato P06 integrado).
