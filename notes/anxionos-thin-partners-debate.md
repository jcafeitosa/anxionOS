---
description: Debate thin partners.
status: draft
tags:
  - partners
  - ANX-389
title: Thin debate — partners
type: debate
---
# Thin debate — partners (spec 003 comercial / ADR0002)

**Issue:** ANX-389 · Módulo `partners`.

## POSSUI

Referrals, regras, comissões, payouts.

## NÃO POSSUI

Invoice paid (`billing`), ledger (`accounting`).

## Non-goals

Pasta marketplace física (PC 29 composto spec 007).

```mermaid
flowchart LR
  bill[billing paid] --> par[partners]
  par --> acc[accounting]
```
