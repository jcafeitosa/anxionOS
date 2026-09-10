---
type: note
title: Agent Performance — métricas e reputação no Agent Graph
description: Spec P1 performance snapshots e seleção de candidatos (§19).
status: draft
decision_status: proposed
owner: Orchestration / Evaluation
created: 2026-09-10
version: "0.1"
tags:
  - performance
  - agent-graph
  - cognitive-os
---
# Agent Performance — métricas e reputação

**Framework:** `.cursor/orchestration/AI-PRODUCT-COMPANY-ENGINE.md` §19

## Métricas (P2+ runtime)

| Métrica | Node/edge | Fonte |
| --- | --- | --- |
| tasks_completed | PerformanceSnapshot | taskboard ANX-* done |
| success_rate | PerformanceSnapshot | G7 / verdict PASS rate |
| rework_rate | PerformanceSnapshot | returns G1→G2 cycles |
| cost_per_task | PerformanceSnapshot | token/cost telemetry proposed |
| human_escalations | PerformanceSnapshot | dialogue escalate count |

## Agent Graph

- Node `PerformanceSnapshot` (schema ANX-271)
- Edge `HAS_SNAPSHOT` (Agent → PerformanceSnapshot, temporal)
- Edge `RANKED_BY` (AgentTeam → Agent, score derived)

## Seleção de candidato

```text
Problem → required AgentCapability
  → Agents CAN_EXECUTE
  → filter availability + authorityLevel L0–L6
  → rank by latest PerformanceSnapshot
  → select / form AgentTeam
```

**P0 oráculo:** `npm run orchestration:who -- --persona <slug> --can-i "..."`

## Gates

- Métricas **não** concedem autoridade — grants permanecem em governance
- Promoção L3+ requer evaluation module + G7

## Critérios P1 doc

- [x] Métricas + grafo
- [x] Query seleção
- [ ] Runtime telemetry (P2 ANX-278+)
