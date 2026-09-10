---
type: index
title: AI Product Company Engine — índice canônico
description: Hub de navegação para toda documentação P0/P1 da AI Product Company Engine.
status: draft
decision_status: proposed
owner: Orchestration
created: 2026-09-10
version: "0.1"
tags:
  - index
  - product-company
  - cognitive-os
---
# AI Product Company Engine — índice canônico

**Status executivo @Owner:** `brain/notes/anxionos-ai-product-company-status.md`  
**Certificado P1 (entregáveis 1–6):** `brain/notes/anxionos-p1-documentation-completion.md`

**Framework (repo):** `.cursor/orchestration/AI-PRODUCT-COMPANY-ENGINE.md` (26 seções)

## Governança e decisão

| Doc | Issue | Status |
| --- | --- | --- |
| `project-docs/specs/anx-governance-decision-engine/design.md` | ANX-265 | done |
| `project-docs/decisions/0005-product-graph-neo4j-projection.md` | ANX-276 greenlight | accepted |
| `.cursor/orchestration/AUTHORITY-LEVELS.md` | — | framework |
| `.cursor/orchestration/DECISION-ENGINE-FRAMEWORK.md` | — | framework |

## Product / Agent Graph

| Doc | Issue | Status |
| --- | --- | --- |
| `project-docs/specs/006-product-agent-graph/spec.md` | ANX-276 | accepted |
| `project-docs/specs/006-product-agent-graph/projection-worker-p2-design.md` | ANX-277 prep | proposed |
| `notes/agent-graph-registry.md` | ANX-268 | done |
| `notes/product-graph-examples/` | ANX-267 | done |
| Schema registry código | ANX-271 | done |

## Ciclo operacional (12 etapas PC1–PC12)

| Doc | CLI |
| --- | --- |
| `notes/anxionos-ai-product-company-lifecycle.md` | `npm run orchestration:phase -- company table` |
| `notes/anxionos-product-company-stage-hooks.md` | ANX-269 |
| `.archify/specs/anxionos-product-company.workflow.json` | `npm run archify:validate` |

## Cognitive OS (§19–25)

| Seção | Doc OKF |
| --- | --- |
| §19 Performance | `notes/anxionos-agent-performance-graph.md` |
| §20 Learning | `notes/anxionos-agent-learning-loop.md` |
| §21 Experimentation | `notes/anxionos-experimentation-engine.md` |
| §22 Incidents | `notes/anxionos-incident-management-graph.md` |
| §23 Continuous architecture | `notes/anxionos-continuous-architecture-loop.md` |
| §24 Self-healing | `notes/anxionos-self-healing-runbooks.md` |
| §25 Self-development | `notes/anxionos-self-development-loop.md` |
| §12 Intelligence | `notes/anxionos-product-intelligence-loop.md` |

## Capacidades compostas

| Doc | Issue |
| --- | --- |
| `project-docs/specs/007-products-marketplace-capability/spec.md` | ANX-284 |

## Alinhamento e auditoria

| Doc | Issue |
| --- | --- |
| `notes/anxionos-ai-product-company-documentation-audit.md` | ANX-275 |
| `notes/anxionos-product-company-module-alignment.md` | ANX-250 |
| `project-docs/plans/ai-product-company-execution-plan.md` | ANX-275 |
| `notes/anxionos-owner-greenlight-package-adr0005.md` | ANX-276 |
| `notes/anxionos-owner-acceptance-deliverable-8.md` | ANX-291 |

## Issues P2 (done G7)

ANX-276–279, ANX-289, ANX-290

## Issues P0 (done G7)

ANX-265, 267, 268, 269, 270, 271, 272, 273, 274, 275, 281, 282, 283, 284, 285

## P2 — delegação (pós-greenlight)

| Issue | Pacote |
| --- | --- |
| ANX-277 | `.cursor/orchestration/examples/project-anxionos/delegation-queue/ANX-277.md` |
| ANX-278 | `.cursor/orchestration/examples/project-anxionos/delegation-queue/ANX-278.md` |
| ANX-279 | `.cursor/orchestration/examples/project-anxionos/delegation-queue/ANX-279.md` |

## P2 — critérios de aceite

`brain/notes/anxionos-p2-slices-acceptance-criteria.md` — ANX-277/278/279 detalhado

## Issues P2 (aguardam greenlight)

| Issue | Título | Depende |
| --- | --- | --- |
| ANX-276 | Owner greenlight | @Owner |
| ANX-277 | Neo4j projection worker | ANX-276 |
| ANX-278 | Product Intelligence runtime | ANX-277 |
| ANX-279 | Self-healing executor | G4 + ANX-273 |

## Oráculos P0

```bash
bun test backend/tests/contracts                    # 55/55
node --test .cursor/orchestration/tests/product-company-stages.test.mjs  # 8/8
npm run archify:validate                            # 4/4 specs
npm run orchestration:phase -- company table
```
