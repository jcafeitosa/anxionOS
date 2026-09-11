---
description: Debate thin execution spec 003.
status: draft
tags:
  - execution
  - spec-003
  - ANX-389
title: Thin debate — execution
type: debate
---
# Thin debate — execution (spec 003 / ADR0002)

**Issue:** ANX-389 · Módulo `execution`. Adapters no dono (ADR0006), não módulo gateway.

## POSSUI

Orders, fills, tentativas, permits de execução, reconciliação venue.

## NÃO POSSUI

TradeIntent (`decisions`), RiskCheck (`risk`), reserva (`capital`), ledger (`accounting`). REAL trading não autorizado por este debate.

## Non-goals

Fila offline SQLite de ordens. Pasta `adapter-gateway`.

```mermaid
flowchart LR
  dec[decisions] --> risk[risk]
  risk --> cap[capital]
  cap --> exe[execution]
  exe --> acc[accounting]
```
