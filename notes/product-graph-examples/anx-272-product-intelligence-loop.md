---
type: example
title: Product Graph — exemplo ANX-272 intelligence loop
description: Instância FEEDS_BACK Monitor→Problem com ciclo manual PC12→PC2.
status: draft
tags:
  - ANX-272
  - product-graph
  - FEEDS_BACK
---
# Product Graph — exemplo ANX-272 intelligence loop

## Cenário

Após deploy de `feat:organizations-invites`, monitor detecta `p99 > 500ms` no handler de invites.

## Nós

| id | type | campos chave |
| --- | --- | --- |
| `mon:invite-p99` | Monitor | metricName=p99_latency, source=observability, threshold=500ms |
| `prob:invite-latency-regression` | Problem | statement="p99 invite API degradou pós-release" |
| `res:intel-spike-2026-09-10` | ResearchArtifact | okfPath=notes/anxionos-product-intelligence-loop.md |
| `feat:organizations-invites` | Feature | (existente ANX-135) |
| `wi:ANX-272` | WorkItem | identifier=ANX-272, status=in_progress |

## Arestas

```text
mon:invite-p99 ──FEEDS_BACK──► prob:invite-latency-regression
prob:invite-latency-regression ◄──ADDRESSES── feat:organizations-invites
res:intel-spike-2026-09-10 ──DERIVES_FROM──► prob:invite-latency-regression
feat:organizations-invites ──TRACKED_IN──► wi:ANX-272
```

## Ciclo manual executado

1. **PC11 Operate** — sinal de monitor (simulado: comentário issue + métrica em OKF)
2. **PC12 Intelligence** — insight registrado, Problem materializado
3. **FEEDS_BACK** — aresta documentada acima
4. **PC2 Discovery** — `orchestration:phase -- company set --issue ANX-272 --stage discovery` (próximo passo após triagem)

## Query

```text
search "anx-272 product intelligence FEEDS_BACK" → este arquivo + runbook
```