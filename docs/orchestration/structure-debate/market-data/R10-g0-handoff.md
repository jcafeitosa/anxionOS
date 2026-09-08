---
type: debate
status: draft
---

# R10 — Pacote G0 (handoff): `modules/market-data`

**Rodada:** R10 — Pacote G0 debate R01–R10  
**Data:** 2026-09-08  
**Issues:** ANX-87 · **ANX-58** · ANX-62 · ANX-83 · **ANX-88** (impl)

## Objetivo

Fechar pacote G0 market-data R01–R10: PC-G0 10/10, handoff impl ANX-88 relacionada ANX-58.

## G0 — Escopo

### In scope

R01 inventário · R02 fronteiras · R03 domínio · R04 contratos · R05 storage · R06 deps · R07 riscos · R08 decision log · R09 dev-plan · R10 este artefato.

### Out of scope implementação

| Item | Destino |
| --- | --- |
| Código `backend/modules/market-data/` | ANX-88 G1 |
| REAL/live trading ingest | P06+ epic separado |
| RLS PostgreSQL | P09 (D-MD-015) |
| Ledger/posting | accounting module |

## Gates documentais G2–G6 (ANX-87)

| Gate | Disposição | Evidência |
| --- | --- | --- |
| **G2** | **PASS** | R04 contratos, D-MD-017 spec |
| **G3** | **PASS** | Matriz G3-MD-* R09 |
| **G4** | **PASS** | R07 stale/cross-tenant; G4-MD-* |
| **G5** | **PASS** | G5-MD-01..05 — exec sandbox na G1 |
| **G6** | **PASS** | R01–R10 completo; handoff ANX-88 |

**G7:** pendente aceite explícito **ANX-87**.

## PC-G0 — Status

| # | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | Decision log R8 | ✅ |
| PC-G0-02 | Plano R9 | ✅ |
| PC-G0-03 | Pacote G0 R10 | ✅ |
| PC-G0-04 | spec 003 R12 alinhada | ✅ |
| PC-G0-05 | R06–R08 sem bloqueios | ✅ |
| PC-G0-06 | ANX-58 contrato P06 | ✅ in_review |
| PC-G0-07 | Top 5 riscos | ✅ |
| PC-G0-08 | graph:market-data:v1 | ✅ ANX-32 |
| PC-G0-09 | RLS application-only | ✅ D-MD-015 |
| PC-G0-10 | Impl issue ANX-88 | ✅ |

**Resumo:** 10/10 ✅

## Handoff

### ANX-87 debate — ✅ PRONTO → `in_review`

Debate R01–R10 encerrado. Fila: **`g0_ready`**.

### Implementação — ANX-88 (related ANX-58)

| Condição | Status |
| --- | --- |
| G0 debate PC-G0 10/10 | ✅ |
| Contrato ANX-58 | ✅ in_review |
| Issue impl | ✅ **ANX-88** — `P06 G1: modules/market-data S1–S2 (registry + Timescale ingest)` |
| Blocked_by | ANX-87 G7 aceite |

### ANX-32 — paralelo

Consumer `graph:market-data:v1` — não bloqueia PG S1–S3.

## Veredito R10

| Pergunta | Resposta |
| --- | --- |
| G0 debate pronto? | **Sim** — PC-G0 10/10 |
| ANX-87 → in_review? | **Sim** |
| G2–G6 doc PASS? | **Sim** |
| G7-ready? | **Sim** — aguarda aceite ANX-87 |
