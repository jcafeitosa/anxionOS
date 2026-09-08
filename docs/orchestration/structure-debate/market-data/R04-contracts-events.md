---
type: debate
---

# R04 — Contratos, eventos e superfície pública: `modules/market-data`

**Componente:** modules/market-data  
**Rodada:** R4 — Contratos, eventos e exports  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issues:** ANX-87 (debate) · ANX-58 (contrato P06) · ANX-62 (observed upstream)  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R02-boundaries.md](./R02-boundaries.md)

## Objetivo

Schemas Zod `@anxionos/contracts/market-data/*`, HTTP `/v1/market-data/*`, catálogo `market_data.*.v1`, integração `connections.market_data.observed.v1`, testes contrato MD-R02/MD-R03.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| `ownerDomain` | `"market-data"` |
| `eventType` | `market_data.<aggregate>.<action>.v1` |
| Idempotência | Header `Idempotency-Key` → `commandId` |
| `executionMode` | `SIMULATED` \| `PAPER` only v1 |

## Layout contracts

```text
packages/contracts/src/market-data/
  types.ts          # InstrumentId, ObservationKind, QualityFlag
  commands.ts       # RegisterInstrument, RecordObservation
  queries.ts        # GetPriceAsOf, ResolveInstrument
  events.ts         # market_data.*.v1 envelopes
  observed-bridge.ts # ConnectionsMarketDataObservedV1 → ConfirmInput
```

## HTTP `/v1/market-data/*`

| Método | Path | Operação |
| --- | --- | --- |
| POST | `/v1/market-data/instruments` | RegisterInstrument |
| POST | `/v1/market-data/instruments/{id}/specs` | PublishInstrumentSpec |
| POST | `/v1/market-data/observations` | RecordObservation |
| GET | `/v1/market-data/prices:asOf` | GetPriceAsOf |
| GET | `/v1/market-data/instruments:resolve` | ResolveInstrument |
| POST | `/v1/market-data/market-events` | RegisterMarketEvent |
| POST | `/v1/market-data/datasets` | PublishMarketDataset |
| GET/POST | `/v1/market-data/freshness-policies` | FreshnessPolicy admin |

Grants: `market_data.read` / `market_data.write` / `market_data.admin`.

## Catálogo eventos v1

| eventType | Consumidores |
| --- | --- |
| `market_data.instrument.registered.v1` | graph, strategies |
| `market_data.instrument.spec_published.v1` | graph, simulation |
| `market_data.observation.recorded.v1` | graph, risk, portfolios, audit |
| `market_data.market_event.recorded.v1` | graph, accounting (read), audit |
| `market_data.dataset.published.v1` | simulation, strategies |
| `market_data.freshness_policy.updated.v1` | risk, audit |

**Upstream consumido (não reemitido):**

| eventType | Papel |
| --- | --- |
| `connections.market_data.observed.v1` | Input worker — ANX-62 |

Payloads **proibidos:** API keys, URLs credenciais, book completo inline, `executionMode=REAL`.

## Integração connections.market_data.observed

```typescript
// packages/contracts/src/market-data/observed-bridge.ts
export function mapObservedToConfirmInput(
  observed: ConnectionsMarketDataObservedV1,
): ConfirmObservationInput | null;
```

| Regra | ID |
| --- | --- |
| Resolve instrument via alias ou canonical | MD-R04-01 |
| Dedupe antes de persist | MD-R04-02 |
| Null = drop silencioso com audit | MD-R04-03 |
| Emit only `market_data.observation.recorded.v1` | MD-R04-04 |

## Testes contrato (G1)

`backend/tests/contracts/market-data-contracts.test.ts` — MD-R02-INV-05/07, MD-R03-INV-OBS-01/02, forbidden payload keys.

## Decisões

| ID | Decisão |
| --- | --- |
| MD-R04-01 | observed-bridge em contracts/market-data |
| MD-R04-02 | QualityFlag enum shared com connections subset |
| MD-R04-03 | HTTP mapa spec 003 R12 |
| MD-R04-04 | Lint CI proíbe REAL + secrets em eventos |
| MD-R04-05 | OpenAPI Scalar plugin market-data/api |

## Critérios de aceite — R04

| # | Critério | Status |
| --- | --- | --- |
| AC-R04-01 | Layout contracts + observed bridge | ✅ |
| AC-R04-02 | Catálogo eventos v1 | ✅ |
| AC-R04-03 | HTTP mapa + grants | ✅ |
| AC-R04-04 | Integração connections.market_data.observed | ✅ |
| AC-R04-05 | Plano testes contrato | ✅ |

## Saída R4

✅ → [R05-storage-pg.md](./R05-storage-pg.md)
