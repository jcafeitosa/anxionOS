---
title: CapabilityManifest v1 — fundação P02
description: Inventário normativo de capacidades mutáveis com owner, schemas, grants, modos, effectClass e políticas.
type: specification
status: draft
owner: Produto e engenharia
issue: ANX-47
depends_on:
  - ANX-31
  - ANX-30
tags:
  - capability-manifest
  - p02
  - governance
---
# CapabilityManifest v1 — fundação P02

**Issue:** ANX-47 · **Coordena:** ANX-45 · **Status:** draft (documental; sem runtime SDK)

Inventário das capacidades **mutáveis** da fundação P02 com contratos verificáveis no repositório. O manifesto é catálogo — **não concede autoridade** (grants/epochs revalidados no handler).

## Convenções

| Campo | Regra |
| --- | --- |
| `capabilityId` | `<ownerModule>.<verb>.<noun>` estável |
| `version` | `1` neste artefato |
| `inputSchema` | Caminho Zod em `@anxionos/contracts` |
| `envelope` | v0.2 quando aplicável ([ANX-31](../../../backend/packages/contracts/src/envelope-v02.ts)) |
| `effectClass` | `READ_ONLY` \| `REVERSIBLE` \| `EXTERNAL_EFFECT` \| `IRREVERSIBLE` |
| `allowedExecutionModes` | `SIMULATED`, `PAPER`, `REAL` — v1 fundação: todos `SIMULATED` até P02-04 |

## Entradas v1 (implementáveis hoje)

### identity

| capabilityId | ownerModule | inputSchema | requiredGrants | channels | effectClass | idempotency | approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `identity.principal.register` | identity | (handler ANX-28) | — (bootstrap) | ui, sdk | REVERSIBLE | commandId UUID | none |
| `identity.session.revoke` | identity | (defer G1) | `identity.admin` ou self | ui, sdk | REVERSIBLE | commandId | none |

### organizations

| capabilityId | ownerModule | inputSchema | requiredGrants | channels | effectClass | idempotency | approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `organizations.agency.create` | organizations | `createAgencyCommandSchema` | Owner session | ui, sdk | REVERSIBLE | Idempotency-Key → commandId | none |
| `organizations.agency.updateMarkets` | organizations | `updateAgencyMarketsCommandSchema` | membership admin+ | ui, sdk | REVERSIBLE | commandId | none |
| `organizations.membership.invite` | organizations | `inviteMemberCommandSchema` | admin/owner | ui, sdk | REVERSIBLE | commandId | none |
| `organizations.membership.activate` | organizations | `activateMembershipCommandSchema` | invited principal | ui, sdk | REVERSIBLE | commandId | none |
| `organizations.membership.revoke` | organizations | `revokeMembershipCommandSchema` | owner/admin | ui, sdk | REVERSIBLE | commandId | none |
| `organizations.membership.acceptInvite` | organizations | `acceptInviteByTokenCommandSchema` | token + session | ui | REVERSIBLE | commandId | none |

Schemas: `backend/packages/contracts/src/organizations/commands.ts`

### governance

| capabilityId | ownerModule | inputSchema | requiredGrants | channels | effectClass | idempotency | approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `governance.grant.issue` | governance | `issueGrantCommandSchema` | Owner ou delegado | ui, sdk | REVERSIBLE | commandId | none |
| `governance.grant.revoke` | governance | `revokeGrantCommandSchema` | Owner ou issuer | ui, sdk | REVERSIBLE | commandId | none |
| `governance.delegation.create` | governance | `createDelegationCommandSchema` | parent grant | ui, sdk | REVERSIBLE | commandId | none |
| `governance.changeProposal.submit` | governance | `submitChangeProposalCommandSchema` | operator+ | ui, sdk, worker | REVERSIBLE | commandId | policy por kind |
| `governance.approval.resolve` | governance | `resolveApprovalCommandSchema` | Owner | ui | IRREVERSIBLE | commandId | G7 Owner |
| `authorization.can` | graph | `T01_INPUT_SCHEMA` | session + epoch | ui, sdk, worker | READ_ONLY | optional intentHash | T01 kernel |

Schemas governance: `backend/packages/contracts/src/governance/commands.ts` · T01: `graph/traversals/T01.ts`

## Políticas transversais (todas as entradas mutáveis)

| Política | v1 |
| --- | --- |
| **audit** | `correlationId`, `actorPrincipalId`, `channel` no envelope v0.2 |
| **budget** | defer P07 billing quotas |
| **timeout** | api 30s; T01 governance port 2s fail-closed |
| **approval** | ChangeProposal INSTITUTIONAL/HIERARCHY_MODE → Owner G7 |

## Critérios P02-02 (ANX-47)

| Critério | Evidência |
| --- | --- |
| Inventário cobre capacidades mutáveis P02 fundação | Tabelas identity, organizations, governance acima |
| Cada entrada tem owner, grants, modos, efeitos, idempotência, approval, audit | Colunas das tabelas + §Políticas |
| Sem implementação SDK | Nenhum arquivo em `packages/sdk` alterado |

## Próximo

- P02-03: `TradeIntent` / `ExecutionPermit` (ANX-48)
- Runtime CapabilityManifest em `packages/sdk` após greenlight e ANX-45 aceite

## Referências

- [p01-p02-contracts-and-gates.md](./p01-p02-contracts-and-gates.md) §CapabilityManifest
- [p01-p02-backlog.md](./p01-p02-backlog.md) P02-02
- [CAPABILITY-MAP.md](./CAPABILITY-MAP.md)
