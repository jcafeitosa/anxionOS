---
description: Debate thin accounting spec 003.
status: draft
tags:
  - accounting
  - spec-003
  - ANX-389
title: Thin debate — accounting
type: debate
---
# Thin debate — accounting (spec 003 / ADR0002)

**Issue:** ANX-389 · Módulo `accounting`. Único ledger financeiro.

## POSSUI

Ledger, taxas, reversões, ajustes, reconciliação.

## NÃO POSSUI

Invoices de plataforma (`billing`), comissões (`partners`), posições (`portfolios`).

## Non-goals

Segundo ledger Neo4j ou SQLite.

```mermaid
flowchart LR
  exe[execution] --> acc[accounting]
  bill[billing] -.->|não substitui| acc
```
