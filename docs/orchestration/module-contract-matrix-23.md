---
title: "Matriz de contratos dos 23 módulos"
description: "Cobertura mínima verificável de ownership, capacidades, eventos, erros, idempotência, oráculos e gates do backend modular."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-68
tags:
  - contracts
  - modules
  - capabilities
  - eventing
  - roadmap
  - gates
---

# Matriz de contratos dos 23 módulos

## 1. Propósito

Esta matriz transforma o mapa de capacidades em backlog verificável. Ela não cria módulos vazios nem declara implementação. Cada linha é um contrato mínimo que deve ser refinado em schema, testes e adapter antes do gate de execução correspondente.

Os módulos são donos de estado e casos de uso. `packages/eventing` fornece transporte, mas não define regra de negócio. Comunicação cross-module usa contrato público ou evento versionado; nenhum módulo acessa repositório privado de outro.

## 2. Contrato comum obrigatório

Todo módulo deve declarar:

- `CapabilityManifest`: capability, owner, input/output schema, grant, modo, effect class, approval, budget, idempotência e auditoria;
- entidades e invariantes de domínio sem framework;
- comandos, eventos, erros tipados e versões;
- idempotency key, expected version, lease/checkpoint e comportamento UNKNOWN quando aplicável;
- owner de PostgreSQL/TimescaleDB/Neo4j/pgvector ou objeto externo;
- API, workers, adapters, graph projection e limites de dependência;
- oráculos de aceitação: testes determinísticos, contract tests, integração, E2E e observabilidade;
- gates, riscos residuais, decisões pendentes e critérios de rollback.

Estado autoritativo, journal e outbox são atômicos por domínio. Projeções são reconstruíveis. Secrets nunca aparecem em eventos, DTOs, prompts ou grafo.

## 3. Matriz

| # | Módulo | Dono de estado e função | Capacidades mínimas | Eventos e erros críticos | Idempotência/oráculo | Gate de saída |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | identity | principals, sessões, MFA e credenciais de identidade | registrar/autenticar/verificar/revogar sessão | `PrincipalCreated`, `SessionRevoked`; `AUTH_INVALID`, `SESSION_REVOKED` | subject+provider; auth contract, tenancy e MFA tests | P02 |
| 2 | organizations | tenants, agencies, owners, memberships e convites | CRUD idempotente, membership e tenant scope | `AgencyCreated`, `MembershipChanged`; `TENANT_DENIED`, `INVITE_REPLAY` | tenant+resource+version; RLS/UoW tests | P02 |
| 3 | governance | grants, authority/policy epochs, permits e kill switch | avaliar autoridade, emitir/revogar grant/permit | `GrantIssued/Revoked`, `PermitGranted/Revoked`; `GRANT_DENIED`, `EPOCH_STALE` | grant subject+scope+epoch; revocation/race tests | P02 |
| 4 | graph | projeção institucional e traversal governado | projetar eventos, constraints, explicar relações | `GraphProjectionApplied`; `GRAPH_STALE`, `TRAVERSAL_DENIED` | eventId+checkpoint+ownerDomain; rebuild/constraint tests | P03 |
| 5 | agents | identidade/versionamento de agente e AgentRun | provisionar, iniciar, pausar, checkpointar e reportar run | `AgentRunStarted/Finished`; `CAPABILITY_DENIED`, `HUMAN_REQUIRED` | runId+step+expected version; lifecycle/takeover tests | P07 |
| 6 | orchestration | objectives, routines, delegation, leases e task execution | criar objetivo, disparar rotina, delegar, claim/renew/release | `ObjectiveCreated`, `DelegationChanged`; `LEASE_LOST`, `ORCHESTRATION_BLOCKED` | issue+boardVersion+status e runId; lease/shutdown tests | P04/P07 |
| 7 | knowledge | documentos, fontes, provenance, retrieval e policy de acesso | ingestão, busca, citação, classificação e retenção | `KnowledgeIngested`, `RetrievalCompleted`; `SOURCE_UNTRUSTED`, `ACL_DENIED` | document hash+version; ACL/injection/provenance tests | P07 |
| 8 | connections | bindings, adapters, capabilities de providers e health | resolver binding, health, read, simulate e reconcile | `BindingActivated/Revoked`, `CallUnknown`; `BINDING_INVALID`, `PROVIDER_UNKNOWN` | binding+request hash; secret redaction/UNKNOWN tests | P05 |
| 9 | inference | policy e execução de inferência por modelo/provider | inferir com schema, budget, provenance e avaliação | `InferenceRequested/Completed`; `MODEL_DENIED`, `OUTPUT_INVALID` | inference key+prompt hash; reproducibility/cost tests | P07 |
| 10 | market-data | instrumentos, feeds, observações e qualidade temporal | catálogo, ingestão, normalização e replay de dados | `MarketObservationRecorded`; `DATA_STALE`, `QUALITY_REJECTED` | source+sequence+timestamp; out-of-order/gap tests | P06 |
| 11 | strategies | definições, versões, universo e parâmetros de estratégia | publicar versão, avaliar sinal e explicar premissas | `StrategyVersioned`, `SignalProduced`; `STRATEGY_INVALID`, `DATASET_MISMATCH` | strategy version+observation set; deterministic replay | P06/P07 |
| 12 | decisions | decisões, sinais aceitos e TradeIntent imutável | criar, explicar, aprovar ou cancelar intenção | `TradeIntentCreated/Cancelled`; `INTENT_INVALID`, `APPROVAL_REQUIRED` | intentId+idempotency key; schema/parity tests | P06 |
| 13 | risk | políticas, exposições, limites e RiskCheck | pré/pós-trade checks, concentration, liquidity e loss | `RiskCheckCompleted`; `RISK_REJECTED`, `RISK_STALE` | intent+portfolio+riskEpoch; race/limit tests | P06 |
| 14 | capital | cash, quotas, reservas e epochs de capital | consultar, reservar, liberar e reconciliar capital paper | `CapitalReserved/Released`; `INSUFFICIENT_CAPITAL`, `RESERVATION_EXPIRED` | account+currency+reservation key; concurrent reserve tests | P06 |
| 15 | execution | ordens, permits consumidos e lifecycle de execução | aceitar/rejeitar/cancelar ordem simulada sob permit | `OrderStateChanged`; `PERMIT_INVALID`, `ORDER_UNKNOWN` | permit single-use+order key; state-machine tests | P06 |
| 16 | accounting | journal financeiro, ledger balanceado e lançamentos | postar/reverter/reconciliar lançamentos paper | `LedgerPosted/Reversed`; `LEDGER_UNBALANCED`, `ENTRY_DUPLICATE` | source event+entry key; double-entry/rebuild tests | P06 |
| 17 | portfolios | posições, lotes, cash views e valuation inputs | aplicar fills, corporate actions, posições e snapshots | `PositionUpdated/Valuated`; `POSITION_DIVERGED`, `VALUATION_MISSING` | fill/action id+sequence; ledger-to-position tests | P06 |
| 18 | performance | P&L, retornos, benchmark, risco e atribuição | calcular realizado/não realizado, fees, FX e métricas | `PerformanceCalculated`; `FX_MISSING`, `METRIC_INVALID` | snapshot+valuation version; reproducibility tests | P06 |
| 19 | simulation | relógio, cenários, fills, slippage e replay | criar run, executar cenário e produzir resultado paper | `SimulationStarted/Filled/Finished`; `SCENARIO_INVALID`, `SIM_UNKNOWN` | simulationRunId+seed/input hash; replay/partial fill tests | P06 |
| 20 | evaluation | datasets, casos, judges, baselines e resultados | avaliar agentes, estratégias, skills e regressões | `EvaluationCompleted`; `EVAL_INCONCLUSIVE`, `BASELINE_MISSING` | candidate+dataset+judge version; regression/adversarial tests | P07/P08 |
| 21 | evolution | propostas de mudança, promoção e rollback de versões | propor, comparar, aprovar e publicar evolução | `ChangeProposed/Promoted/RolledBack`; `PROMOTION_DENIED`, `REGRESSION_FOUND` | candidate hash+approval epoch; canary/rollback tests | P09 |
| 22 | partners | organizações externas, contratos e escopos de parceria | provisionar partner, consentir feed e administrar binding | `PartnerBound/Unbound`; `PARTNER_SCOPE_DENIED`, `CONSENT_EXPIRED` | partner+binding version; tenant/contract tests | P05/P08 |
| 23 | billing | planos, quotas, usage, invoices e cobrança interna | medir uso, reservar quota, faturar e exportar | `UsageRecorded`, `InvoiceIssued`; `QUOTA_EXCEEDED`, `BILLING_CONFLICT` | usage event+period; quota/reconciliation tests | P08/P09 |

## 4. Oráculos transversais

A prova de cada linha exige, conforme aplicável:

1. schema válido no boundary e erros tipados;
2. happy path e casos negativos;
3. repetição idempotente e payload conflitante;
4. concorrência com expected version, lease ou fencing;
5. isolamento tenant/ambiente/conta;
6. evento, journal/outbox e projeção verificáveis;
7. timeout e UNKNOWN sem retry cego;
8. shutdown, checkpoint, replay e reconstrução;
9. observabilidade com trace/correlation e redaction;
10. documentação do risco residual e do rollback.

Para P06, o fluxo integrado mínimo é market-data → strategy → decision → risk → capital → permit → simulation → accounting → portfolios → performance → reconciliation, com stocks, cripto e carteira combinada em SIMULATED/PAPER.

## 5. Dependências e backlog

A ordem normativa é:

- P01/P02: contracts, eventing, identity, organizations e governance;
- P03: graph e projeções reconstruíveis;
- P04: orchestration, leases e taskboard mirror;
- P05: connections, bindings e inference boundaries;
- P06: fluxo financeiro simulado;
- P07: agentes, knowledge, evaluation e consoles;
- P08: operations, recovery, billing e partners;
- P09: evolution somente após evidência de regressão, segurança e aceite.

Cada linha sem schema, owner, oráculo ou issue ativa é backlog, não readiness. Não scaffoldar os 23 módulos vazios.

## 6. Gates da matriz

- G0: linha, owner, issue, crítico, dependências e não-escopo registrados.
- G1: contrato e testes proporcionais escritos; nenhum TODO ambíguo.
- G2: revisão de ownership, boundary, concorrência, persistência e migração.
- G3: integração/E2E conforme o oráculo da linha.
- G4: Security avalia tenancy, secrets, capability e isolamento.
- G5: Red Team testa replay, bypass, confused deputy, injection e corrida em sandbox.
- G6: integração revalidada no mesmo candidato.
- G7: aceite explícito; documentação não equivale a PASS.

REAL/live, capital real, autonomia L3/L4 e autoexpansão de autoridade não são lacunas a preencher nesta matriz; permanecem proibidos.

## 7. Referências

- [Mapa de capacidades](./system-capabilities/CAPABILITY-MAP.md)
- [Checklist estrutural](./system-capabilities/MODULE-STRUCTURE-CHECKLIST.md)
- [Roadmap de execução](./execution-roadmap.md)
- [Pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md)
- [Contrato P05 Connections](./system-capabilities/p05-connections-binding-inference-contract.md)
- [Contrato P06 financeiro](./system-capabilities/p06-financial-lifecycle-contract.md)
- [Contrato P07 agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Contrato P08 operacional](./system-capabilities/p08-operations-slos-recovery-contract.md)
