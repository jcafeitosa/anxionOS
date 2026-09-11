---
type: debate
status: draft
---

# R08 — Decision log: `modules/market-data`

**Rodada:** R8 — Síntese MD-R* → D-MD-*  
**Data:** 2026-09-08  
**Issue:** ANX-87 · gate: ANX-58 · graph: ANX-32

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R8)

**In:** síntese D-MD-*. **Out:** decision log. **Não** fechar spec accepted.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Decisões D-MD-* | **market-data** |
| adapter-gateway | **KEEP** |

## Objetivo

Consolidar R01–R07, resolver P-R7, PC-G0 checklist.

## Tabela consolidada D-MD-*

| ID | Decisão | Status |
| --- | --- | --- |
| D-MD-001 | market-data dono Instrument/Observation/FreshnessPolicy/MarketEvent/Dataset | ✅ |
| D-MD-002 | Timescale hypertables owner market-data (ADR0004) | ✅ |
| D-MD-003 | PG registry + journal/outbox ownerDomain market-data | ✅ |
| D-MD-004 | connections observed → recorded sem reemissão | ✅ |
| D-MD-005 | getPriceAsOf com freshness explícito | ✅ |
| D-MD-006 | resolveInstrument + alias map tabela única | ✅ |
| D-MD-007 | SIMULATED+PAPER only v1 — REAL rejeitado | ✅ |
| D-MD-008 | MarketEvent ≠ lançamento accounting | ✅ |
| D-MD-009 | Neo4j async graph:market-data:v1 | ✅ |
| D-MD-010 | Large books → object storage | ✅ |
| D-MD-011 | QualityFlag enum shared contracts | ✅ |
| D-MD-012 | specHash imutável para backtest pin | ✅ |
| D-MD-013 | DRAINING block new instruments only | ✅ |
| D-MD-014 | command_journal HTTP idempotency | ✅ |
| D-MD-015 | RLS PG defer P09 — application guards | ✅ |
| D-MD-016 | Hypertables desde P06-S2 | ✅ |
| D-MD-017 | `@anxionos/contracts/market-data/*` G1 pending | ⏳ ANX-88 |
| D-MD-018 | Workers ingest/observed consumer G1 pending | ⏳ ANX-88 |

**Total:** 18 decisões aceitas v1 · 2 G1 pendentes

## Crosswalk MD-R* → D-MD-*

| Rodada | IDs |
| --- | --- |
| R02 | D-MD-001,007,008,015 |
| R03 | D-MD-004,005,006,011,012,013 |
| R04 | D-MD-004,017 |
| R05 | D-MD-002,003,009,010,016 |
| R06 | D-MD-004 wiring |
| R07 | D-MD-005 reforço,015 |

## Resolução P-R7

| # | Pergunta | Decisão |
| --- | --- | --- |
| P-R7-01 | observed vs recorded | recorded only institucional (D-MD-004) |
| P-R7-02 | Timescale S1 vs S2 | S2 hypertables (D-MD-016) |
| P-R7-03 | Book storage | object storage >256KB (D-MD-010) |
| P-R7-04 | Freshness default risk | FAIL_CLOSED obrigatório (MD-R07-01) |
| P-R7-05 | RLS v1 | Application-only defer P09 (D-MD-015) |

## PC-G0 checklist (preview R10)

| # | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | Decision log R8 | ✅ |
| PC-G0-02 | Plano R9 | ⏳ R09 |
| PC-G0-03 | Pacote G0 R10 | ⏳ R10 |
| PC-G0-04 | spec 003 R12 alinhada | ✅ |
| PC-G0-05 | R06–R08 sem bloqueios | ✅ |
| PC-G0-06 | Top 5 riscos | ✅ |
| PC-G0-07 | graph:market-data:v1 spec | ✅ ANX-32 |
| PC-G0-08 | ANX-58 contrato P06 | ✅ in_review |
| PC-G0-09 | Crítico nominal | ✅ |
| PC-G0-10 | Impl issue | ⏳ ANX-88 |

## Critérios de aceite — R08

| # | Critério | Status |
| --- | --- | --- |
| AC-R08-01 | D-MD-* consolidado | ✅ |
| AC-R08-02 | P-R7 resolvidos | ✅ |
| AC-R08-03 | PC-G0 preview | ✅ |

## Saída R8

✅ → [R09-dev-plan.md](./R09-dev-plan.md)
