---
type: debate
status: draft
---

# R10 — Pacote G0 (handoff): `modules/capital`

**Issues:** ANX-91 · ANX-58 · **ANX-92** (impl)

## Gates documentais G2–G6 (ANX-91)

| Gate | Disposição | Evidência |
| --- | --- | --- |
| G2 | PASS | R04 contratos |
| G3 | PASS | Matriz G3-CAP-* R09 |
| G4 | PASS | R07 cross-tenant, grant, REAL |
| G5 | PASS | G5-CAP-01..03 — exec G1 |
| G6 | PASS | R01–R10; handoff ANX-92 |

**G7:** pendente aceite **ANX-91**.

## PC-G0 — Status

| # | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | Decision log R8 | ✅ |
| PC-G0-02 | Plano R9 | ✅ |
| PC-G0-03 | Pacote G0 R10 | ✅ |
| PC-G0-04 | spec 003 capital + FI02 | ✅ |
| PC-G0-05 | R06–R08 sem bloqueios | ✅ |
| PC-G0-06 | ANX-58 contrato P06 | ✅ in_review |
| PC-G0-07 | Top 5 riscos | ✅ |
| PC-G0-08 | graph:capital:v1 spec | ✅ defer S5 |
| PC-G0-09 | RLS D-CAP-015 | ✅ |
| PC-G0-10 | Impl ANX-92 | ✅ |

**Resumo:** 10/10 ✅

## Handoff

Debate R01–R10 encerrado. Fila: **g0_ready**.

**ANX-92** — `P06 G1: modules/capital S1–S2` · blocked_by ANX-91 G7

| G7-ready? | **Sim** — aguarda aceite ANX-91 |
