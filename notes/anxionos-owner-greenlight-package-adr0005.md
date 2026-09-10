---
type: note
title: Pacote Owner Greenlight — ADR0005 + spec 006
description: Checklist formal de revisão para @Owner aceitar P2 sandbox (ANX-276).
status: draft
decision_status: proposed
owner: Orchestration
created: 2026-09-10
version: "0.1"
tags:
  - greenlight
  - ANX-276
  - adr0005
  - owner
---
# Pacote Owner Greenlight — ADR0005 + spec 006

**Issue:** ANX-276 · **Framework pointer:** `.cursor/orchestration/examples/project-anxionos/OWNER-GREENLIGHT-ADR0005.md`

## Checklist de revisão

| # | Documento | Pergunta | OK? |
| --- | --- | --- | --- |
| 1 | ADR0005 | Grafo Product separado do institucional? | ☐ |
| 2 | ADR0005 | Sandbox/staging only até homologação? | ☐ |
| 3 | Spec 006 | Nodes/edges cobrem Product+Agent? | ☐ |
| 4 | Spec 006 | Schema registry ANX-271 alinhado? | ☐ |
| 5 | Audit P0 | ANX-265–273 done com evidência? | ☐ |
| 6 | Experimentation | `notes/anxionos-experimentation-engine.md` | ☐ |
| 7 | Incidents | `notes/anxionos-incident-management-graph.md` | ☐ |
| 8 | Self-dev | `notes/anxionos-self-development-loop.md` | ☐ |
| 9 | Self-healing | `notes/anxionos-self-healing-runbooks.md` (doc only) | ☐ |
| 10 | Intelligence | `notes/anxionos-product-intelligence-loop.md` | ☐ |
| 11 | Performance §19 | `notes/anxionos-agent-performance-graph.md` | ☐ |
| 12 | Learning §20 | `notes/anxionos-agent-learning-loop.md` | ☐ |
| 13 | Continuous arch §23 | `notes/anxionos-continuous-architecture-loop.md` | ☐ |
| 14 | Projection worker design | `project-docs/specs/006-product-agent-graph/projection-worker-p2-design.md` | ☐ |

## Evidências P0

```bash
bun test backend/tests/contracts  # 55/55 pass
node --test .cursor/orchestration/tests/product-company-stages.test.mjs  # 8/8
npm run archify:validate  # workflow 12 etapas
```

## Aceite (copiar no ANX-276)

```text
GREENLIGHT ADR0005 + spec 006 — aceito para P2 sandbox.
```

## Desbloqueia

- ANX-277 Neo4j projection worker
- ANX-278 Product Intelligence runtime
- ANX-279 Self-healing executor (após G4)
