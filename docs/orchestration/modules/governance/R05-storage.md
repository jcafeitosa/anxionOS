---
type: debate
---

# R05 — Armazenamento: `modules/governance`

**Rodada:** R5 — PostgreSQL, journal/outbox, projeção Neo4j  
**Data:** 2026-09-08 · **Issue:** ANX-40

## Objetivo

Modelo de persistência autoritativo: tabelas PG, command journal, outbox via `@anxionos/eventing`, projeção Neo4j (graph), sem SQLite para permissões.

## Princípios

| Princípio | Decisão |
| --- | --- |
| Fonte de verdade | PostgreSQL `governance_*` |
| Grafo | Neo4j via projector **graph** (GRANT/MANDATE edges) |
| Idempotência | `governance_command_journal` |
| `authorityEpoch` | Tabela `governance_authority_epochs` (scope_id PK, epoch monotônico) |
| FK cross-module | **Não** — `principal_id`, `agency_id` referência lógica |

## Tabelas principais

| Tabela | Propósito |
| --- | --- |
| `governance_grants` | Grant versionado, status, valid_from/until, derived_from_membership_id |
| `governance_delegations` | Delegation com parent_grant_id |
| `governance_mandates` | Mandate agent + agency |
| `governance_change_proposals` | ChangeProposal pending/approved |
| `governance_approvals` | Approval decisions |
| `governance_authority_epochs` | epoch por scope_id |
| `governance_command_journal` | commandId → aggregate revision replay |

## Neo4j (projeção graph)

| Edge/Node | Evento fonte |
| --- | --- |
| `GRANT` edge | `governance.grant.issued.v1` |
| Revoke edge close | `governance.grant.revoked.v1` |
| `MANDATE` | `governance.mandate.issued.v1` |

Consumer: `graph:governance:v1` (implementação P03 graph).

## Fluxo UoW

Estado agregado + command_journal + appendJournal + enqueueOutbox na mesma transação PG.

## Saída R5

✅ Modelo v1 fechado para R6.
