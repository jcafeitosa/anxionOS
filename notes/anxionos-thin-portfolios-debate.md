---
description: Debate thin portfolios spec 003.
status: draft
tags:
  - portfolios
  - spec-003
  - ANX-389
title: Thin debate — portfolios
type: debate
---
# Thin debate — portfolios (spec 003 / ADR0002)

**Issue:** ANX-389 · Módulo `portfolios`.

## POSSUI

Posições canônicas, valuation, exposição; séries derivadas Timescale (ADR0004).

## NÃO POSSUI

Ledger (`accounting`), fills autoritativos (`execution`), instrumentos mestres (`market-data`).

## Non-goals

Cache local com asOf nunca decide risco.

```mermaid
flowchart LR
  fill[execution fill] --> pos[portfolios]
  md[market-data] --> pos
  pos --> perf[performance]
```
