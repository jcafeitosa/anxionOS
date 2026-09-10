---
description: "PC 20 fechado: Incidents em operations."
status: stable
tags:
  - PC20
  - ANX-370
  - operations
title: PC 20 Incidents debate M20
type: debate
---
# PC 20 Incidents — debate e diagramas (M20)

**Unidade serial:** PC 20 · **Issue:** ANX-370 · **Status documental:** fechado
**Owner fisico:** `operations` (Incident + runbook). Nota P1: notes/anxionos-incident-management-graph.md.

## POSSUI

- Incident, runbook, postmortem refs
- Ligacao a deploy/recovery

## NAO POSSUI

- ChangeProposal de promocao — `governance`
- DecisionRecord de trade — `decisions`

```mermaid
flowchart TD
  probe[probes] --> inc[Incident]
  inc --> runbook[runbook]
  runbook --> rec[recovery]
```

## Fontes

- [atlas operations](./anxionos-diagram-atlas-modules.md)
