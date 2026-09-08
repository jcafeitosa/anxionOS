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

Reconciliação ANX-127: a lista e os owners seguem a [estrutura aceita, seção Responsabilidades que não podem se sobrepor](../../brain/notes/anxionos-backend-structure.md) e o [ADR0002 — organização modular](../../brain/project-docs/decisions/0002-adopt-modular-backend-layout.md). Esta matriz permanece draft; alinhamento de ownership não homologa schemas nem execução.

Inferência é capacidade de connections. Evolução é um fluxo entre governance (ChangeProposal/aprovação), simulation (cenário), evaluation (avaliação/certificação) e os donos que aplicam a mudança. Não são módulos adicionais. Permits devem distinguir aprovação institucional, autorização de risco e consumo/revalidação em execution; o contrato específico deve ser reconciliado, sem mover todos os permits para governance por conveniência. O kill switch pertence a risk.

Os antigos nomes de eventos/erros desta matriz eram exemplos conceituais, não inventário de schemas publicados. Para cada capacidade, ANX-127/ANX-132 devem registrar símbolo/caminho real, versão, envelope, erro, retry e teste; item sem essa evidência fica **não verificado**, não implicitamente atendido. A tabela abaixo não elimina essa obrigação.

| # | Módulo | Dono de estado e função | Capacidades mínimas | Idempotência/oráculo a verificar | Pacote baseline | Continuação no board |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | identity | Principal e sessão | Registrar, autenticar, revogar e recuperar acesso | principal/sessão + versão; revogação, MFA e tenancy | P02 | ANX-134 |
| 2 | organizations | Agency, Owner, membership e onboarding | Convites, equipes, ownership e mercados habilitados | tenant + recurso + versão; convites concorrentes e bootstrap | P02 | ANX-135 |
| 3 | governance | Grant, mandato, delegação, approval e authority epoch | Conceder/revogar autoridade e aprovar mudanças | scope + epoch + versão; revogação entre consulta e efeito | P02 | ANX-136/ANX-137 |
| 4 | graph | Controle de projeção/rebuild e grafo derivado | Traversals governados, contexto, linhagem e reconstrução | eventId + checkpoint + ownerDomain; replay e stale denial | P03 | ANX-138 |
| 5 | agents | Agent, AgentVersion, configuração e referências a skills | Versionar agente e oferecer fachada Brain; não possuir Run | agent + versão; grants, rollback e paridade de acesso | P04 | ANX-139/ANX-143/ANX-144 |
| 6 | orchestration | Goal, Task, Run, scheduler, lease e checkpoint do produto | Agendar, delegar, pausar, retomar e WAITING_HUMAN_INPUT | task/run + versão + fencing; cancelamento e retomada | P04 | ANX-140/ANX-133 |
| 7 | connections | Provider, conta, modelo/oferta, binding, quota e uso de inferência | Catálogo, inferência governada, routing explícito e reconciliação de uso | binding/request + reserva de quota; timeout, custo e redaction | P05 | ANX-141/ANX-129 |
| 8 | knowledge | Document, Memory, Evidence e ContextManifest | Ingestão, memória, retrieval autorizado e proveniência | hash + versão + ACL; revogação, poisoning e recall | P04 | ANX-142 |
| 9 | market-data | Instrumento, feed, observação e séries temporais | Histórico/realtime, qualidade, calendários e eventos de mercado | fonte + sequência + tempo; gaps, backfill e point-in-time | P06 | ANX-145/ANX-146 |
| 10 | strategies | StrategyVersion, backtest e Deployment | Versionar, processar backtest e aplicar deployment aprovado | versão + dataset + parâmetros; replay sem lookahead | P06 | ANX-147 |
| 11 | capital | Conta de capital, alocação e reserva | Reservar, consumir, liberar e reconciliar alocações | conta + moeda + reserva; concorrência e consumo parcial | P06 | ANX-148 |
| 12 | portfolios | Posição, lote, exposição, snapshot e valuation | Aplicar fatos confirmados e valorar posições | fill/action + versão; FX, stale e comparação com ledger | P06 | ANX-153 |
| 13 | decisions | Decision e TradeIntent | Explicar, versionar, aprovar e cancelar intenção | intent + payload + versão; validade e aprovação | P06 | ANX-149 |
| 14 | risk | RiskPolicy, RiskCheck, limites, risk epoch e kill switch | Checar risco e autorizar/revogar permit de risco conforme contrato | intent + estado de risco + epoch; limite e revogação concorrentes | P06 | ANX-150 |
| 15 | execution | ExecutionSession, Order, Fill e reconciliação de venue | Dispatch, cancelamento, fills e revalidação/consumo de permit | ordem + permit + fencing; UNKNOWN sem retry cego | P06 | ANX-151/ANX-163 |
| 16 | accounting | Ledger, lançamentos, taxas e ajustes financeiros | Postar, reverter e reconciliar saldos financeiros | evento fonte + entry; balanceamento e reversão imutável | P06 | ANX-152 |
| 17 | performance | P&L, retornos, métricas e atribuição derivadas | Calcular métricas sobre ledger e valuation | snapshot + versão; oráculos de P&L/FX/fees | P06 | ANX-154 |
| 18 | evaluation | Evaluation, Certification, Reputation e critérios de promoção | Avaliar/certificar candidato e detectar regressão | candidato + dataset + versão; regressão impede promoção | P08 | ANX-160/ANX-171 |
| 19 | simulation | Snapshot, SimulationRun e cenários isolados | Digital Twin, relógio simulado e replay de cenário | run + seed + input hash; isolamento e reprodução | P08 | ANX-159 |
| 20 | audit | Flight Recorder, manifests, linhagem e replay governado | Indexar evidências e reconstruir explicação sem novos efeitos | evento + digest; integridade, ACL e replay sem ordens | P06 | ANX-155 |
| 21 | billing | Assinatura/Invoice da plataforma e ciclo comercial | Faturar, reconciliar uso comercial e reverter cobrança | evento de uso/pagamento + período; webhook idempotente | P07 | ANX-156 |
| 22 | partners | Referral, Commission e Payout comercial | Atribuir indicação, calcular/reverter comissão e aprovar payout | invoice paga/revertida + regra; duplicata e isolamento | P07 | ANX-157 |
| 23 | operations | Incident, procedimentos, retenção, exportação e recuperação | Operar, recuperar e administrar dados sob governança | operação + scope + versão; restore e ações auditadas | P07 | ANX-158/ANX-169/ANX-170 |

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

Para P06, o fluxo integrado mínimo é market-data → strategies → decisions → risk → capital (reserva) → execution (revalidação/consumo de permit e adapter simulado) → accounting → portfolios → performance, com reconciliação de venue em execution e financeira em accounting. Simulation fornece cenários/relógio isolado, não substitui o dono institucional de Order/Fill. Stocks, cripto e carteira combinada exigem evidência SIMULATED/PAPER na ANX-163.

## 5. Dependências e backlog

A sequência abaixo reproduz os pacotes da [estrutura aceita](../../brain/notes/anxionos-backend-structure.md); os prefixos de fase em documentos anteriores não redefinem ownership nem dispensam o [SDD institucional](../../brain/project-docs/specs/001-institutional-contract/spec.md):

- P01/P02: tooling/boundaries, contracts, eventing, database, secrets, observability, identity, organizations e governance;
- P03: graph e projeções reconstruíveis;
- P04: agents, orchestration e knowledge;
- P05: connections e inferência governada;
- P06: market-data, strategies, capital, portfolios, decisions, risk, execution, accounting, performance e audit;
- P07: billing, partners, operations e experiências humanas;
- P08: evaluation, simulation e workflows avançados;
- P09: recovery, benchmarks e lançamento conforme evidências e autorização.

O Dashi local gerencia o desenvolvimento; seu claim não é o estado de Task/Run do produto. As dependências executáveis são as relações do programa ANX-126. Planos de gates por slice continuam obrigatórios; revisar o programa não aprova automaticamente seus filhos.

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

REAL/live, capital real e autonomia L3/L4 não estão autorizados para ativação. O planejamento futuro permanece rastreado em ANX-172/ANX-173, condicionado a evidências e autorização separada; autoexpansão de autoridade continua proibida. Criar backlog não concede capacidade de execução.

## 6.1. Pendências de reconciliação ANX-127

A correção de owners acima é incremental. Continuam pendentes: inventário completo de cada capacidade dos R09/R10 contra símbolos/schemas/testes atuais; atualização da fila e roadmap A5; decisão de posicionamento do adapter-gateway sem criar um 24º dono por inferência; e pareceres independentes G1–G7 aplicáveis. Não declarar ANX-127 concluída apenas por corrigir esta tabela. A [auditoria ANX-118](../../brain/notes/anxionos-backend-conformance-2026-09-08.md) é fonte de achados a revalidar, não prova de ausência atual.

## 6.2. Evidência granular inicial — identity e agents

Snapshot de inspeção estática ANX-127 sobre worktree baseado em HEAD `87a891fc6e95148f5ec67daf2478225a0e1bc58c`, com source não commitado preexistente. Os caminhos/símbolos abaixo são evidência de presença ou desvio; **nenhum teste de produto foi executado nesta inspeção**. Não extrapolar para readiness dos 23 módulos.

| Requisito e fonte | Arquivo/símbolo observado | Evidência e classificação | Verificação restante / tarefa |
| --- | --- | --- | --- |
| [identity R09 P1-S1/S2](./modules/identity/R09-dev-plan.md): contratos e evento registrado | `backend/packages/contracts/src/identity/events.ts`: IDENTITY_EVENT_TYPES e identityPrincipalRegisteredV1PayloadSchema; `backend/modules/identity/src/application/commands/register-principal.ts`: registerPrincipal | Presente estaticamente: tipo identity.principal.registered.v1; payload construído sem authUserId; appendJournal/enqueueOutbox. Não prova rollback/race. | ANX-134: G3-IDN-01/02/05, payload conflitante e concorrência em PG isolado |
| [identity R09 P1-S3](./modules/identity/R09-dev-plan.md): suspensão | `backend/modules/identity/src/application/commands/suspend-principal.ts`: suspendPrincipal; `infrastructure/migrations/0001_identity_suspend_cols.sql` no mesmo módulo | Command e migration presentes; consulta prévia não prova idempotência sob corrida. Comportamento executado não verificado. | ANX-134: G3-IDN-03/04, simultaneidade e rollback |
| [identity R09 P1-S4/G3-IDN-06](./modules/identity/R09-dev-plan.md): revogar sessão via consumer | `backend/tests/identity/session-revocation-nats-e2e.test.ts`: beforeAll e teste suspend → relay → consumer | Lacuna de evidência confirmada no teste: indisponibilidade é capturada, e o teste retorna após aviso SKIP sem falhar. Não executado aqui; não se afirma falso PASS ocorrido em CI. | ANX-134: gate deve falhar se dependência obrigatória faltar; skip opcional explicitamente reportado. Exercitar revogação e indisponibilidade em sandbox dedicado |
| Regra accepted application→ports, [baseline](../../brain/notes/anxionos-backend-structure.md) | registerPrincipal, suspendPrincipal e syncPrincipalEmail, em `backend/modules/identity/src/application/commands/` | Desvio A1 confirmado: imports de Drizzle/Pool/schema/mapeador infrastructure e SQL transacional direto em application. | ANX-134/ANX-128: UoW/ports e teste arquitetural, preservando estado+journal+outbox |
| [agents R09 S1–S6](./structure-debate/agents/R09-dev-plan.md): módulo, contratos, comandos e API | `backend/modules/agents`, `backend/packages/contracts/src/agents`, `backend/tests/agents` | Diretórios ausentes nesta leitura. Ausência desses paths não é prova de inexistência de toda capacidade equivalente em outros componentes. | ANX-139: implementar slices com G3-AGT-01..05, após reconciliação das interfaces e do R10 |
| [agents R09 S4](./structure-debate/agents/R09-dev-plan.md): integração registry | `backend/modules/orchestration/src/domain/ports/agent-registry.ts`: AgentRegistryPort.isAgentActive(agentId, organizationId), reexport público | Port consumidor já existe. Busca pelos símbolos examinados não encontrou implementação equivalente; cobertura de aliases/consumidores ainda não demonstrada. | ANX-139: integrar contrato público sem duplicar estado de Run nem criar interface incompatível |

O plano identity P1 exclui ServicePrincipal e rotas públicas; esses itens de continuação não devem ser atribuídos retroativamente ao aceite ANX-78. O plano agents prevê S7 opcional e S8+; disposição deve ser explícita, sem worker vazio. ANX-143/144 e pesquisas ANX-124/125 preservam o escopo avançado/OpenBot separado do núcleo.

Os demais módulos e os R10 ainda não foram reconciliados exaustivamente neste snapshot; a seção 6.3 acrescenta evidência inicial de organizations/governance. Esta tabela inicia a evidência, não fecha o aceite integral de ANX-127.

## 6.3. Evidência inicial — organizations e governance

Inspeção ANX-127 dos planos [organizations R09 S1–S6](./modules/organizations/R09-dev-plan.md) e [governance R09 S1–S6](./modules/governance/R09-dev-plan.md), sem reabrir o aceite dos slices ANX-29/30.

| Fonte/critério | Source e evidência | Classificação / continuação |
| --- | --- | --- |
| Organizations S1–S5 | Migrations 0000/0001, ports/UoW e commands em `backend/modules/organizations/src/`; `accept-invite-by-token.ts` importa MembershipRevisionConflictError do repository infrastructure | Presença estática parcial; A2 confirmado. ANX-135 deve corrigir fronteira do erro sem perder CAS/replay ou mudar erro público silenciosamente |
| Organizations S3, commit/rollback | `backend/tests/organizations/uow-journal-outbox.test.ts` declara cenários commit/rollback, mas retorna se dbAvailable falso | Integração não executada neste incremento; gate obrigatório não pode usar retorno vazio como evidência. ANX-135 exige fixture dedicada; não executar cleanup amplo do plano em banco compartilhado |
| Governance S2/S4 | `backend/modules/governance/src/application/commands/revoke-grant.ts` usa UoW, epoch e eventos; submit-change-proposal/resolve-approval e testes correspondentes existem | Presença estática, não prova concorrência/atomicidade executada. ANX-136 revalida G3-GOV-01..04 |
| Governance S3 | `application/consumers/organizations-membership-consumer.ts` no módulo governance usa Pool/processWithInbox, além do GovernanceUnitOfWork | A2 confirmado; ANX-136 separa infra/transport do caso de uso. Atomicidade inbox/UoW e crash entre commits ainda precisam prova |
| Governance S5/G3-GOV-05 | `backend/modules/governance/src/infrastructure/adapters/graph-t01-traversal-evaluator.ts`; `backend/tests/governance/t01-traversal-evaluator.test.ts` | Executado: `cd backend && bun test tests/governance/t01-traversal-evaluator.test.ts`, Bun 1.4.0, **4 pass / 0 fail / 10 assertions**. Doubles de epoch store/grafo; cobre timeout, stale input, normalização e erro. Não homologa Neo4j real nem revogação durante chamada |

Comentários específicos de handoff registrados em ANX-135/136. Os retornos por indisponibilidade no teste membership-consumer também exigem tratamento explícito no gate, sem alegar que falso PASS ocorreu em CI. A evolução RLS (ANX-131) não deve ser confundida com o escopo original application-only tenancy v1 do plano organizations.

Esta seção não completa o inventário exaustivo dos dois módulos: R10, campos de schemas, todas as decisões D-ORG e API/G5 ainda requerem cruzamento. Somada à seção 6.2, há evidência inicial para quatro módulos; os demais 19 continuam sem reconciliação granular aqui.

## 6.4. Evidência inicial — graph e orchestration

Fontes de escopo: [graph R09 S1–S8](./structure-debate/graph/R09-dev-plan.md) e [orchestration R09 S1–S9](./structure-debate/orchestration/R09-dev-plan.md). Os planos históricos não substituem as regras de camadas do baseline.

| Requisito | Source / resultado | Limite e tarefa |
| --- | --- | --- |
| Graph S4 inbox/projeção | `backend/modules/graph/src/application/projections/inbox/process-with-inbox.ts` importa Pool, inbox/DLQ repositories e messaging infrastructure; executa project antes de ackInboxEntry/COMMIT PG e NATS ack | A2 confirmado. ANX-138 deve separar ports/infra e provar crash/replay no destino; ordem de chamadas não demonstra transação atômica entre PG e Neo4j |
| Graph S5–S7 | `application/rebuild/full-generation-swap.ts` importa Pool/PoolClient e rebuild repository; `application/http/` importa cache/repos concretos | Refatoração rastreada ANX-138, sem mover ownership para apps. Integração/rebuild não executados aqui |
| RB-D04 / grants | `application/projections/governance/governance-projector.ts` em graph já contém schemas issued/revoked, guard de revisão e chaves AGENCY | Não afirmar ausência por bloqueio histórico. ANX-138 deve revalidar wiring, revogação e escopo PLATFORM; presença não homologa o fluxo |
| Orchestration S4 HMAC | `backend/modules/orchestration/src/application/commands/ingest-taskboard-webhook.ts` importa implementação/config HMAC de infrastructure | A2 confirmado. ANX-140 deve usar port, preservar raw payload/autorização/erro e provar caminho HTTP |
| Orchestration S4 mirror | Executado `cd backend && bun test tests/orchestration/unit/taskboard-hmac.test.ts tests/orchestration/unit/validate-mirror-transition.test.ts`: Bun 1.4.0, **8 pass / 0 fail / 8 assertions** | Assinaturas e transições de mirror, incluindo G7 e versão. Doubles dos repositories; não prova PG, webhook real ou disponibilidade do board |
| Orchestration S5–S9 | Árvore prevista de workers e deferências no R09 não basta para identificar runtime atual | ANX-140/ANX-133 devem resolver símbolos/composition e verificar heartbeat/sweeper/restart. Não inferir ausência por pasta diferente; registry permissivo do plano não autoriza bypass em produção |

Graph S8, travessias completas além do smoke, PlanRevision e requisitos R10 continuam pendentes de reconciliação específica. O título histórico de teste “COMMIT atômico inbox+marker+Neo4j” deve ser confrontado com os limites reais das transações: marcador de deduplicação e mutação precisam ser consistentes no destino; PG e Neo4j não ganham atomicidade distribuída pela nomenclatura.

Este é o terceiro par com evidência inicial: seis módulos examinados parcialmente, 17 ainda sem evidência granular nesta matriz. Nenhum aceite integral de ANX-127 nem gate integrado decorre dessas verificações.

## 7. Referências

- [Mapa de capacidades](./system-capabilities/CAPABILITY-MAP.md)
- [Checklist estrutural](./system-capabilities/MODULE-STRUCTURE-CHECKLIST.md)
- [Roadmap de execução](./execution-roadmap.md)
- [Pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md)
- [Contrato P05 Connections](./system-capabilities/p05-connections-binding-inference-contract.md)
- [Contrato P06 financeiro](./system-capabilities/p06-financial-lifecycle-contract.md)
- [Contrato P07 agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Contrato P08 operacional](./system-capabilities/p08-operations-slos-recovery-contract.md)
