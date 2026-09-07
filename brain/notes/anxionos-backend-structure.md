---
type: planning-note
title: Backend — estrutura modular adotada
description: Árvore de módulos aceita pelo usuário, ownership, dependências e sequência de implementação.
status: stable
decision_status: accepted
accepted_on: 2026-09-07
cluster: anxionos
version: "1.0"
tags:
  - backend
  - architecture
  - modules
---
# Backend — estrutura modular adotada

Proposta apresentada em tela e aceita pelo usuário em 2026-09-07: “vamos documentar essa proposta e vamos seguila”. **Esta árvore é o baseline adotado de organização do backend.** Ainda não representa diretórios/código implementados. Integra o [SDD institucional](../project-docs/specs/001-institutional-contract/spec.md) e o [Connections integration](../project-docs/specs/005-connections-integration/spec.md).

Registro da decisão: [ADR0002 — organização modular aceita](../project-docs/decisions/0002-adopt-modular-backend-layout.md).

## Árvore principal

```text
backend/
├── apps/
│   ├── api/                       # API Bun + Elysia
│   └── workers/                   # Composition root dos workers TypeScript
├── modules/
│   ├── identity/                  # Usuários, sessões, autenticação
│   ├── organizations/             # Empresa/Agency, Owner, onboarding e equipes
│   ├── governance/                # Grants, delegação, mandatos e aprovações
│   ├── graph/                     # Kernel, schema, traversals e temporalidade
│   ├── agents/                    # Identidade/versões, skills e fachada do Brain
│   ├── orchestration/             # Goals, Tasks, Runs, heartbeat e scheduler
│   ├── connections/               # Providers, contas, modelos e inferência
│   ├── knowledge/                 # Documentos, memórias, evidências e Graph RAG
│   ├── market-data/               # Instrumentos, feeds, preços e eventos
│   ├── strategies/                # Estratégias, backtests e deployments
│   ├── capital/                   # Contas de capital, alocações e reservas
│   ├── portfolios/                # Portfolios, posições, exposição e valuation
│   ├── decisions/                 # Decisões e intenções de investimento
│   ├── risk/                      # Políticas/limites de risco, checks e kill switch
│   ├── execution/                 # Ordens, fills e reconciliação da venue
│   ├── accounting/                # Ledger, taxas e ajustes/reconciliação financeira
│   ├── performance/               # P&L, métricas e atribuição
│   ├── evaluation/                # Avaliação, certificação, reputação e promoção
│   ├── simulation/                # Digital Twin e execução isolada de cenários
│   ├── audit/                     # Flight Recorder, linhagem e replay governado
│   ├── billing/                   # Assinatura/cobrança da plataforma
│   ├── partners/                  # Indicações, comissões e payouts
│   └── operations/                # Incidentes, retenção, exportação e recuperação
├── services/
│   ├── execution-go/              # Runtime especializado; não outro dono da ordem
│   └── research-python/           # Pesquisa, backtests/ML por protocolo de job
├── packages/
│   ├── contracts/                 # API, comandos, eventos e tipos públicos
│   ├── sdk/                       # Clientes tipados dos contratos
│   ├── eventing/                  # Journal/outbox/inbox e adapter NATS
│   ├── database/                  # Infra de conexões/transações/migration runner
│   ├── secrets/                   # Porta/cofre; segredos fora de prompt/grafo
│   └── observability/             # Logging, métricas e tracing
├── tests/
│   ├── contracts/
│   ├── integration/
│   ├── end-to-end/
│   ├── recovery/
│   └── benchmarks/
└── deploy/
    ├── docker/
    ├── environments/
    └── monitoring/
```

## Padrão de um módulo

```text
modules/<module>/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── events/
│   └── ports/
├── application/
│   ├── commands/
│   ├── queries/
│   └── workflows/
├── infrastructure/
│   ├── persistence/
│   │   ├── schema/
│   │   ├── repositories/
│   │   └── migrations/
│   └── adapters/
├── graph/
│   ├── projections/
│   └── traversals/
├── api/
│   ├── routes/
│   ├── schemas/
│   └── presenters/
├── workers/
├── tests/
└── index.ts                       # Superfície pública explícita
```

Criar subpastas quando houver responsabilidade concreta, sem arquivos vazios para preencher árvore. Em módulos grandes, como Connections, domain é subdividido por contexto funcional conforme a árvore abaixo; entidades/policies/ports ficam dentro de cada contexto quando necessário.

## Connections

```text
modules/connections/
├── domain/
│   ├── providers/
│   ├── accounts/
│   ├── subscriptions/
│   ├── credentials/
│   ├── endpoints/
│   ├── models/
│   ├── offerings/
│   ├── catalog/
│   ├── bindings/
│   ├── inference-profiles/
│   ├── routing/
│   ├── pools/
│   ├── quotas/
│   ├── budgets/
│   ├── cooldowns/
│   ├── health/
│   └── usage/
├── application/
│   ├── commands/
│   ├── queries/
│   └── workflows/
├── infrastructure/
│   ├── persistence/
│   ├── providers/
│   ├── local-runtimes/
│   ├── normalization/
│   └── telemetry/
├── graph/
│   ├── projections/
│   └── traversals/
├── api/
│   ├── routes/
│   ├── schemas/
│   └── presenters/
├── workers/
│   ├── catalog-sync/
│   ├── health-monitor/
│   ├── cooldown-recovery/
│   ├── quota-reconciler/
│   └── usage-reconciler/
└── tests/
```

Credential refresh, lease reaper, job polling, classifier e artifact expiry ficam em workers adicionais quando implementados, conforme [spec de integração](../project-docs/specs/005-connections-integration/spec.md). Não exigir um processo/container por pasta.

## Graph Kernel

```text
modules/graph/
├── domain/
│   ├── identity/
│   ├── schema/
│   ├── temporal/
│   └── query-plans/
├── application/
│   ├── authorization/
│   ├── context/
│   ├── traversals/
│   ├── lineage/
│   ├── impact/
│   └── projections/
├── infrastructure/
│   ├── adapters/
│   │   └── neo4j/
│   ├── checkpoints/
│   └── migrations/
├── api/
├── workers/
│   ├── projection-consumer/
│   ├── rebuild/
│   └── consistency-check/
└── tests/
```

O Kernel resolve acesso/contexto pelo grafo e chama domínio proprietário para comandos. Não se torna dono de capital, tasks, modelos ou grants por ter uma API node.create. Os planners específicos de cada domínio são registrados por interface; o Kernel não importa repositório privado daquele módulo.

## Responsabilidades que não podem se sobrepor

| Fronteira | Dono do estado | Consumidores |
| --- | --- | --- |
| Identidade/empresa | identity: identidade/sessão; organizations: Agency/Owner/membership/onboarding | governance e todos os scopes |
| Authority vs Risk | governance: grants/mandates/approvals; risk: RiskPolicy/RiskCheck/limits/kill switch | graph explica; execution revalida |
| Agent vs Task | agents: Agent/AgentVersion/skills; orchestration: Goal/Task/Run/delegation workflow | knowledge monta contexto; connections infere |
| Brain vs Memory | agents oferece fachada do Brain; knowledge possui Memory/Evidence/Document | orchestration registra Run/outcome e consulta |
| Model vs Billing | connections: ProviderSubscription/AIAccount/usage; billing: Subscription/Invoice da plataforma | accounting não mistura consumo IA com capital de trading |
| Capital vs Portfolio | capital: titular/conta/alocação/reserva; portfolios: posição/valuation; accounting: ledger | performance usa snapshots/ledger, não reescreve saldos |
| Decision vs Execution | decisions: Decision/TradeIntent; execution: Order/Fill/venue reconciliation | execution-go executa protocolo, sem estado de negócio independente |
| Strategy vs Evaluation | strategies: StrategyVersion/Deployment; evaluation: Evaluation/Certification/Reputation | research-python processa jobs, não promove produção |
| Twin vs Change | simulation: Snapshot/SimulationRun; governance: ChangeProposal/aprovação; evaluation: critérios de promoção | aplicação por comandos dos donos |
| Audit vs Eventing | cada domínio confirma fato; eventing fornece mecanismo; audit guarda manifests/replay/linhagem | log de auditoria não é um segundo ledger |
| Reconciliation | execution reconcilia protocolo/order/fill; accounting reconcilia saldos/lançamentos | ReconciliationCase referencia ownerDomain único e subtarefas |
| Comercial | partners: Referral/Commission/Payout; billing: Invoice/refund | evento pago/revertido alimenta comissão idempotente |

Os nomes de domínios amplos usados no schema (Identity, Agents, Investment/Accounting) agrupam módulos físicos desta tabela; não autorizam dois escritores sobre o mesmo agregado. RiskPolicy é PolicyVersion(kind=RISK), cujo proprietário é risk; governance mantém o contrato genérico e referências.

## Regras obrigatórias de dependência

1. domain não importa Elysia, Drizzle, Neo4j, NATS, providers ou apps. Entidades/policies dependem de tipos e ports mínimos.
2. application implementa casos de uso com ports; infrastructure implementa ports. api valida/autentica/apresenta e chama application, sem regra de negócio na rota.
3. apps/api e apps/workers são composition roots; registram módulos/adapters/config, não concentram lógica.
4. Um módulo acessa outro pelo contrato público/index.ts/SDK ou evento versionado. Proibido importar repository privado ou escrever tabela de outro módulo.
5. Cada domínio grava estado+journal+outbox atomicamente; packages/eventing é mecanismo compartilhado, não banco de regras de negócio.
6. packages/contracts não importa modules; contratos publicados têm schemaVersion. Evitar pacote common com entidades misturadas.
7. Projeção de grafo nasce de evento e mantém eventId/checkpoint/ownerDomain. Agent nunca chama Neo4j diretamente.
8. Serviços Go/Python usam envelopes de job/comando/evento e service principals; não atualizam tabelas de domínio por SQL lateral. Execution-go pode integrar-se ao domínio execution por protocolo interno de dispatch/report.
9. Workers são implementados junto ao módulo; apps/workers escolhe quais executar. Deploys podem separar processos por perfil de carga sem duplicar código/ownership.
10. Migrações de tabelas pertencem ao módulo; packages/database executa dependências ordenadas e controle transacional. Migração destrutiva exige backfill/compatibilidade/rollback definidos.
11. Secrets só são resolvidos na infraestrutura autorizada e injetados ao adapter; não passam por domain events, DTO de leitura, prompt ou graph.
12. Rust/novos runtimes/extração de microservices exigem justificativa de carga/isolamento e decisão registrada, preservando contratos.

## Sequência para seguir a estrutura

P01 estabelece workspace/package tooling, dependency boundaries e versions/licenças. P02 cria contracts/eventing/database/secrets/observability e identity/organizations/governance. P03 graph/schema/projections/T01–T20. P04 agents/orchestration/knowledge e P05 connections. P06 market-data/strategies/capital/portfolios/decisions/risk/execution/accounting/performance/audit. P07 billing/partners/operations e experiências humanas. P08 evaluation/simulation e workflows avançados. P09 recovery/bench/lançamento. Ordem detalhada e gates no [SDD](../project-docs/specs/001-institutional-contract/spec.md).

Não iniciar scaffolding ou código apenas porque a estrutura foi documentada; esta sessão autoriza documento/baseline. Quando houver implementação, criar só os módulos/pastas necessários ao pacote ativo, seguindo a árvore e sem reabrir decisões de organização já aceitas.

## Verificação da arquitetura

AR01: dependency test impede domain→infra/apps e import privado cross-module. AR02: generated contracts/SDK compilam e schemas têm versão. AR03: migration ownership impede dois módulos alterarem mesmo agregado. AR04: agents não recebem credencial Neo4j/cofre; execution-go/Python não fazem escrita lateral. AR05: event-driven projector reconstrói grafo a partir do journal. AR06: CI executa unit de módulo, contract boundary, integration/recovery relevantes e Txx quando alteração afeta query/schema.

Esses testes são exigências para implementação futura; não foram executados nesta entrega. Alterações futuras da estrutura devem atualizar este documento e um registro de decisão, com motivo e plano de movimentação/imports.
