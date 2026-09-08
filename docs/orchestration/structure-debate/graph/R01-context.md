---
type: debate
---

# R01 — Contexto: `modules/graph`

**Componente:** modules/graph  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P03  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-41 · **Issue mapa funcional:** ANX-43  
**Sessão Slack:** [Session D — #module-graph](../../system-capabilities/SLACK-TRANSCRIPTS.md#sessão-d--module-graph) · [Session E — R02](./SLACK-TRANSCRIPTS.md#session-e--r02-boundaries)

## Propósito

Graph Kernel — schema versionado, traversals T01–T20, temporalidade bitemporal, contexto para agentes, autoridade explicável e projeções a partir de eventos. Resolve acesso/contexto pelo grafo e despacha mutações ao domínio proprietário; **não** concentra capital, tasks, modelos ou grants como dono de estado.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Catálogo de contratos de grafo e registry T01–T20
- Query plans e authorization/context traversals (Kernel)
- Projection consumers, checkpoints, rebuild control (PG)
- Neo4j adapter privado (nós, arestas, versões, marcadores projeção)

### Não possui (fronteiras ADR0002 / brain)

- Capital, tasks, models, grants como dono — apenas resolve contexto e chama domínio proprietário
- Journal de domínios — cada owner mantém PG + outbox
- Credencial Neo4j para agentes — AR04/GK05
- Cypher arbitrário ou DSL executável exposto a consumidores

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | P02 foundation (identity, organizations, governance eventos), packages/eventing, packages/contracts GraphQuery v1, eventos versionados de **todos** os módulos |
| **Downstream** | agents (T04/T05), orchestration (T06/T13), knowledge (Graph RAG read), governance (explain UI), risk/execution (T01 handoff), audit (lineage), simulation (T19) |

## Armazenamento

PG: catálogo Txx, rebuild checkpoints, inbox projection state. Neo4j: nós, relações, versões, marcadores `eventId`/`checkpoint`/`ownerDomain`. SQLite: não replicar grafo institucional.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Capacidades humano + agente (ANX-43)

Ver [modules/graph.md](../../system-capabilities/modules/graph.md) — matriz completa, T01–T20 sketch, integração e fronteiras Neo4j vs PG.

## Estado do código atual

**Ausente.** Issues ANX-32/33/34; debate ANX-41 R01 iniciado; fixture F0 e bench T01–T20 documentais apenas.

## Perguntas abertas para debate

- T01–T20: quais traversals são 100% Kernel vs registrados por domínio (T08, T16, T18, T20)?
- Consistência marcador projeção Neo4j vs ack NATS pós-crash?
- Agents nunca recebem credencial Neo4j — traversals exclusivamente via `/v1/graph`?
- Rebuild completo: ordem por `ownerDomain` e cutoff checkpoint?
- `authorization.can` stale: UI mostra explain com flag; execution revalida epoch em PG — contrato exato?
- Admin rebuild: PLATFORM vs operations OP01?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` (Graph Kernel L158–187) |
| Traversals T01–T20 | `brain/notes/anxionos-graph-traversals-v1.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` (API Graph Kernel L124–145) |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| CAPABILITY-MAP | `docs/orchestration/system-capabilities/CAPABILITY-MAP.md` (linha graph) |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** ✅ [R02-boundaries.md](./R02-boundaries.md) — kernel vs domínio, dispatcher `node.create`, Neo4j authority boundaries.
