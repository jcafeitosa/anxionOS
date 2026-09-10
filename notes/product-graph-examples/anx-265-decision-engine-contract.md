---
type: example
title: Product Graph — exemplo ANX-265 Decision Engine contract
description: Instância P0 do Product Graph para o slice ANX-265 (contrato Decision Engine).
status: draft
owner: Engenharia
created: 2026-09-10
tags:
  - product-graph
  - ANX-265
  - decisions
---
# Product Graph — ANX-265 Decision Engine contract

## Nós

| id | type | Campos chave |
| --- | --- | --- |
| wi:ANX-265 | WorkItem | identifier=ANX-265, status=in_review |
| feat:decision-engine-contract-v1 | Feature | title=Decision Engine contract delta narrow |
| req:decision-record-envelope | Requirement | text=DecisionRecord SHALL be traceability envelope |
| cap:decisions-contracts | Capability | capabilityId=decisions.contracts, ownerModule=packages/contracts |
| svc:contracts-decisions | Service | name=contracts/decisions, ownerModule=packages/contracts |
| code:decision-record-ts | CodeArtifact | path=backend/packages/contracts/src/decisions/decision-record.ts |
| test:decision-engine-contract | TestArtifact | path=backend/tests/contracts/decision-engine.test.ts, oracleCommand=bun test decision-engine |
| agent:backend-executor | AgentRole | roleName=backend-executor, coverageStatus=covered |
| agent:backend-critic | AgentRole | roleName=backend-critic, coverageStatus=covered |

## Arestas

```text
wi:ANX-265 TRACKED_IN feat:decision-engine-contract-v1
feat:decision-engine-contract-v1 IMPLEMENTS req:decision-record-envelope
feat:decision-engine-contract-v1 REALIZED_BY svc:contracts-decisions
cap:decisions-contracts ENABLES feat:decision-engine-contract-v1
svc:contracts-decisions CONTAINS_CODE code:decision-record-ts
code:decision-record-ts VERIFIED_BY test:decision-engine-contract
wi:ANX-265 OWNED_BY_AGENT agent:backend-executor
```

## Query: por que este contrato existe?

```text
feat:decision-engine-contract-v1
  → IMPLEMENTS → req:decision-record-envelope
  → REALIZED_BY → svc:contracts-decisions
  → CONTAINS_CODE → code:decision-record-ts
  → VERIFIED_BY → test:decision-engine-contract
  → TRACKED_IN → wi:ANX-265
```

## Evidência runtime

- G1 PASS, G2 PASS (revalidação 2026-09-10)
- 10/10 testes contrato
- Spec: brain/project-docs/specs/anx-governance-decision-engine/design.md