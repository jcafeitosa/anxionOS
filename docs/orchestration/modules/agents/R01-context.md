---
type: debate
---
# R01 — Contexto: `modules/agents`

**Módulo:** agents (P04) · **Issue:** ANX-392 · **PC:** [03](../../../../notes/anxionos-pc03-agents-debate.md)
**Histórico:** [structure-debate R01](../../structure-debate/agents/R01-context.md)

## Inventário documental

| Fonte | Relevância |
| --- | --- |
| [spec 002](../../../../brain/project-docs/specs/002-agents-knowledge/spec.md) | AgentVersion, Brain, skills |
| [estrutura](../../../../brain/notes/anxionos-backend-structure.md) | Dono físico `modules/agents` |
| [storage](../../../../brain/notes/anxionos-storage-ownership.md) | PG Agent/AgentVersion; Neo4j projeção |
| [CAPABILITY-MAP](../../system-capabilities/CAPABILITY-MAP.md) | Linha agents |
| [R02 structure](../../structure-debate/agents/R02-boundaries.md) | Fronteira já debatida |

## Inventário de código (snapshot P1)

`backend/modules/agents/src/index.ts` pode existir (CAPABILITY-MAP: Parcial). Isso **não** é DEV_READY nem G7. Este pack não autoriza código novo.

## Lacunas

1. Pack `modules/agents/` ausente até ANX-392 (este).
2. Spec 002 `draft`.
3. Promotion AgentVersion → evaluation P08.

## Saída R1

Context brief P1 fechado. Próximo: R2.
