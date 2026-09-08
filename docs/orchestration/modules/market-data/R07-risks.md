---
type: debate
---

# R07 — Riscos: `modules/market-data`

**Componente:** modules/market-data  
**Rodada:** R7 — Threat matrix, stale data, manipulation, cross-tenant  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issues:** ANX-87 · ANX-58

## Objetivo

Matriz L×I, controles G4/G5, top 5 → R08.

## Registro de riscos

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-MD-01 | Cross-tenant price/instrument leak | 3 | 5 | **15** | org_id em todas queries; application guards | G4,G5 |
| R-MD-02 | Stale data usado em risk/exposure | 4 | 5 | **20** | FreshnessPolicy FAIL_CLOSED; MD-R03-INV-FRS-02 | G3,G4 |
| R-MD-03 | Market data manipulation / bad tick | 3 | 5 | **15** | QualityFlag SUSPECTED_BAD_TICK; outlier worker | G4,G5 |
| R-MD-04 | Dedupe bypass duplicate exposure | 2 | 5 | **10** | MD-R03-INV-OBS-01 unique (sourceId, sourceEventId) | G3 |
| R-MD-05 | REAL/live ingest path em v1 | 2 | 5 | **10** | MD-R02-INV-05 API+schema reject REAL | G4,G5 |
| R-MD-06 | Secrets em evento observed/recorded | 2 | 5 | **10** | Redaction lint; MD-R02-INV-07 | G4 |
| R-MD-07 | Corporate action → ledger inferido | 3 | 4 | **12** | MD-R03-INV-EVT-01; accounting event separado | G3,G4 |
| R-MD-08 | Book gap silent wrong mid | 3 | 4 | **12** | MD-R02-INV-08 BOOK_GAP fail | G3 |
| R-MD-09 | Timescale hypertable cross-tenant | 2 | 5 | **10** | instrument_id FK + org scope join | G4,G5 |
| R-MD-10 | Replay dataset swap mid-backtest | 2 | 4 | **8** | datasetId+revision pin strategies | G3 |

## Matriz ameaças

| Impact → | 3 Médio | 4 Alto | 5 Crítico |
| --- | --- | --- | --- |
| **L4 Provável** | — | — | R-MD-02 |
| **L3 Possível** | R-MD-07,08 | — | R-MD-01,03 |
| **L2 Improvável** | R-MD-10 | — | R-MD-04,05,06,09 |

## Top 5 → R08

| Rank | ID | Sev | Tema |
| ---: | --- | ---: | --- |
| 1 | R-MD-02 | 20 | Stale data em risk |
| 2 | R-MD-01 | 15 | Cross-tenant leak |
| 3 | R-MD-03 | 15 | Manipulation / bad tick |
| 4 | R-MD-07 | 12 | Corporate action → ledger inferido |
| 5 | R-MD-08 | 12 | Order book gap |

## Controles G5 (sandbox)

| ID | Cenário adversarial |
| --- | --- |
| G5-MD-01 | Query price org A instrument org B → 403/empty + audit |
| G5-MD-02 | Ingest executionMode=REAL → schema reject |
| G5-MD-03 | Duplicate sourceEventId → single observation |
| G5-MD-04 | Stale price + FAIL_CLOSED risk → block exposure |
| G5-MD-05 | Observed payload com API key → redaction reject |

## Decisões R07

| ID | Decisão |
| --- | --- |
| MD-R07-01 | FreshnessPolicy obrigatória para risk consumerKind |
| MD-R07-02 | Outlier detection worker S4 — não bloqueia v1 debate |
| MD-R07-03 | Application-only tenancy v1 — RLS defer P09 |
| MD-R07-04 | G5 checklist obrigatório pré-G1 código |

## Critérios de aceite — R07

| # | Critério | Status |
| --- | --- | --- |
| AC-R07-01 | Threat matrix L×I | ✅ |
| AC-R07-02 | Stale + cross-tenant + manipulation | ✅ |
| AC-R07-03 | Top 5 mapeados | ✅ |
| AC-R07-04 | Controles G4/G5 | ✅ |

## Saída R7

✅ → [R08-decision-log.md](./R08-decision-log.md)
