---
type: debate
---
# R10 — Pacote G0 (handoff): `modules/agents`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issue debate:** ANX-392  
**Histórico:** [structure R10](../../structure-debate/agents/R10-g0-handoff.md)

## G0 — Escopo documental / G1 futuro

### In scope

| Área | Entrega |
| --- | --- |
| Domínio | Agent, AgentVersion, Skill, AgentBinding, BrainFacade |
| Contratos | `@anxionos/contracts/agents/*` + eventos v1 R04 |
| Persistência | PostgreSQL agents_* + journal + outbox (ADR0004) |
| Ports | AgentRegistryPort, TraversalEvaluator, PrincipalLookup |
| API | `/v1/agents` esboço R04 |
| Testes | G3-AGT-01..05; G5-AGT-01..05 |

### Out of scope

| Item | Destino |
| --- | --- |
| Task/Run/lease | orchestration |
| Neo4j driver | graph |
| Provider secrets | connections |
| Promotion auto | evaluation P08 |
| D-GOV-010 | risk P06 |

## Non-goals

- Nenhuma migration ST08 neste pack documental.
- Specs 001–005 **draft**; ANX-342 permanece `todo`.
- Sem pasta `approvals/` / `policies/`.
| Pastas agent-teams / capabilities | PC 04 / PC 05 — não criar |
| G7 código | Owner + issue impl |

## Equipe G1 (nominal, futuro)

| Papel | Agente |
| --- | --- |
| Executor | backend-executor |
| Crítico | backend-critic |

## PC-G0 avaliação (debate)

| ID | Status |
| --- | --- |
| PC-G0-01..03 | Debate R1–R10 fat neste diretório |
| PC-G0-04 | identity upstream (parcial código; pack identity R01–R05 a completar) |
| PC-G0-05 | organizations pack fat existente |
| PC-G0-06 | T01 TraversalEvaluator real — graph |
| PC-G0-07..10 | crítico nominal, riscos R07, escopo fechado |

**Veredito P1:** pack G0 **documental completo** (profundidade governance-like). **Não** autoriza G1. Spec 002 `draft`. Próximo serial: [orchestration pack](../orchestration/ROUNDS.md) (ANX-393).

## Saída R10

G0 debate aprovado para P1. ANX-392 permanece evidência de pack — não é G7 de produto.
