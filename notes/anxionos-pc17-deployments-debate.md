---
description: "PC 17 fechado: Deployments em operations."
status: stable
tags:
  - PC17
  - ANX-367
  - operations
title: PC 17 Deployments debate M17
type: debate
---
# PC 17 Deployments — debate e diagramas (M17)

**Unidade serial:** PC 17 · **Issue:** ANX-367 · **Status documental:** fechado
**Owner primario:** `operations` (deploy catalog). `strategies` publica versao de estrategia, nao o runtime de deploy.

## POSSUI

- Catalogo de deploy, recovery, ambiente
- Promocao institucional via ChangeProposal (governance)

## NAO POSSUI

- StrategyVersion body — `strategies`
- Pasta `deployments`

```mermaid
flowchart LR
  cat[operations deploy catalog] --> env[Environment]
  gov[ChangeProposal] --> cat
```

## Fontes

- [atlas operations](./anxionos-diagram-atlas-modules.md)
