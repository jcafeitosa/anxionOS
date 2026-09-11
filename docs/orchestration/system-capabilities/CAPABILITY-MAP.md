---
type: guide
---

# Mapa mestre de capacidades — anxionOS (23 módulos)

**Issue:** ANX-43 · **Gap refresh:** ANX-346 (2026-09-10)  
**Data:** 2026-09-11 (P1 ANX-389: packs agents/orchestration/graph canônicos em `docs/orchestration/modules/`)  
**Escopo:** Matriz humano + agente, eventos, grafo e API por módulo físico ADR0002  
**Fontes canônicas:** `brain/notes/anxionos-backend-structure.md` · `brain/project-docs/specs/001-institutional-contract/spec.md` · `brain/project-docs/specs/002-agents-knowledge/spec.md` · `brain/project-docs/specs/003-investment-lifecycle/spec.md` · `brain/project-docs/specs/004-institutional-evolution/spec.md` · `brain/project-docs/specs/005-connections-integration/spec.md`

## Legenda

| Coluna | Significado |
| --- | --- |
| **Human affordances** | Jornadas Owner / Operator / Platform via consoles Astro + REST |
| **Agent affordances** | Tools/SDK via CapabilityManifest + Graph Kernel (spec 002 AP01–AP08) |
| **Events emitted** | Eventos de domínio versionados (ownerDomain, .v1) |
| **Events consumed** | Projeções, workflows, audit — inbox idempotente |
| **Graph projection** | Nós/arestas Neo4j derivados de eventos (nunca escrita direta) |
| **API surface** | REST prefixo /v1/<domain> ou /v1/graph/* quando kernel |
| **Gap código** | Snapshot **2026-09-10 (ANX-346)**: presença de `backend/modules/<name>/src/index.ts`. «Ausente» de 2026-09-07 está obsoleto. **Parcial** = código/esqueleto presente; **não** implica G7. `adapter-gateway` **fora** desta matriz (ADR0006). |

---

## Matriz completa (23 módulos)

| # | Módulo | Human affordances | Agent affordances | Events emitted | Events consumed | Graph projection | API surface | Fontes | Gap código |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **identity** | Login/logout, MFA, perfil, sessões ativas, service principals (Platform) | identity.principal.get, identity.session.revoke (manifest P02) | identity.principal.registered.v1, identity.session.revoked.v1 | — (downstream consome revogação) | Principal, papéis visíveis | /v1/auth/* (Better Auth), /v1/identity/principals | backend-structure L29, SDD R25–R27, identity R01 | **Parcial** — Principal + register/get; sem Better Auth no módulo, sem eventos, sem graph |
| 2 | **organizations** | Onboarding Owner (UI01), criar Agency, convidar equipe, roles, mercados stocks/crypto | organizations.agency.create, organizations.membership.invite, organizations.onboarding.advance | organizations.agency.created.v1, organizations.membership.invited.v1, organizations.membership.activated.v1 | billing.subscription.confirmed.v1 (saga UI01, deferido) | Agency, Membership, OnboardingRun | /v1/organizations/* | organizations R04, D-ORG-001..043, SDD UI01/UI03 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 3 | **governance** | Conceder/revogar grants, mandatos, aprovar ChangeProposal, ver authority explain | governance.grant.issue, governance.approval.resolve, authorization.can (via graph) | governance.grant.issued.v1, governance.grant.revoked.v1, governance.approval.resolved.v1 | organizations.membership.*, risk.policy.updated.v1 | Caminhos GRANT, MANDATE, APPROVAL temporais | /v1/governance/*, /v1/graph/authorization/* | governance R01, SDD envelope comando, spec 003 segregação | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 4 | **graph** | Graph Explorer, traversals T01–T20, authority explain, context build | graph.traversal.*, graph.context.buildForAgent, graph.authorization.explain | — (projetor interno) | **Todos** eventos com ownerDomain | Kernel Neo4j completo | /v1/graph/* | backend-structure Graph Kernel, SDD API semântica GK | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 5 | **agents** | Configurar Agent/AgentVersion, skills, bindings modelo, autonomia L0–L4 | Brain facade: agents.version.deploy, agents.capability.list | agents.agent.created.v1, agents.version.published.v1 | governance.grant.*, connections.binding.* | Agent, AgentVersion, Skill | /v1/agents/* | spec 002, agents R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 6 | **orchestration** | Goals/Tasks dashboard, cancelar/assumir Run, ver heartbeat | orchestration.task.create, orchestration.run.resume, scheduler tools | orchestration.goal.created.v1, orchestration.run.completed.v1, orchestration.run.waiting_human.v1 | agents.*, governance.*, outcomes domínio | Goal, Task, Run, delegação | /v1/orchestration/* | spec 002, orchestration R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 7 | **connections** | Conectar provider, SYSTEM_FREE, bindings, quotas, cooldown | connections.account.bind, connections.inference.invoke (via profile) | connections.account.connected.v1, connections.usage.recorded.v1, connections.quota.exceeded.v1 | governance.grant.*, billing.* (PLATFORM) | Provider, AIAccount, Binding, Usage | /v1/connections/* | spec 005, connections R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 8 | **knowledge** | Upload docs, memórias, busca Graph RAG, evidências | knowledge.document.ingest, knowledge.memory.search, knowledge.evidence.attach | knowledge.document.committed.v1, knowledge.evidence.available.v1 | orchestration.run.* (contexto) | Document, Memory, Evidence, embeddings ref | /v1/knowledge/* | spec 002, knowledge R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 9 | **market-data** | Ver instrumentos, feeds, qualidade, corporate actions | market-data.instrument.resolve, market-data.observation.get | market-data.instrument.registered.v1, market-data.observation.ingested.v1 | — (ingest workers) | Instrument, MarketEvent, Signal | /v1/market-data/* | spec 003, market-data R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 10 | **strategies** | Criar StrategyVersion, backtest, deploy paper/live | strategies.version.create, strategies.backtest.run, strategies.deployment.promote | strategies.version.created.v1, strategies.backtest.completed.v1, strategies.deployment.activated.v1 | market-data.*, evaluation.* | Strategy, StrategyVersion, Deployment | /v1/strategies/* | spec 003, strategies R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 11 | **capital** | Contas capital, alocações, reservas, disponível | capital.account.register, capital.allocation.reserve | capital.account.opened.v1, capital.allocation.reserved.v1 | execution.fill.*, accounting.* | CapitalAccount, Allocation | /v1/capital/* | spec 003, capital R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 12 | **portfolios** | Posições, exposição, valuation, attribution view | portfolios.position.get, portfolios.exposure.analyze | portfolios.position.updated.v1, portfolios.valuation.snapshot.v1 | execution.fill.*, market-data.* | Portfolio, Position | /v1/portfolios/* | spec 003, portfolios R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 13 | **decisions** | Propor decisão, TradeIntent, anexar evidências | decisions.propose, decisions.intent.submit (AGENCY L1+) | decisions.decision.recorded.v1, decisions.intent.submitted.v1 | knowledge.evidence.*, strategies.signal.* | Decision, TradeIntent, cadeia evidência | /v1/decisions/* | spec 003, decisions R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 14 | **risk** | Políticas limite, RiskCheck, kill switch Owner/Platform | risk.policy.update, risk.check.validate, risk.kill_switch.activate | risk.policy.updated.v1, risk.check.completed.v1, risk.kill_switch.activated.v1 | decisions.intent.*, portfolios.* | RiskPolicy, RiskCheck, violações | /v1/risk/* | spec 003, risk R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 15 | **execution** | Ordens abertas, cancel, reconciliação venue | execution.order.submit, execution.order.cancel (permit-bound) | execution.order.submitted.v1, execution.fill.received.v1 | decisions.intent.*, risk.check.* | Order, Fill | /v1/execution/* | spec 003, execution R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 16 | **accounting** | Ledger, taxas, ajustes, reconciliação financeira | accounting.ledger.query, accounting.adjustment.propose | accounting.entry.posted.v1, accounting.reconciliation.opened.v1 | execution.fill.*, capital.* | Lançamentos ref (não segundo ledger) | /v1/accounting/* | spec 003, accounting R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 17 | **performance** | P&L, métricas, atribuição por estratégia/agente | performance.pnl.get, performance.attribution.run | performance.snapshot.computed.v1 | accounting.*, portfolios.* | Métricas derivadas | /v1/performance/* | spec 003, performance R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 18 | **evaluation** | Certificação, reputação, promoção Strategy/Agent | evaluation.run, evaluation.certify, evaluation.reputation.get | evaluation.completed.v1, evaluation.certification.issued.v1 | strategies.backtest.*, simulation.* | Evaluation, Certification, Reputation | /v1/evaluation/* | spec 004, evaluation R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 19 | **simulation** | Digital Twin, snapshot diff, cenários isolados | simulation.snapshot.create, simulation.run, simulation.diff | simulation.snapshot.created.v1, simulation.run.completed.v1 | strategies.*, governance.change_proposal.* | SimulationRun, Snapshot | /v1/simulation/* | spec 004, simulation R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 20 | **audit** | Flight Recorder, linhagem, replay governado (Platform) | audit.manifest.get, audit.lineage.trace, audit.replay.request | audit.manifest.recorded.v1, audit.replay.completed.v1 | **Journal global** (todos domínios) | Cadeia causal, manifests | /v1/audit/* | spec 003, audit R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 21 | **billing** | Assinatura, faturas, upgrade plano (Owner) | billing.subscription.get, billing.invoice.list | billing.subscription.confirmed.v1, billing.invoice.paid.v1 | organizations.agency.created.v1 | Subscription, Invoice | /v1/billing/* | backend-structure L49, billing R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 22 | **partners** | Indicações, comissões, payouts (Partner console) | partners.referral.register, partners.commission.get | partners.commission.accrued.v1, partners.payout.sent.v1 | billing.invoice.* | Referral, Commission | /v1/partners/* | backend-structure L50, partners R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |
| 23 | **operations** | Incidentes, retenção, export, recovery, procedures | operations.incident.open, operations.procedure.execute (OP01–OP08) | operations.incident.opened.v1, operations.procedure.completed.v1 | audit.*, telemetria | Incident, ProcedureVersion | /v1/operations/* | spec 004 OP01–OP08, operations R01 | **Parcial** — index.ts 2026-09-10; G7 não declarado |

---

## Capacidades transversais

| ID | Capacidade | Módulos | Fonte |
| --- | --- | --- | --- |
| X01 | Paridade humano/agente (AP01–AP08) | Todos | spec 002 |
| X02 | Autoridade grafo + epoch revalidation | graph, governance, risk, execution | SDD 001 |
| X03 | Journal + outbox atômico | Todos com estado PG | SDD 001 |
| X04 | CapabilityManifest + idempotency | contracts/sdk | spec 002 |
| X05 | Flight Recorder / linhagem | audit + emitters | spec 003 |
| X06 | WAITING_HUMAN_INPUT retomável | orchestration, connections | spec 002 |
| X07 | Kill switch + segregação funções | risk, governance, decisions, execution | spec 003 |
| X08 | Projeção Neo4j event-driven | graph + graph/projections | ADR0002 |
| X09 | Ambientes SIMULATED/PAPER/REAL + isolamento por asset class | simulation, market-data, strategies, risk, capital, execution, accounting, portfolios | [desenho de modos e classes de ativos](./execution-modes-and-asset-classes.md) |

---

## Ponteiros P1 (ANX-389)

Debates seriais: [índice PC](../../../notes/anxionos-pc-serial-index.md). Packs `modules/agents` e `modules/orchestration` (ANX-392/393). Graph R01–R10 em `modules/graph/` só depois desses packs; histórico em [structure-debate/graph](../structure-debate/graph/R10-g0-handoff.md). Specs 001–005 permanecem draft.

| Módulo | Debate PC | Pack canônico |
| --- | --- | --- |
| agents | [PC 03](../../../notes/anxionos-pc03-agents-debate.md) | [modules/agents](../modules/agents/ROUNDS.md) |
| orchestration | [PC 12](../../../notes/anxionos-pc12-tasks-debate.md) | [modules/orchestration](../modules/orchestration/ROUNDS.md) |
| governance | [PC 01](../../../notes/anxionos-pc01-governance-debate.md) | [modules/governance](../modules/governance/ROUNDS.md) |

## Referências

- [SLACK-TRANSCRIPTS.md](./SLACK-TRANSCRIPTS.md)
- [MODULE-STRUCTURE-CHECKLIST.md](./MODULE-STRUCTURE-CHECKLIST.md)
- [Modos de execução e classes de ativos](./execution-modes-and-asset-classes.md)
- [modules/](./modules/) — 23 fichas (ANX-347); sem `approvals`, `policies` ou `adapter-gateway`
