---
description: "PC 18 fechado: Infrastructure operacional, nao 24o modulo."
status: stable
tags:
  - PC18
  - ANX-368
  - operations
title: PC 18 Infrastructure debate M18
type: debate
---
# PC 18 Infrastructure — debate e diagramas (M18)

**Unidade serial:** PC 18 · **Issue:** ANX-368 · **Status documental:** fechado
**Owner:** `operations` + `backend/deploy` + packages. **Sem pasta `infrastructure` de dominio.**

## POSSUI

- Probes, runbooks, recovery
- Layout deploy (compose/k8s) fora dos 23 contexts

## Non-goals

- Não criar 24º módulo de infraestrutura.
- `adapter-gateway` permanece infra, não context ADR0002.

## NAO POSSUI

- adapter-gateway como 24o modulo
- Autoridade de capital

```mermaid
flowchart LR
  ops[operations] --> deployPkg[backend deploy]
  deployPkg --> probes[probes]
```

## Fontes

- ADR0002 apps/packages vs modules
