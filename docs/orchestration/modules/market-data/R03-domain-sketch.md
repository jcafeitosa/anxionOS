---
type: debate
---

# R03 — Esboço de domínio: `modules/market-data`

**Componente:** modules/market-data  
**Rodada:** R3 — Domain model  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issues:** ANX-42 (debate estrutura) · **ANX-87** (R02–R10) · contrato P06: **ANX-58**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md) · [R01-context.md](./R01-context.md) · spec 003 (R12)

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R3)

**In:** Instrument/Observation/Freshness/Dataset. **Out:** `market_data.*.v1`. Consome `connections.market_data.observed.v1` sem reemitir bruto.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Domain sketch | **market-data** |
| adapter-gateway | **KEEP** |
| Timescale | **market-data** (ADR0004) |

## Objetivo da rodada

Esboçar o modelo de domínio após [R02-boundaries.md](./R02-boundaries.md): agregados `Instrument`, `MarketObservation`, `FreshnessPolicy`, `MarketEvent`, `MarketDataset`; ports `getPriceAsOf`, `resolveInstrument`; invariantes `MD-R03-INV-*`; sketch de eventos `market_data.*.v1`; integração consumo `connections.market_data.observed.v1` sem reemitir bruto; ownership Timescale conforme ADR0004.

## Fontes aplicadas

| Fonte | Uso em R3 |
| --- | --- |
| [R02-boundaries.md](./R02-boundaries.md) | MD-R02-INV-*, split PG/Timescale, proibição REAL |
| [R01-context.md](./R01-context.md) | Inventário, armazenamento, perguntas abertas |
| `brain/project-docs/specs/003-investment-lifecycle/spec.md` | Market observation, instrument identity, freshness, replay |
| `brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md` | Timescale hypertables; ticks não viram nós Neo4j |
| `brain/notes/anxionos-storage-ownership.md` | Matriz market-data |
| [connections/R04-contracts-events.md](../../modules/connections/R04-contracts-events.md) | `connections.market_data.observed.v1` upstream |
| [knowledge/R03-domain-sketch.md](../knowledge/R03-domain-sketch.md) | Padrão agregados, ports, eventos sem secrets |

## Debate R3 (síntese atribuída)

**Arquiteto:** Cinco agregados/raízes v1 — `Instrument`, `MarketObservation`, `FreshnessPolicy`, `MarketEvent`, `MarketDataset`. Entidades satélite: `InstrumentSpec`, `InstrumentAlias`.

**Executor:** Ports `resolveInstrument`, `getPriceAsOf`, `recordObservation`. Consumer `connections.market_data.observed.v1` → `ConfirmObservation`.

**Crítico:** connections emite observed bruto; market-data dedupe e confirma. Não reemitir observed.

**Security:** Sem credenciais em DTOs/eventos. `executionMode=REAL` rejeitado.

**Síntese Orquestrador:** Domain sketch v1 aprovado; R04 normaliza `@anxionos/contracts/market-data/*`.

---

## Agregado: `Instrument`

```typescript
interface Instrument {
  id: InstrumentId;
  organizationId: string;
  agencyId?: string;
  assetId: AssetId;
  venueId: VenueId;
  canonicalSymbol: string;
  instrumentKind: InstrumentKind;
  status: InstrumentStatus;
  activeSpecId?: InstrumentSpecId;
  revision: number;
}

interface InstrumentSpec {
  id: InstrumentSpecId;
  instrumentId: InstrumentId;
  versionNumber: number;
  specHash: string;
  lotSize: string;
  tickSize: string;
  currency: string;
  settlementDays: number;
  calendarRef: string;
  validFrom: Date;
  validTo?: Date;
  publishedAt?: Date;
}

type InstrumentStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "DELISTED" | "DRAINING";
```

### Invariantes (`MD-R03-INV-INS-*`)

| ID | Regra |
| --- | --- |
| MD-R03-INV-INS-01 | Observação exige `instrumentId` resolvido — fail-closed |
| MD-R03-INV-INS-02 | `InstrumentSpec` imutável após `publishedAt` |
| MD-R03-INV-INS-03 | `canonicalSymbol` único por org+venue+validity |
| MD-R03-INV-INS-04 | `DRAINING` bloqueia novos instrumentos |
| MD-R03-INV-INS-05 | Mutações registry = journal + outbox mesma TX PG |

**Decisão MD-R03-01:** Alias map tabela `market_data_instrument_aliases` por `sourceId`.

**Decisão MD-R03-02:** `specHash` SHA-256 canônico para backtest pin.

---

## Agregado: `MarketObservation`

```typescript
interface MarketObservation {
  id: MarketObservationId;
  organizationId: string;
  instrumentId: InstrumentId;
  sourceId: SourceId;
  sourceEventId: string;
  observationKind: ObservationKind;
  eventTime: Date;
  asOf: Date;
  price?: DecimalString;
  qualityFlags: QualityFlag[];
  dedupeKey: string;
  executionMode: "SIMULATED" | "PAPER";
  datasetId?: MarketDatasetId;
}
```

### Invariantes (`MD-R03-INV-OBS-*`)

| ID | Regra |
| --- | --- |
| MD-R03-INV-OBS-01 | Dedupe `(sourceId, sourceEventId)` — MD-R02-INV-02 |
| MD-R03-INV-OBS-02 | `executionMode=REAL` rejeitado v1 |
| MD-R03-INV-OBS-03 | Header PG; série em Timescale hypertable |
| MD-R03-INV-OBS-04 | `BOOK_GAP` invalida book até snapshot — MD-R02-INV-08 |

---

## Agregado: `FreshnessPolicy`

```typescript
interface FreshnessPolicy {
  id: FreshnessPolicyId;
  organizationId: string;
  policyKey: string;
  consumerKind: "RISK_CHECK" | "PORTFOLIO_MARK" | "STRATEGY_SIGNAL" | "DECISION_SNAPSHOT";
  maxAgeMs: number;
  clockSkewMs: number;
  staleBehavior: "FAIL_CLOSED" | "WARN_ALLOW" | "USE_LAST_KNOWN";
  status: "ACTIVE" | "DEPRECATED";
}
```

### Invariantes (`MD-R03-INV-FRS-*`)

| ID | Regra |
| --- | --- |
| MD-R03-INV-FRS-01 | `getPriceAsOf` avalia policy no `asOf` |
| MD-R03-INV-FRS-02 | `FAIL_CLOSED` bloqueia nova exposição — não apaga série |
| MD-R03-INV-FRS-03 | Policy versionada; não retroage snapshots |

---

## Agregado: `MarketEvent`

Corporate action/macro/incident — **não** lançamento contábil.

### Invariantes (`MD-R03-INV-EVT-*`)

| ID | Regra |
| --- | --- |
| MD-R03-INV-EVT-01 | Lançamento contábil exige evento accounting separado |
| MD-R03-INV-EVT-02 | Correção = nova revisão + SUPERSEDED |
| MD-R03-INV-EVT-03 | Neo4j via evento — sem driver cross-module |

---

## Agregado: `MarketDataset`

Replay SIMULATED — dataset fixado.

### Invariantes (`MD-R03-INV-DS-*`)

| ID | Regra |
| --- | --- |
| MD-R03-INV-DS-01 | Replay exige `datasetId` fixo |
| MD-R03-INV-DS-02 | `PUBLISHED` imutável |
| MD-R03-INV-DS-03 | Blob object storage; PG manifest only |

---

## Port: `resolveInstrument`

```typescript
export interface MarketDataQueryPort {
  resolveInstrument(input: ResolveInstrumentInput): Promise<ResolveInstrumentResult>;
  getInstrumentSpec(instrumentId: InstrumentId, asOf: Date): Promise<InstrumentSpec>;
}
```

## Port: `getPriceAsOf`

```typescript
export interface MarketDataPricingPort {
  getPriceAsOf(input: GetPriceAsOfInput): Promise<PriceSnapshot>;
  getFreshnessStatus(instrumentId: InstrumentId, consumerKind: ConsumerKind): Promise<FreshnessStatus>;
}
```

Retorna `{ price, asOf, freshnessStatus, policyId, qualityFlags }`.

---

## Eventos `market_data.*.v1`

| eventType | Consumidores |
| --- | --- |
| `market_data.instrument.registered.v1` | graph, strategies |
| `market_data.instrument.spec_published.v1` | graph, simulation |
| `market_data.observation.recorded.v1` | graph, risk, audit |
| `market_data.market_event.recorded.v1` | graph, accounting (read) |
| `market_data.dataset.published.v1` | simulation, strategies |
| `market_data.freshness_policy.updated.v1` | risk, audit |

### Integração `connections.market_data.observed.v1`

| Aspecto | Decisão |
| --- | --- |
| Emissor | connections (ANX-62) |
| Consumidor | market-data worker |
| Saída | `market_data.observation.recorded.v1` (zero ou uma por observed) |
| Reemissão observed | ❌ Proibido |

---

## Critérios de aceite — R03

| # | Critério | Status |
| --- | --- | --- |
| AC-R03-01 | Agregados core tipados | ✅ |
| AC-R03-02 | Ports resolveInstrument, getPriceAsOf | ✅ |
| AC-R03-03 | Invariantes MD-R03-INV-* | ✅ |
| AC-R03-04 | Eventos market_data.*.v1 + observed integration | ✅ |
| AC-R03-05 | Perguntas R02 respondidas | ✅ |

## Saída R3

✅ → [R04-contracts-events.md](./R04-contracts-events.md)
