---
title: Traversals T01-T05 e fixtures F0 v1
description: Catálogo F0, fixture graph-f0-minimal.json e handlers mock para wave ANX-33.
type: specification
status: draft
issue: ANX-33
depends_on:
  - ANX-32
---
# T01-T05 fixtures v1

**Issue:** ANX-33

## Fixture

`backend/tests/fixtures/graph-f0-minimal.json` — Agency, User, Membership, Grant, principals agency/platform.

## Catálogo F0

`GRAPH_F0_TRAVERSAL_ENTRIES` registra **T01–T05** com edge allowlist ⊆ F0.

| ID | Nome | Classe | HTTP F0 |
| --- | --- | --- | --- |
| T01 | authorization.can | kernel | mock ALLOW/DENY |
| T02 | temporal.asOf | kernel | mock `{ complete: true }` |
| T03 | authorization.explain | kernel | mock + reasonTree |
| T04 | context.scope | domain | mock `{ complete: true }` |
| T05 | context.buildForAgent | hybrid | mock `{ complete: true }` |

## Testes

```
bun test backend/tests/graph/unit/traversals-t01-t05-f0.test.ts
bun test backend/tests/graph/unit/gk-r02-matrix.test.ts
bun test backend/tests/contracts/graph.test.ts
```

## Escopo / pendências

- Evaluator Neo4j real: **ANX-32**
- T02/T04/T05 semantics completas: debate graph R04+
