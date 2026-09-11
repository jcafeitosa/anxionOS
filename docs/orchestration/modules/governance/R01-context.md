---
type: debate
---

# R01 — Contexto: `modules/governance`

**Módulo:** governance (P02 Foundation)  
**Rodada:** R1 — Inventário documental e de código  
**Data:** 2026-09-08  
**Issue:** ANX-30 (implementação) · ANX-40 (debate)

## In / Out (R1)

**In:** inventário Grant, Delegation, Mandate, Approval, ChangeProposal, authorityEpoch.

**Out:** PolicyVersion RISK (`risk`). Membership (`organizations`). Traverse (`graph`).

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Grant / Delegation / Mandate / Approval / ChangeProposal | **governance** |
| adapter-gateway | **KEEP** |

## Participantes

| Papel | Agente |
| --- | --- |
| Explorador | code-explorer |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Consolidar fontes de verdade, código existente e lacunas antes de definir fronteiras (R2) e domínio (R3). Reconciliar inventário estrutural ([structure-debate](../../structure-debate/governance/R01-context.md)) com debate SDD por módulo (padrão organizations).

## Inventário documental

| Fonte | Caminho | Relevância |
| --- | --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` | Dono: grants, delegação, mandatos, aprovações, ChangeProposal, epochs |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` | PG: grants/delegações/mandatos/aprovações; Neo4j: caminhos de autoridade temporal |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` | T01–T20, ExecutionPermit, authorityEpoch |
| Spec investimento | `brain/project-docs/specs/003-investment-lifecycle/spec.md` | Segregação authority vs risk |
| ADR0010 hierarquia agentes | `brain/project-docs/decisions/0010-agent-hierarchy-modes-triangular-circular.md` | ChangeProposal para troca TREE/CIRCULAR |
| Spec 010 hierarquia | `brain/project-docs/specs/010-agent-hierarchy-orchestration/spec.md` | `HierarchyModeChange` via governance |
| ADR0002 | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` | Layout `modules/governance/` |
| Fronteira org vs gov | [organizations R02](../organizations/R02-boundaries.md) | Membership → organizations; grant → governance |
| Orchestration deps | [orchestration R06](../../structure-debate/orchestration/R06-dependencies.md) | Port `TraversalEvaluator` T01 |
| Capabilities map | [governance.md](../../system-capabilities/modules/governance.md) | Histórias humano+agente |

## Inventário de código

| Artefato | Estado | Notas |
| --- | --- | --- |
| `backend/modules/governance/` | **Ausente** | Correto para esta fase — debate antes de G1 |
| `backend/packages/contracts/src/graph/traversals/T01.ts` | **Presente** | Schema T01 `authorization.can` com `authorityEpoch`, `proof.grantIds` |
| `backend/packages/contracts` | Parcial | Sem `governance/*` — envelopes genéricos apenas |
| `backend/modules/organizations/` | Parcial (`in_review` ANX-29) | Emite `membership.*` — consumer futuro governance |
| `backend/modules/identity/` | Parcial (`in_review` ANX-28) | `Principal` — upstream de grants |
| `backend/modules/graph/` | Parcial (ANX-32 `in_progress`) | Executa T01; governance é fonte de epoch/grants |
| Testes | — | `backend/tests/graph/unit/full-generation-swap.test.ts` referencia `governance` em rebuild order |

## Debate R1 (síntese atribuída)

**Explorador:** governance é o terceiro módulo P02 na fila após identity e organizations. ANX-30 já existe como issue de implementação com GK03 revogação. O debate formal ANX-40 estava `todo` — structure-debate R01 cobre layout, mas falta trilha `modules/governance/` com R1–R10 completos.

**Arquiteto:** O SDD separa **authority** (grants, mandatos, approvals, `authorityEpoch`) de **risk** (PolicyVersion kind=RISK, kill switch). governance mantém contrato genérico de PolicyVersion e referências; risk é dono de RiskPolicy. graph **explica** caminhos; governance **persiste** grants e bumps epoch.

**Crítico:** T01 já está em contracts/graph — governance não reimplementa traverse; expõe `TraversalEvaluator` e persiste estado que alimenta projeção. Revogação (GK03) deve bump `authorityEpoch` de forma monotônica — alinhado a graph R05 cache invalidation.

**Security:** Grants nunca em SQLite offline autoritativo. Fail-closed em timeout T01 (orchestration R07).

**Orquestrador:** R1 concluído. Próximo: R2 fronteiras explícitas vs risk, organizations, graph, simulation.

## Lacunas identificadas

1. Spec dedicada `governance` não existe em `brain/project-docs/specs/` — derivar de SDD + ADR0005 + capabilities map.
2. Contratos `packages/contracts/src/governance/` ausentes.
3. Consumer `organizations.membership.activated.v1` → grant baseline Owner (CAP-B01) não especificado em código.
4. Dependência ANX-28 G7 para eventos com `principalId` — debate pode continuar em paralelo.
5. Relação `ChangeProposal` (governance) vs `Snapshot` (simulation) — resolver em R2/R7.

## Saída R1

✅ Context brief aprovado para avançar a R2.
