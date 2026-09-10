---
description: "PC 21 fechado: Experiments = simulation + evaluation."
status: stable
tags:
  - PC21
  - ANX-371
  - simulation
title: PC 21 Experiments debate M21
type: debate
---
# PC 21 Experiments — debate e diagramas (M21)

**Unidade serial:** PC 21 · **Issue:** ANX-371 · **Status documental:** fechado
**Owners:** `simulation` + `evaluation`. **Sem pasta `experiments`.**

## POSSUI

- Snapshot / SimulationRun / Digital Twin (`simulation`)
- Score / certificado (`evaluation`)
- ChangeProposal de promocao (governance consome, nao cria o twin)

## NAO POSSUI

- ExecutionPermit live
- Pasta experiments

## Non-goals

- Não criar pasta `experiments`.
- Twin não aplica ChangeProposal.

```mermaid
flowchart LR
  snap[Snapshot] --> twin[SimulationRun]
  twin --> score[evaluation score]
  score --> cp[ChangeProposal]
```

## Fontes

- [atlas simulation](./anxionos-diagram-atlas-modules.md)
