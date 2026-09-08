---
title: Boundaries de ambiente de execução v1
description: Enums normativos e guards de isolamento SIMULATED/PAPER/REAL (P02-04).
type: specification
status: draft
issue: ANX-49
depends_on:
  - ANX-48
  - ANX-47
---
# Execution environment boundaries v1

**Issue:** ANX-49 · **Backlog:** P02-04

## Enums

Reutiliza `executionModeSchema` (`SIMULATED` | `PAPER` | `REAL`) de `decisions/types.ts`.

## Adapter descriptor

`executionAdapterDescriptorSchema` em `backend/packages/contracts/src/execution/environment.ts`:

| Campo | Regra |
| --- | --- |
| `supportedModes` | Lista explícita — sem wildcard |
| `secretScope` | `NONE` \| `PAPER_SIM_ONLY` \| `REAL_VENUE` |
| `homologatedForReal` | Obrigatório `true` para dispatch REAL |

## Guards (boundary, sem runtime broker)

| Função | Invariante |
| --- | --- |
| `assertNoSilentModeEscalation` | `intentMode === dispatchMode` |
| `assertAdapterAllowedForMode` | Adapter suporta modo + scope + homologação REAL |
| `isAdapterAllowedForMode` | Versão booleana para policy tests |

## Matriz de secret scope

| Modo | Scopes permitidos |
| --- | --- |
| SIMULATED | NONE, PAPER_SIM_ONLY |
| PAPER | NONE, PAPER_SIM_ONLY |
| REAL | NONE, PAPER_SIM_ONLY, REAL_VENUE |

`REAL_VENUE` **nunca** resolve para SIMULATED/PAPER.

## Códigos de violação

`ENV_MODE_MISMATCH`, `ENV_ADAPTER_NOT_ALLOWED`, `ENV_SECRET_SCOPE_DENIED`, `ENV_SILENT_ESCALATION`, `ENV_REAL_NOT_HOMOLOGATED`.

## Critérios P02-04

| Critério | Evidência |
| --- | --- |
| Enums explícitos | `executionModeSchema` + `secretScopeSchema` |
| Sem fallback entre ambientes | `assertNoSilentModeEscalation` + testes |
| Isolamento SIM/PAPER vs REAL secrets | `assertAdapterAllowedForMode` + testes |

## Referências

- [execution-modes-and-asset-classes.md](./execution-modes-and-asset-classes.md)
- [trade-intent-execution-permit-v1.md](./trade-intent-execution-permit-v1.md)
