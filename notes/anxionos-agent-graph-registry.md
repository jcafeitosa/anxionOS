---
type: research
title: Agent Graph registry — personas → AgentRole
description: Mapeamento P0 de 18 personas permanentes para nós AgentRole com coverageStatus.
status: stable
issue: ANX-268
---
# Agent Graph registry — personas → AgentRole

## Escopo (ANX-268)

Mapear **100% das personas permanentes** de `PERSONAS.md` / `roster.anxionos.json` para nós **AgentRole** do Product Graph (schema P0).

## Artefatos

| Artefato | Caminho |
| --- | --- |
| Registry JSON | `.cursor/orchestration/agent-graph/agent-role-registry.json` |
| Builder | `.cursor/orchestration/agent-graph/build-agent-role-registry.mjs` |
| Testes | `.cursor/orchestration/tests/agent-graph-registry.test.mjs` |
| Schema | `.cursor/orchestration/PRODUCT-GRAPH-SCHEMA.md` § AgentRole |

## coverageStatus

| Valor | Critério |
| --- | --- |
| `covered` | Persona no roster + workflow `workflow-{slug}.md` existe |
| `partial` | Persona no roster sem workflow |
| `proposed` | Persona proposta em AGENT-ROSTER (não permanente) |

**Resultado (2026-09-10):** 18/18 personas permanentes → `covered`.

## Verificação

```bash
node .cursor/orchestration/agent-graph/build-agent-role-registry.mjs
npm run orchestration:test -- --test-name-pattern agent-graph
```

## Relação Agent Graph

```text
AgentRole (agent:backend-executor)
  → roleName=backend-executor
  → coverageStatus=covered
  → workflowPath=.cursor/orchestration/workflows/workflow-backend-executor.md
  → OWNED_BY_AGENT ← WorkItem ANX-*
```

Spec: `project-docs/specs/006-product-agent-graph/spec.md`
