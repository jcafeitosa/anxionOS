---
type: note
title: Agent Learning Loop — task a decisão futura
description: Spec P1 loop de aprendizagem integrado brain reflect (§20).
status: draft
decision_status: proposed
owner: Orchestration
created: 2026-09-10
version: "0.1"
tags:
  - learning
  - brain
  - cognitive-os
---
# Agent Learning Loop

**Framework:** `.cursor/orchestration/AI-PRODUCT-COMPANY-ENGINE.md` §20

## Loop

```mermaid
flowchart LR
  T[Task ANX-*] --> D[Decision]
  D --> E[Execution]
  E --> R[Result]
  R --> Ev[Evaluation G1-G7]
  Ev --> F[Feedback]
  F --> L[Learning brain/]
  L --> FD[Future decisions]
```

## Cursor P0 (operacional hoje)

```bash
npm run orchestration:brain -- reflect --issue ANX-N --outcome pass|fail --lesson "..."
```

Após CHANGES_REQUIRED ou erro — promover lição em `brain/` (framework: `.cursor/orchestration/OPENKNOWLEDGE-BRAIN.md`).

## Product Graph edges

- `LEARNED_FROM` (Agent → KnowledgeRef)
- `INFORMED_BY` (Decision → KnowledgeRef)
- `FEEDS_BACK` (Evaluation → Requirement | Problem)

## Agent Graph

- `KNOWS` (Agent → KnowledgeRef)
- PerformanceSnapshot atualizado após cada slice G7

## Guardrails

1. Learning **não** altera ADRs aceitos sem novo ADR
2. Lições em `brain/` passam por OKF MCP
3. Supermemory complementa — não substitui `brain/`

## Critérios P1 doc

- [x] Loop + CLI brain reflect
- [x] Edges grafo
- [ ] Automated reflect trigger (P2)
