---
description: Debate thin capital spec 003.
status: draft
tags:
  - capital
  - spec-003
  - ANX-389
title: Thin debate — capital
type: debate
---
# Thin debate — capital (spec 003 / ADR0002)

**Issue:** ANX-389 · Módulo `capital`. Sem 24º módulo.

## POSSUI

Conta de capital, titular, alocações, reservas (HELD/release/consume/expiry).

## NÃO POSSUI

Ledger comercial (`accounting`), posições (`portfolios`), ordens (`execution`), PolicyVersion RISK (`risk`). SQLite não guarda saldo.

## Non-goals

Não ser segundo ledger. D-GOV-010 não aplica aqui.

```mermaid
flowchart LR
  cap[capital reserva] --> risk[risk check]
  risk --> dec[decisions]
  dec --> exe[execution]
  exe --> cap
```
