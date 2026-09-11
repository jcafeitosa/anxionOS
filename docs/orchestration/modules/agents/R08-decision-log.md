---
type: debate
---
# R08 — Decision log: `modules/agents`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue:** ANX-392 · pack ANX-389

## In / Out (R8)

**In:** D-AGT-001–007. **Out:** este log. **Não** fecha ANX-389. Sem ST08 live.

## Non-goals

Não spec `accepted`. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| Agent / AgentVersion / Skill / Binding / BrainFacade | **agents** |
| Task / Run | **orchestration** |
| adapter-gateway | **KEEP** |

## Tabela consolidada

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| D-AGT-001 | Dono de Agent, AgentVersion, Skill, Binding, BrainFacade — não Task/Run | R1 | fechada |
| D-AGT-002 | AgentVersion imutável após publish | R2 | fechada |
| D-AGT-003 | Brain não persiste Run | R2 | fechada |
| D-AGT-004 | Skills Zod + contracts | R2 | fechada |
| D-AGT-005 | PG autoritativo; Neo4j só projector graph (ADR0004) | R5 | fechada |
| D-AGT-006 | T01 fail-closed pré-publish e pré-invoke | R6 | fechada |
| D-AGT-007 | Eventos v1: registered, status_changed, version.published, binding.created, skill.registered, brain.invocation.requested | R4 | fechada |
| D-AGT-008 | Consumer graph:agents:v1 no graph | R6 | fechada |
| D-AGT-009 | AgentRegistryPort para orchestration | R6 | fechada |
| D-AGT-010 | Sem secrets em eventos/DTOs | R4 R7 | fechada |
| D-AGT-011 | Promotion produção exige evaluation P08 | R2 | defer P08 |
| D-AGT-012 | Brain: HTTP sync só ENABLE_DEV_ROUTES; prod evento-first | R4 | fechada |
| D-AGT-013 | Autonomia L0–L4 no Version/Mandate — eixo ≠ Authority L0–L6 | R1 | fechada |
| D-AGT-014 | Sem pastas agent-teams/capabilities | PC 03 | fechada |
| P1-AGT-01 | Pack canônico G0 vive em `docs/orchestration/modules/agents/` | P1 | fechada |
| P1-AGT-02 | Structure-debate é histórico, não segundo dono | P1 | fechada |
| P1-AGT-03 | Spec 002 permanece draft até checklist evidenciado | P1 | fechada |
| P1-AGT-04 | Este pack não é G7 de código | P1 | fechada |

## Saída R8

Decision log aprovado para R9.
