---
type: debate
---

# R02 — Fronteiras: `modules/governance`

**Rodada:** R2 — Scope boundary  
**Data:** 2026-09-08  
**Issue:** ANX-40

## Debate R2 (diálogo atribuído)

**Arquiteto:** governance é dono de **autoridade institucional**: Grant versionado, Delegation com escopo temporal, Mandate para agentes, Approval/ChangeProposal, e o contador monotônico `authorityEpoch` por scope (organization/agency).

**Crítico:** O que **não** entra aqui?

**Arquiteto:** RiskPolicy, RiskCheck, limites de exposição, kill switch → **risk** (PolicyVersion `kind=RISK`). Execução de ordens, venue routing → **execution**. Membership/convite → **organizations**. Traverse Neo4j T01–T20 → **graph** (kernel); governance alimenta dados e epoch, não executa Cypher. Simulação de twin → **simulation** (Snapshot); governance aprova promoção via ChangeProposal.

**Executor:** Port público `TraversalEvaluator.evaluateT01` — facade que delega ao graph kernel com input normalizado; governance valida epoch local antes de encaminhar.

**Security:** `IssueGrant` exige principal autenticado com papel Owner ou grant delegado equivalente. Nenhum agente pode auto-expandir grant (CAP-B02).

**QA:** Revogação membership → revogar grants derivados (event consumer) — teste de integração obrigatório G3.

**Síntese Orquestrador:** Fronteira aceita; sem objeção bloqueante.

## O módulo POSSUI (estado autoritativo PostgreSQL)

| Agregado | Responsabilidade |
| --- | --- |
| `Grant` | Capability/resource concedida a principal ou agent; intervalo temporal; revision |
| `Delegation` | Subconjunto de grant repassado com validUntil e intentHash opcional |
| `Mandate` | Autoridade de agente (CEO blueprint, operador) vinculada a agency |
| `Approval` | Decisão APPROVED/REJECTED sobre ChangeProposal ou ação sensível |
| `ChangeProposal` | SOFTWARE ou INSTITUTIONAL; payload hash; workflow de aprovação |
| `AuthorityEpoch` | Contador monotônico por `scopeId` (agency ou organization) |
| `PolicyReference` | Ponteiro genérico a PolicyVersion (kind=RISK em risk) — não duplica corpo |

## O módulo NÃO POSSUI

| Item | Dono correto |
| --- | --- |
| Principal, sessão, credencial | identity |
| Agency, Membership, convite | organizations |
| Nós/arestas Neo4j, traverse T01 | graph (kernel + projector) |
| RiskPolicy, kill switch, limites | risk |
| ExecutionPermit emissão final | decisions (após governance+risk) |
| Snapshot/SimulationRun | simulation |
| Ordens, fills | execution / accounting |

## Invariantes de fronteira (propostas)

1. `authorityEpoch` só incrementa via comandos governance (IssueGrant, RevokeGrant, ResolveApproval que afete grants).
2. T01 ALLOW mutável **nunca** cacheado com `intentHash` ativo (graph GK-R05-04).
3. Comandos idempotentes com `commandId` + envelope institucional (contracts).
4. `PolicyReference` não copia corpo de política — apenas `policyId` + `kind` + `version`.
5. Revogação membership (`organizations.membership.revoked.v1`) dispara revogação grants derivados neste módulo.

## Saída R2

✅ Boundary doc aprovado para R3 (domínio).
