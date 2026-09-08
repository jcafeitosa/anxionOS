---
type: debate
---

# R09 — Plano de implementação: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R9 — Plano G1  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-82 · issue implementação derivada pós-R10 G0

## Pré-requisitos

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 aprovado | [R10-g0-handoff.md](./R10-g0-handoff.md) |
| 2 | P02 eventing + outbox relay | ANX-79 |
| 3 | graph G7 (ANX-32) | Consumer `graph:agents:v1` |
| 4 | identity G7 (ANX-78) | PrincipalLookup |
| 5 | organizations G1 | AgencyScopePort |

## Árvore ADR0002 (resumo)

```text
backend/modules/agents/
├── src/
│   ├── domain/entities/   # agent, agent-version, skill
│   ├── domain/ports/      # repositories, brain-facade, traversal, graph-context
│   ├── application/commands/  # createAgent, publishVersion, invokeBrain
│   ├── infrastructure/persistence/
│   ├── api/
│   └── index.ts
```

## Fatias S1–S7

| Slice | Entrega | Critério |
| --- | --- | --- |
| **S1** | Schema PG + migrations `agents_*` | Drizzle apply; testes repo |
| **S2** | Contratos `@anxionos/contracts/agents/*` | Zod events + errors |
| **S3** | Commands create/publish com UoW+outbox | Teste integração PG |
| **S4** | `AgentRegistryPort` export | orchestration adapter verde |
| **S5** | Brain facade + invoke guard (T01) | Testes deny/allow |
| **S6** | HTTP `/v1/agents/*` | API plugin Elysia |
| **S7** | Worker invoke dequeue (opcional v1) | Defer se S6 suficiente |

## Matriz testes G3

| ID | Caso |
| --- | --- |
| G3-AGT-01 | createAgent idempotente |
| G3-AGT-02 | publishVersion emite outbox |
| G3-AGT-03 | publish deny sem grant |
| G3-AGT-04 | AgentRegistryPort cross-module |
| G3-AGT-05 | graph consumer projeta nó |

## Defer S8+

- OpenAPI público Scalar  
- Evaluation promotion automática (P08)  
- Brain streaming SSE  

**Próximo:** [R10-g0-handoff.md](./R10-g0-handoff.md)
