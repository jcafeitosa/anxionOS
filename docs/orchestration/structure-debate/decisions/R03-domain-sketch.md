---
type: debate
---

# R03 — Esboço de domínio: `modules/decisions`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-97**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## Agregados

### DecisionRecord

- `id`, `organizationId`, `decisionVersion`, `portfolioId`, `capitalAccountId`
- `strategyVersionId?`, `deploymentId?`, `signalId?`
- `proposedBy`: `{ kind: PRINCIPAL|AGENT, principalId?, agentId?, agentVersionId? }`
- `contextManifestRef`, `evidenceManifest`, `rationale`, `correlationId`, `taskId?`, `runId?`
- `status`: DRAFT → PROPOSED → AUTHORITY_CHECKED → RISK_CHECKED → WAITING_APPROVAL → APPROVED → RESERVED → READY → SUBMITTED | DENIED | EXPIRED | CANCELLED

### Proposal

- `id`, `organizationId`, `decisionId`, `proposalKind`: TRADE|REBALANCE|WITHDRAWAL|HEDGE
- `boundsEnvelope`, `source`, `status`: OPEN → ACCEPTED → SUPERSEDED|REJECTED|EXPIRED

### TradeIntent

Contrato `tradeIntentSchema` + `decisionId`, `proposalId?`, `marketSnapshotRef`, `mandateVersion`, `purpose`. Imutável pós-submit (DC-R02-INV-01).

### Disposition

- `id`, `decisionId`, `intentHash`, `dispositionKind`: APPROVED|DENIED|REVOKED|EXPIRED
- `approver`, `approvedAt`, `expiresAt`, `scope`

### AuthorityRef

- `grantId`, `authorityEpoch`, `capability`, `effectivePrincipalId`, `mandateId?`, `autonomyLevel`
- `traversalRef?`: `{ traversalId, result: ALLOW|DENY }`

## Ports

GovernancePort · GraphTraversalPort · KnowledgeQueryPort · PortfoliosQueryPort · CapitalQueryPort · MarketDataPort · StrategiesQueryPort · RiskNotifyPort · AgentsQueryPort · OrchestrationNotifyPort · AuditNotifyPort

## Invariantes DC-R03-INV-*

| ID | Regra |
| --- | --- |
| DC-R03-INV-01 | intentHash = hash canônico campos material |
| DC-R03-INV-02 | Idempotência por idempotencyKey |
| DC-R03-INV-03 | expiresAt passado → EXPIRED terminal |
| DC-R03-INV-04 | Independent approver quando policy exige |
| DC-R03-INV-05 | authorityEpoch mismatch bloqueia avanço |
| DC-R03-INV-06 | Evidence mínima ausente → DENIED |
| DC-R03-INV-07 | RESERVED atômico com capital reservation |
| DC-R03-INV-08 | ExecutionPermit só em READY com epochs atuais |
| DC-R03-INV-09 | SUBMITTED congela Decision |
| DC-R03-INV-10 | correlationId obrigatório em mutações |

## Commands

`proposeDecision` · `checkAuthority` · `recordDisposition` · `submitIntent` · `cancelDecision`

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
