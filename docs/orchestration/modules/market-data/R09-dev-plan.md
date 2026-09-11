---
type: debate
status: draft
---

# R09 — Plano de implementação (P06): `modules/market-data`

**Rodada:** R9 — Plano executável pós-debate  
**Data:** 2026-09-08  
**Issue:** ANX-87 · gate: **ANX-58** · impl: **ANX-88** · connections: ANX-62/84

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R9)

**In:** slices P06-S1–S5. **Out:** plano documental. Zero código até claim ANX-88.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Plano market-data | **market-data** |
| adapter-gateway | **KEEP** |

## Objetivo

Traduzir D-MD-* em slices P06-S1–S5 com matriz G3/G4/G5. Zero código até claim ANX-88.

## Pré-requisitos

| Gate | Evidência | Issue |
| --- | --- | --- |
| R10 G0 | R10-g0-handoff.md | ANX-87 |
| Contrato P06 | ciclo SIMULATED/PAPER | ANX-58 |
| connections observed | evento + binding stub | ANX-62, ANX-84 |
| Impl claim | Taskboard | ANX-88 |

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema registry PG, instruments, specs, aliases, command_journal, contracts skeleton | G2, G4 |
| **P06-S2** | Timescale hypertables, observation_headers, observed consumer, recordObservation | G3, G4, G5 parcial |
| **P06-S3** | freshness_policies, market_events, datasets, getPriceAsOf | G3, G4 |
| **P06-S4** | rollup candles worker, quality monitor, resolveInstrument HTTP | G3, G5 |
| **P06-S5** | HTTP `/v1/market-data/*`, replay loader, OpenAPI | G2, G3, G5 completo |

## Matriz G3

| ID | Cenário | Slice |
| --- | --- | --- |
| G3-MD-S1-01 | registerInstrument idempotent | S1 |
| G3-MD-S1-02 | recordObservation dedupe same sourceEventId | S2 |
| G3-MD-S2-01 | getPriceAsOf stale FAIL_CLOSED risk | S3 |
| G3-MD-S2-02 | resolveInstrument via alias | S1,S4 |
| G3-MD-S3-01 | observed→recorded null when instrument missing | S2 |
| G3-MD-S3-02 | MarketEvent não gera ledger entry | S3 |

## Matriz G4

| ID | Controle | Slice |
| --- | --- | --- |
| G4-MD-01 | REAL executionMode schema reject | S1 |
| G4-MD-02 | Cross-org instrument GET → 403 | S1 |
| G4-MD-03 | Event payload sem secrets/URLs | S2 |
| G4-MD-04 | Hypertable schema lint — no ledger cols | S2 |

## Matriz G5

| ID | Adversarial | Slice |
| --- | --- | --- |
| G5-MD-01 | Cross-tenant price query | S3 |
| G5-MD-02 | REAL ingest attempt | S2 |
| G5-MD-03 | Duplicate observed flood | S2 |
| G5-MD-04 | Stale + risk FAIL_CLOSED | S3 |
| G5-MD-05 | Bad tick quality flag | S4 |

## Dependências externas

| Issue | Impacto |
| --- | --- |
| ANX-58 | Epic autoriza G1 P06 |
| ANX-84 | connections MARKET_DATA stub |
| ANX-62 | observed event contract |
| ANX-32 | graph:market-data:v1 projector |

## Critérios de aceite — R09

| # | Critério | Status |
| --- | --- | --- |
| AC-R09-01 | Slices P06-S1–S5 | ✅ |
| AC-R09-02 | Matriz G3/G4/G5 | ✅ |
| AC-R09-03 | Mapa D-MD → slices | ✅ |
| AC-R09-04 | Dependências issues | ✅ |

## Saída R9

✅ → [R10-g0-handoff.md](./R10-g0-handoff.md)
