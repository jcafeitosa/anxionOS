---
title: TradeIntent e ExecutionPermit v1
description: Contratos normativos P02-03 para intent imutável e permit single-use.
type: specification
status: draft
issue: ANX-48
depends_on:
  - ANX-47
  - ANX-30
---
# TradeIntent e ExecutionPermit v1

**Issue:** ANX-48 · **Backlog:** P02-03 · **Owner módulo:** decisions (emissão intent) + risk/governance (epochs)

## TradeIntent (imutável)

Identifica tenant, agência, ator, ativo, venue, conta, modo, lado, quantidade, tipo, limites, epochs, hash e expiração.

**Schema Zod:** `backend/packages/contracts/src/decisions/trade-intent.ts`

| Campo | Regra |
| --- | --- |
| `intentHash` | SHA-256 canônico do payload sem timestamps |
| `authorityEpoch` / `riskEpoch` | Capturados na criação; revalidados no dispatch |
| `executionMode` | `SIMULATED` \| `PAPER` \| `REAL` — sem fallback silencioso |
| `idempotencyKey` | Deduplica submissão |

## ExecutionPermit (single-use)

Emitido somente após governance + risk. Vinculado a `intentHash`.

**Schema Zod:** `backend/packages/contracts/src/decisions/execution-permit.ts`

| Invariante | Descrição |
| --- | --- |
| INV-PERMIT-01 | `singleUse: true` — segundo dispatch com mesmo permitId → rejeição |
| INV-PERMIT-02 | Epoch drift → status `STALE` via `isPermitStale()` |
| INV-PERMIT-03 | `expiresAt` enforced antes de DISPATCHED |
| INV-PERMIT-04 | Revogação/kill switch invalida permit ativo |

## Máquina de estados (referência)

Ver [p01-p02-contracts-and-gates.md](./p01-p02-contracts-and-gates.md) §Máquina operacional.

## Critérios P02-03

| Critério | Evidência |
| --- | --- |
| Intent imutável com campos normativos | `tradeIntentSchema` |
| Permit vinculado por hash, epochs, limites, prazo, single-use | `executionPermitSchema` |
| Stale/revoked rejeitado | `isPermitStale` + testes |
| Sem runtime execution | Nenhum módulo `decisions/` em backend ainda |

## Referências

- [execution-modes-and-asset-classes.md](./execution-modes-and-asset-classes.md)
- [capability-manifest-v1.md](./capability-manifest-v1.md)
