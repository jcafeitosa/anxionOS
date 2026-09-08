---
type: debate
---

# R03 — Esboço de domínio: `modules/governance`

**Rodada:** R3 — Domain model  
**Data:** 2026-09-08  
**Issue:** ANX-40

## Debate R3 (diálogo atribuído)

**Arquiteto:** Cinco agregados núcleo v1: `Grant`, `Delegation`, `Mandate`, `Approval`, `ChangeProposal`. Value object: `AuthorityEpoch`, `CapabilityScope`, `GrantStatus`.

**Executor:** Ports: `GrantRepository`, `DelegationRepository`, `MandateRepository`, `ApprovalRepository`, `ChangeProposalRepository`, `AuthorityEpochStore`, `PrincipalLookup` (identity), `GovernanceEventPublisher` (outbox).

**Crítico:** `Mandate` vs `Grant` para agentes — Mandate é especialização com `agentId` e `mandateKind` (CEO, OPERATOR); Grant genérico para humanos e PLATFORM.

**Arquiteto:** v1 inclui consumer reativo: `membership.activated` → grant baseline `owner` capabilities; `membership.revoked` → close grants where `derivedFromMembershipId`.

**QA:** GK03 — revogar grant bump epoch; segundo revoke idempotente (mesmo interval close).

## Entidades

### Grant

```typescript
interface Grant {
  id: string;
  scopeId: string;
  scopeKind: "agency" | "organization";
  granteePrincipalId: string;
  granteeAgentId?: string;
  capability: string;
  resourceRef?: string;
  status: "active" | "revoked" | "expired";
  validFrom: Date;
  validUntil?: Date;
  derivedFromMembershipId?: string;
  authorityEpochAtIssue: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Delegation

```typescript
interface Delegation {
  id: string;
  parentGrantId: string;
  delegatePrincipalId: string;
  capabilitySubset: string[];
  intentHash?: string;
  validUntil: Date;
  status: "active" | "revoked" | "expired";
  revision: number;
}
```

### Mandate

```typescript
interface Mandate {
  id: string;
  agencyId: string;
  agentId: string;
  mandateKind: "ceo" | "operator" | "audit";
  grantId: string;
  status: "active" | "suspended" | "revoked";
  revision: number;
}
```

### ChangeProposal

```typescript
interface ChangeProposal {
  id: string;
  scopeId: string;
  kind: "SOFTWARE" | "INSTITUTIONAL" | "HIERARCHY_MODE";
  payloadHash: string;
  proposerPrincipalId: string;
  status: "pending" | "approved" | "rejected" | "superseded";
  requiredApprovals: number;
  revision: number;
  createdAt: Date;
}
```

### Approval

```typescript
interface Approval {
  id: string;
  changeProposalId?: string;
  actionRef?: string;
  resolverPrincipalId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  resolvedAt: Date;
}
```

### AuthorityEpoch

```typescript
interface AuthorityEpoch {
  scopeId: string;
  epoch: number;
  updatedAt: Date;
}
```

## Invariantes de domínio

| ID | Regra |
| --- | --- |
| INV-GOV-01 | `authorityEpoch` incrementa em IssueGrant, RevokeGrant, ResolveApproval que altere grants |
| INV-GOV-02 | Grant revogado não reabre sem novo IssueGrant |
| INV-GOV-03 | Delegation não excede capability do parentGrant |
| INV-GOV-04 | Mandate exige Grant ativo backing |
| INV-GOV-05 | ChangeProposal INSTITUTIONAL exige Owner approval |
| INV-GOV-06 | Idempotência: mesmo commandId → mesmo aggregate revision |
| INV-GOV-07 | derivedFromMembershipId revogado → grants derivados fechados |

## Ports (domain/)

| Port | Método (esboço) |
| --- | --- |
| `GrantRepository` | `save`, `findById`, `listEffective(scopeId, principalId)` |
| `DelegationRepository` | `save`, `findActiveByGrant` |
| `MandateRepository` | `save`, `findByAgentAndAgency` |
| `ChangeProposalRepository` | `save`, `findPendingByScope` |
| `ApprovalRepository` | `save` |
| `AuthorityEpochStore` | `get`, `increment(scopeId)` |
| `PrincipalLookup` | `exists(principalId)` |
| `TraversalEvaluator` | `evaluateT01(input): Promise<T01Output>` |
| `GovernanceUnitOfWork` | transação estado+journal+outbox |

## Eventos de domínio (rascunho para R4)

| eventType | aggregate |
| --- | --- |
| `governance.grant.issued.v1` | Grant |
| `governance.grant.revoked.v1` | Grant |
| `governance.delegation.created.v1` | Delegation |
| `governance.delegation.revoked.v1` | Delegation |
| `governance.mandate.issued.v1` | Mandate |
| `governance.mandate.revoked.v1` | Mandate |
| `governance.change_proposal.submitted.v1` | ChangeProposal |
| `governance.approval.resolved.v1` | Approval |
| `governance.authority_epoch.bumped.v1` | AuthorityEpoch |

## Comandos application (rascunho para R4)

| Command | Agregado |
| --- | --- |
| `IssueGrant` | Grant |
| `RevokeGrant` | Grant |
| `CreateDelegation` | Delegation |
| `RevokeDelegation` | Delegation |
| `IssueMandate` | Mandate |
| `RevokeMandate` | Mandate |
| `SubmitChangeProposal` | ChangeProposal |
| `ResolveApproval` | Approval |

## Saída R3

✅ Domain sketch aprovado para R4 (contratos).
