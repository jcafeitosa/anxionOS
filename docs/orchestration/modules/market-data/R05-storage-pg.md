---
type: debate
---

# R05 — Armazenamento: `modules/market-data`

**Componente:** modules/market-data  
**Rodada:** R5 — PostgreSQL, TimescaleDB, journal/outbox, Neo4j  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issues:** ANX-87 · ANX-58 · graph consumer: ANX-32  
**Pré-requisito:** [R04-contracts-events.md](./R04-contracts-events.md) · ADR0004

## Princípios

| Princípio | Decisão |
| --- | --- |
| Registry OLTP | PostgreSQL `market_data_*` |
| Séries temporais | **TimescaleDB** hypertables — owner market-data |
| Grafo | Neo4j projeção `graph:market-data:v1` |
| Journal/outbox | `ownerDomain: "market-data"` mesma TX UoW |
| SQLite | Fixture replay local dev/test only |
| Ledger/ordens | **Fora** — accounting/execution owners |

## Tabelas PG (registry)

| Tabela | Papel |
| --- | --- |
| `market_data_instruments` | Instrument agregado |
| `market_data_instrument_specs` | InstrumentSpec versionado |
| `market_data_instrument_aliases` | vendor symbol → instrumentId |
| `market_data_freshness_policies` | FreshnessPolicy |
| `market_data_market_events` | MarketEvent |
| `market_data_datasets` | MarketDataset manifest |
| `market_data_observation_headers` | Header PG (dedupe, quality) |
| `market_data_command_journal` | Idempotência HTTP |

## Timescale hypertables

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
-- market_data_observations_ts: time, instrument_id, observation_kind, price, volume, bid, ask
SELECT create_hypertable('market_data_observations_ts', 'event_time');
-- market_data_candles_ts, market_data_funding_rates_ts (derivados)
```

**MD-R05-01:** Nenhuma hypertable contém saldo, ordem, fill ou ledger — schema lint CI.

**MD-R05-02:** Retenção/compressão Timescale é política market-data; não apaga journal PG.

**MD-R05-03 (R02 Q1):** Hypertables desde **P06-S2** — S1 só registry PG; séries em S2 após instrument resolve.

## Journal/outbox

`MarketDataUnitOfWork`: BEGIN → mutação registry/header → hypertable insert → command_journal → appendJournal + enqueueOutbox (`ownerDomain=market-data`) → COMMIT.

| eventType | Tabelas afetadas |
| --- | --- |
| `market_data.observation.recorded.v1` | observation_headers + observations_ts |
| `market_data.instrument.registered.v1` | instruments |
| `market_data.market_event.recorded.v1` | market_events |

## Neo4j — `graph:market-data:v1`

Projector no módulo **graph** (ANX-32). Async inbox dedup `eventId`.

| Nó / aresta | evento |
| --- | --- |
| `:Asset` / `:Venue` / `:Instrument` | instrument.registered |
| `:InstrumentSpec` ref | spec_published |
| `:MarketEvent` | market_event.recorded |
| `QUOTES_AT` (ref, não tick) | observation.recorded (agregado) |

**Proibido:** cada tick como nó; secrets; book bruto.

## Object storage

| Conteúdo | Ref em PG |
| --- | --- |
| Order book snapshots >256KB | `blobRef` + hash |
| Replay dataset files | `MarketDataset.blobManifestRef` |

## Migração P06 slices

| Slice | Escopo storage |
| --- | --- |
| P06-S1 | enums, instruments, specs, aliases, command_journal |
| P06-S2 | observation_headers, Timescale hypertables, observed consumer |
| P06-S3 | freshness_policies, market_events, datasets |
| P06-S4 | rollup workers (candles), quality monitor |
| P06-S5 | HTTP + replay loader + graph event completeness |

Bootstrap: eventing → identity → organizations → governance → graph → **connections MARKET_DATA stub** → **market-data**.

## Decisões

| ID | Decisão |
| --- | --- |
| MD-R05-01 | PG+Timescale mesmo cluster ADR0004 |
| MD-R05-02 | journal/outbox ownerDomain=market-data |
| MD-R05-03 | Hypertables desde S2 |
| MD-R05-04 | Neo4j async graph:market-data:v1 |
| MD-R05-05 | Large blobs object storage |

## Critérios de aceite — R05

| # | Critério | Status |
| --- | --- | --- |
| AC-R05-01 | Inventário tabelas market_data_* | ✅ |
| AC-R05-02 | Timescale + exclusões ledger | ✅ |
| AC-R05-03 | journal/outbox atômico | ✅ |
| AC-R05-04 | Projeção Neo4j | ✅ |
| AC-R05-05 | Migração slices P06-S1–S5 | ✅ |

## Saída R5

✅ → [R06-dependencies.md](./R06-dependencies.md)
