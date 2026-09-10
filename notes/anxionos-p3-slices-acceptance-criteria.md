---
type: note
title: P3 slices — critérios de aceite
description: Critérios para homologação staging/prod da AI Product Company Engine pós-sandbox P2.
status: draft
decision_status: proposed
owner: Orchestration
created: 2026-09-10
version: "0.1"
tags:
  - p3
  - acceptance
  - neo4j
  - ANX-292
---
# P3 slices — critérios de aceite

**Dependência:** ANX-290/291 done (sandbox P2)

## ANX-292 — Neo4j staging homologation + doc sync

| Campo | Valor |
| --- | --- |
| Status | in_progress |
| Owner | infra-executor + infra-critic |
| Gate | G3 |

### Critérios

- [ ] Profile `graph-staging` no docker-compose (porta separada do sandbox)
- [ ] `npm run p3:staging-homologation` → `overallOk: true`
- [ ] Teste integração Neo4j staging com projeção WorkItem
- [ ] Docs status/execution-plan sincronizados pós-ANX-291
- [ ] ADR0005 corpo alinhado a `decision_status: accepted`

### Oráculo

```bash
docker compose -f backend/deploy/docker/docker-compose.yml --profile graph-staging up -d
npm run p3:staging-homologation -- --issue ANX-292 --json
```

## Roadmap P3 (backlog)

| Slice | Escopo |
| --- | --- |
| ANX-293+ | Cognitive OS §19–25 runtime integral |
| ANX-294+ | Deploy institucional staging/prod |
