---
type: debate
---

# R04 — Contratos, API e eventos: `modules/governance`

**Rodada:** R4 — Superfície pública, contratos e API sketch  
**Data:** 2026-09-08  
**Issue:** ANX-40 (debate) · ANX-30 (implementação)

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Crítico | critic-reviewer |

## Objetivo da rodada

Definir superfície pública antes de armazenamento (R5) e dependências (R6).

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `ownerDomain` | `"governance"` |
| `eventType` | `governance.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |

### Eventos v1

| eventType | Campos principais |
| --- | --- |
| `governance.grant.issued.v1` | `grantId`, `scopeId`, `granteePrincipalId`, `capability`, `authorityEpoch` |
| `governance.grant.revoked.v1` | `grantId`, `authorityEpoch` |
| `governance.change_proposal.submitted.v1` | `proposalId`, `kind`, `payloadHash` |
| `governance.approval.resolved.v1` | `approvalId`, `decision` |
| `governance.authority_epoch.bumped.v1` | `scopeId`, `epoch` |

### REST sketch

| Método | Rota | Ação |
| --- | --- | --- |
| POST | `/v1/agencies/:agencyId/grants` | IssueGrant |
| DELETE | `/v1/agencies/:agencyId/grants/:grantId` | RevokeGrant |
| GET | `/v1/agencies/:agencyId/grants` | ListEffectiveGrants |
| POST | `/v1/agencies/:agencyId/change-proposals` | SubmitChangeProposal |
| POST | `/v1/governance/authorization/can` | evaluateT01 |

### Port público

`TraversalEvaluator.evaluateT01` — adapter → graph kernel; timeout 2s → DENY.

## Saída R4

✅ Contratos v1 aprovados para R5.
