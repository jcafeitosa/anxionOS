---
description: "PC 19 fechado: Observability transversal."
status: stable
tags:
  - PC19
  - ANX-369
  - observability
title: PC 19 Observability debate M19
type: debate
---
# PC 19 Observability — debate e diagramas (M19)

**Unidade serial:** PC 19 · **Issue:** ANX-369 · **Status documental:** fechado
**Owners:** `performance` + `operations` + package observability. **Sem pasta `observability`.**

## POSSUI

- KPIs / p95 em performance (derivados de accounting/eval)
- SLO / probes em operations
- Logs/traces no package, nao em modulo de dominio

## NAO POSSUI

- Ledger PnL autoritativo — `accounting`
- Kill switch — `risk`

## Non-goals

- Não criar pasta `observability`.
- Package observability não vira módulo físico.

```mermaid
flowchart LR
  acc[accounting] --> perf[performance KPIs]
  perf --> slo[operations SLO]
```

## Fontes

- [atlas performance](./anxionos-diagram-atlas-modules.md)
