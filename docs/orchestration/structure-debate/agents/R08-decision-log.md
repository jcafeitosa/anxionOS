---
type: debate
---

# R08 — Decision log: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R8 — Síntese R01–R07, deferências v1  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-82 · ANX-42

## Objetivo

Consolidar decisões `D-AGT-*` de R01–R07 e pré-condições para R09/R10.

## Tabela consolidada

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| **D-AGT-001** | agents dono de Agent, AgentVersion, Skill, Binding, Brain facade — não Task/Run | R1 | ✅ |
| **D-AGT-002** | AgentVersion imutável após publish | R2 | ✅ |
| **D-AGT-003** | Brain não persiste estado de Run | R2 | ✅ |
| **D-AGT-004** | Skills validadas via Zod + contracts | R2 | ✅ |
| **D-AGT-005** | PG autoritativo Agent/Version; Neo4j projeção graph | R1 | ✅ |
| **D-AGT-006** | T01 fail-closed pré-publish e pré-invoke externo | R6 | ✅ AGT-R06-03 |
| **D-AGT-007** | 4 eventos v1: `agent.created`, `version.published`, `version.deprecated`, `skill.updated` | R6 | ✅ |
| **D-AGT-008** | Consumer `graph:agents:v1` no graph module | R6 | ✅ AGT-R06-06 |
| **D-AGT-009** | `AgentRegistryPort` para orchestration | R6 | ✅ AGT-R06-08 |
| **D-AGT-010** | Sem secrets em eventos/DTOs AgentVersion | R2, R7 | ✅ |
| **D-AGT-011** | Promotion produção exige evaluation gate (P08) quando aplicável | R2 | ⏸ Defer P08 |
| **D-AGT-012** | Brain invoke v1: HTTP síncrono + fila worker para long-running | R6 | ✅ Provisório |
| **D-AGT-013** | Autonomia L0–L4 no AgentVersion metadata | R1 | ✅ |
| **D-AGT-014** | Kill switch global via governance mandate | R7 | ✅ |

## Pendências resolvidas / deferidas

| ID | Tema | Disposição |
| --- | --- | --- |
| P-R7-01 | Formalizar R03–R05 | R09 S1 incorpora domain sketch mínimo |
| P-R7-02 | OpenAPI Scalar | Defer S8 |
| P-R7-03 | Brain streaming | Defer pós-v1 |

**Saída:** R08 aprovado → **R09** dev-plan.

**Próximo:** [R09-dev-plan.md](./R09-dev-plan.md)
