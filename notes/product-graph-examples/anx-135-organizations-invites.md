---
type: example
title: Product Graph — exemplo ANX-135 Organizations invites
description: Instância P0 do Product Graph para slice organizations/invites (referência PRODUCT-GRAPH-SCHEMA.md).
status: draft
owner: Engenharia
created: 2026-09-10
tags:
  - product-graph
  - ANX-135
  - organizations
---
# Product Graph — ANX-135 Organizations invites

Baseado no exemplo canônico em `.cursor/orchestration/PRODUCT-GRAPH-SCHEMA.md`.

## Nós

| id | type | Campos |
| --- | --- | --- |
| prob:org-invite-friction | Problem | Operadores não conseguem convidar membros sem idempotency |
| req:org-invite-idempotent | Requirement | POST invite SHALL be idempotent per Idempotency-Key |
| feat:organizations-invites | Feature | Organizations invite API |
| svc:organizations | Service | ownerModule=backend/modules/organizations |
| code:invite-handler | CodeArtifact | path=backend/apps/api/src/organizations/handlers/invites.ts |
| test:invite-idempotency | TestArtifact | oracleCommand=bun test invite-idempotency |
| wi:ANX-135 | WorkItem | identifier=ANX-135 |

## Arestas

```text
feat:organizations-invites ADDRESSES prob:org-invite-friction
feat:organizations-invites IMPLEMENTS req:org-invite-idempotent
feat:organizations-invites REALIZED_BY svc:organizations
svc:organizations CONTAINS_CODE code:invite-handler
code:invite-handler VERIFIED_BY test:invite-idempotency
feat:organizations-invites TRACKED_IN wi:ANX-135
```

## Status

Exemplo de referência P0 — verificar paths e testes contra working tree antes de citar como evidência runtime.