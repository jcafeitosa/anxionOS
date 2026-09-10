---
description: "PC 29 fechado: Marketplace composto spec 007, sem pasta."
status: stable
tags:
  - PC29
  - ANX-379
  - marketplace
title: PC 29 Marketplace debate M29
type: debate
---
# PC 29 Marketplace — debate e diagramas (M29)

**Unidade serial:** PC 29 · **Issue:** ANX-379 · **Status documental:** fechado (capacidade composta)
**Owner:** spec 007 composta com Products (PC 10). **Sem pasta `marketplace`.**

## POSSUI

- Conceito de catalogo/parceiro (partners cobre comissao, nao o marketplace institucional)

## NAO POSSUI

- Modulo fisico marketplace
- Listagem de skills como store sem spec

## Non-goals

- Nao scaffoldar. Implementacao exige Definition + ADR.

```mermaid
flowchart LR
  mkt[capacidade Marketplace] --> spec007[spec 007 composta]
  spec007 -.-> part[partners payout]
```

## Questoes abertas

1. Spec 007 numerada no tree `project-docs/specs/` — **nao listada** neste workspace (001-006, 008). Follow-up de implementacao; nao bloqueia fechar a unidade documental.
