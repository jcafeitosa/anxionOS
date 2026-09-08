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

Saldo vigente após auditoria independente de fechamento, registrada em ANX-127 no comentário `405b8304-f8bd-430b-866d-c171fd86b735`: **CHANGES_REQUIRED** para o conjunto documental. A correção de owners é incremental, não aceite integral.

| Entrega de planejamento | Estado e evidência | Condição para encerramento |
| --- | --- | --- |
| Lista dos 23 módulos e owners | Reconciliada na §3 com baseline/ADR0002; não homologa implementação | Preservar exatamente os owners aceitos e revalidar mudanças posteriores |
| A5 — fila e roadmap | Atualização documental realizada em [module-queue](./module-queue.md), seção Continuação vigente, e [execution-roadmap](./execution-roadmap.md), Mapeamento da continuação; checkpoints anteriores abaixo são históricos | Incluir estes arquivos no candidato final e nos pareceres; não repetir A5 como alteração ainda não realizada |
| Cobertura de cada capacidade R09/R10 | Parcial nas §§6.2–6.11 | Cada requisito deve ter fonte/seção, classificação, evidência/limite e issue ou disposição; uma linha por módulo não substitui este rastreio |
| Conflitos de contrato e migração | Identificados nas tabelas e comentários dos filhos | Consolidar decisão aplicável, impacto e migração dos conflitos conhecidos; encaminhamento genérico ao executor não encerra a reconciliação |
| Placement do adapter-gateway | Decisão humana pendente; diretório observado não aprova 24º owner | Decisão explícita entre distribuição no baseline e novo owner com ADR/árvore/migração; opções podem ser preparadas sem executar migração |
| Pacote final documental | Pareceres incrementais não equivalem a aprovação do conjunto | Agregar critérios, digests e pareceres independentes aplicáveis ao mesmo candidato; não simular gates ou herdar PASS antigo |
| Implementação futura | Delegada às tarefas do programa ANX-126 | Não precisa ser executada para concluir este planejamento; gaps devem estar cobertos e dependências claras. Gates de produto permanecem futuros |

As contagens progressivas e pendências nas §§6.2–6.9 descrevem o checkpoint em que cada inspeção foi feita; o saldo acima e a §6.10 prevalecem para o alcance da revisão documental atual. Todos os 23 módulos possuem evidência inicial parcial e todos os R10 foram consultados, mas o inventário exaustivo de capacidades ainda não está concluído.

Não declarar ANX-127 concluída apenas por corrigir esta tabela ou criar 60 tarefas. A [auditoria ANX-118](../../brain/notes/anxionos-backend-conformance-2026-09-08.md) é fonte de achados a revalidar, não prova de ausência atual.

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

## 6.5. Evidência inicial — connections e knowledge

Fontes: [connections R09 S1–S5](./modules/connections/R09-dev-plan.md) e [knowledge R09 S1–S5](./structure-debate/knowledge/R09-dev-plan.md). Handoffs complementados nas ANX-141/142, sem repetir os slices iniciais aceitos.

| Requisito | Source / evidência | Lacuna / aceitação |
| --- | --- | --- |
| Connections S2 inferência | `backend/modules/connections/src/application/commands/invoke-inference.ts` usa ports/UoW, restringe adapterId a simulated e chama adapter dentro da TX; registra completed e usage OWNER | Não homologado para provider externo. ANX-141 exige estado durável de dispatch/UNKNOWN/reconcile, contexto consumidor confiável e replay com payload/binding |
| Connections S2 streaming / S3–S5 | `domain/ports/inference-adapter.ts` em connections é terminal Promise, sem chunks; migrations inventariadas 0000/0001 | UNKNOWN/stream/fairness/catalog/ops não demonstrados no slice observado. ANX-141 deve confrontar todos os aceites R09 e equivalências antes de implementar |
| Knowledge S2 ingest/publicação | `backend/modules/knowledge/src/application/commands/ingest-document.ts`, `publish-index.ts`; worker é fachada run→ingest; simulated embedding usa hash pseudoVector | Presença não prova scheduler, retrieval nem embedding semântico. Publicação verifica contagem persistida, mas provider real exige cardinalidade/IDs/dimensões/modelVersion e falha parcial verificados |
| Knowledge compilação | `bun run typecheck` em `backend/modules/knowledge` retornou **exit 2**, TS2304 em ingest-document.ts:37, publish-index.ts:32, register-knowledge-source.ts:32 | assertCommandJournalOrganization existe exportado em command-support, porém não está resolvido nos comandos. ANX-142 deve corrigir import/integração e testar ramo raced/cross-tenant. Não corrigido aqui |
| Knowledge S3–S5 | Inventário atual de commands/ports concentra registro/ingest/publicação/embedding | Memórias/evidências/revogação, retrieval/context e HTTP/expiry ainda não demonstrados; ANX-142 exige G3/G4/G5 do R09, busca de equivalentes e schemas explícitos |

A compilação falha é evidência executada, não inferência de prontidão. Nenhuma chamada a provider externo ou teste PG/pgvector foi executado nesta inspeção. A lacuna de imports não autoriza atribuir falha a entregas antigas sem identificar a revisão correspondente.

Oito módulos agora possuem evidência inicial, ainda parcial. Os demais 15, R10 e inventário completo de cada capability permanecem pendentes.

## 6.6. Evidência inicial — market-data, strategies e capital

Fontes: [market-data R09](./structure-debate/market-data/R09-dev-plan.md), [strategies R09](./structure-debate/strategies/R09-dev-plan.md) e [capital R09](./structure-debate/capital/R09-dev-plan.md). Inspeção estática; nenhum teste financeiro/PG ou efeito de mercado executado.

| Requisito | Source observado | Delta / tarefa |
| --- | --- | --- |
| Market-data S2 observed→recorded | `backend/modules/market-data/src/application/consumers/observed-consumer.ts` chama recordObservation com commandId novo e qualityFlag OK; retorna null quando mapeamento falha | ANX-145: comprovar dedupe sourceEventId e preservar/avaliar qualidade de feed real. Retorno null é previsto no R09, não automaticamente erro engolido |
| Market-data S3–S5 | Registry/record e migrations 0000/0001 presentes; getPriceAsOf não encontrado na busca de símbolos nesses módulos | ANX-146: freshness/as-of, histórico/replay, calendários/FX, stale FAIL_CLOSED e eventos sem escrita lateral de ledger; busca limitada não prova ausência global |
| Strategies S2 publicação | `backend/modules/strategies/src/application/commands/publish-strategy-version.ts` define lifecycle BACKTESTED sem consultar resultado de backtest no comando observado | ANX-147: reconciliar semântica antes de deployment; publicar não prova execução de backtest. Verificar também replay commandId/payload/tenant antes de promover |
| Strategies S3–S5 | Commands inventariados: register/createVersion/publish; runner/deployment/signal não demonstrados | ANX-147: implementar delta com binding validation e stale signal; stub do plano não autoriza mock de produção |
| Capital S2 reservas | `backend/modules/capital/src/application/commands/reserve-for-intent.ts` valida grant antes da TX, persiste HELD/intentHash/expiresAt e publica evento | ANX-148: FI02 e revogação entre validação/commit. Timestamp não prova expiração operacional |
| Capital release/consume e S3–S5 | Inventário commands register/proposeAllocation/reserve; busca releaseReservation/consumeReservation não retornou implementação em capital | ANX-148: rastrear equivalências e comprovar release idempotente, consume após release negado, revogação auto-release, settled lag/FX/projector. Não inferir completude de S2 por status histórico |

Critérios detalhados registrados em ANX-145/146/147/148. Onze módulos possuem evidência inicial parcial; os demais 12 e a cobertura exaustiva R09/R10 ainda estão pendentes.

## 6.7. Evidência inicial — decisions, risk e execution

Fontes: [decisions R09](./structure-debate/decisions/R09-dev-plan.md), [risk R09](./structure-debate/risk/R09-dev-plan.md), [execution R09](./structure-debate/execution/R09-dev-plan.md). Handoffs ANX-149/150/151 refinados; somente inspeção estática, sem ordem, reserva ou chamada externa.

| Requisito | Source observado | Disposição de planejamento |
| --- | --- | --- |
| Decisions S2 submit e S4 reserva | `backend/modules/decisions/src/application/commands/submit-intent.ts` exige AUTHORITY_CHECKED/imutabilidade, sem consulta risco/reserva no comando | R09 exige precondição risco/reserva. ANX-149 deve resolver ordem/semântica candidato→liberação sem ciclo e verificar spec antes de implementar. SUBMITTED isolado não autoriza execução |
| Decisions S3/S5 | Inventário commands propose/checkAuthority/submit | Approval independente, WAITING_HUMAN e EvidenceManifest não demonstrados; ANX-149 exige oráculos de hash/campos aprovados, validade e replay concorrente |
| Risk S2 | `backend/modules/risk/src/application/commands/run-pre-trade-check.ts` valida epochs no caminho novo, verifica maxNotional e emite permit só PASS | Presente estaticamente; não prova exposição/freshness/liquidez ou kill switch. ANX-150 completa limites e S3 wiring |
| Risk replay | Retorno idempotente por commandId/intentHash precede validações atuais | ANX-150 deve distinguir resultado histórico de autorização vigente; testar policy/epoch alterado sem reutilização indevida de permit |
| Execution S2 | `backend/modules/execution/src/application/commands/submit-order.ts` revalida permit da sessão e cria fill síncrono via VenueFillPort dentro da TX | Slice simulated não prova dispatch remoto. ANX-151 exige estado durável, fencing, UNKNOWN/reconcile e rastreabilidade de single-use |
| Execution S3/S4 | Commands inventariados openSession/submit; cancel/parciais/reconciliation não demonstrados | ANX-151 deve rastrear equivalências e validar vinculação de instrumento/side/quantidade/preço/contas ao intentHash e reserva; inspeção isolada não prova bypass nem enforcement completo |

Não atribuir automaticamente estes gaps a falha dos aceites históricos: comparar revisão e escopo dos slices. Quatorze módulos possuem evidência inicial parcial; nove restantes e R10/exaustividade/gates continuam pendentes.

## 6.8. Evidência inicial — accounting, portfolios e performance

Fontes: [accounting R09](./structure-debate/accounting/R09-dev-plan.md), [portfolios R09](./structure-debate/portfolios/R09-dev-plan.md), [performance R09](./structure-debate/performance/R09-dev-plan.md). Inspeção estática; handoffs ANX-152/153/154 complementados, sem alteração de código nem testes financeiros.

| Requisito | Source observado | Delta / tarefa |
| --- | --- | --- |
| Accounting S2 fill→ledger | `backend/modules/accounting/src/application/commands/post-trade-fill.ts` gera duas linhas cash/clearing e delega postLedgerEntry; sourceRef.eventId recebe commandId | ANX-152: confrontar natureza e sinais com chart canônico, rastrear evento original no consumer e provar dedupe por fill. Balanceamento isolado não demonstra interpretação econômica correta |
| Accounting S3/S4/S6 | Commands inventariados postTradeFill/postLedgerEntry | Fees, balance snapshot, reconciliation OPEN/RESOLVE e billing consumer exigem busca de equivalentes e prova; não declarar ausência global nem reutilizar aceite antigo |
| Portfolios S2 | `backend/modules/portfolios/src/application/commands/apply-fill-to-position.ts` deduplica holding por tenant/fill e aplica signedDelta com LONG/TRADING | ANX-153: validar escopo dos defaults, chave/revisão e concorrência. Guard tenant anterior não é repetido no replay raced; requer teste, não exploit declarado |
| Portfolios concorrência / S3–S5 | Mesmo command captura genericamente erro de save e consulta posição novamente; inventário create/apply | ANX-153: distinguir conflito único de outros erros e provar transação/savepoint PG; valuation, cash reconciliation e rebalance ainda não demonstrados no slice observado |
| Performance S2/S3 | `backend/modules/performance/src/application/commands/record-outcome-snapshot.ts` deduplica commandId/journalEntryId com guards tenant também dentro da TX; persiste linesSummary/valueDate | ANX-154: UUID novo do consumer não significa ausência de dedupe. Snapshot de lançamento não demonstra cálculo de P&L |
| Performance S2/S4 | Consumer observado ledger-posted; R09 requer ledger+position e séries/rebuild | ANX-154: mapear equivalentes, metric definitions, convergência fora de ordem, stale/divergência, fees/FX/fluxos e rebuild com oráculos reproduzíveis |

Dezessete módulos possuem evidência inicial parcial. Audit, billing, partners, operations, evaluation e simulation ainda não receberam inspeção granular nesta matriz; as respectivas tarefas já existem. Exaustividade R09/R10, schemas/testes e gates continuam pendentes. Estes handoffs orientam os próximos agentes e não homologam o ciclo financeiro.

## 6.9. Evidência inicial — seis módulos restantes

Fontes R09 e respectivos R10: [audit](./structure-debate/audit/R09-dev-plan.md), [billing](./structure-debate/billing/R09-dev-plan.md), [partners](./structure-debate/partners/R09-dev-plan.md), [operations](./structure-debate/operations/R09-dev-plan.md), [evaluation](./structure-debate/evaluation/R09-dev-plan.md), [simulation](./structure-debate/simulation/R09-dev-plan.md). Inspeção estática sem testes de produto, alterações de código ou efeitos externos. Paths abaixo relativos a `backend/modules/<módulo>/src/application/`.

| Módulo / tarefa | Source observado | Requisito restante / oráculo |
| --- | --- | --- |
| audit / ANX-155 | commands/ingest-domain-event-tap.ts deduplica sourceEventId e guarda payloadHash fornecido, com guards tenant também no replay raced | Rastrear origem/verificação hash; replay read-only com grant, export cross-tenant negado e chunk alterado rejeitado. Persistência de hash não prova integridade |
| billing / ANX-156 | consumers/usage-recorded-consumer.ts deduplica usageRecordId e faz read/add/write de total DRAFT | Provar locks/CAS em dois usos simultâneos e corrida emissão/agregação. Não declarar lost update sem inspecionar infra. Ciclo payment/refund e preço versionado permanecem a verificar |
| partners / ANX-157 | commands/accrue-commission.ts usa BillingInvoiceIssuedBridge e totalAmount*commissionRate | R09 S2 exige invoice.paid. Resolver accrual provisório versus elegibilidade, sem considerar emissão como pagamento; reversal e payout retry/approval ainda não demonstrados |
| operations / ANX-158 | commands/register-health-check.ts atualiza registro e retorna idempotentReplay=true para novo command sobre serviço existente | Reconciliar semântica, ordenação checkedAt e CAS. Registro informado não prova probe executado; S2 manifest consumer e S3 export/retention exigem equivalências e testes |
| evaluation / ANX-160 | commands/record-evaluation-score.ts calcula outcome_notional e deduplica outcomeSnapshotId com guards tenant | R09 S2 exige simulation/agents; S3 certificação e recomendação para governance. Notional não prova qualidade ou promoção; exigir regressão, expiração e revogação |
| simulation / ANX-159 | commands/create-simulation-run.ts deduplica backtestRequestId e persiste STARTED, manifest/isolationFlags | R09 exige conclusão/checkpoint. Provar runner, hash tamper→FAILED, isolamento e determinismo seed/dataset/clock; flags declaradas não demonstram sandbox |

Os seis R10 lidos são draft e apresentam PC-G0 10/10 e PASS genérico G2–G6 com referência R04–R09. Isso não constitui evidência executada sobre o candidato atual: parecer, revisão, escopo e resultados precisam ser recuperados antes de herdar qualquer aprovação. Preservar histórico e consultar board para status, sem reabrir aceites por inferência.

Agora os 23 módulos possuem **evidência inicial parcial** e tarefas de continuação. Isso não fecha a reconciliação exaustiva por capability/schema/teste, R10 dos demais módulos, roadmap A5, posicionamento do adapter-gateway ou gates independentes. ANX-127 continua em andamento.

## 6.10. Reconciliação dos handoffs R10

Leitura documental ANX-127 em 2026-09-08, complementando os seis R10 da §6.9. R10 é fonte de escopo e condições históricas; não transfere aprovação para um novo candidato.

| Fonte R10 | Constatação | Continuação |
| --- | --- | --- |
| [identity](./modules/identity/R10-g0-handoff.md) e [organizations](./modules/organizations/R10-g0-handoff.md) | Distinguem slices aceitos de itens deferidos (RLS, reativação, blueprint, quotas). Equipes são nomes nominais de papéis | ANX-134/135/131 e ANX-181 devem vincular cada delta a requisitos e responsáveis/run identificáveis; não reabrir P0 por inferência |
| [governance](./modules/governance/R10-g0-handoff.md) | PC-G0-06 T01 real aparece pendente, embora resumo diga 10/10 debate; emission de ExecutionPermit aponta para decisions | ANX-136/138/149/150: distinguir G0 documental de prova T01 e reconciliar permit institucional/risco/execução por contrato aceito, sem mover owner silenciosamente |
| [graph](./structure-debate/graph/R10-g0-handoff.md) e [orchestration](./structure-debate/orchestration/R10-g0-handoff.md) | Registram 9/10 e bloqueios upstream históricos, além de mocks limitados a slices | ANX-138/140: comprovar integração atual, não inferir ausência de grant events nem liberar produção por fixture. Workers de domínio permanecem nos módulos; apps compõem |
| [agents](./structure-debate/agents/R10-g0-handoff.md) | Documento registra módulo ausente e cita suite 387/387 como G3 | ANX-139/181: suite global não demonstra os G3-AGT; exigir testes específicos e crítico independente identificado |
| [connections](./modules/connections/R10-g0-handoff.md) | PASS G5 aponta execução sandbox futura em G1 | ANX-141/181: separar qualidade do plano de teste adversarial executado; recuperar relatório/candidato antes de herdar aprovação |
| [knowledge](./structure-debate/knowledge/R10-g0-handoff.md) | Tabela contém G4 CHANGES_REQUIRED parcial e G5 S1–S2 parcial, mas veredito declara G2–G6 doc PASS | ANX-142: conservar pendências G4-KN-03/04 e KN-02/04/05 até prova/disposição autorizada; resumo não encerra achados |
| market-data, strategies, capital, decisions, risk, execution, accounting, portfolios e performance (R10 nos mesmos diretórios de seus R09 acima) | Referenciam matrizes/rodadas ou execução futura; vários diferem RLS/projeção | Respectivas ANX-145–154, ANX-131 e ANX-181: recuperar evidência exata, rastrear deferências por capability e validar integração; checkmark não demonstra engine real |

Todos os 23 R10 foram consultados nesta sequência, mas isso **não** conclui rastreio de todos os requisitos nos documentos referenciados R04–R09, ADRs, símbolos, testes e resultados. A decisão accepted aplicável continua prevalecendo sobre handoffs draft. Nomes como code-architect/critic-reviewer indicam papéis planejados; isoladamente não demonstram agentes distintos com contexto próprio. Os próximos gates exigem responsável/run, candidato/digest, escopo, evidências, achados, disposição e riscos residuais.

## 6.11. Fundação transversal — catálogo e envelopes

Fonte: [P01/P02, CapabilityManifest e envelope](./system-capabilities/p01-p02-contracts-and-gates.md). Continuação ANX-132, com ANX-130 para evolução de eventos.

- Busca literal `CapabilityManifest|capabilityManifest|capability_manifest` em backend/packages, backend/modules, backend/apps e frontend/src: sem matches. Buscar equivalentes antes de afirmar ausência universal ou criar duplicatas.
- `backend/packages/contracts/src/execution/effect-gate.ts` contém effectClassSchema com as quatro classes documentadas. Isso não implementa catálogo de capabilities nem prova uso do gate por todos os handlers.
- `envelope-v02.ts` publica envelope 0.2.0; `index.ts` mantém schemaVersion 0.1.0 para health/legado. Coexistência não é defeito automaticamente: mapear produtores/consumidores e migração.
- Envelope genérico aceita payload unknown e escopos opcionais; ANX-132 deve comprovar schema de messageType e escopo obrigatório onde aplicável. Parse genérico não é autorização.
- Idempotency key do envelope v02 exige UUID, enquanto AdapterCommand aceita string 1..128. ANX-132/161 devem fechar interoperabilidade explícita, sem transformação silenciosa.

**Evidência executada:** em backend, `bun test tests/contracts/events-envelope.test.ts tests/contracts/effect-gate.test.ts` — Bun 1.4.0, exit 0, **11 pass / 0 fail / 14 assertions**. Os testes inspecionados cobrem shape/upgrade, gate puro e transições UNKNOWN; não comprovam paridade UI/API/tools, registry, single-use concorrente ou integração externa. Nenhuma ordem ou provider foi acionado.

A matriz por capability ainda deve ligar catálogo, schemas, handler, superfícies, grant/epoch, budget/approval, erros e oráculos reais. ANX-132 contém handoff detalhado; o resultado estreito acima não fecha ANX-127.

## 6.12. Rastreio por capacidade — identity R09/R10

Fontes: [R09 completo](./modules/identity/R09-dev-plan.md) e [R10 completo](./modules/identity/R10-g0-handoff.md), relidos em 2026-09-08. Esta seção desdobra os requisitos explícitos desses dois artefatos; não atesta o conteúdo transitivo de todas as decisões D-IDN-001..024 ou rodadas R01–R08. ANX-134 continua responsável pelo delta de identity; ANX-127 pela completude documental.

| Requisito / fonte | Classificação e evidência | Disposição / verificação |
| --- | --- | --- |
| R09 P0: Principal, migration, register, queries, bootstrap e adapter organizations | Baseline histórico aceito; não revalidado integralmente neste incremento. Arquivos identity inventariados na §6.2 | ANX-134: preservar P0, testar regressões afetadas; não repetir implantação por checkmark histórico |
| R09 P1-S1: types/commands/queries/events/index e round-trip | Parcial, schemas presentes. Teste real localizado em `backend/tests/contracts/identity-events.test.ts`, não no subdiretório sugerido pelo Top 5 | ANX-134/132: completar matriz de campos, erros e casos inválidos. Resultado estreito abaixo |
| R09 P1-S2 / G3-IDN-01 / G4-IDN-01 / G5 payload: evento registrado sem authUserId | Parcial: símbolo/command na §6.2; teste de envelope construído sem authUserId passou | ANX-134: inspecionar evento realmente persistido no journal/outbox. Fixture sem campo não prova rejeição/remoção de campo injetado |
| R09 G3-IDN-02 / G5 duplo register | Não verificado em execução neste incremento; teste register-principal existe | ANX-134: replay e race com mesmo authUserId, um Principal e um evento; payload conflitante explicitamente tratado |
| R09 P1-S3 / G3-IDN-03 | Parcial: migration 0001 e suspendPrincipal presentes | ANX-134: active→suspended, evento e queries fail-closed em PG isolado |
| R09 G3-IDN-04 | Não verificado em execução; teste suspend-principal existe | ANX-134: re-suspend sem evento duplicado, inclusive corrida |
| R09 G3-IDN-05 / R10 R-IDN-03 | Não verificado em execução | ANX-134: falha de outbox não deixa estado/journal parcial; separar infra/UoW preservando transação |
| R09 P1-S4 / G3-IDN-06 / G5 sessão / R10 R-IDN-06 | Parcial: `apps/api/src/identity/session-revocation-consumer.ts` valida payload, resolve authUserId e chama DELETE em session. Teste NATS existe, com limitação de skip registrada na §6.2 | ANX-134/130: sessões inválidas após evento, indisponibilidade, replay e crash entre efeito/inbox; não executar contra sessões reais |
| R09 P1-S4 syncPrincipalEmail | Parcial: command implementa atualização e evento; comentário “P1 sketch” não prova hook conectado nem comportamento completo | ANX-134: origem autenticada da alteração, concorrência email único, replay, hook Better Auth e regressão. Não entregar esboço como funcionalidade homologada |
| R09 G4-IDN-02 logs sem email em clear | Não verificado; teste de contrato não inspeciona logs | ANX-134/129: amostragem de logs/caminhos de erro com fixtures; distinguir payload autorizado de log redigido |
| R10 R-IDN-05 PG indisponível / R-IDN-02 tipo legado | Não verificado no candidato integrado | ANX-134/130: consultas/adapters negam acesso quando indisponíveis; migração de consumidores não perde nem duplica eventos |
| R09/R10 ServicePrincipal deferido D-IDN-017 | Planejado fora do P1 histórico, explicitamente incluído na continuação ANX-134 | ANX-134: contratos institucionais e ciclo de revogação próprios; não criar identidade implícita de execução |
| R09/R10 rotas D-IDN-019 | Planejado fora do P1; destino histórico operations não transfere ownership identity | ANX-134 define handlers; ANX-164–167 compõem superfícies por papel. ANX-128 verifica apps como composition roots |
| R10 RLS D-IDN-018 | Planejado, não provado por tenancy em application | ANX-131: implementação/roles/contexto/testes PG; fase histórica P09 não substitui sequência aceita atual |
| R09/R10 projector D-IDN-020 | Planejado fora de identity, dono graph | ANX-138: eventos identity, idempotência, rebuild e revogação; sem duplicar grafo em identity |
| R10 reactivatePrincipal DEF-06 | Planejado pós-suspend; recovery da ANX-134 deve desdobrar reativação explicitamente | ANX-134: autoridade, auditoria e estado restaurado; reativação não restaura grants ou sessões revogados por inferência |
| R09 pré-requisitos / R10 DEP-01..06, AC-G0-01..08, PC-G0-01..10, H-01..04 | Evidência histórica documental, não revalidada para novo candidato. ANX-78 citado no R10 não é claim deste programa | ANX-134/181: novo G0 com issue, dependências atuais, fonte decisória, executor/crítico distintos e evidências. R06–R08 e decisões referenciadas ainda exigem rastreio transitivo na ANX-127 |

**Verificação executada:** `bun test tests/contracts/identity-events.test.ts` em backend, Bun 1.4.0, exit 0: **4 pass / 0 fail / 11 assertions**. Inspeção prévia confirmou testes puros de códigos de erro, normalização de comando, envelope registered e payload suspended. Não houve PG, NATS, Better Auth, operações de sessão nem teste de segurança integrado.

O inventário de paths inicialmente retornou exit 2 porque `backend/tests/contracts/identity/` não existe; a busca posterior encontrou o arquivo `identity-events.test.ts`. O erro não foi interpretado como ausência de testes. Este incremento não fecha os demais módulos nem o aceite integral ANX-127.

## 6.13. Rastreio por capacidade — organizations R09/R10

Fontes: [R09](./modules/organizations/R09-dev-plan.md) e [R10](./modules/organizations/R10-g0-handoff.md), relidos integralmente em 2026-09-08. O aceite histórico ANX-29 não é reaberto; ANX-135 executa o delta. Rodadas e decisões referenciadas transitivamente ainda precisam de rastreio na ANX-127.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 / R10 domínio e contratos | Parcial: migrations 0000/0001 e ports identificados na §6.3; contrato testado abaixo | ANX-135/132: enums, campos, erros, índices únicos e bootstrap idempotente; não criar entidade Organization por inferência |
| R09 S2 / AR01 | Parcial: application/services e commands presentes; desvio de import concreto registrado na §6.3 | ANX-135/128: ports sem framework, eventos ownerDomain organizations, nenhuma dependência privada identity/governance/Neo4j/Better Auth |
| R09 S3 / P-R5-06 | Parcial: UoW e teste existem; integração não executada | ANX-135: estado + command_journal + domain_journal + outbox na mesma TX, rollback e corrida; dependência indisponível não conta como PASS |
| R09 S4 CreateAgency / G3-01 | Parcial: create-agency.ts e teste presentes | ANX-135: duas chamadas com mesma chave criam uma Agency, replay definido e conflito de payload tratado |
| R09 S4 UpdateAgencyMarkets / R10 comandos | Parcial: update-agency-markets.ts presente | ANX-135: autorização owner/admin, versão concorrente, mercados stocks/crypto/both e evento; sem habilitar execução financeira implicitamente |
| R09 G3-03 / R10 quatro queries | Não verificado neste incremento; inventário application sem pasta queries não prova ausência de equivalentes | ANX-135: localizar exports/handlers de GetAgencyById, ListAgenciesForPrincipal, ListMembershipsByAgency e GetMembership; listar somente escopo/memberships ativos |
| R09 InviteMember / G3-04 | Parcial: invite-member.ts e teste presentes | ANX-135: convite sem depender de lookup identity; identidade indisponível não impede este caso específico |
| R09 CreateAgency / G3-05 / R10 R-ORG-03 | Não verificado em execução | ANX-135: identity indisponível retorna 503 e zero escrita. Não generalizar esta regra para InviteMember |
| R09 S5 ActivateMembership / G3-09 | Parcial: activate-membership.ts e membership-commands.test.ts presentes | ANX-135: caminho administrativo autorizado, sem bypass genérico; testar role/agency e concorrência |
| R09 S5 RevokeMembership / G3-06 | Parcial: revoke-membership.ts presente | ANX-135: não remover último owner; 409 ORG_OWNER_REQUIRED, incluindo duas revogações concorrentes |
| R09 S5 AcceptInvite / G3-07/08 / G5-04 | Parcial: accept-invite-by-token.ts e accept-invite.test.ts presentes | ANX-135: TTL 7d segundo contrato, expirado 410, email divergente 403, single-use e token após revoke. Valores históricos precisam configuração tipada/documentada |
| R09 HMAC/pepper/startup / R10 DEP-04 | Não verificado em execução; teste de hasher e bootstrap.ts inventariados | ANX-135/129: HMAC-SHA256, pepper ausente/vazio aborta startup; nenhum token/pepper em logs/eventos; ordem eventing→identity→organizations antes das rotas |
| R09 S6 / wiring / OpenAPI | Parcial: plugin.ts, middleware, scoped-access.ts, dto.ts e accept-rate-limit.ts presentes | ANX-135: prefixo e rotas contratuais, sessão, Idempotency-Key, tags, ordem e rate limit accept 10/min/IP conforme contrato. Arquivo presente não prova aplicação do limite |
| R09 G3-02 / G5-01 / R10 R-ORG-01 | Não verificado em execução | ANX-135: principal A não lê/muta agency B; middleware, application e repositório mantêm scope, erro 403 |
| R09 G5-02 | Não verificado em execução | ANX-135: 20 convites paralelos, índice email respeitado e sem corrupção, em fixture isolada |
| R09 G5-03 / R10 R-ORG-10 | Não verificado em execução | ANX-135: principalId adulterado no body não eleva privilégio; origem confiável e schema, 403 ou campo ignorado conforme contrato |
| R09 G3-10 / R10 R-ORG-06 | Residual v1 documentado: chaves distintas podem criar duas Agencies; não é dedupe global prometida | ANX-135/156: preservar semântica e aplicar quota comercial por contrato, sem deduplicação silenciosa |
| R10 D-ORG-039 AdvanceOnboarding | Parcial: `application/commands/advance-onboarding.ts` valida transição simples, owner/admin e publica evento via UoW | ANX-135/140/156: saga billing com compensação, retomada e idempotência ainda não demonstrada. Método existente não prova saga completa |
| R10 D-ORG-042 blueprint | Planejado fora do v1; capacidade não cria owner novo | ANX-135/139/140: organizations possui onboarding/configuração; agents fornece versões/configuração e orchestration executa fluxo conforme contrato |
| R10 D-ORG-043 Organization/CONTAINS_AGENCY e DEF-10 Department/Team | Planejado pós-v1, não homologado por escopo genérico “hierarquia” | ANX-135: desenho e decisão explícita antes de novas entidades, migração de memberships/ownership e isolamento; sem redefinir baseline silenciosamente |
| R10 D-ORG-038 realtime e D-ORG-021 graph | Planejado fora do slice inicial | ANX-168/138: eventos organizations, autorização de assinatura, revogação, projeção/rebuild; nenhum estado autoritativo transferido ao transporte/grafo |
| R10 D-ORG-040 RLS | Planejado, não provado por guards v1 | ANX-131: roles/contexto/policies e testes PG; fase histórica não substitui sequência vigente |
| R10 D-ORG-035 maxCompanies | Planejado comercial | ANX-156/135: billing fornece quota por contrato, organizations aplica criação/alteração sem escrita privada cross-module; teste concorrente |
| R10 D-ORG-044 export/listagem global | Não verificado | ANX-135/158: escopo PLATFORM/AGENCY, dados mínimos, audit e autorização; “global” não libera consulta cross-tenant a qualquer usuário |
| R09 fixtures/cleanup / R10 checklist e ambiente | Testes API, fixture-isolation e UoW inventariados; não executados neste incremento | ANX-135/181: fixture dedicada equivalente ao registry, PG/NATS isolados e cleanup limitado; não copiar TRUNCATE CASCADE do plano para banco compartilhado |
| R09 pré-requisitos / R10 AC-G0-01..08, PC-G0-01..10, DEP-01..07, H-01..05 e B-01..03 | Histórico documental; G6 integrado aparece pendente no R10, não prova situação atual | ANX-135/181: recuperar/revalidar pareceres por candidato, ambiente, claims e responsáveis independentes; checklist marcado não equivale a execução |

**Teste executado:** `bun test tests/contracts/organizations.test.ts` em backend, Bun 1.4.0, exit 0, **6 pass / 0 fail / 21 assertions**. Inspeção prévia: códigos/status de erro, detalhes, enum de Agency, comando create e envelope agency.created. Não cobre todos os comandos/eventos/queries, G3-01..10, G5-01..04, PG, HTTP ou bootstrap. O arquivo é equivalente ao diretório de contratos sugerido pelo plano; não confundir mudança de path com ausência.

A lista de queries e a saga completa continuam não verificadas; rastreio transitivo de D-ORG-001..044 e referências R01–R08 permanece pendente. Nenhum código foi alterado, nenhum convite real enviado e nenhum gate integrado aprovado.

## 6.14. Rastreio por capacidade — governance R09/R10

Fontes: [R09](./modules/governance/R09-dev-plan.md) e [R10](./modules/governance/R10-g0-handoff.md), relidos em 2026-09-08. ANX-136 executa o delta; ANX-137 trata matriz de autonomia. Evidência histórica de ANX-30 não é aprovação deste candidato.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 / R10 persistência | Parcial: migrations 0000/0001, governance-unit-of-work, command-journal e authority-epoch-store presentes | ANX-136: schema idempotente, estado+journal+outbox e rollback; testes schema/epoch existentes não executados aqui |
| R09 S2 IssueGrant / G3-GOV-01 | Parcial: issue-grant.ts e grant-commands.test.ts presentes | ANX-136: mesmo comando não duplica grant/evento; payload conflitante, scope e concorrência explicitamente testados |
| R09 S2 RevokeGrant / GK03 / G3-GOV-02 | Parcial: revoke-grant.ts e epoch store presentes; observação anterior na §6.3 | ANX-136: revoke+epoch+evento atômicos; revogação entre leitura e efeito bloqueia em todos os consumidores afetados |
| R09 S3 / G3-GOV-03 | Parcial: organizations-membership-consumer.ts presente, com desvio de camada já identificado | ANX-136/130: activated cria apenas grants derivados previstos; revoked os fecha; inbox/estado atômicos, replay e eventos fora de ordem sem restaurar grant revogado |
| R10 CreateDelegation / R09 G3-GOV-04 | Parcial contratual: commands.ts contém parentGrantId/delegatePrincipalId; não há command CreateDelegation no inventário application observado | ANX-136: procurar equivalentes, implementar delta; delegação não excede parent, erro 409, expiração/revogação em cadeia e scope |
| R10 Mandate | Parcial contratual: mandateKindSchema e mandateIssuedPayloadSchema publicados; entidade/command não demonstrados no inventário | ANX-136: especificar criação, validade, revogação e autoridade; payload de evento não demonstra mandato operante |
| R09 S4 / R10 SubmitChangeProposal e ResolveApproval | Parcial: commands e entities presentes, change-proposal-commands.test.ts existe | ANX-136: aprovação vinculada à versão/hash, actor autorizado, expiração, replay e concorrência; aprovação não executa mudança automaticamente |
| R10 ListEffectiveGrants, GetGrantById, GetAuthorityEpoch | Não verificado por símbolo neste incremento; ausência de arquivo com nome esperado não prova ausência global | ANX-136: mapear query pública/handler equivalente, scope, status/expiração e estado atual; erro/indisponibilidade fail-closed |
| R09 S5 / G3-GOV-05 / R10 TraversalEvaluator | Parcial: adapter graph-t01 e port presentes; teste com doubles na §6.3 passou | ANX-136/138: T01 real, epoch stale, timeout→DENY e revogação durante chamada; sem Cypher ou credencial Neo4j para agente |
| R09 S6 / R10 API e AR01 | Não verificado integralmente | ANX-136/128: rotas grants e change-proposals, autorização de escopo, contratos e imports resolvidos; suites HTTP/G5 independentes sobre sandbox |
| R10 PolicyVersion RISK body | Planejado fora de governance, owner risk | ANX-150: policy/kill switch de risco; approval institucional não substitui check de risco |
| R10 projector Neo4j | Planejado no owner graph | ANX-138: projeção derived/eventId/checkpoint/rebuild; nenhuma transferência de autoridade PG |
| R10 ExecutionPermit emission→decisions | Conflito contratual conhecido, não encerrado pelo encaminhamento | ANX-127/149/150/151: consolidar distinção aprovação institucional, permit de risco e consumo em execution; manter ADR aceito até decisão/migração explícita |
| R10 PLATFORM engineering grants full matrix | Deferido no v1; não significa autorização irrestrita | ANX-136/137: matriz PLATFORM versus AGENCY, efeitos/limites/aprovação/transições e break-glass revogável; não ativar L3/L4 |
| R09 pré-requisitos / R10 PC-G0-01..10 e equipes | Histórico: PC-G0-06 indica T01 real pendente, apesar de resumo 10/10 debate | ANX-136/181: verificar identity/eventing/organizations atuais, crítico independente identificado e evidência T01; não herdar PASS por papel nominal |

**Teste executado:** `bun test tests/contracts/governance-contracts.test.ts` em backend, Bun 1.4.0, exit 0, **4 pass / 0 fail / 4 assertions**. Testes inspecionados cobrem owner constant, parse IssueGrant, grantIssued e mapeamento GOV_EPOCH_STALE. Não testam delegação, mandato, autoridade efetiva, PG, T01 real ou corrida de revogação.

A busca de delegation/mandate nos paths governance/contracts/API encontrou schemas, não execução equivalente demonstrada. Classificação é parcial/não verificada, não ausência universal. Rastreio transitivo das rodadas anteriores e consolidação de conflitos continuam na ANX-127. Nenhum grant ou aprovação real foi criado.

## 6.15. Rastreio por capacidade — graph R09/R10

Fontes: [R09](./structure-debate/graph/R09-dev-plan.md) e [R10](./structure-debate/graph/R10-g0-handoff.md), relidos integralmente em 2026-09-08; ANX-138 é a continuação. Inventário atual confirma arquivos de handlers, workers e testes, mas nenhum teste graph foi executado neste incremento. Paths abaixo são relativos a `backend/modules/graph/src/`, salvo indicação.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 contratos, migrations 0000–0003, seed e registry generation | Não revalidado integralmente; teste ensure-schema presente no inventário | ANX-138/132: schemas/envelope/erros/catálogo T01–T20, drift seed↔PG, migração e bootstrap idempotentes |
| R09 S2 registry, sub-plan e ports | Não verificado em execução; testes registry/ports presentes | ANX-138: lookup e allowlist de edges, sub-plano não registrado falha no bootstrap; domínio sem framework |
| R09 S3 adapter/constraints / G5-01 / AR01 | Parcial por inventário e desvios na §6.4; testes de constraints/adapter presentes | ANX-138/128: adapter Neo4j privado, import cross-module negado, nenhum acesso privado a graph_*; credenciais só infra/secrets |
| R09 startup / R10 DEP-03..07 | Não verificado em execução | ANX-138/129: ausência de Neo4j/credenciais falha nos runtimes dependentes, sequência schemas→registry→HTTP→workers; local-only permite L1 sem Redis apenas no modo documentado |
| R09 S4 / G3-01 / G5-05 | Parcial: application/projections/inbox/process-with-inbox.ts e workers/projection-consumer.ts presentes | ANX-138/130: dedupe eventId+consumer, crash antes/depois da mutação e ack; prova real PG+Neo4j. Nome do teste “atômico” não estabelece TX distribuída |
| R09 S4 organizations+identity / R10 DEP-01/02/06 | Parcial: organizations e governance projectors presentes; identity smoke não demonstrado neste inventário | ANX-138: rastrear evento/símbolo equivalente, oráculos Membership/User/Grant, ordering e revision. RB-D04 histórico não significa grant projector ausente atualmente |
| R09 poison / G3-07 / R10 R-GR-01 | Não verificado em execução; teste poison-pill presente | ANX-138: quinta falha conforme política documentada leva quarantine/DLQ/ack; sem retry infinito, segredo ou bloqueio de fila |
| R09 G5-03 / R10 R-GR-06 | Não verificado | ANX-138/129/155: payload_ref redigido, ACL e retenção; inspeção de logs/DLQ em fixture, não segredo real |
| R09 S5 / G3-06 / R10 full swap e R-GR-02 | Parcial: application/rebuild/full-generation-swap.ts e workers/rebuild-worker.ts presentes | ANX-138: drain→pause→N+1→replay→F0→swap→resume, ordem ownerDomain, leitura consistente e recuperação de falha em cada etapa. Limite pending 100k, batch 100/inflight 3 são requisitos do plano, não medição atual |
| R09 S6 / G3-09 / R10 cache e R-GR-04 | Não verificado em execução; testes cache-key, redis-invalidate e graph-cache-g3-09 presentes | ANX-138: chave epoch-aware, L1 30s, DENY 60s conforme contrato, invalidate cross-pod; ALLOW/intentHash fresh, revogação impede stale autorização |
| R09 S7 T01/T03 / G3-04 | Parcial: traversal-handlers.ts e traversal/t01-grant-evaluation.ts presentes | ANX-138: respostas reais autorizadas, fresh/cache miss intentHash e explain com scope; smoke não prova todos os caminhos |
| R09 node.get / G3-02/03 | Parcial: http/node-handlers.ts e pending-projection-registry.ts presentes | ANX-138: distinguir 404 ausente e 409 não projetado; poll minProjectionGeneration só devolve 200 quando satisfaz condição, timeout explícito |
| R09 nodes.batchGet / G3-05 | Não verificado em execução | ANX-138: 51 keys rejeitadas 422 conforme contrato, limites/escopo/erros por item e nenhuma leitura cross-tenant |
| R09 dispatcher node.create/update / G5-02 | Não verificado | ANX-138: comando para Grant vai ao handler público governance, não mutação direta Neo4j; mesma autoridade humano/agente |
| R09 admin / G3-08 / G5-04/05 / R10 R-GR-03 | Parcial: http/admin-handlers.ts presente | ANX-138/155: PLATFORM+audit_manifest_id obrigatório, manual replay idempotente e rebuild sem PLATFORM 403 |
| R09 rate limit / G3-10 / G5-06 | Parcial: http/graph-rate-limit.ts presente | ANX-138: 61ª request/min e herd 100 paralelas durante catch-up respeitam política 60/min; teste multi-instância se for promessa do runtime |
| R09 S8 partial / GK-R08-01 / R10 D-GR-036 | Planejado, go/no-go não demonstrado | ANX-138: protótipo T07 cross-domain com read fence e oráculo; sem prova, manter full swap. Não migrar graph_domain_generation por antecipação |
| R09 S8 OpenAPI/graphDlqReplayInputSchema | Planejado, não verificado | ANX-138/132: contrato/publicação Scalar e comando contracts:openapi ou equivalente validado; sem afirmar ferramenta inexistente pelo nome |
| R10 auto-replay batch D-GR-039 | Fora do v1, sem autorização implícita de replay automático | ANX-138: manter manual como baseline; antes de incluir batch, fechar política, limite, cancelamento, autorização e auditoria |
| R10 T04–T20 completos | Deferido no v1; inventário contém smoke t01-t05, não prova todas as travessias | ANX-138 com owners consumidores: mapear cada traversal aplicável a schema/handler/oráculo; inaplicabilidade exige disposição explícita, não stub |
| R09 benchmarks / R10 SLO premium D-GR-040/041 | Objetivos não medidos: T01 p99≤80ms L2 warm, ack p99≤2s a100evt/s, swap10k≤5min dev | ANX-138/170: benchmark reproduzível e ambiente/config; ANX-158 define operação/alertas. PagerDuty citado não é vendor homologado |
| R10 Graph Explorer UI | Planejado fora P03 | ANX-164–167: navegação/explain por papel, limites e field masking; não fornecer credenciais ou Cypher livre ao usuário/agente |
| R09 fixture/cleanup / R10 checklist | Teste graph-f0-reset-isolation presente; fixture e cleanup não executados | ANX-138/181: F0 sanitizado Agency/User/Membership/Grant; nunca executar DETACH DELETE ou truncate amplo em graph compartilhado |
| R09 pré-requisitos / R10 AC-G0-01..08, PC-G0-01..10, H-01..05, B-01..03 e dependências | Histórico 9/10, upstream/restrições de slices não provam status atual | ANX-138/181: revalidar fontes/claims, wiring real e pareceres do candidato; ADR0001 proposto não vira aceito pelo debate |

Esta tabela cobre agrupamentos explícitos R09/R10, mas não substitui rastreio transitivo de D-GR-001..044, T01–T20 individuais e schemas referenciados. Os valores de política do plano exigem configuração tipada e compatibilidade com contrato vigente; não foram aplicados nem homologados. Nenhum rebuild, replay, benchmark ou efeito externo foi executado.

## 6.16. Rastreio por capacidade — agents R09/R10

Fontes: [R09](./structure-debate/agents/R09-dev-plan.md) e [R10](./structure-debate/agents/R10-g0-handoff.md), relidos em 2026-09-08. A consulta atual dos três paths agents (módulo, contracts e testes) retorna diretórios inexistentes; isso comprova ausência nesses paths, não de todo comportamento equivalente. ANX-139 continua núcleo, ANX-143/144 capacidades avançadas.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 / R10 Agent, AgentVersion, Skill e persistência | Ausente nos paths esperados; equivalentes não demonstrados | ANX-139: domínio e migrations agents_* com schema/repository reais, lifecycle/versionamento/rollback; estado+journal+outbox. Não scaffoldar módulos vazios |
| R09 S2 / R10 quatro eventos v1 | Ausente no path contracts/agents; nomes/campos dos quatro eventos não enumerados nestes R09/R10 | ANX-139/132: recuperar R04/decisões e especificar nomes, versões, payloads, erros e oráculos. Não inventar quatro nomes para preencher contagem |
| R09 S3 create / G3-AGT-01 | Implementação não demonstrada | ANX-139: criação idempotente, payload conflitante e scope, um Agent/um evento sob corrida, rollback PG |
| R09 S3 publish / G3-AGT-02/03 | Implementação não demonstrada | ANX-139: versão imutável, publish+outbox atômicos, deny sem grant e revogação entre validação/efeito; publicar não concede novos grants |
| R09 S4 / R10 registry / G3-AGT-04 | Parcial no consumidor: `orchestration/src/domain/ports/agent-registry.ts` declara isAgentActive(agentId, organizationId) | ANX-139/140: integrar adapter público compatível e testar agente inativo/tenant diferente/indisponibilidade; não duplicar ou substituir silenciosamente interface existente |
| R09 S5 / R10 Brain | Implementação não demonstrada no núcleo agents | ANX-139/141/138: invoke por fachada, T01 e grant guard, bindings explícitos, deny/allow e custo; inferência/provider/secrets em connections, sem fallback silencioso |
| R09 S6 / R10 HTTP CRUD, publish, list skills | Implementação não demonstrada | ANX-139: API Elysia /v1/agents com handlers compartilhados, schema/erros/autorização; listar referências a skills não autoriza executá-las |
| R09 S7 invoke dequeue opcional | Planejado opcional, não autorização para worker vazio | ANX-139/140: decisão explícita S6 suficiente ou fila concreta com caso de uso/teste; Task/Run/lease continuam orchestration |
| G3-AGT-05 / R10 projector | Planejado no dono graph | ANX-138/139: consumer graph:agents:v1 projeta nó e versões a partir de evento, dedupe/rebuild/tenant; sem driver Neo4j em agents |
| R09 S8 OpenAPI Scalar | Deferido do v1 | ANX-139/132: contrato público gerado e validado contra handlers; não confundir documentação com CRUD implementado |
| R09 S8 Brain streaming SSE | Deferido do v1 | ANX-139/141/168: contrato streaming, cancelamento/backpressure, erro terminal e accounting de uso; transporte não muda authority |
| R09/R10 promoção evaluation automática | Deferido, não habilitado | ANX-160/171: certificação/recomendação separada de aprovação governance e aplicação da versão pelo owner; ANX-173 reserva autonomia futura, sem autoexpansão |
| R10 CEO blueprint onboarding saga | Planejado fora do núcleo v1 | ANX-135/139/140/143: organizations possui onboarding, agents configuração/versionamento, orchestration coordena execução; nenhum Run ou billing ledger transferido a agents |
| R10 checklist G5-AGT-01..05 | Referenciado sem cenários nestes R09/R10; execução não provada | ANX-139/181: recuperar R07 e registrar cada cenário/evidência em sandbox; PASS textual “exec sandbox na G1” não é teste executado |
| R09 pré-requisitos / R10 AC-G0-01..05, AGT-R06-01..10 e bloqueios | Histórico documental, não revalidado para candidato novo | ANX-139/181: dependências atuais identity/organizations/graph/eventing, claim e crítico nominal real. ANX-82 não autoriza reabrir ou escrever fora da issue |
| R10 G2–G6 e suite387/387 | Evidência insuficiente para produto agents ausente | ANX-181: pareceres independentes e testes específicos por candidato; suite global não substitui G3-AGT-01..05 |

Não houve execução de testes agents: diretórios previstos estão ausentes, e rodar suite global não comprovaria esses requisitos. Permanecem pendentes o rastreio transitivo de D-AGT-001..014, quatro eventos, dependências R06 e cenários R07. OpenBots seguem ANX-124/125→144; núcleo não presume homologação dessas integrações.

## 6.17. Rastreio por capacidade — orchestration R09/R10

Fontes: [R09](./structure-debate/orchestration/R09-dev-plan.md) e [R10](./structure-debate/orchestration/R10-g0-handoff.md), relidos integralmente em 2026-09-08. ANX-140 executa o delta e ANX-133 a fundação de workers. Inventário atual confirma commands de heartbeat/sweeper, embora não exista pasta src/workers no módulo; não classificar a funcionalidade como ausente pelo layout. Paths relativos a `backend/modules/orchestration/src/application/`.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1–S2 / R10 entidades, persistência e contratos | Não revalidado integralmente neste incremento | ANX-140/132: Goal/Task/Run/Lease/Heartbeat/GateBinding, migrations 0000–0001, UoW, journal hash, scope obrigatório, seis eventos versionados e gateBinding1.0.0; mapear campos e erros R04 |
| R09 S3 / G3-01/02/03 / P-R5-05 | Parcial: checkout-task.ts presente | ANX-140: board todo nega, in_progress+T01 autoriza, replay definido, FOR UPDATE e TX lease+run+journal+outbox com rollback; hash mismatch G5-05 rejeitado |
| R09 renew / G3-06 / G5-03 | Parcial: renew-task-lease.ts presente | ANX-140: token alheio negado, comparação segura, renew em in_review conforme contrato e cap8h; fencing/epoch revalidados no efeito |
| R09 release / G5-01/08 | Parcial: release-task-lease.ts presente | ANX-140: liberação idempotente autorizada, spoof done não libera lease; token apenas resposta autorizada, nunca logs/eventos |
| R09 S4 mirror / G3-04 / G5-01/07 | Parcial: ingest-taskboard-webhook.ts, sync-taskboard-status.ts e validate-mirror-transition.ts presentes; testes puros anteriores §6.4 | ANX-140/129: HMAC real sobre raw body, prod sem assinatura401, done/canceled sem gate vigente rejeitados, nenhum efeito colateral |
| R09 dedupe/polling / R10 mirror | Parcial nos comandos, worker runtime não revalidado | ANX-140/133: dedupe issue+boardVersion+status, webhook+polling sem double-apply, offline90s recupera, polling60s apenas leases ativos; TASKBOARD_URL ausente desabilita polling com aviso explícito |
| R09 S5 heartbeat / G3-07 / G5-04 | Parcial: record-run-heartbeat.ts, dequeue-run-heartbeats.ts e acknowledge-run-heartbeat.ts presentes | ANX-140/133: coalesce30s, uma pending por chave, ack pós-processamento, flood20k/org respeita cap10k/backpressure; retry após crash sem duplicar efeito |
| R09 sweeper / G3-08 | Parcial: sweep-expired-leases.ts presente | ANX-140/133: 500 leases em até5 batches100, jitter0–30s conforme política e orphan event; restart/checkpoint e lease expirado não permitem worker antigo atuar |
| R09 S6 gates / G3-05/09 / G5-02 | Parcial: record-gate-disposition.ts presente | ANX-140: append-only, PASS invalidado por digest, G7 exige Owner real, N/A exige razão; identity down503 sem binding fantasma |
| R09 queries / R10 HTTP | Parcial: get-task.ts, get-run.ts, list-gate-bindings-by-issue.ts presentes | ANX-140: dez rotas e erros contratuais, DTO sem token indevido, scope+idempotency e G5-06 cross-tenant; paths públicos/admin definidos |
| R09 T01 / G3-10 / R10 R-ORC-02 | Parcial: checkout-authorization.ts presente; integração não executada | ANX-140/136/138: timeout2s503, breaker30s nega checkout/renew até half-open; nenhuma indisponibilidade vira ALLOW |
| R09 hierarchy / R10 TREE/CIRCULAR | Parcial: hierarchy-mode-resolver.ts presente | ANX-140/135: modo obtido de port autorizado, payload CIRCULAR completo, ExplainEscalationPath read-only; ADR0005/spec006 propostos não viram aceitos pelo R10 |
| R09 startup/S7/AR01 | Não verificado integralmente | ANX-140/128/129: bootstrap eventing→identity→organizations→orchestration; adapters antes de rotas/workers; webhook rate60/min/IP e sem imports privados. Worker de domínio permanece no módulo, apps compõe, apesar da árvore histórica |
| R09 S8 OpenAPI / R10 D-ORC-054 | Deferido, não demonstrado | ANX-140/132: geração OpenAPI Scalar/contratos públicos versus admin e comando documentado equivalente |
| R09 S8 G5 CI / R10 D-ORC-056 | Deferido; manual sandbox não substituído por job planejado | ANX-140/181: go/no-go fixture determinística, board de teste isolado, HMAC e cleanup seguro. Não incluir Dashi de desenvolvimento no CI contrariando AGENTS; usar superfície simulada isolada de teste quando aplicável |
| R09 S9 PlanRevision / R10 D-ORC-055 | Deferido; R10 resume spike em S8, R09 especifica S9 | ANX-140: consolidar go/no-go/ADR e migration0002 ou rejeição formal antes de código; diferença de rótulo não autoriza migração |
| R10 AgentRegistry forte / wakeup saga | Deferido do v1 | ANX-139/140/143: registry público fail-closed, agente ativo e tenant; wakeup não transfere Run a agents e não usa registry permissivo em produção |
| R10 Neo4j/ReviewEdge / grants | Fora do owner orchestration | ANX-138 projeta gate events; ANX-136 fornece autoridade/T01 por port; sem Neo4j ou concessão interna de grant |
| R09 benchmarks / R10 riscos | Objetivos não medidos: checkout p99≤120ms local, T01 p99≤2s, zero double-apply, 500orphans≤5batches | ANX-140/170: ambiente/carga/dataset e métricas reproduzíveis; não confundir target com SLO cumprido |
| R09 fixture e G5 checklist20 / R10 checklist/ambiente | Referências não equivalem a prova executada | ANX-140/181: oito cenários G5 acima e vinte itens R07 precisam evidências próprias; fixture ANX901/902 somente no ambiente dedicado, sem alterar board real ou truncate compartilhado |
| R09 pré-requisitos / R10 AC-G0-01..08, PC-G0-01..10, DEP-01..08, H-01..05, B-01..04 | Histórico9/10, dependências e autorização a revalidar | ANX-140/181: novo claim/G0, ambiente, crítico e pareceres do candidato; status históricos não bloqueiam/liberam automaticamente o delta atual |

Os tempos/limites acima vêm do plano histórico, exigem config tipada e reconciliação com contrato vigente. A ligação ao Dashi descrita nesses slices é integração explícita de desenvolvimento, não dependência universal de cada Task/Run do produto. WAITING_HUMAN_INPUT, cancelamento, budgets e retomada da ANX-140 permanecem requisitos adicionais das specs institucionais, não comprovados pelos cenários de mirror. Rastreio transitivo D-ORC-001..056, seis eventos, dez rotas e checklist20 ainda pendente. Nenhum worker, webhook, teste integrado ou cleanup foi executado.

## 7. Referências

- [Mapa de capacidades](./system-capabilities/CAPABILITY-MAP.md)
- [Checklist estrutural](./system-capabilities/MODULE-STRUCTURE-CHECKLIST.md)
- [Roadmap de execução](./execution-roadmap.md)
- [Pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md)
- [Contrato P05 Connections](./system-capabilities/p05-connections-binding-inference-contract.md)
- [Contrato P06 financeiro](./system-capabilities/p06-financial-lifecycle-contract.md)
- [Contrato P07 agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Contrato P08 operacional](./system-capabilities/p08-operations-slos-recovery-contract.md)
