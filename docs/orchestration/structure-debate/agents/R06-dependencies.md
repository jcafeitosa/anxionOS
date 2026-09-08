---
type: debate
---

# R06 — Dependências: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R6 — Upstream, packages, downstream e contratos cross-module  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-82 · ANX-42 · graph G7 (ANX-32)  
**Pré-requisito:** [R01-context.md](./R01-context.md) · [R02-boundaries.md](./R02-boundaries.md) · `brain/project-docs/specs/002-agents-knowledge/spec.md`

## Objetivo da rodada

Fechar o mapa de dependências de **agents** após R01–R02: ports upstream (identity, organizations, governance, graph), mecanismo **eventing**, packages compartilhados, exports públicos, imports proibidos e integração com orchestration/knowledge/connections.

## Debate R6 (síntese atribuída)

**Arquiteto:** agents depende de **identity** (`PrincipalLookup` para vincular Agent a principal institucional), **organizations** (`AgencyScopePort` para tenancy), **governance** (`TraversalEvaluator` T01 + grants antes de publish/deploy) e **graph** (`GraphContextPort` T04/T05 — leitura governada, nunca driver Neo4j direto).

**Executor:** Adapters em `infrastructure/adapters/`: `IdentityPrincipalLookup`, `OrganizationsAgencyScope`, `GovernanceTraversalAdapter`, `GraphContextAdapter`. Journal/outbox na mesma transação PG via `@anxionos/eventing`.

**Security:** `AgentVersion` não referencia secrets; connections resolve provider bindings. Brain facade exige grant + T01 ALLOW antes de invocação com efeito externo.

**Crítico:** orchestration consome `AgentRegistryPort` — agents publica leitura estável (`getAgent`, `listAgentVersions`) sem expor repositório interno. knowledge recebe eventos `agents.version.published.v1` para indexação — não importa agents domain.

**Síntese Orquestrador:** Mapa v1 fechado; handoff R07 riscos.

---

## Decisões-chave de dependência

| ID | Decisão | Direção | Nota |
| --- | --- | --- | --- |
| **AGT-R06-01** | `PrincipalLookup` valida `ownerPrincipalId` em create Agent | upstream identity | Fail-closed `AGT_PRINCIPAL_NOT_FOUND` |
| **AGT-R06-02** | `AgencyScopePort` valida agency/tenant ativo | upstream organizations | Sem FK cross-schema |
| **AGT-R06-03** | T01 obrigatório antes de `publishAgentVersion` e Brain invoke externo | upstream governance | Timeout 2s → deny |
| **AGT-R06-04** | `GraphContextPort` (T04/T05) somente leitura via graph module SDK | upstream graph | ANX-32 consumer + HTTP interno |
| **AGT-R06-05** | Journal/outbox via `@anxionos/eventing` na mesma transação PG | package | Bootstrap: eventing → identity → organizations → agents |
| **AGT-R06-06** | Projector Neo4j no **graph** — consumer `graph:agents:v1` | downstream graph | Eventos `agents.agent.created.v1`, `agents.version.published.v1` |
| **AGT-R06-07** | agents **publica** 4 eventos v1; subscreve `governance.grant.*` (opcional v1) | downstream async | orchestration, knowledge, audit |
| **AGT-R06-08** | `AgentRegistryPort` exportado para orchestration | downstream orchestration | Stub orchestration até agents S4 |
| **AGT-R06-09** | connections binding refs por ID — agents não importa connections repo | upstream connections | Port `ModelBindingPort` v1 leve |
| **AGT-R06-10** | Brain worker runtime em `apps/workers` (invoke dequeue) — fora do módulo | composition | Sem estado Run |

---

## Upstream

| Módulo | Port | Uso |
| --- | --- | --- |
| identity | `PrincipalLookup` | Validar principal dono / operador humano |
| organizations | `AgencyScopePort` | Tenancy, hierarchy mode awareness |
| governance | `TraversalEvaluator` | T01 pré-publish / pré-invoke |
| graph | `GraphContextPort` | T04 discovery, T05 context build |
| connections | `ModelBindingPort` (v1 ref) | Resolver binding ID → metadata sem secret |

## Downstream

| Consumidor | Contrato | Eventos |
| --- | --- | --- |
| orchestration | `AgentRegistryPort` | `agents.agent.created.v1` |
| knowledge | projector/indexer | `agents.version.published.v1` |
| graph | inbox consumer | agent nodes, skills edges |
| audit | subscriber | todos `agents.*.v1` |

## Imports proibidos

- Repositório privado de orchestration, knowledge, connections
- `neo4j-driver` em agents (projeção só no graph)
- Secrets / env de provider em domain ou DTOs

## Pendências → R09

| ID | Tema | Destino |
| --- | --- | --- |
| P-R6-01 | R03 domain sketch formal (Agent invariants) | issue derivada ou R09 S1 |
| P-R6-02 | Catálogo HTTP `/v1/agents/*` | R09 S6 |
| P-R6-03 | Brain sync vs async invoke | R08 D-AGT-012 |

**Próximo:** [R07-risks.md](./R07-risks.md)
