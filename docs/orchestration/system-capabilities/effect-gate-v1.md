---
title: EffectGate e reconciliação UNKNOWN v1
description: Gate de efeitos externos, estados UNKNOWN/RECONCILING e proibição de retry cego (P02-07).
type: specification
status: draft
issue: ANX-50
depends_on:
  - ANX-48
  - ANX-49
---
# EffectGate v1

**Issue:** ANX-50 · **Backlog:** P02-07

## Estados

`orderLifecycleStateSchema`: PROPOSED → … → DISPATCHED → CONFIRMED | FAILED | UNKNOWN → RECONCILING → CLOSED.

## Guards

| Função | Regra |
| --- | --- |
| `assertEffectGateOpen` | Kill switch, revogação, policy stale, permit ACTIVE/não expirado/epochs |
| `assertNoBlindRetry` | UNKNOWN/RECONCILING exigem `reconcileUnknownCommand` |
| `assertValidLifecycleTransition` | Máquina de estados normativa |

## Reconcile UNKNOWN

`reconcileUnknownCommandSchema` — decisão explícita antes de nova tentativa.

## Códigos

`EFFECT_KILL_SWITCH`, `EFFECT_PERMIT_*`, `EFFECT_POLICY_STALE`, `EFFECT_BLIND_RETRY`, `EFFECT_INVALID_TRANSITION`.

## Referências

- [p01-p02-contracts-and-gates.md](./p01-p02-contracts-and-gates.md)
- [trade-intent-execution-permit-v1.md](./trade-intent-execution-permit-v1.md)
