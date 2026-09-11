---
type: debate
---
# R04 — Contratos, API e eventos: `modules/governance`

**Rodada:** R4 — Superfície pública, contratos e API sketch  
**Data:** 2026-09-11  
**Issue:** ANX-40 (debate) · ANX-30 (implementação) · pack ANX-389  
**Callers:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R05-storage.md](./R05-storage.md).

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `ownerDomain` | `"governance"` |
| `eventType` | `governance.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |

**KEEP adapter-gateway** se já exportado.

## In / Out (R4)

**In:** POST/DELETE/GET grants; POST change-proposals; POST `/v1/governance/authorization/can` (evaluateT01). Timeout T01 2s → DENY.

**Out:** `governance.grant.*` / `change_proposal.submitted` / `approval.resolved` / `authority_epoch.bumped`. **Não** PolicyVersion RISK (`risk`). **Não** T01 kernel (`graph`). Sem secrets.

## Non-goals

Não D-GOV-010 enforcement cross-risk neste módulo (defer P06). Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não Neo4j driver no módulo.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| Grant / Delegation / Mandate / ChangeProposal / Approval / AuthorityEpoch | **governance** |
| PolicyVersion RISK / kill switch | **risk** |
| T01 kernel | **graph** |
| adapter-gateway | **KEEP** |

## Eventos v1

| eventType | Campos principais |
| --- | --- |
| `governance.grant.issued.v1` | `grantId`, `scopeId`, `granteePrincipalId`, `capability`, `authorityEpoch` |
| `governance.grant.revoked.v1` | `grantId`, `authorityEpoch` |
| `governance.change_proposal.submitted.v1` | `proposalId`, `kind`, `payloadHash` |
| `governance.approval.resolved.v1` | `approvalId`, `decision` |
| `governance.authority_epoch.bumped.v1` | `scopeId`, `epoch` |

## REST sketch

| Método | Rota | Ação |
| --- | --- | --- |
| POST | `/v1/agencies/:agencyId/grants` | IssueGrant |
| DELETE | `/v1/agencies/:agencyId/grants/:grantId` | RevokeGrant |
| GET | `/v1/agencies/:agencyId/grants` | ListEffectiveGrants |
| POST | `/v1/agencies/:agencyId/change-proposals` | SubmitChangeProposal |
| POST | `/v1/governance/authorization/can` | evaluateT01 |

## Port público

`TraversalEvaluator.evaluateT01` — adapter → graph kernel; timeout 2s → DENY.

## Saída R4

Contratos v1 para R5 (debate). Spec **não** `accepted`.
