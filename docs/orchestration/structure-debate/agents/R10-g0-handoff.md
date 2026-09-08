---
type: debate
---

# R10 — Pacote G0 (handoff): `modules/agents`

**Rodada:** R10 — Pacote G0 para claim implementação P04  
**Data:** 2026-09-08  
**Issues:** ANX-82 (debate) · ANX-42 · implementação derivada pós-greenlight

## G0 — Escopo v1 (fechado)

### In scope (G1)

| Área | Entrega |
| --- | --- |
| **Domínio** | Agent, AgentVersion, Skill — ports sem framework |
| **Contratos** | `@anxionos/contracts/agents/*` — 4 eventos v1 |
| **Persistência** | PostgreSQL `agents_*` + outbox |
| **HTTP** | CRUD Agent + publish version + list skills |
| **Brain** | Facade invoke com T01 + grant guard |
| **Ports** | `AgentRegistryPort` para orchestration |
| **Testes** | G3-AGT-01..05; checklist G5-AGT-01..05 |

### Out of scope v1

| Item | Destino |
| --- | --- |
| Task/Run/lease | orchestration |
| Neo4j driver | graph projector |
| Provider secrets | connections |
| Evaluation promotion auto | P08 |
| CEO blueprint onboarding saga | organizations + agents S7+ |

## Critérios aceite G0

| # | Critério | Evidência |
| --- | --- | --- |
| AC-G0-01 | Decisões D-AGT-001..014 | R08 |
| AC-G0-02 | Plano S1–S7 | R09 |
| AC-G0-03 | Dependências AGT-R06-01..10 | R06 |
| AC-G0-04 | Top 5 riscos mitigados | R07 |
| AC-G0-05 | graph ANX-32 G7 (pré-req projector) | gate matrix |

## Dependências bloqueantes implementação

1. **ANX-32** graph G7 — consumer agents no graph  
2. **ANX-78** identity G7 — PrincipalLookup  
3. **ANX-79** outbox relay — eventos agents publicados  
4. Greenlight explícito usuário + issue `ANX-*` implementação

## Status debate

✅ **G0 aprovado** — debate agents `g0_ready` (documental).  
Código `backend/modules/agents/` permanece **ausente** até claim pós-greenlight.

**Issue ANX-82:** entrega documental R06–R10; não autoriza codar módulo sem issue implementação dedicada.
## Gates documentais G2–G6 (ANX-82)

| Gate | Disposição | Evidência |
| --- | --- | --- |
| G2 | PASS | R06–R10 + cross-ref index; ADR0002 ports/adapters |
| G3 | PASS | Matriz G3-AGT-* R09; `bun test` 387/387 |
| G4 | PASS | R07 T01/grant/PII; AGT-R06-03 fail-closed |
| G5 | PASS | G5-AGT-01..05 — exec sandbox na G1 |
| G6 | PASS | R01–R10; handoff pós-greenlight |

**G7:** pendente aceite explícito **ANX-82**.

