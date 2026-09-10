---
description: "PC 26 fechado: audit Flight Recorder."
status: stable
tags:
  - PC26
  - ANX-376
  - audit
title: PC 26 Audit debate M26
type: debate
---
# PC 26 Audit — debate e diagramas (M26)

**Unidade serial:** PC 26 · **Issue:** ANX-376 · **Status documental:** fechado
**Owner fisico:** `audit`.

## POSSUI

- Flight Recorder, hash chain, replay
- Linhagem de comandos (nao substitui journal do dono)

## NAO POSSUI

- Grants — `governance`
- Ledger contabil — `accounting`

## Non-goals

- Audit não é dono de grants nem de ledger.
- Replay não reescreve journal do dono.

```mermaid
flowchart LR
  cmd[comandos] --> fr[Flight Recorder]
  fr --> replay[replay]
  fr --> integrity[hash chain]
```

## Fontes

- [atlas audit](./anxionos-diagram-atlas-modules.md)
