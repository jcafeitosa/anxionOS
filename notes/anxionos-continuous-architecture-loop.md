---
type: note
title: Continuous Architecture — telemetria a migração
description: Spec P1 evolução arquitetural contínua (§23).
status: draft
decision_status: proposed
owner: Architecture
created: 2026-09-10
version: "0.1"
tags:
  - architecture
  - adr
  - cognitive-os
---
# Continuous Architecture Loop

**Framework:** `.cursor/orchestration/AI-PRODUCT-COMPANY-ENGINE.md` §23

## Fluxo

```mermaid
flowchart TD
  A[Architecture baseline ADR0002] --> Tel[Telemetry]
  Tel --> An[Analysis]
  An --> Prop[Proposal ADR draft]
  Prop --> Sim[Simulation / archify]
  Sim --> App[Approval G2 Marcus + G7]
  App --> Mig[Migration slice ANX-*]
  Mig --> Ver[Verification tests]
  Ver --> A
```

## Sinais observados

| Sinal | Fonte P0 | Fonte P2 |
| --- | --- | --- |
| Traffic / latency | Monitor node manual | observability |
| Costs | issue comments | billing module |
| Failures | incidents + runbooks | operations |
| Dependencies | graphify + ADR | Neo4j traversal |
| Security | G4 findings | security scans |

## Product Graph

- `Monitor` → `FEEDS_BACK` → `Problem`
- `ResearchArtifact` → `DERIVES_FROM` → `Requirement`
- ADR aceito → `Capability` ENABLES → `Feature`

## Cursor P0

- Marcus `consult` antes de mudança arquitetural
- `npm run archify:validate` + `archify:build`
- Novo ADR em `brain/project-docs/decisions/` via OKF

## Gates

| Mudança | Gate mínimo |
| --- | --- |
| Doc/ADR | G0 + Marcus |
| Código módulo | G2 Fernanda |
| Deploy | G7 Owner exceção |

## Critérios P1 doc

- [x] Fluxo Mermaid
- [x] Integração ADR + archify
- [ ] Automated telemetry→ADR draft (P3+)
