---
type: guide
---

# Funcionalidades — `modules/graph` (P03)

**Issue mapa:** ANX-43 · **Debate estrutura:** ANX-41 · **Implementação:** ANX-32, ANX-33, ANX-34  
**Fontes:** [graph R01](../../structure-debate/graph/R01-context.md) · `brain/project-docs/specs/001-institutional-contract/spec.md` · `brain/notes/anxionos-graph-traversals-v1.md` · `brain/notes/anxionos-backend-structure.md`

## Responsabilidade

Graph Kernel — schema versionado, projeções event-driven, traversals registrados (T01–T20), contexto para agentes, autoridade explicável (`authorization.can/explain`), temporalidade bitemporal. **Não** é dono de capital, grants, tasks, modelos ou journal de domínio — resolve contexto e despacha mutações ao owner via `node.create/update`.

## Histórias humanas

| Papel | Jornada | Endpoint / Traversal |
| --- | --- | --- |
| **Owner** | Graph Explorer — ver organograma Agency, memberships, grants visíveis | `traversal.neighbors`, T06 |
| **Owner** | Painel "por que negado" antes de ordem ou aprovação | `authorization.explain` (T03) |
| **Operator** | Linhagem de decisão até fill (audit visual) | T10, T11, `lineage.get` |
| **Operator** | Exposição consolidada por ativo | T09 |
| **Platform** | Impact report ao suspender agente ou revogar conexão | T13, T14, `findImpact` |
| **Platform** | Rebuild/consistency dashboard, projection lag | `/v1/graph/admin/*` (R-debate) |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Brain AGENCY** | `graph.context.buildForAgent` (T05) | Token budget; políticas obrigatórias não truncadas |
| **CEO AGENCY** | T04 descoberta de agentes, T06 dependências de Goal | Ranking ≠ autorização |
| **Orchestration worker** | T13 impacto antes de ChangeProposal | Relatório incompleto bloqueia apply |
| **Risk/Execution adapter** | T01 `authorization.can` com intentHash + epochs | Stale projection → revalidação PG; nunca ALLOW só do grafo |
| **Audit PLATFORM** | T10/T11 causal chain read-only | Sem credencial Neo4j — API Kernel only |

**Regra ADR0002 #7:** agente **nunca** recebe credencial Neo4j; traversals via `/v1/graph` ou SDK tipado.

## Traversals T01–T20 (sketch)

| ID | Nome | Domínio principal | Kernel vs registrado |
| --- | --- | --- | --- |
| T01 | Autoridade de execução atual | governance + risk + execution | **Kernel** — GK03 |
| T02 | Autoridade histórica bitemporal | governance | **Kernel** |
| T03 | Explicação negação/aprovação | governance | **Kernel** |
| T04 | Descoberta de agentes | agents + orchestration | **Kernel** (spec 002) |
| T05 | Contexto agente/tarefa | agents + knowledge + investment | **Kernel** |
| T06 | Objetivos e dependências | orchestration | **Kernel** |
| T07 | Capital sob agente | capital + portfolios | **Kernel**; planners capital registrados |
| T08 | Estratégias e deployments | strategies | Registrado strategies + Kernel dispatch |
| T09 | Exposição consolidada por ativo | portfolios + market-data | **Kernel** |
| T10 | Linhagem de decisão | decisions + knowledge | **Kernel** |
| T11 | Fill até autorização | execution + decisions | **Kernel** |
| T12 | Atribuição de outcome | performance + accounting | **Kernel** |
| T13 | Impacto suspender agente/estratégia | multi-domínio | **Kernel** |
| T14 | Impacto revogar conexão | connections + agents | **Kernel** |
| T15 | Rotas elegíveis binding | connections + governance | **Kernel** (CX gate) |
| T16 | Trace roteamento inferência | connections | Registrado connections |
| T17 | Consumo e custos | connections + billing ref | **Kernel** agregador |
| T18 | Reconciliação divergências | execution + accounting | Registrado owners + Kernel report |
| T19 | Mudança simulada autoridade | simulation + governance | **Kernel** + simulation snapshot |
| T20 | Atribuição comercial | partners + billing | Registrado partners |

**Distinção kernel vs domínio:** o Kernel mantém registry, scope injection, budgets e authorization envelope; domínios registram **query plans** e edge allowlists via interface pública — Kernel **não** importa repository privado cross-module (backend-structure L187).

## API surface (sketch)

Prefixo `/v1/graph`. Sem Cypher arbitrário.

| Grupo | Métodos | Notas |
| --- | --- | --- |
| Read | `node.get`, `nodes.batchGet`, `traversal.*`, `temporal.*` | Envelope: scope, validAt, knownAt, checkpoint, cursor |
| Authority | `authorization.can`, `authorization.explain`, `authorization.resolveAuthority` | T01–T03; mutável exige epoch atual em PG |
| Context | `context.buildForAgent`, `context.buildForDecision`, `context.buildForPortfolio` | T05; manifest autorizado |
| Mutation dispatch | `node.create/update/archive`, `relation.create/revoke/version` | **Dispatcher** → comando domínio owner; projectionPending |
| Intelligence | `intelligence.findAgents`, `findCapabilities`, `findKnowledge` | T04; filtros enumerados |
| Simulation | `simulation.snapshot`, `simulation.diff` | T19; job assíncrono |
| Admin | rebuild, consistency-check | workers projection-consumer/rebuild |

## Events

| Direção | Detalhe |
| --- | --- |
| **Emitted** | — (graph é projetor interno; checkpoints/rebuild status via audit/operations — R-debate) |
| **Consumed** | **Todos** eventos com `ownerDomain` — inbox idempotente por eventId + checkpoint |

Projeção: `eventId`, `checkpoint`, `ownerDomain`, `projectionGeneration` em cada nó/aresta visível.

## Integração

| Upstream | Downstream |
| --- | --- |
| packages/eventing (NATS/outbox) | agents (T04/T05 context) |
| P02 identity/organizations/governance (eventos) | orchestration (T06, impact) |
| Todos módulos (eventos versionados) | knowledge (Graph RAG refs, não write) |
| Neo4j adapter privado | governance (explain UI delega ao Kernel) |
| PG catálogo/rebuild control | risk, execution (T01 revalidation handoff) |
| — | audit (lineage read via Kernel) |
| — | simulation (T19 diff) |

## Fronteiras Neo4j vs PostgreSQL

| Autoridade | Store | Regra |
| --- | --- | --- |
| Grants, epochs, permits de uso | PostgreSQL (governance + domínios) | Fonte para efeito mutável |
| Nós, arestas, temporalidade lógica | Neo4j | Projeção reconstruível; stale OK para UI |
| Journal/outbox | PostgreSQL por ownerDomain | AR05 rebuild a partir do journal |
| Catálogo Txx, rebuild state | PostgreSQL (graph module) | Não replicar grafo em SQLite institucional |

Grafo atrasado: visualização com `stale: true`; **nunca** confirmar permissão sensível sem `authorityEpoch`/`riskEpoch` atuais na transação de comando (SDD 001).

## Decisões aplicáveis (debate)

- CAP-A01 — CAPABILITY-MAP alimenta R-debate funcional
- RB-A01 — graph: authorization.can + stale projection (Session A)
- GK01–GK09 — quinze leis SDD como gates AR04–AR06

## Gap código

**Ausente** — zero `backend/modules/graph/`; fixture F0 e bench T01–T20 não implementados; ANX-41 debate R01 iniciado.

## Perguntas abertas (top 5 — ver Session D)

1. Quais Txx permanecem 100% Kernel vs registrados por domínio com merge de planos?
2. Ordem de rebuild por `ownerDomain` e cutoff checkpoint vs ack NATS pós-crash?
3. Cache de T01/T03/T15: chave inclui epochs — invalidação cross-pod?
4. `node.create` dispatcher: sync vs async projectionPending no envelope de resposta?
5. Admin rebuild API: escopo PLATFORM only ou operations OP01?
