---
description: Debate thin strategies mapeado a spec 003, sem pasta nova.
status: draft
tags:
  - strategies
  - spec-003
  - ANX-389
title: Thin debate — strategies
type: debate
---
# Thin debate — strategies (spec 003 / ADR0002)

**Issue:** ANX-389 · **Módulo físico:** `strategies` · Sem pasta nova. PC serial não cobriu este módulo (taxonomia 30 ≠ 23).

## POSSUI

StrategyVersion, parâmetros/hash, Deployment, estado de backtest. Publicação ≠ backtest executado.

## NÃO POSSUI

| Item | Dono |
| --- | --- |
| Certificação/promoção auto | evaluation |
| Approval de change | governance |
| Ordens | execution |
| Ticks | market-data |

## Non-goals

Não criar pasta `products/` (PC 10). evaluation certifica; strategies aplica versão.

```mermaid
flowchart LR
  md[market-data] --> st[strategies]
  st --> ev[evaluation]
  ev --> gov[governance]
  gov --> st
  st --> dep[Deployment]
```

Fontes: spec 003 draft · [R-pack](../docs/orchestration/modules/strategies/ROUNDS.md) · [PC índice](./anxionos-pc-serial-index.md).
