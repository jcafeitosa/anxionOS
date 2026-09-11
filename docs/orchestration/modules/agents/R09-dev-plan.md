---
type: debate
---
# R09 — Plano de implementação: `modules/agents`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue debate:** ANX-392  
**Implementação:** issue distinta pós-greenlight Owner — **não** neste pack. Pack ANX-389 — não `done`.

## In / Out (R9)

**In:** plano G1 futuro (não neste pack).

**Out:** pré-requisitos. **Não** ST08. **Não** ANX-389 `done`.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (plano)

| Superfície | Dono |
| --- | --- |
| schema agents_* | **agents** |
| graph:agents:v1 | **graph** |
| adapter-gateway | **KEEP** |

## Pré-requisitos G1 futuro

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 documental | este pack |
| 2 | eventing + outbox relay | packages/eventing |
| 3 | graph consumer graph:agents:v1 | graph module |
| 4 | identity PrincipalLookup | identity |
| 5 | organizations AgencyScopePort | organizations |

## Árvore ADR0002 (alvo G1)

```text
backend/modules/agents/src/
  domain/entities/  domain/ports/
  application/commands/
  infrastructure/persistence/
  api/
  index.ts
```

Não scaffoldar os 23 módulos. Não criar `agent-teams/` nem `capabilities/`.

## Fatias S1–S7 (pós-greenlight)

| Slice | Entrega | Critério |
| --- | --- | --- |
| S1 | Schema PG agents_* | Drizzle + testes repo |
| S2 | Contratos contracts/agents/* | Zod events + errors |
| S3 | Commands create/publish UoW+outbox | integração PG |
| S4 | AgentRegistryPort | orchestration adapter |
| S5 | BrainFacade + T01 | G3-AGT deny/allow |
| S6 | HTTP /v1/agents/* | Elysia |
| S7 | Worker invoke dequeue | opcional se S6 suficiente |

## Matriz testes

| ID | Caso |
| --- | --- |
| G3-AGT-01 | publish imutável |
| G3-AGT-02 | invoke sem grant fail-closed |
| G3-AGT-03 | outbox na mesma transação |
| G3-AGT-04 | AgentRegistryPort |
| G3-AGT-05 | projector projeta nó |
| G5-AGT-01..05 | ver R07 |

## Defer

OpenAPI Scalar público; evaluation promotion automática (P08); Brain streaming SSE; D-GOV-010; L3/L4 runtime.

P1 **só** fecha o pack G0 documental.

## Saída R9

Plano documental aprovado para R10.
