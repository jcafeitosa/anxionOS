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
| 7 | connections | Provider, conta, modelo/oferta, binding, quota e uso de inferência | Catálogo, inferência governada, routing explícito e reconciliação de uso | binding/request + reserva de quota; timeout, custo e redaction | P05 | ANX-141 (secrets: ANX-129 em packages/secrets, não connections) |
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

## 6.1. Histórico de pendências de reconciliação ANX-127

**Checkpoint histórico, não saldo vigente.** A auditoria de fechamento registrada em ANX-127 no comentário `405b8304-f8bd-430b-866d-c171fd86b735` emitiu **CHANGES_REQUIRED** sobre seu candidato. A tabela e as contagens abaixo preservam aquele estágio e as atualizações incrementais subsequentes; não atestam aprovação nem pendência atual. O run de revalidação documental integrado vigente está na §6.37 e nos pareceres da ANX-186, sempre vinculados ao candidato exato.

| Entrega de planejamento | Estado e evidência | Condição para encerramento |
| --- | --- | --- |
| Lista dos 23 módulos e owners | Reconciliada na §3 com baseline/ADR0002; não homologa implementação | Preservar exatamente os owners aceitos e revalidar mudanças posteriores |
| A5 — fila e roadmap | Atualização documental realizada em [module-queue](./module-queue.md), seção Continuação vigente, e [execution-roadmap](./execution-roadmap.md), Mapeamento da continuação; checkpoints anteriores abaixo são históricos | Incluir estes arquivos no candidato final e nos pareceres; não repetir A5 como alteração ainda não realizada |
| Cobertura de cada capacidade R09/R10 | Agrupamentos explícitos dos 23 módulos desdobrados nas §§6.12–6.33, complementando §§6.2–6.11. Crítico não identificou agrupamento explícito faltante nas revisões realizadas (ANX-127, comentário 5dcba1cf-9dd3-44f9-ab33-bd721d32abea); sem PASS integral/transitivo | Completar referências transitivas, campos/schemas e decisões indicados como pendentes em cada seção. Preservar fonte/seção, classificação, evidência/limite e issue/disposição por requisito; obter parecer do candidato integrado |
| Conflitos de contrato e migração | Identificados nas tabelas e comentários dos filhos | Consolidar decisão aplicável, impacto e migração dos conflitos conhecidos; encaminhamento genérico ao executor não encerra a reconciliação |
| Placement do adapter-gateway | Aprovado (ADR0006); G1C3 F1 PASS documental 2026-09-08 (ANX-192/193) | Registry técnico em operations, execução em execution, dados em market-data; spec gateway. Digest candidato integrado: ver §6.34 e comentários ANX-127. G1 integrado, implementação e migração (ANX-161/162) permanecem distintos |
| Pacote final documental | §6.36 candidato C4 `d31f823d…010200d`; G1 C4 PASS_WITH_CONDITIONS (`018e91eb`); A4 PASS_WITH_CONDITIONS (`2ccab708`); candidato C5 pós-P1–P3 | Condições C1–C3 do parecer G1 C4 satisfeitas; housekeeping P1–P3 aplicado; gates G2–G7 proporcionais antes de encerrar ANX-127; não simular gates ou herdar PASS antigo |
| Implementação futura | Delegada às tarefas do programa ANX-126 | Não precisa ser executada para concluir este planejamento; gaps devem estar cobertos e dependências claras. Gates de produto permanecem futuros |

As contagens progressivas e pendências nas §§6.2–6.9 descrevem o checkpoint em que cada inspeção foi feita. As afirmações de completude ou incompletude desta seção e da §6.10 são históricas; a disposição finita dos agrupamentos e referências está nas §§6.12–6.35. A §6.37 e o ledger da ANX-186 distinguem cobertura documental, lacunas delegadas e aprovação do candidato integrado. Nenhum desses registros comprova implementação.

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

Agora os 23 módulos possuem **evidência inicial parcial** e tarefas de continuação. Isso não fecha a reconciliação exaustiva por capability/schema/teste, R10 dos demais módulos, roadmap A5, revalidação G1 integrada do placement (ADR0006) e implementação/migração (ANX-161/162), ou gates independentes. ANX-127 continua em andamento.

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

Fontes: [R09 completo](./modules/identity/R09-dev-plan.md) e [R10 completo](./modules/identity/R10-g0-handoff.md), relidos em 2026-09-08. Esta seção desdobra os requisitos explícitos desses dois artefatos; o rastreio transitivo **D-IDN-001..024** está em **§6.12.1** (ANX-197). Rodadas **R01–R05** permanecem em [structure-debate/identity/](./structure-debate/identity/) com crosswalk em [R08](./modules/identity/R08-decision-log.md); **R06–R08** têm fonte primária nos artefatos citados no R10. ANX-134 continua responsável pelo delta executável de identity; ANX-127 pela completude documental.

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
| R09 pré-requisitos / R10 DEP-01..06, AC-G0-01..08, PC-G0-01..10, H-01..04 | Evidência histórica documental, não revalidada para novo candidato. ANX-78 citado no R10 não é claim deste programa | ANX-134/181: novo G0 com issue, dependências atuais, fonte decisória, executor/crítico distintos e evidências. **D-IDN-001..024** rastreados em §6.12.1 (ANX-197); R06–R08 mantêm limite de revalidação executável no candidato integrado |

**Verificação executada:** `bun test tests/contracts/identity-events.test.ts` em backend, Bun 1.4.0, exit 0: **4 pass / 0 fail / 11 assertions**. Inspeção prévia confirmou testes puros de códigos de erro, normalização de comando, envelope registered e payload suspended. Não houve PG, NATS, Better Auth, operações de sessão nem teste de segurança integrado.

O inventário de paths inicialmente retornou exit 2 porque `backend/tests/contracts/identity/` não existe; a busca posterior encontrou o arquivo `identity-events.test.ts`. O erro não foi interpretado como ausência de testes. Este incremento não fecha os demais módulos nem o aceite integral ANX-127.

### 6.12.1. A1 — disposição transitiva D-IDN-001..024 (ANX-197)

Fonte primária: [R08 decision log](./modules/identity/R08-decision-log.md) (tabela consolidada, relida 2026-09-08). Crosswalk **R01–R05** → D-IDN na mesma fonte; artefatos em [structure-debate/identity/](./structure-debate/identity/). Esta subseção **não** revalida código nem substitui G0/G3 de ANX-134; classifica cada decisão com owner, issue e limite explícito.

| ID | Decisão (resumo) | Classificação | Disposição / issue | Evidência ou limite |
| --- | --- | --- | --- | --- |
| D-IDN-001 | Principal humano em PG `identity_principals` | Aceito v1/P0 | ANX-134 preserva baseline | Migration e register na §6.2; não revalidado integralmente neste candidato |
| D-IDN-002 | Better Auth/sessão HTTP em `apps/api` | Aceito v1/P0 | ANX-128 composition root | identity não importa BA; wiring de sessão em ANX-134/130 |
| D-IDN-003 | `principalId` canônico; `authUserId` só no boundary | Aceito v1/P0 | ANX-134/132 contratos | Teste envelope §6.12 parcial; campo em payload real não inspecionado |
| D-IDN-004 | Agency/Membership/grants → organizations/governance | Aceito v1/P0 | ANX-135/136 | Fora do módulo identity; sem claim de execução aqui |
| D-IDN-005 | Projeção Neo4j `:Principal` via eventos | Aceito v1/P0 | ANX-138 graph | Projector D-IDN-020 deferido; sem grafo em identity |
| D-IDN-006 | `RegisterPrincipal` idempotente por `authUserId` | Aceito v1/P0 | ANX-134 G3-IDN-02 | Teste register existe; corrida não verificada neste incremento |
| D-IDN-007 | Journal/outbox mesma transação PG | Aceito v1/P0 | ANX-134 G3-IDN-05 | UoW identity; falha outbox não verificada em execução |
| D-IDN-008 | Queries fail-closed para `suspended` | Aceito v1/P0 | ANX-134 G3-IDN-03/04 | suspendPrincipal presente; re-suspend/corrida pendente |
| D-IDN-009 | Adapter `IdentityPrincipalLookup` em organizations | Aceito v1/P0 | ANX-135 adapter | P-R7-03 deferido reavaliação; v1 aceita organizations |
| D-IDN-010 | governance usa `PrincipalLookup` via organizations | Aceito v1/P0 | ANX-136 | Lookup indireto; sem adapter identity em packages |
| D-IDN-011 | Eventos `ownerDomain: identity`, sufixo `.v1` | P1 pendente | ANX-134/132 | Código legado; normalização eventType aberta |
| D-IDN-012 | Payload evento sem `authUserId` | P1 pendente | ANX-134/132 | Teste fixture §6.12; journal real não inspecionado |
| D-IDN-013 | `@anxionos/contracts/identity/*` schemas públicos | P1 pendente | ANX-132 | Pacote contracts; matriz de campos incompleta |
| D-IDN-014 | `suspendPrincipal` + `identity.principal.suspended.v1` | P1 pendente | ANX-134 | Command presente; evento persistido não provado |
| D-IDN-015 | Consumer `apps/api:identity-sessions:v1` | P1 pendente | ANX-134/130 | Consumer em apps/api §6.2; NATS/skip registrado |
| D-IDN-016 | `syncPrincipalEmail` hook BA → identity | P1 pendente | ANX-134 | Command sketch; hook não comprovado conectado |
| D-IDN-017 | `ServicePrincipal` agregado + storage | Deferido P02+ | ANX-134 DEF-01 | execution-go; sem identidade implícita de execução |
| D-IDN-018 | RLS PostgreSQL identity | Deferido P09 | ANX-131 | Tenancy PG; fase histórica não substitui sequência aceita |
| D-IDN-019 | Rotas HTTP `/v1/identity/*` | Deferido | ANX-164–167/128 | operations P07; sem API pública v1 em identity |
| D-IDN-020 | Consumer `graph:identity:v1` | Deferido P03 | ANX-138 DEF-05 | Dono graph; rebuild/idempotência fora identity |
| D-IDN-021 | Bootstrap: eventing → identity → organizations → governance | Aceito v1/P0 | ANX-128/129 ordem | Bootstrap apps; não executado neste incremento |
| D-IDN-022 | SQLite proibido para estado institucional identity | Aceito v1/P0 | ADR0004/PG | Política de storage; sem SQLite autoritativo |
| D-IDN-023 | Principal global; tenancy via Membership | Aceito v1/P0 | ANX-135 membership | Sem tenant id em Principal |
| D-IDN-024 | Testes P0 register/get | Aceito v1/P0 | ANX-134 regressão | Testes citados §6.2; suite parcial 4 pass identity-events |

**Rodadas R06–R08 (limite A1):** R06 dependências → D-IDN-009/010/021; R07 riscos → D-IDN-011/012/018; R08 decision log → tabela acima. **R01–R05** não são reescritos linha a linha aqui; crosswalk R08 mapeia para D-IDN. Revalidação executável de DEP/AC-G0/PC-G0 permanece em ANX-134/181.

## 6.13. Rastreio por capacidade — organizations R09/R10

Fontes: [R09](./modules/organizations/R09-dev-plan.md) e [R10](./modules/organizations/R10-g0-handoff.md), relidos integralmente em 2026-09-08. O aceite histórico ANX-29 não é reaberto; ANX-135 executa o delta executável. O rastreio transitivo **D-ORG-001..044** está em **§6.13.1** (ANX-198). Rodadas **R01–R08** têm fonte primária em [R08](./modules/organizations/R08-decision-log.md) e artefatos do debate; ANX-127 cobre completude documental.

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
| R09 pré-requisitos / R10 AC-G0-01..08, PC-G0-01..10, DEP-01..07, H-01..05 e B-01..03 | Histórico documental; G6 integrado aparece pendente no R10, não prova situação atual | ANX-135/181: recuperar/revalidar pareceres por candidato. **D-ORG-001..044** em §6.13.1 (ANX-198); R06–R08 com limite de revalidação executável |

**Teste executado:** `bun test tests/contracts/organizations.test.ts` em backend, Bun 1.4.0, exit 0, **6 pass / 0 fail / 21 assertions**. Inspeção prévia: códigos/status de erro, detalhes, enum de Agency, comando create e envelope agency.created. Não cobre todos os comandos/eventos/queries, G3-01..10, G5-01..04, PG, HTTP ou bootstrap. O arquivo é equivalente ao diretório de contratos sugerido pelo plano; não confundir mudança de path com ausência.

A lista de queries e a saga completa continuam não verificadas neste incremento. **D-ORG-001..044** estão rastreados em §6.13.1; saga/queries executáveis permanecem em ANX-135. Nenhum código foi alterado, nenhum convite real enviado e nenhum gate integrado aprovado.

### 6.13.1. A1 — disposição transitiva D-ORG-001..044 (ANX-198)

Fonte primária: [R08 decision log](./modules/organizations/R08-decision-log.md) (tabela consolidada, relida 2026-09-08). Crosswalk Slack R07 → D-ORG na mesma fonte. Esta subseção **não** revalida código nem substitui G0/G3 de ANX-135.

| ID | Decisão (resumo) | Classificação | Disposição / issue | Evidência ou limite |
| --- | --- | --- | --- | --- |
| D-ORG-001 | Dono Agency/Owner/Membership em PG | Aceito v1 | ANX-135 baseline | Migrations §6.3; não revalidado integralmente |
| D-ORG-002 | Sessão/BA em identity+apps/api | Aceito v1 | ANX-134/128 | organizations recebe principalId resolvido |
| D-ORG-003 | Grants/mandatos → governance | Aceito v1 | ANX-136 | organizations publica role/status apenas |
| D-ORG-004 | Assinatura/invoice → billing | Aceito v1 | ANX-156 | Sem escrita billing em organizations |
| D-ORG-005 | Projeção Neo4j → graph | Aceito v1 | ANX-138 | organizations emite eventos; D-ORG-021 impl graph |
| D-ORG-006 | Agent/CEO blueprint → agents | Aceito v1 | ANX-139 | Runtime agents, não organizations |
| D-ORG-007 | v1 = Agency+Owner+Membership; Organization fora v1 | Deferido pós-v1 | ANX-135 D-ORG-043 | Entidade Organization não no escopo v1 |
| D-ORG-008 | principalId via PrincipalLookup sem FK cross-module | Aceito v1 | ANX-135/134 | Port identity; adapter D-ORG-022 |
| D-ORG-009 | INV-ORG-02: um owner ativo por Agency | Aceito v1 | ANX-135 G3-06 | revoke último owner → 409 |
| D-ORG-010 | Idempotency-Key → commandId + journal | Aceito v1 | ANX-135 | Middleware idempotency §6.3 |
| D-ORG-011 | Eventos ownerDomain organizations `.v1` | Aceito v1 | ANX-132/135 | Teste contracts 6 pass §6.13 |
| D-ORG-012 | Contratos `@anxionos/contracts/organizations/*` | Aceito v1 impl G1 | ANX-132 | Matriz campos incompleta |
| D-ORG-013 | REST `/v1/organizations` + Idempotency-Key | Aceito v1 | ANX-135/128 | plugin.ts presente; HTTP não executado aqui |
| D-ORG-014 | principalId nunca do body | Aceito v1 | ANX-135 G5-03 | R-ORG-10 não verificado em execução |
| D-ORG-015 | Tenancy membership ativo; ORG_CROSS_TENANT 403 | Aceito v1 | ANX-135 G3-02 | scoped-access/middleware §6.3 |
| D-ORG-016 | Prefixo `organizations_*`; enums Drizzle | Aceito v1 | ANX-135 | migrations 0000/0001 |
| D-ORG-017 | Journal/outbox mesma TX (OrganizationUnitOfWork) | Aceito v1 | ANX-135 S3 | UoW teste existe; integração não executada |
| D-ORG-018 | Token convite 32b; HMAC-SHA256 pepper | Aceito v1 | ANX-135/129 | hasher inventariado; startup não executado |
| D-ORG-019 | Token/pepper proibidos em eventos/logs/API | Aceito v1 | ANX-135/129 | Política R08; logs não inspecionados |
| D-ORG-020 | SQLite proibido estado institucional | Aceito v1 | ADR0004/PG | Política storage |
| D-ORG-021 | Projeção Neo4j E003/E008/E009/E016 | Aceito impl graph P03 | ANX-138 | consumer `graph:organizations:v1` deferido execução |
| D-ORG-022 | IdentityPrincipalLookup → getPrincipalById | Aceito v1 | ANX-134/135 | Pré-req ANX-28 histórico |
| D-ORG-023 | Identity indisponível → 503 ORG_IDENTITY_UNAVAILABLE | Aceito v1 | ANX-135 G3-05 | CreateAgency; não generalizar InviteMember |
| D-ORG-024 | InviteMember sem lookup se convidado inexistente | Aceito v1 | ANX-135 G3-04 | invite-member.ts presente |
| D-ORG-025 | Cache existência principal para AuthZ proibido | Aceito v1 | ANX-135 | Sem cache documentado |
| D-ORG-026 | RLS não obrigatório v1; guards application+api | Aceito v1 | ANX-131 adiado | D-ORG-040 P09 hardening |
| D-ORG-027 | TTL convite 7 dias | Aceito v1 | ANX-135 G3-07/08 | Config tipada; teste accept parcial |
| D-ORG-028 | Accept `POST /v1/organizations/invites/accept` | Aceito v1 | ANX-135 | accept-invite-by-token.ts presente |
| D-ORG-029 | Rate limit 10/IP/min accept | Aceito v1 | ANX-128/135 | accept-rate-limit.ts presente |
| D-ORG-030 | Guard `assertAgencyScope` api+application | Aceito v1 | ANX-135 | require-agency-membership §6.3 |
| D-ORG-031 | Índice único parcial invite email | Aceito v1 | ANX-135 G5-02 | migration; corrida não verificada |
| D-ORG-032 | Rotação pepper dual 24h + runbook | Aceito v1 | ANX-135/129 | Runbook não executado |
| D-ORG-033 | ANX-29 bloqueada até identity G7 + R10 G0 | Aceito histórico | ANX-135/181 | Aceite ANX-29 não reaberto aqui |
| D-ORG-034 | Accept token exige match email sessão | Aceito v1 | ANX-135 G3-08 | P-R7-01 resolvido R08 |
| D-ORG-035 | Quota maxCompanies → billing P07 | Aceito v1 comercial | ANX-156/135 | organizations v1 sem quota própria |
| D-ORG-036 | Admin/owner ativa por membershipId sem match email | Aceito v1 | ANX-135 | Fluxo assistido documentado |
| D-ORG-037 | Bootstrap eventing→identity→organizations | Aceito v1 | ANX-128/129 | bootstrap.ts §6.3; ordem não executada |
| D-ORG-038 | Realtime `organizations:agency:{id}` | Deferido R9 | ANX-168 | Wiring opcional v1 |
| D-ORG-039 | Saga onboarding UI01 completa | Deferido R9/P04 | ANX-140/156 | advance-onboarding parcial §6.13 |
| D-ORG-040 | RLS PostgreSQL hardening | Deferido P09 | ANX-131 | Critérios P09 |
| D-ORG-041 | Código ORG_INVITE_EXPIRED em contracts | Deferido R9 | ANX-132 | P-R7-04 |
| D-ORG-042 | Tabela organizations_blueprints | Deferido R9 | ANX-135/139 | Onboarding blueprint state |
| D-ORG-043 | Organization + CONTAINS_AGENCY multi-company | Deferido pós-v1 | ANX-135 | Sem entidade Organization v1 |
| D-ORG-044 | Export/listagem global memberships | Deferido | ANX-135/158 | Sem endpoint v1; revisão G4 |

**Rodadas R06–R08 (limite A1):** R06 dependências → D-ORG-008/022/023/024/025; R07 riscos/tenancy → D-ORG-015/026–034; R08 → D-ORG-034–036 e tabela acima. **R01–R05** consolidados via crosswalk R08; revalidação executável de queries/saga/G3–G5 permanece ANX-135.

## 6.14. Rastreio por capacidade — governance R09/R10

Fontes: [R09](./modules/governance/R09-dev-plan.md) e [R10](./modules/governance/R10-g0-handoff.md), relidos em 2026-09-08. ANX-136 executa o delta; ANX-137 trata matriz de autonomia. O rastreio transitivo **D-GOV-001..010** e dependências **D-R6-GOV-001..006** estão em **§6.14.1** (ANX-199). Evidência histórica de ANX-30 não é aprovação deste candidato.

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
| R09 pré-requisitos / R10 PC-G0-01..10 e equipes | Histórico: PC-G0-06 indica T01 real pendente, apesar de resumo 10/10 debate | ANX-136/181: verificar deps atuais. **D-GOV/PC-G0/D-R6-GOV** em §6.14.1 (ANX-199); T01 real e crítico independente permanecem pendentes |

**Teste executado:** `bun test tests/contracts/governance-contracts.test.ts` em backend, Bun 1.4.0, exit 0, **4 pass / 0 fail / 4 assertions**. Testes inspecionados cobrem owner constant, parse IssueGrant, grantIssued e mapeamento GOV_EPOCH_STALE. Não testam delegação, mandato, autoridade efetiva, PG, T01 real ou corrida de revogação.

A busca de delegation/mandate nos paths governance/contracts/API encontrou schemas, não execução equivalente demonstrada. Classificação é parcial/não verificada, não ausência universal. **D-GOV-001..010** e **D-R6-GOV-001..006** estão em §6.14.1; conflitos ExecutionPermit/PLATFORM permanecem abertos em ANX-127/149/150/151. Nenhum grant ou aprovação real foi criado.

### 6.14.1. A1 — disposição transitiva governance (ANX-199)

Fontes: [R08 decision log](./modules/governance/R08-decision-log.md), [R06 dependências](./modules/governance/R06-dependencies.md), [R07 riscos](./modules/governance/R07-risks.md) (relidas 2026-09-08). Governance **não** usa prefixo D-GR (reservado ao módulo **graph**, §6.15). Esta subseção **não** revalida código nem fecha conflitos contratuais.

#### D-GOV-001..010 (R08)

| ID | Decisão (resumo) | Classificação | Disposição / issue | Evidência ou limite |
| --- | --- | --- | --- | --- |
| D-GOV-001 | Dono grants, delegations, mandates, approvals, authorityEpoch | Aceito v1 | ANX-136 baseline | Migrations/UoW §6.4; delegation/mandate não demonstrados |
| D-GOV-002 | PolicyVersion RISK e kill switch → risk | Aceito ownership | ANX-150 | governance não implementa corpo RISK |
| D-GOV-003 | graph executa T01; governance persiste grants+epoch | Aceito v1 | ANX-136/138 | Adapter graph-t01 com doubles §6.4; T01 real pendente |
| D-GOV-004 | Prefixo PG `governance_*` + command journal | Aceito v1 | ANX-136 | schema 0000/0001 inventariado |
| D-GOV-005 | Eventos ownerDomain governance `.v1` | Aceito v1 | ANX-132/136 | Teste contracts 4 pass §6.14 |
| D-GOV-006 | Consumer membership.activated → grant baseline owner | Aceito v1 | ANX-136/130 | organizations-membership-consumer presente; desvio camada §6.4 |
| D-GOV-007 | RevokeGrant bump authorityEpoch monotônico (GK03) | Aceito v1 | ANX-136 G3-GOV-02 | epoch store presente; corrida não verificada |
| D-GOV-008 | TraversalEvaluator port público; adapter → graph | Aceito v1 | ANX-136/138 | Port+adapter §6.4; timeout/stale não executados |
| D-GOV-009 | ChangeProposal HIERARCHY_MODE via ADR0005/spec006 | Aceito v1 | ANX-136/137 | change-proposal commands parciais |
| D-GOV-010 | v1 sem PolicyReference enforcement cross-risk | Deferido P06 | ANX-150/151 | Integração pré-submit P06 §2.1 |

#### D-R6-GOV-001..006 (R06 — dependências)

| ID | Decisão (resumo) | Consolidado em | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-R6-GOV-01 | PrincipalLookup fail-closed em IssueGrant | D-GOV-001 | ANX-136/134 | Lookup via identity port |
| D-R6-GOV-02 | Consumer activated → grant baseline | D-GOV-006 | ANX-136/135 | Evento organizations |
| D-R6-GOV-03 | Consumer revoked → close grants + epoch | D-GOV-007 | ANX-136 | membership.revoked handler |
| D-R6-GOV-04 | TraversalEvaluator adapter → graph T01 | D-GOV-008 | ANX-138 | Sem Neo4j no módulo |
| D-R6-GOV-05 | orchestration importa port público | D-GOV-008 | ANX-140/128 | Proibido infra privada |
| D-R6-GOV-06 | risk PolicyVersion kind=RISK | D-GOV-002/010 | ANX-150 | governance só PolicyReference |

#### PC-G0-01..06 (R08 — pré-condições G0)

| ID | Pré-condição | Status documental | Disposição |
| --- | --- | --- | --- |
| PC-G0-01 | R01–R08 concluídos | ✅ debate | Artefatos R01–R08 no módulo |
| PC-G0-02 | R09 plano slices | ✅ R09 | ANX-136 executa |
| PC-G0-03 | R10 handoff | ✅ R10 | ANX-136 G0 |
| PC-G0-04 | identity G7 ANX-28 | ⏳ Pendente | ANX-134 |
| PC-G0-05 | organizations membership events | ⏳ ANX-29 histórico | ANX-135 |
| PC-G0-06 | graph T01 adapter testável | ⏳ ANX-32 | ANX-138 |

#### Conflitos e itens abertos (não-D-GOV)

| Item | Fonte §6.14 | Disposição | Limite |
| --- | --- | --- | --- |
| ExecutionPermit emission → decisions | R10 conflito conhecido | ANX-127/149/150/151 | Distinção aprovação/permit/risco não fechada |
| PLATFORM engineering grants full matrix | R10 deferido v1 | ANX-136/137 | Sem L3/L4; matriz PLATFORM vs AGENCY |
| CreateDelegation / Mandate commands | R10 parcial contratual | ANX-136 | Schemas sem command demonstrado |
| Projector Neo4j governance | R10 planejado graph | ANX-138 | Projeção derived, sem autoridade PG |
| R-GOV-02 stale ALLOW (R07) | GK03 | D-GOV-007 | Cache invalidation graph ANX-138 |

**Rodadas R01–R05:** consolidadas em R06/R08; não reescritas linha a linha. Revalidação executável G3-GOV-01..05, HTTP e T01 real permanece ANX-136/181.

## 6.15. Rastreio por capacidade — graph R09/R10

Fontes: [R09](./structure-debate/graph/R09-dev-plan.md) e [R10](./structure-debate/graph/R10-g0-handoff.md), relidos integralmente em 2026-09-08; ANX-138 é a continuação. O rastreio transitivo **D-GR-001..044** e **T01–T20** está em **§6.15.1** (ANX-200). Fonte primária decisões: [R08 decision log](./structure-debate/graph/R08-decision-log.md). Inventário atual confirma arquivos de handlers, workers e testes, mas nenhum teste graph foi executado neste incremento. Paths abaixo são relativos a `backend/modules/graph/src/`, salvo indicação.

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
| R09 pré-requisitos / R10 AC-G0-01..08, PC-G0-01..10, H-01..05, B-01..03 e dependências | Histórico 9/10, upstream/restrições de slices não provam status atual | ANX-138/181: revalidar wiring. **D-GR/T01–T20** em §6.15.1 (ANX-200); ADR0001 proposto não vira aceito pelo debate |

Esta tabela cobre agrupamentos explícitos R09/R10; **D-GR-001..044** e **T01–T20** estão em §6.15.1. Schemas executáveis e homologação F0 permanecem ANX-138. Nenhum rebuild, replay, benchmark ou efeito externo foi executado.

### 6.15.1. A1 — disposição transitiva graph (ANX-200)

Fonte primária: [R08 decision log](./structure-debate/graph/R08-decision-log.md) (relido 2026-09-08). Classificação T01–T20: [R02 fronteiras](./structure-debate/graph/R02-boundaries.md). Esta subseção **não** executa traversals nem substitui F0 oracles (D-GR-044).

#### D-GR-001..044 (R08)

| ID | Decisão (resumo) | Classificação | Disposição / issue | Evidência ou limite |
| --- | --- | --- | --- | --- |
| D-GR-001 | Dono catálogo T01–T20, inbox, rebuild, adapter Neo4j | Aceito v1 | ANX-138 | Handlers/workers §6.15; não executado |
| D-GR-002 | Capital/grants/tasks/journal não em graph | Aceito v1 | ANX-138 | Dispatcher roteia ownerDomain |
| D-GR-003 | Zero credencial Neo4j para agentes/módulos | Aceito v1 | ANX-128/138 | API/SDK apenas |
| D-GR-004 | Registry único; classificação kernel/híbrido | Aceito v1 | ANX-138 | registry.ts inventariado |
| D-GR-005 | Neo4j adapter isolado infrastructure | Aceito v1 | ANX-138/128 | Import cross-module negado |
| D-GR-006 | Dispatcher node.create/update por ownerDomain | Aceito v1 | ANX-138 G5-02 | Não verificado execução |
| D-GR-007 | Consumers `graph:{domain}:v1` em graph P03 | Aceito v1 | ANX-138 | Projectors org/gov parciais |
| D-GR-008 | Registry híbrido contracts+PG+fail-fast | Aceito v1 | ANX-138/132 | schema migrations 0000–0003 |
| D-GR-009 | User Neo4j; Principal só PG identity | Aceito v1 | ANX-134/138 | Membership E009→User |
| D-GR-010 | Um escritor por agregado via ownerDomain | Aceito v1 | ANX-138 | Inbox idempotente |
| D-GR-011 | T01–T20 edge allowlist; sub-planos estáticos | Aceito v1 | ANX-138 | Bootstrap fail-fast |
| D-GR-012 | projectionPending async; sync wait PLATFORM | Aceito v1 | ANX-138 | X-Graph-Wait-Projection |
| D-GR-013 | GraphQuery v1 Zod traversals/; queryVersion 1 | Aceito v1 | ANX-132/138 | contracts/graph |
| D-GR-014 | Poll minProjectionGeneration; etag checkpoint+gen | Aceito v1 | ANX-138 | node.get handlers |
| D-GR-015 | NODE_NOT_PROJECTED 409 ≠ NOT_FOUND 404 | Aceito v1 | ANX-138 G3-02/03 | Distinção não executada |
| D-GR-016 | MERGE_CONFLICT 409 + 1 retry interno | Aceito v1 | ANX-138 | T07 spike |
| D-GR-017 | PROJECTION_TIMEOUT 504 com commandId | Aceito v1 | ANX-138 | Sync wait |
| D-GR-018 | Redis L2 + L1 LRU 30s; local-only dev | Aceito v1 | ANX-138/129 | GRAPH_CACHE_MODE |
| D-GR-019 | Cache epoch-aware (scope, epoch, generation) | Aceito v1 | ANX-138 G3-09 | cache-key tests |
| D-GR-020 | T01 ALLOW+intentHash nunca cache; DENY 60s | Aceito v1 | ANX-138/136 | GK stale ALLOW |
| D-GR-021 | Invalidação epoch + pub/sub pós-inbox ack | Aceito v1 | ANX-138 | redis-invalidate test |
| D-GR-022 | Rebuild flush via registry_generation++ | Aceito v1 | ANX-138 | full swap worker |
| D-GR-023 | Inbox idempotente eventId+consumerName | Aceito v1 | ANX-138 G3-01 | process-with-inbox |
| D-GR-024 | NATS ack após COMMIT PG inbox+generation | Aceito v1 | ANX-138/130 | Não executado PG+NATS |
| D-GR-025 | Rebuild full drain→pause→N+1→replay→F0→swap | Aceito v1 | ANX-138 G3-06 | rebuild-worker parcial |
| D-GR-026 | Ordem rebuild ownerDomain documentada | Aceito v1 | ANX-138 | identity→org→gov→… |
| D-GR-027 | nodes.batchGet max 50; 409 só node.get | Aceito v1 | ANX-138 G3-05 | Não executado |
| D-GR-028 | Poison max_attempts=5 → quarantine+DLQ+ack | Aceito v1 | ANX-138 G3-07 | poison-pill test |
| D-GR-029 | Backoff exponencial + AckWait ≥330s | Aceito v1 | ANX-138 | Política R07 |
| D-GR-030 | DLQ graph_projection_dlq; payload_ref redacted | Aceito v1 | ANX-138/155 G5-03 | Não inspecionado |
| D-GR-031 | Catch-up throttle batch 100 inflight 3 | Aceito v1 | ANX-138 | Valores plano, não medidos |
| D-GR-032 | Pending >100k bloqueia rebuild | Aceito v1 | ANX-138/158 | SLA OP01 |
| D-GR-033 | Rate limit 60/min principalId+traversalId | Aceito v1 | ANX-138 G3-10 | graph-rate-limit.ts |
| D-GR-034 | Admin rebuild/DLQ PLATFORM+audit_manifest_id | Aceito v1 | ANX-138/155 G3-08 | admin-handlers |
| D-GR-035 | OP01 read-only — sem trigger rebuild UI | Aceito v1 | ANX-164–167 | Explorer deferido |
| D-GR-036 | Partial rebuild spike design only | Aceito spike | ANX-138 S8 | GK-R08-01; não operação v1 |
| D-GR-037 | v1 operação = full generation swap only | Aceito v1 | ANX-138 | GK-R08-02 |
| D-GR-038 | OpenAPI Scalar generation | Deferido slice 2 | ANX-132/138 | GK-R08-03 |
| D-GR-039 | Auto-replay DLQ batch | Deferido R09 | ANX-138 | v1 manual PLATFORM |
| D-GR-040 | SLO lag tenants premium | Deferido R09/P07 | ANX-156/170 | Não medido |
| D-GR-041 | Alertmanager/PagerDuty | Deferido P07 | ANX-158/170 | Vendor não homologado |
| D-GR-042 | graphDlqReplayInputSchema contracts | Deferido slice 2 | ANX-132 | GK-R08-04 |
| D-GR-043 | Código graph bloqueado até R10 G0+P02 | Aceito histórico | ANX-138 | Código presente §6.4; revalidar G0 |
| D-GR-044 | F0 oracles T01–T20 antes prod; QA NOT_RUN | Aceito v1 | ANX-138/181 | Smoke t01-t05 parcial |

#### T01–T20 (R02 — classificação e disposição)

| ID | Classificação R02 | Consumidor/registrador | Disposição | Limite |
| --- | --- | --- | --- | --- |
| T01 | Kernel puro | governance grant eval | ANX-138/136 | t01-grant-evaluation.ts; F0 obrigatório |
| T02 | Kernel puro | authorization envelope | ANX-138 | Schema/handler ANX-132 |
| T03 | Kernel puro | explain traversal | ANX-138 | Smoke parcial |
| T04 | Kernel composto | agents context | ANX-139/138 | Sub-plano agents |
| T05 | Kernel puro | agents context | ANX-139/138 | Brain fachada agents |
| T06 | Kernel puro | orchestration read | ANX-140/138 | Sem mutação via graph |
| T07 | Kernel composto | capital/portfolios/connections | ANX-148/153/141/138 | Cross-domain; spike D-GR-036 |
| T08 | Híbrido registrado | strategies | ANX-147/138 | Plano registrado strategies |
| T09 | Kernel puro | portfolios | ANX-153/138 | Eventos→projeção |
| T10 | Kernel puro | decisions read | ANX-149/138 | Linhagem read-only |
| T11 | Kernel puro | execution read | ANX-151/138 | execution-go protocolo |
| T12 | Kernel puro | graph | ANX-138 | Kernel application |
| T13 | Kernel puro | orchestration impact | ANX-140/138 | Pré ChangeProposal |
| T14 | Kernel puro | graph | ANX-138 | Allowlist edges |
| T15 | Kernel puro | connections | ANX-141/138 | Inferência via T15 gate |
| T16 | Híbrido registrado | connections | ANX-141/138 | Usage autoritativo connections |
| T17 | Kernel composto | connections/billing | ANX-141/156/138 | Sub-planos registrados |
| T18 | Híbrido registrado | execution+accounting | ANX-151/152/138 | Cases ownerDomain |
| T19 | Kernel puro | simulation snapshot | ANX-159/138 | Isolado; sem promote overwrite |
| T20 | Híbrido registrado | partners | ANX-157/138 | Plano partners |

**Rodadas R01–R07:** consolidadas via crosswalk GK→D-GR em R08; não reescritas linha a linha. Homologação executável traversals, rebuild, DLQ e benchmarks permanece ANX-138/181.

## 6.16. Rastreio por capacidade — agents R09/R10

Fontes: [R09](./structure-debate/agents/R09-dev-plan.md) e [R10](./structure-debate/agents/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-AGT-001..014** e **AGT-R06-01..10** está em **§6.16.1** (ANX-201). A consulta atual dos três paths agents (módulo, contracts e testes) retorna diretórios inexistentes; isso comprova ausência nesses paths, não de todo comportamento equivalente. ANX-139 continua núcleo, ANX-143/144 capacidades avançadas.

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
| R09 pré-requisitos / R10 AC-G0-01..05, AGT-R06-01..10 e bloqueios | Histórico documental, não revalidado para candidato novo | ANX-139/181: deps atuais. **D-AGT/AGT-R06** em §6.16.1 (ANX-201). ANX-82 não autoriza reabrir fora da issue |
| R10 G2–G6 e suite387/387 | Evidência insuficiente para produto agents ausente | ANX-181: pareceres independentes e testes específicos por candidato; suite global não substitui G3-AGT-01..05 |

Não houve execução de testes agents: diretórios previstos estão ausentes. **D-AGT-001..014** e **AGT-R06-01..10** estão em §6.16.1; G5-AGT-01..05 e implementação permanecem ANX-139. OpenBots seguem ANX-124/125→144; núcleo não presume homologação dessas integrações.

### 6.16.1. A1 — disposição transitiva agents (ANX-201)

Fontes: [R08 decision log](./structure-debate/agents/R08-decision-log.md) e [R06 dependências](./structure-debate/agents/R06-dependencies.md) (relidas 2026-09-08). Módulo **não implantado** nos paths esperados (§6.16); esta subseção é disposição documental, não claim de código.

#### D-AGT-001..014 (R08)

| ID | Decisão (resumo) | Classificação | Disposição / issue | Evidência ou limite |
| --- | --- | --- | --- | --- |
| D-AGT-001 | Dono Agent, AgentVersion, Skill, Binding, Brain — não Task/Run | Aceito v1 | ANX-139 | Módulo ausente §6.16 |
| D-AGT-002 | AgentVersion imutável após publish | Aceito v1 | ANX-139 G3-AGT-02/03 | Sem impl demonstrada |
| D-AGT-003 | Brain não persiste estado de Run | Aceito v1 | ANX-140 orchestration | Run/lease fora agents |
| D-AGT-004 | Skills validadas Zod + contracts | Aceito v1 | ANX-139/132 | Schemas não no path contracts/agents |
| D-AGT-005 | PG autoritativo; Neo4j projeção graph | Aceito v1 | ANX-138/139 | consumer graph:agents:v1 |
| D-AGT-006 | T01 fail-closed pré-publish e pré-invoke | Aceito v1 | ANX-139/136/138 | AGT-R06-03; timeout 2s→deny |
| D-AGT-007 | 4 eventos v1 (created/published/deprecated/skill.updated) | Aceito v1 | ANX-139/132 | Nomes em R06; payloads não enumerados §6.16 |
| D-AGT-008 | Consumer graph:agents:v1 no graph | Aceito v1 | ANX-138 | Projector dono graph |
| D-AGT-009 | AgentRegistryPort para orchestration | Aceito v1 | ANX-139/140 | Port parcial orchestration §6.16 |
| D-AGT-010 | Sem secrets em eventos/DTOs AgentVersion | Aceito v1 | ANX-139/141 | connections resolve bindings |
| D-AGT-011 | Promotion produção exige evaluation P08 | Deferido P08 | ANX-160/171 | Sem auto-promoção |
| D-AGT-012 | Brain invoke HTTP sync + fila long-running | Aceito provisório v1 | ANX-139/140 workers | P-R6-03→R08 |
| D-AGT-013 | Autonomia L0–L4 em AgentVersion metadata | Aceito v1 | ANX-137/173 | L3/L4 não habilitados |
| D-AGT-014 | Kill switch global via governance mandate | Aceito v1 | ANX-136/139 | Mandate governance |

#### AGT-R06-01..10 (R06 — dependências)

| ID | Decisão (resumo) | Consolidado em | Disposição | Limite |
| --- | --- | --- | --- | --- |
| AGT-R06-01 | PrincipalLookup valida ownerPrincipalId | D-AGT-001 | ANX-134/139 | AGT_PRINCIPAL_NOT_FOUND |
| AGT-R06-02 | AgencyScopePort tenancy ativo | D-AGT-001 | ANX-135/139 | Sem FK cross-schema |
| AGT-R06-03 | T01 obrigatório publish/invoke externo | D-AGT-006 | ANX-136/138 | Timeout 2s |
| AGT-R06-04 | GraphContextPort T04/T05 leitura via graph | D-AGT-005 | ANX-138/139 | Sem neo4j-driver agents |
| AGT-R06-05 | Journal/outbox mesma TX PG | D-AGT-005 | ANX-139/129 | Bootstrap eventing→…→agents |
| AGT-R06-06 | Projector Neo4j graph:agents:v1 | D-AGT-008 | ANX-138 | Eventos agents.*.v1 |
| AGT-R06-07 | 4 eventos publicados; sub grant opcional | D-AGT-007 | ANX-139 | orchestration/knowledge/audit |
| AGT-R06-08 | AgentRegistryPort → orchestration | D-AGT-009 | ANX-140 | Stub até agents S4 |
| AGT-R06-09 | ModelBindingPort ref; sem connections repo | D-AGT-010 | ANX-141 | Binding ID apenas |
| AGT-R06-10 | Brain worker em apps/workers | D-AGT-012 | ANX-140/128 | Sem estado Run no módulo |

#### Deferências R08 e integrações separadas

| Item | Disposição | Limite |
| --- | --- | --- |
| P-R7-02 OpenAPI Scalar | Defer S8 | ANX-139/132 |
| P-R7-03 Brain streaming SSE | Defer pós-v1 | ANX-139/141/168 |
| OpenBots | ANX-124/125→144 | Fora núcleo agents |
| Teammates / CEO blueprint | ANX-143/135/140 | Saga onboarding fora v1 |
| G5-AGT-01..05 cenários R07 | ANX-139/181 | Recuperar R07; não executado |

**Rodadas R01–R05:** incorporadas em R06/R08; domain sketch mínimo em R09 S1 (P-R7-01). Implementação executável permanece ANX-139.

## 6.17. Rastreio por capacidade — orchestration R09/R10

Fontes: [R09](./structure-debate/orchestration/R09-dev-plan.md) e [R10](./structure-debate/orchestration/R10-g0-handoff.md), relidos integralmente em 2026-09-08. O rastreio transitivo **D-ORC-001..056** está em **§6.17.1** (ANX-202). ANX-140 executa o delta e ANX-133 a fundação de workers. Inventário atual confirma commands de heartbeat/sweeper, embora não exista pasta `src/workers` no módulo; paths relativos a `backend/modules/orchestration/src/application/`.

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
| R09 pré-requisitos / R10 AC-G0-01..08, PC-G0-01..10, DEP-01..08, H-01..05, B-01..04 | Histórico9/10, dependências e autorização a revalidar | ANX-140/181: revalidar G0. **D-ORC-001..056** em §6.17.1 (ANX-202); checklist20/G5 permanecem pendentes execução |

Os tempos/limites acima vêm do plano histórico, exigem config tipada e reconciliação com contrato vigente. A ligação ao Dashi descrita nesses slices é integração explícita de desenvolvimento, não dependência universal de cada Task/Run do produto. **D-ORC-001..056** estão em §6.17.1; G5 checklist20 e homologação executável permanecem ANX-140. Nenhum worker, webhook, teste integrado ou cleanup foi executado.

### 6.17.1. A1 — disposição transitiva orchestration (ANX-202)

Fonte primária: [R08 decision log](./structure-debate/orchestration/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.17); esta subseção não revalida G3/G5 nem executa workers.

#### D-ORC-001..028 (R08 — domínio, contratos, storage)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-ORC-001 | Dono Goal/Task/Run/lease/scheduler | Aceito v1 | ANX-140 | Sem grants/Neo4j |
| D-ORC-002 | Modos HIERARCHY_TREE e CIRCULAR | Aceito v1 | ANX-140/135 | ADR0005/spec006 |
| D-ORC-003 | Org nova default CIRCULAR; import TREE | Aceito v1 | ANX-135 | OH-T06 |
| D-ORC-004 | Centro Owner+CEO; pipeline G0–G7 | Aceito v1 | ANX-140/181 | AGENTS.md gates |
| D-ORC-005 | Checkout TaskLease idempotente | Aceito v1 | ANX-140 G3-01 | checkout-task.ts |
| D-ORC-006 | Heartbeat fila PG + Run FSM | Aceito v1 | ANX-140/133 | record/dequeue heartbeat |
| D-ORC-007 | goalAncestry[] denormalizado | Aceito v1 | ANX-140 | Goal DAG orch |
| D-ORC-008 | Board override Owner; G7 único done | Aceito v1 | ANX-140 G3-05 | GateBinding |
| D-ORC-009 | Dashi claim ANX-*; orch espelha | Aceito v1 | ANX-140 | Dev integration only |
| D-ORC-010 | TREE: checkout/ancestry iguais | Aceito v1 | ANX-140 | Audit+GateBinding |
| D-ORC-011 | CIRCULAR: G4/G5 fail → ESCALATES_TO | Aceito v1 | ANX-138/140 | graph read |
| D-ORC-012 | GateBinding schema v1 normativo | Aceito v1 | ANX-132/140 | gateBindingV1 |
| D-ORC-013 | TTL lease 4h; renew cap 8h | Aceito v1 | ANX-140 G3-06 | Config tipada |
| D-ORC-014 | Evento checked_out sem leaseToken | Aceito v1 | ANX-132/140 | Payload v1 |
| D-ORC-015 | PlanRevision agregado separado | Aceito v1 | ANX-140 | migration 0002 defer |
| D-ORC-016 | Mirror webhook + polling 60s | Aceito v1 | ANX-140/129 | taskboard mirror |
| D-ORC-017 | RecordGateDisposition invalida PASS | Aceito v1 | ANX-140 | Digest change |
| D-ORC-018 | CIRCULAR: gate event → ReviewEdge graph | Aceito v1 | ANX-138 | graph:orchestration:gate |
| D-ORC-019 | Comentário board ≠ GateBinding | Aceito v1 | ANX-140 | Unidirecional |
| D-ORC-020 | gateBindingV1Schema Zod normativo | Aceito v1 | ANX-132 | JSON Schema derivado |
| D-ORC-021 | 6 eventos v1 mapeados | Aceito v1 | ANX-132/140 | Ver tabela abaixo |
| D-ORC-022 | HTTP /v1/orchestration/* 10 rotas | Aceito v1 | ANX-140 | Sketch R04 |
| D-ORC-023 | Webhook dedupe; comandos+outbox | Aceito v1 | ANX-140 G3-04 | ingest webhook |
| D-ORC-024 | HMAC webhook opcional v1 | Aceito v1 | ANX-140 | D-ORC-051 prod |
| D-ORC-025 | NOT_APPLICABLE exige reason | Aceito v1 | ANX-140 | Demais exigem digest |
| D-ORC-026 | leaseToken só HTTP checkout/renew | Aceito v1 | ANX-140 | Nunca evento/log |
| D-ORC-027 | CIRCULAR: evento gate binding completo | Aceito v1 | ANX-138 | Projeção graph |
| D-ORC-028 | TaskLease tabela filha 1:1 | Aceito v1 | ANX-140 | Não colunas em tasks |

#### D-ORC-029..056 (R08 — deps, riscos, deferências)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-ORC-029 | Heartbeat fila PG coalesce | Aceito v1 | ANX-140/133 | Não Redis lock |
| D-ORC-030 | gate_bindings append-only | Aceito v1 | ANX-140 | invalidated_at |
| D-ORC-031 | command_journal idempotência HTTP | Aceito v1 | ANX-140 G5-05 | Hash mismatch |
| D-ORC-032 | Migrations 0000 core + 0001 índices | Aceito v1 | ANX-140 | §6.4 inventário |
| D-ORC-033 | taskboard_mirror dedupe | Aceito v1 | ANX-140 | issue+version+status |
| D-ORC-034 | PrincipalLookup valida reviewer G7 | Aceito v1 | ANX-134/140 | identity port |
| D-ORC-035 | OrganizationScopePort fail-closed | Aceito v1 | ANX-135/140 | ORC_SCOPE_DENIED |
| D-ORC-036 | T01 obrigatório checkout/renew 2s | Aceito v1 | ANX-136/138 | 503 deny |
| D-ORC-037 | GraphQueryPort read-only escalation | Aceito v1 | ANX-138/140 | CIRCULAR explain |
| D-ORC-038 | Journal/outbox mesma TX PG | Aceito v1 | ANX-140/129 | eventing bootstrap |
| D-ORC-039 | TaskboardMirrorPort; Dashi não autoridade lease | Aceito v1 | ANX-140 | Mirror table |
| D-ORC-040 | Projector graph:orchestration:gate:v1 | Aceito v1 | ANX-138 | Dono graph |
| D-ORC-041 | Publica 6 eventos; não subscreve v1 | Aceito v1 | ANX-140 | Downstream async |
| D-ORC-042 | AgentRegistryPort stub v1 permissivo | Aceito v1 | ANX-140/139 | D-ORC-053 forte |
| D-ORC-043 | Workers sweeper+heartbeat apps/workers | Aceito v1 | ANX-133/140 | Composition root |
| D-ORC-044 | Checkout bloqueado se board ≠ in_progress | Aceito v1 | ANX-140 G3-01 | ORC_MIRROR sync |
| D-ORC-045 | Mirror done/canceled exige G7 PASS | Aceito v1 | ANX-140 | ORC_MIRROR_REJECTED |
| D-ORC-046 | G7 PASS: reviewerId isOwnerPrincipal | Aceito v1 | ANX-140 | Comentário ignorado |
| D-ORC-047 | Sweeper batch máx 100 + jitter | Aceito v1 | ANX-140/133 | sweep-expired-leases |
| D-ORC-048 | Heartbeat coalesce 30s; cap 10k/org | Aceito v1 | ANX-140 G5-04 | Backpressure |
| D-ORC-049 | Checklist G5 R07 gate pré-G1 | Aceito v1 | ANX-140/181 | 20 itens não executados |
| D-ORC-050 | SLO T01 p99 2s/5s + breaker | Aceito v1 | ANX-140/170 | P-R7-01 resolvido |
| D-ORC-051 | Prod HMAC webhook obrigatório | Aceito v1 | ANX-140/129 | ORC_WEBHOOK_HMAC_REQUIRED |
| D-ORC-052 | in_review: lease renovável; done exige G7 | Aceito v1 | ANX-140 | P-R7-03 resolvido |
| D-ORC-053 | AgentRegistryPort forte agents P04 | Aceito v1 | ANX-139/140 | P-R7-05 critérios |
| D-ORC-054 | OpenAPI Scalar generation | Deferido R09 | ANX-140/132 | S8 |
| D-ORC-055 | plan_revisions migration 0002 | Deferido R09 | ANX-140 | S9 spike |
| D-ORC-056 | G5 CI sandbox automatizado | Deferido R09 | ANX-140/181 | Manual sandbox baseline |

#### Artefatos contratuais referenciados (D-ORC-021/022)

| Artefato | Disposição | Limite |
| --- | --- | --- |
| 6 eventos v1 (`task.checked_out`, gate disposition, etc.) | ANX-132/140 | Mapa eventType→schema R04 |
| 10 rotas HTTP sketch | ANX-140 | get-task, checkout, renew, webhook, admin… |
| gateBindingV1Schema | ANX-132 | Normativo antes código |

**Rodadas R01–R07:** crosswalk ORCH-R02..R08 → D-ORC em R08. Homologação executável G3/G5, workers runtime e mirror real permanecem ANX-140/133/181.

## 6.18. Rastreio por capacidade — connections R09/R10

Fontes: [R09](./modules/connections/R09-dev-plan.md) e [R10](./modules/connections/R10-g0-handoff.md), relidos integralmente em 2026-09-08. O rastreio transitivo **D-CX-001..064** está em **§6.18.1** (ANX-203). Fonte primária: [R08 decision log](./modules/connections/R08-decision-log.md). Inventário parcial: register-ai-account/invoke-inference, ports e migrations 0000/0001. ANX-141 é a continuação.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 core / G3-S1-01/02 | Parcial: register-ai-account.ts, UoW/journal e migration0000 presentes | ANX-141/132: account/provider/binding e contracts completos, registered outbox, replay commandId HTTP definido e payload conflitante |
| R09 S1 activateBinding / G3-S1-03 | Não demonstrado no inventário de commands | ANX-141: localizar equivalente, negar sem grant CX_GRANT_INVALID, readiness/conta/tenant/mode explícitos |
| R09 G3-S1-04/05 / G4-04 / G5-04 | Não verificado em execução | ANX-141/131: falha outbox zero estado parcial, cross-org403, autorização também em replay/race; application tenancy não prova RLS |
| R09 S2 terminal / G3-S2-01/02 | Parcial: invoke-inference.ts SIMULATED observado na §6.5 | ANX-141: usage+completed coerentes, mesma idempotencyKey retorna request original, custos/retries sem duplicação; simulado não homologa provider |
| R09 S2 UNKNOWN / G3-S2-03 / G5-03 | Não demonstrado no fluxo inspecionado anteriormente | ANX-141: timeout incerto gera UNKNOWN/evento e reconciliação durável, sem retry cego, troca de conta/provider ou dupla cobrança |
| R09 S2 streaming / G3-S2-04 | Port terminal Promise registrado na §6.5, streaming não demonstrado | ANX-141/168: chunks versionados, um terminal, cancelamento/backpressure/erro e usage parcial/final |
| R09 S2 waitingHuman / G3-S2-05 / G5-07 | Não demonstrado | ANX-141/140: TASKBOARD consumer retorna espera sem mover board, callback repetido/tardio idempotente; estado Task/Run no owner orchestration |
| R09 S3 / G3-S3-01/02/03 / G5-02/10 | Migration0002 não presente neste inventário; mecanismo equivalente não demonstrado | ANX-141: DL-CX2 vinte PLATFORM paralelas/três contas, replay mantém conta/lease único, AGENCY cursor com lock+revision; quotas concorrentes não excedidas |
| R09 S4 / G3-S4-01/02 | Migration0003 não presente no inventário; catálogo completo não demonstrado | ANX-141: offerings/releases/subscriptions, readiness nega invoke; PG autoritativo, SQLite opcional só cache reconstruível, sem autoridade de quota/grant |
| R09 S5 reconcile / G3-S5-01 | Não demonstrado; migration0004 ausente no inventário | ANX-141: case→resolved com evidência e evento reconciled;24h é alvo do plano, não SLA medido/garantido |
| R09 S5 reaper / G3-S5-02 | Não demonstrado | ANX-141/133: liberar só lease expires_at<now, fencing e race com uso ativo, nenhuma quota liberada duas vezes |
| R09 S5 registry/profiles/probes/breaker / G3-S5-03 / G5-08 | Não demonstrado como conjunto | ANX-141: homologação/config/perfil explícitos, probes reais, breaker governance503 fail-closed; upstream cascade não causa fallback permissivo |
| R09 EndpointPolicy / G4-01 / G5-01/06 | Não verificado | ANX-141/129: metadata URL negada, SSRF e redirects/OAuth avaliados em sandbox autorizado; secrets apenas no adapter autorizado |
| R09 secrets/mode/stub / G4-02/03/06 / G5-09 | Não verificado integralmente | ANX-141/129: snapshots eventos sem chaves proibidas, LIVE_TRADING rejeitado, prod+stub startup fail; inferência real autorizada não equivale a execução financeira REAL |
| R09 G4-05/07 / G5-05 | Não verificado | ANX-141/136: revogação mid-invoke, consumerKind derivado de contexto confiável e spoof ignorado; uso OWNER observado não cobre todos consumidores |
| R09 G4-08 AR01 | Não verificado neste incremento | ANX-141/128: imports resolvidos, application via ports, sem acesso privado cross-module e sem provider SDK no domínio |
| R09 defer REAL_EXECUTION/broker live | Fora de connections P05 | ANX-172 permanece backlog sem ativação; execution/adapters por contratos próprios, inferência não recebe permissão de trade implicitamente |
| R09/R10 defer RLS | Planejado | ANX-131: políticas/roles/contexto/testes PG; fase histórica P09 não substitui sequência aceita |
| R09 defer GrantValidation HTTP multi-VM | Planejado, não requisito de deploy multi-VM imediato | ANX-141/136: preservar port, decidir transporte quando houver requisito, autenticação/epoch/fail-closed e compatibilidade sem duplicar autoridade |
| R09 billing consumer / graph projector | Planejado fora de connections | ANX-156/138: usage comercial deduplicado e graph:connections:v1 reconstruível, sem escrever ledger financeiro ou grafo direto em connections |
| R09 SINGLE_ACCOUNT_WAIT | Deferido pós-v1 | ANX-141: disposição explícita de espera/limite/timeout; proibir troca silenciosa de conta para escapar da quota |
| R09 pré-requisitos / R10 AC-G0-01..10, PC-G0-01..10, riscos/handoff | Histórico documental; matriz G5 aponta execução futura | ANX-141/181: revalidar candidato. **D-CX-001..064** em §6.18.1 (ANX-203); G5-CX não executado |

Os IDs G3-S* na tabela abreviam G3-CX-S* do R09. **D-CX-001..064** estão em §6.18.1; R04 schemas, DL-CX2 executável e homologação G5-CX permanecem ANX-141/181. Nenhum provider, callback, quota ou teste integrado foi acionado neste incremento.

### 6.18.1. A1 — disposição transitiva connections (ANX-203)

Fonte primária: [R08 decision log](./modules/connections/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.18); esta subseção não revalida G3/G5 nem executa invoke/provider real.

**Saldo R08:** 64 decisões · aceitas v1: 58 · G1 pendentes: 2 (D-CX-059, D-CX-060) · deferidas: 4 (D-CX-061..064).

#### D-CX-001..032 (R08 — fronteiras, domínio, contratos, storage)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-CX-001 | Dono ProviderSubscription, AIAccount, ConnectionBinding, quotas, usage | Aceito v1 | ANX-141 | Sem Goal/Task/Run |
| D-CX-002 | Escopo v1 SIMULATED+PAPER apenas | Aceito v1 | ANX-141 | Sem REAL_EXECUTION |
| D-CX-003 | Goal/Task/Run, WAITING_HUMAN workflow → orchestration | Aceito v1 | ANX-140/141 | connections retorna waitingHuman |
| D-CX-004 | Grant/epoch/consent → governance; connections fail-closed | Aceito v1 | ANX-136/141 | GrantValidationPort |
| D-CX-005 | UsageRecord autoritativo PG; billing consome evento | Aceito v1 | ANX-156/141 | Sem ledger em connections |
| D-CX-006 | Neo4j via graph:connections:v1 — sem dual-write | Aceito v1 | ANX-138/141 | Dono graph |
| D-CX-007 | ConnectionKind sem REAL_EXECUTION persistível | Aceito v1 | ANX-141/132 | CX-R02-INV-01 |
| D-CX-008 | Resolver rejeita REAL_EXECUTION legado | Aceito v1 | ANX-141 | CX_CONNECTION_KIND_NOT_SUPPORTED |
| D-CX-009 | effectClass=LIVE_TRADING proibido registry v1 | Aceito v1 | ANX-141/172 | Adapter registry |
| D-CX-010 | Import 9Router live → deferred/rejected | Aceito v1 | ANX-141 | Nunca ACTIVE silencioso |
| D-CX-011 | OpenAPI/docs não listam REAL_EXECUTION | Aceito v1 | ANX-132/141 | Contratos públicos |
| D-CX-012 | DTOs: secretRef/secretId apenas | Aceito v1 | ANX-129/141 | CX-R02-SEC-01 |
| D-CX-013 | Eventos connections.*.v1 sem chaves/tokens | Aceito v1 | ANX-132/141 | CX-R02-SEC-02 |
| D-CX-014 | Neo4j sem secret em propriedade | Aceito v1 | ANX-138/141 | CX-R02-SEC-03 |
| D-CX-015 | Secret injetado só boundary infra pós grant+epoch | Aceito v1 | ANX-129/141 | CX-R02-SEC-04 |
| D-CX-016 | OAuth redirect sem credential host não aprovado | Aceito v1 | ANX-141/129 | EndpointPolicy |
| D-CX-017 | Dois agregados: AIAccount + ConnectionBinding | Aceito v1 | ANX-141 | CX-R03-01 |
| D-CX-018 | ConnectionResolver único entry point | Aceito v1 | ANX-141 | CX-R03-02 |
| D-CX-019 | RuntimeAdapter port infra; domain puro | Aceito v1 | ANX-141/128 | CX-R03-03 |
| D-CX-020 | AgentModelBindingRef em agents, validado connections | Aceito v1 | ANX-139/141 | CX-R03-04 |
| D-CX-021 | Usage + outbox mesma UoW PG | Aceito v1 | ANX-141/129 | CX-R03-05 |
| D-CX-022 | Fairness PLATFORM: sequence+lease mesma TX (DL-CX2) | Aceito v1 | ANX-141 G3-S3 | CX-R03-06 |
| D-CX-023 | PascalCase ANX-62 → connections.*.v1 outbox | Aceito v1 | ANX-132/141 | CX-R04-01 |
| D-CX-024 | InferenceRequirements em contracts/inference | Aceito v1 | ANX-132/141 | CX-R04-02 |
| D-CX-025 | Stream + terminal único; billing fecha terminal+usage | Aceito v1 | ANX-141/168 | CX-R04-03 |
| D-CX-026 | HTTP /v1/connections/* delega mesmo handler SDK | Aceito v1 | ANX-141 | CX-R04-04 |
| D-CX-027 | GrantValidationPort in-process v1 | Aceito v1 | ANX-136/141 | CX-R04-05 |
| D-CX-028 | Testes contrato bloqueiam REAL_EXECUTION schema | Aceito v1 | ANX-141/132 | CX-R04-06 |
| D-CX-029 | secret_id + secret_generation colunas PG | Aceito v1 | ANX-141 | CX-R05-01 |
| D-CX-030 | Binding ACTIVE imutável — nova versão p/ mudança | Aceito v1 | ANX-141 | CX-R05-02 |
| D-CX-031 | connections_command_journal obrigatório v1 | Aceito v1 | ANX-141 | CX-R05-04 |
| D-CX-032 | Stream events journal-only; terminal+usage em PG | Aceito v1 | ANX-141/168 | CX-R05-05 |

#### D-CX-033..064 (R08 — deps, riscos, G1 e deferências)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-CX-033 | SQLite proibido quota/fairness | Aceito v1 | ANX-141 | Só catálogo descartável |
| D-CX-034 | Migrations P05 slices S1–S5 incrementais | Aceito v1 | ANX-141 | CX-R05-08 |
| D-CX-035 | Sem import repos privados agents/orch/billing/graph | Aceito v1 | ANX-128/141 | CX-R06-01 |
| D-CX-036 | OrganizationScopePort tenancy obrigatório | Aceito v1 | ANX-135/141 | CX-R06-03 |
| D-CX-037 | PrincipalLookup via adapter organizations | Aceito v1 | ANX-134/141 | CX-R06-04 |
| D-CX-038 | SecretPort stub P02 OK SIMULATED; gate prod ANX-36 | Aceito v1 | ANX-129/141 | CX-R06-05 |
| D-CX-039 | Journal/outbox @anxionos/eventing mesma TX | Aceito v1 | ANX-141/129 | CX-R06-06 |
| D-CX-040 | Consumer graph:connections:v1 no módulo graph | Aceito v1 | ANX-138/32 | CX-R06-07 |
| D-CX-041 | billing async via connections.usage.recorded.v1 | Aceito v1 | ANX-156/141 | CX-R06-08 |
| D-CX-042 | orchestration/agents via @anxionos/connections index | Aceito v1 | ANX-140/139/141 | CX-R06-09 |
| D-CX-043 | Bootstrap: eventing→identity→org→gov→secrets→connections | Aceito v1 | ANX-141/181 | CX-R06-10 |
| D-CX-044 | deltaRef stream — dono audit; connections emite ref | Aceito v1 | ANX-141 | CX-R06-11 |
| D-CX-045 | EndpointPolicy obrigatório HTTP/OAuth/MODEL | Aceito v1 | ANX-141/129 | CX-R07-01 |
| D-CX-046 | Timeout invoke → unknown + connections.call.unknown.v1 | Aceito v1 | ANX-141 G3-S2-03 | CX-R07-03 |
| D-CX-047 | Reconcile worker SLA 24h; succeeded/failed/void_usage | Aceito v1 | ANX-141 S5 | CX-R07-04 |
| D-CX-048 | RLS PG v1 não obrigatório — app guards + G5 cross-tenant | Aceito v1 | ANX-131/141 | Paridade organizations |
| D-CX-049 | WAITING_HUMAN: connections retorna waitingHuman; orch dono Run | Aceito v1 | ANX-140/141 | Não move board |
| D-CX-050 | consumerKind derivado grant/sessão — header ignorado | Aceito v1 | ANX-141 G4-05 | CX-R07-06 |
| D-CX-051 | Governance/org down → 503 fail-closed — sem cache grant | Aceito v1 | ANX-136/141 | CX-R07-07 |
| D-CX-052 | SecretPort stub só NODE_ENV≠prod + ALLOW_SECRETS_STUB | Aceito v1 | ANX-129/141 | CX-R07-08 |
| D-CX-053 | Checklist G5 R07 gate obrigatório pré-G1 | Aceito v1 | ANX-141/181 | G5-CX não executado |
| D-CX-054 | command_journal retenção 90d hot PG + archival R09 | Aceito v1 | ANX-141 | CX-R06-13 |
| D-CX-055 | Circuit breaker upstream: 5 falhas/30s, half-open 1 probe | Aceito v1 | ANX-141 S5 | P-R7-02 |
| D-CX-056 | EndpointPolicy admin allowlist: connections.platform_admin | Aceito v1 | ANX-136/141 | P-R7-04 |
| D-CX-057 | Resume WAITING_HUMAN: ${idempotencyKey}:resume:${operationId} | Aceito v1 | ANX-140/141 | P-R7-05 |
| D-CX-058 | SINGLE_ACCOUNT_WAIT deadline → CX_QUOTA_EXCEEDED + retryAfter | Aceito v1 | ANX-141 | P-R7-07 |
| D-CX-059 | @anxionos/contracts/connections/* schemas públicos | G1 pendente | ANX-36 S1/132 | ANX-141 bloqueado sem schemas |
| D-CX-060 | Workers: reconcile, lease reaper, credential refresh | G1 pendente | ANX-36 S5/133 | ANX-141 S5 |
| D-CX-061 | REAL_EXECUTION / broker live | Deferido | ANX-172 | Epic separado ADR |
| D-CX-062 | RLS PostgreSQL defense-in-depth | Deferido P09 | ANX-131 | Após G5 evidence |
| D-CX-063 | GrantValidation HTTP multi-processo | Deferido multi-VM | ANX-141/136 | Preservar port |
| D-CX-064 | Tabela dedicada stream chunks v1 | Deferido volume | ANX-168 | ALT-CX-R05-06 |

#### Artefatos contratuais referenciados (D-CX-023/026)

| Artefato | Disposição | Limite |
| --- | --- | --- |
| Eventos connections.*.v1 (PascalCase ANX-62) | ANX-132/141 | Mapa eventType→schema R04 |
| HTTP /v1/connections/* | ANX-141 | Paridade handler SDK |
| InferenceRequirements + invoke path | ANX-141/168 | SIMULATED≠provider real |
| DL-CX2 fairness PLATFORM | ANX-141 G3-S3 | TX única sequence+lease |

**Rodadas R01–R07:** crosswalk CX-R02..R08 → D-CX em R08. Homologação executável G3/G5, providers reais e workers S5 permanecem ANX-141/133/181.

## 6.19. Rastreio por capacidade — knowledge R09/R10

Fontes: [R09](./structure-debate/knowledge/R09-dev-plan.md) e [R10](./structure-debate/knowledge/R10-g0-handoff.md), relidos integralmente em 2026-09-08. O rastreio transitivo **D-KN-001..020** está em **§6.19.1** (ANX-204). Fonte primária: [R08 decision log](./structure-debate/knowledge/R08-decision-log.md). Inventário parcial: register-knowledge-source, ingest-document, publish-index, text-chunking e worker sob application/workers. Continuação ANX-142.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 sources/documents/journal/contracts | Parcial: register-knowledge-source.ts e command-journal/UoW presentes | ANX-142/132: schemas, ownership, versão, dedupe e estado+journal+outbox; erro de typecheck anteriormente executado na §6.5 precisa revalidação/correção pelo executor |
| R09 S2 pgvector/chunks/EmbeddingPort | Parcial: embedding-port.ts, text-chunking e ingest presentes; pseudoVector observado na §6.5 | ANX-142/141: dimensões/modelVersion/IDs/cardinalidade e espaços de embedding, provider autorizado e custos; vetor hash não equivale a embedding semântico homologado |
| R09 G3-KN-S1-01 ingest idempotente | Parcial por presença do comando, não reexecutado | ANX-142: mesmo documento/versão não duplica chunks/custo/eventos, payload conflitante e concorrência com falha parcial |
| R09 G3-KN-S1-02 publish atomic | Parcial: publish-index.ts presente, contagem verificada na inspeção anterior | ANX-142: falha parcial não altera activeVersion, generation/manifest íntegros e rollback; contagem sozinha não valida correspondência/modelo |
| R09 S2 ingest worker | Parcial: application/workers/ingest-document-worker.ts presente | ANX-142/133: composição/scheduler, retry/checkpoint/fencing, cancelamento e backpressure; fachada run não prova execução contínua |
| R09 S3 memories/evidence/embedding_spaces | Não demonstrado pelo inventário de comandos/ports | ANX-142: ciclo candidata/verificada/revogada, evidência/proveniência, versões/ACL e armazenamento conforme contrato; buscar equivalentes antes de criar |
| R09 G3-KN-S2-02 verifyMemory | Não verificado | ANX-142: sem evidência resulta KN_INSUFFICIENT_EVIDENCE; evidência inválida/revogada não promove memória |
| R09 G3-KN-S3-02 / G5-KN-04 revoke/expiry | Não verificado | ANX-142/138: revogação exclui retrieval vetorial/grafo/cache dentro do TTL contratual, corrida e cache stale não vazam conteúdo; memory-expiry worker testado com relógio controlado |
| R09 S4 RetrievalPort/query / G3-KN-S2-01 | Não demonstrado no inventário de ports | ANX-142: ACL deny retorna vazio+audit conforme contrato, filtros antes de disponibilizar conteúdo, recall medido com dataset autorizado |
| R09 G5-KN-01 / G4-KN-02 | Não verificado no candidato atual | ANX-142/131: vector query cross-tenant não retorna dados, document GET cross-org403; filtro de aplicação não comprova RLS |
| R09 context manifests / G3-KN-S3-01 / G4-KN-04 | Não demonstrado | ANX-142: truncamento por budget com proveniência/rastreio, sem hiddenReasoning e sem conteúdo não autorizado, tamanho/custo reproduzíveis |
| R09 G5-KN-02 poisoning | Não verificado | ANX-142: documento é dado não instrução; injection no manifest não amplia tools/grants nem altera políticas. Sandbox e casos negativos explícitos |
| R09 GraphTraversalPort / G4-KN-03 / G5-KN-05 | Não demonstrado como integração completa | ANX-142/138: T05/T10 e expansões somente registradas/autorizadas, sem grant deny, limites/ACL revalidados; nenhum Cypher livre |
| R09 G4-KN-01 / G5-KN-03 | Não verificado | ANX-142/132: schema/lint/evento realmente persistido não contém float[]/embeddings; inspeção de todos os produtores pertinentes, não só fixture limpa |
| R09 S5 HTTP/OpenAPI | Não verificado integralmente | ANX-142: /v1/knowledge, contratos/erros/auth e OpenAPI coerentes; paridade handler humano/agente sem lógica duplicada |
| R09 deps connections/agents/graph | Ports/consumidores planejados, integração não provada | ANX-141/139/138: embedding via connections, Brain consome contexto autorizado, graph:knowledge:v1 derivado. “embed stub” do plano não autoriza mock em produção |
| R10 RLS / Timescale fora de knowledge | Deferências/ownership documentados | ANX-131 trata RLS; ANX-145/146 séries de mercado. Não criar ledger de séries autoritativo em knowledge por proximidade técnica |
| R09 AC-R09-01..04 / R10 PC-G0-01..10 e handoff | Checklist histórico; mapa D-KN afirmado no R09 não está desdobrado ali | **D-KN-001..020** em §6.19.1 (ANX-204); G5-KN não executado |
| R10 G4 parcial/G5 parcial versus veredito PASS | Conflito de evidência preservado, não encerrado por resumo | ANX-142/181: G4-KN-03/04 e G5-KN-02/04/05 permanecem pendentes até relatório/teste/disposição autorizada, revalidar demais cenários afetados |

Não foi executado novo teste de knowledge neste incremento. **D-KN-001..020** estão em §6.19.1; spec002/R04 schemas executáveis e G5-KN permanecem ANX-142/181. Nenhuma memória/documento real foi ingerido, publicado ou revogado.

### 6.19.1. A1 — disposição transitiva knowledge (ANX-204)

Fonte primária: [R08 decision log](./structure-debate/knowledge/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.19); esta subseção não revalida G3/G5 nem executa ingest/retrieval real.

**Saldo R08:** 20 decisões · aceitas v1: 18 · G1 pendentes: 2 (D-KN-019, D-KN-020).

#### D-KN-001..020 (R08 — domínio, contratos, storage, deps)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-KN-001 | Dono Document/Memory/Evidence/ContextManifest/EmbeddingSpace | Aceito v1 | ANX-142 | spec002 |
| D-KN-002 | pgvector PG owner knowledge (ADR0004) | Aceito v1 | ANX-142 | Sem Timescale |
| D-KN-003 | ACL pré-filtro antes vector search | Aceito v1 | ANX-142 G5-KN-01 | R07 reforço |
| D-KN-004 | BrainFacade agents — knowledge persiste corpus | Aceito v1 | ANX-139/142 | Dono corpus |
| D-KN-005 | GraphTraversalPort read-only via graph module | Aceito v1 | ANX-138/142 | SDK in-process v1 |
| D-KN-006 | Embedding compute via connections MODEL | Aceito v1 | ANX-141/142 | Sem mock prod |
| D-KN-007 | Eventos sem vetores/texto bruto/secrets | Aceito v1 | ANX-132/142 | G4-KN-01 |
| D-KN-008 | context.manifest.created.v1 ownerDomain knowledge | Aceito v1 | ANX-132/142 | P-R7-01 |
| D-KN-009 | BlobStorePort shared contracts/storage | Aceito v1 | ANX-132/142 | P-R7-03 |
| D-KN-010 | Neo4j async graph:knowledge:v1 | Aceito v1 | ANX-138/32 | Sem dual-write |
| D-KN-011 | Working memory TTL owner knowledge | Aceito v1 | ANX-142 | Config tipada |
| D-KN-012 | PromoteMemory via evaluation gate | Aceito v1 | ANX-160/142 | evaluation owner P08 |
| D-KN-013 | SQLite só ACL cache descartável | Aceito v1 | ANX-142 | Sem autoridade |
| D-KN-014 | command_journal HTTP idempotency | Aceito v1 | ANX-142 | 90d hot PG |
| D-KN-015 | RLS PG defer P09 — application guards | Aceito v1 | ANX-131/142 | Paridade org |
| D-KN-016 | knowledge.document.revoked.v1 ACL document | Aceito v1 | ANX-132/142 | P-R7-05 |
| D-KN-017 | Timescale fora knowledge | Aceito v1 | ANX-145/146 | market-data owner |
| D-KN-018 | RetrievalSession audit efêmera | Aceito v1 | ANX-142 | Sem persistência longa |
| D-KN-019 | @anxionos/contracts/knowledge/* schemas públicos | G1 pendente | ANX-86/132 | ANX-142 bloqueado |
| D-KN-020 | Workers ingestion/index | G1 pendente | ANX-86/133 | ANX-142 S2 |

#### Resoluções P-R7 referenciadas

| P-R7 | Decisão | ID |
| --- | --- | --- |
| P-R7-01 | Prefix context.manifest.created.v1 | D-KN-008 |
| P-R7-02 | GraphTraversal SDK in-process v1 | D-KN-005 |
| P-R7-03 | BlobStore @anxionos/contracts/storage | D-KN-009 |
| P-R7-04 | Retrieval scores RetrievalPolicy versionada env | R07 KN-R07-02 |
| P-R7-05 | document revoke event | D-KN-016 |
| P-R7-06 | RLS v1 application-only defer P09 | D-KN-015 |
| P-R7-07 | command_journal 90d hot + archival R09 | D-KN-014 |

**Rodadas R01–R07:** crosswalk KN-R02..R08 → D-KN em R08. Homologação executável G3/G5, embedding real e workers ingestion permanecem ANX-142/133/181.

## 6.20. Rastreio por capacidade — market-data R09/R10

Fontes: [R09](./structure-debate/market-data/R09-dev-plan.md) e [R10](./structure-debate/market-data/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-MD-001..018** está em **§6.20.1** (ANX-205). Fonte primária: [R08 decision log](./structure-debate/market-data/R08-decision-log.md). Inventário parcial: register-instrument, record-observation e observed-consumer, além de UoW/journal. ANX-145 cobre ingest/realtime/qualidade; ANX-146 histórico e semântica temporal.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 instruments/specs/aliases/contracts / G3-MD-S1-01 | Parcial: register-instrument.ts presente | ANX-145/132: registry versionado, idempotência, payload conflitante, instrumento/venue/asset class e alias não ambíguo; mapear schemas/erros R04 |
| R09 S2 hypertables/headers/recordObservation / G3-MD-S1-02 | Parcial: record-observation.ts e observed-consumer.ts presentes | ANX-145: Timescale real, sourceEventId deduplica sob concorrência/reconexão, estado+journal/outbox atômicos e event/receive time preservados |
| R09 G3-MD-S3-01 observed sem instrumento | Parcial: retorno null previsto no plano e observado na §6.6 | ANX-145: manter disposição explícita sem fabricar instrumento/preço; definir observabilidade e recuperação de mapeamento, não transformar null documentado em erro por inferência |
| R09 G5-MD-03 duplicate flood | Não verificado | ANX-145: flood/replay idempotente com backpressure, sem duplicar ticks/candles/eventos nem ultrapassar limites por tenant/stream |
| R09 S3 freshness / G3-MD-S2-01 / G5-MD-04 | Não demonstrado no inventário | ANX-145/146/150: getPriceAsOf stale nega uso sensível em risk, relógio/política explícitos e metadata de qualidade; não usar last-known silenciosamente |
| R09 S1/S4 resolveInstrument / G3-MD-S2-02 | Não demonstrado como query/HTTP no inventário | ANX-145: resolução alias determinística por venue/tempo/escopo, ambiguidade e símbolo inválido retornam erro rastreável |
| R09 S3 market_events / G3-MD-S3-02 | Não demonstrado | ANX-146: fato de mercado não posta ledger; corporate action raw/adjusted e proveniência; accounting decide efeitos financeiros pelo seu contrato |
| R09 S3 datasets / S5 replay loader | Não demonstrado | ANX-146: histórico paginado/retomável, snapshots point-in-time, calendário/FX/raw-adjusted, sem lookahead; replay não emite ordem |
| R09 S4 rollup candles | Não demonstrado | ANX-145/146: agregação temporal determinística, gaps/out-of-order/correções, timeframe/timezone/sessões e revisão de candle rastreáveis |
| R09 S4 quality monitor / G5-MD-05 | Parcial: consumer aplica OK no slice observado na §6.6; monitor não provado | ANX-145: tick inválido sinalizado/rejeitado conforme contrato, qualidade preservada, alarmes e bloqueio de uso sensível |
| R09 S5 HTTP/OpenAPI | Não revalidado | ANX-145/146: /v1/market-data, schemas/erros/paginação/limites, autorização e licença de feed, paridade humano/agente |
| R09 G4-MD-01 / G5-MD-02 / R10 REAL deferido | Restrição do slice SIMULATED/PAPER documentada, execução não testada | ANX-145/146: REAL executionMode rejeitado conforme contrato; separar origem live de preço de autorização de trading REAL, sem alterar schema silenciosamente |
| R09 G4-MD-02 / G5-MD-01 | Não verificado | ANX-145/131: instrumento/price cross-org negado, GET403 conforme contrato; RLS tem prova PG separada |
| R09 G4-MD-03/04 | Não verificado | ANX-145/129/132: evento sem secrets/URLs de provider, hypertable sem ledger cols; conferir todos os produtores e schemas pertinentes |
| R09 connections observed/binding / graph consumer | Integração não provada neste incremento | ANX-141/161/174–180 fornecem capacidades homologadas, ANX-145 normaliza dados e ANX-138 projeta. Stub do plano não autoriza fixture em produção |
| R10 RLS e ledger fora do módulo | Planejado/ownership delimitado | ANX-131 implementa RLS, ANX-152 ledger; nenhuma gravação lateral em accounting a partir de market_events |
| R09 AC-R09-01..04 / R10 PC-G0-01..10 e gates | Histórico documental, mapa D-MD afirmado sem desdobramento no R09 | **D-MD-001..018** em §6.20.1 (ANX-205); G5-MD não executado |

O usuário pediu dados históricos e realtime de motores externos para stocks/cripto e ambos; esse delta já está nas ANX-145/146, incluindo licenciamento/capacidade e retomada. A ambiguidade histórica “REAL/live trading ingest” recebeu disposição documental no [contrato P06 §1.1](./system-capabilities/p06-financial-lifecycle-contract.md): origem corrente não é executionMode REAL. **D-MD-001..018** estão em §6.20.1; spec003 R12 schemas executáveis e G5-MD permanecem ANX-145/146/181. Nenhum feed/engine foi consultado ou homologado neste incremento.

### 6.20.1. A1 — disposição transitiva market-data (ANX-205)

Fonte primária: [R08 decision log](./structure-debate/market-data/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.20); esta subseção não revalida G3/G5 nem executa ingest/Timescale real.

**Saldo R08:** 18 decisões · aceitas v1: 16 · G1 pendentes: 2 (D-MD-017, D-MD-018).

#### D-MD-001..018 (R08 — domínio, contratos, storage, deps)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-MD-001 | Dono Instrument/Observation/FreshnessPolicy/MarketEvent/Dataset | Aceito v1 | ANX-145/146 | spec003 R12 |
| D-MD-002 | Timescale hypertables owner market-data (ADR0004) | Aceito v1 | ANX-145 | P06-S2 |
| D-MD-003 | PG registry + journal/outbox ownerDomain market-data | Aceito v1 | ANX-145 | Mesma TX |
| D-MD-004 | connections observed → recorded sem reemissão | Aceito v1 | ANX-141/145 | P-R7-01 |
| D-MD-005 | getPriceAsOf com freshness explícito | Aceito v1 | ANX-145/150 | FAIL_CLOSED risk |
| D-MD-006 | resolveInstrument + alias map tabela única | Aceito v1 | ANX-145 | Determinístico |
| D-MD-007 | SIMULATED+PAPER only v1 — REAL rejeitado | Aceito v1 | ANX-145/146 | P06 §1.1 |
| D-MD-008 | MarketEvent ≠ lançamento accounting | Aceito v1 | ANX-146/152 | Sem ledger lateral |
| D-MD-009 | Neo4j async graph:market-data:v1 | Aceito v1 | ANX-138/32 | Sem dual-write |
| D-MD-010 | Large books → object storage | Aceito v1 | ANX-145 | >256KB P-R7-03 |
| D-MD-011 | QualityFlag enum shared contracts | Aceito v1 | ANX-132/145 | G5-MD-05 |
| D-MD-012 | specHash imutável para backtest pin | Aceito v1 | ANX-146/159 | Replay sem lookahead |
| D-MD-013 | DRAINING block new instruments only | Aceito v1 | ANX-145 | Leitura permitida |
| D-MD-014 | command_journal HTTP idempotency | Aceito v1 | ANX-145 | 90d hot PG |
| D-MD-015 | RLS PG defer P09 — application guards | Aceito v1 | ANX-131/145 | Paridade org |
| D-MD-016 | Hypertables desde P06-S2 | Aceito v1 | ANX-145 | P-R7-02 |
| D-MD-017 | @anxionos/contracts/market-data/* schemas públicos | G1 pendente | ANX-88/132 | ANX-145 bloqueado |
| D-MD-018 | Workers ingest/observed consumer | G1 pendente | ANX-88/133 | ANX-145 S2 |

#### Resoluções P-R7 referenciadas

| P-R7 | Decisão | ID |
| --- | --- | --- |
| P-R7-01 | observed vs recorded — recorded only institucional | D-MD-004 |
| P-R7-02 | Timescale S1 vs S2 — hypertables S2 | D-MD-016 |
| P-R7-03 | Book storage object storage >256KB | D-MD-010 |
| P-R7-04 | Freshness default risk FAIL_CLOSED obrigatório | D-MD-005 / MD-R07-01 |
| P-R7-05 | RLS v1 application-only defer P09 | D-MD-015 |

**Rodadas R01–R07:** crosswalk MD-R02..R08 → D-MD em R08. Homologação executável G3/G5, Timescale real e feeds externos permanecem ANX-145/146/181.

## 6.21. Rastreio por capacidade — strategies R09/R10

Fontes: [R09](./structure-debate/strategies/R09-dev-plan.md) e [R10](./structure-debate/strategies/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-ST-001..007, D-ST-015** está em **§6.21.1** (ANX-206). Fonte primária: [R08 decision log](./structure-debate/strategies/R08-decision-log.md). Inventário parcial: register-strategy, create/publish-strategy-version, UoW/journal. ANX-147 é continuação.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 Strategy CRUD/schema/contracts | Parcial: register-strategy.ts presente; demais operações CRUD não comprovadas pelo inventário | ANX-147/132: localizar queries/update/retire equivalentes, contratos/erros/tenancy e journal/outbox; não declarar CRUD completo por registro |
| R09 S2 StrategyVersion publish / G3-ST-S1-01 | Parcial: create/publish commands presentes | ANX-147: artefato/parâmetros/hash/versão imutáveis, replay idempotente, payload conflitante e publicação atômica |
| R09 lifecycle / G3-ST-S2-01 | Parcial: §6.6 observou publish definir BACKTESTED sem consulta a backtest | ANX-127/147: consolidar semântica publish versus backtest demonstrado, migration de estados históricos se necessária; lifecycle inválido rejeitado, não inferir certificação do rótulo |
| R09 S3 BacktestRun/runner port | Não demonstrado no inventário de ports/commands | ANX-147/146/159: dataset/version/seed/clock, execução isolada e resultados reproduzíveis, sem lookahead; stub histórico não autoriza runner falso em produção |
| R09 S4 Deployment / G3-ST-S4-01 | Não demonstrado | ANX-147/141/161: binding incompatível negado, versão aprovada/imutável, modo PAPER explícito, pause/cancel/rollback e reconciliação de jobs sem duplicação |
| R09 S5 Signal emit / G3-ST-S3-01 | Não demonstrado | ANX-147/145/149: signal stale rejeitado, proveniência e tempo/dataset/versão; sinal não é autorização de ordem |
| R09 S5 HTTP | Não verificado integralmente | ANX-147: superfície por contratos, mesmo application handler humano/agente, erros/autorização e testes HTTP |
| R10 G4 cross-tenant/REAL reject | Referência histórica R07, não teste executado | ANX-147/131: isolamento em comandos/queries/replay, REAL não habilitado; schemas e gate de efeito em teste negativo |
| R10 G5-ST-01..03 | Cenários apenas referenciados nestes R09/R10 | ANX-147/181: recuperar R07, identificar os três cenários e reproduções em sandbox; não inventar títulos para completar numeração |
| R09 deps market-data/agents/graph / R10 graph:strategies:v1 | Integração não provada | ANX-146/139/138: dataset autorizado e point-in-time, configuração de agente por port, projeção reconstruível; não copiar estado privado |
| R10 RLS D-ST-015 | Planejado além de application-only | ANX-131: roles/policies/contexto e testes PG próprios, sem herdar prova por filtro de aplicação |
| R10 PC-G0-01..10, spec003 Strategy Factory e handoff | Histórico documental, contratos/decisões transitivos não recuperados neste incremento | **D-ST-001..007,015** em §6.21.1 (ANX-206); G5-ST não executado |

**Precisão de ownership para o executor ANX-147:** a frase da issue “avaliação e promoção não pertencem a strategies” deve ser lida como avaliação/certificação em evaluation e aprovação institucional em governance. A aplicação de deployment/promoção/rollback da própria StrategyVersion permanece em strategies, conforme §3 e contrato de evolução; não transferir escrita desse estado para evaluation. Consolidar esta formulação no pacote de conflitos, sem retirar o escopo de deployment solicitado.

Nenhum backtest, deploy PAPER, teste integrado ou alteração de código foi executado. **D-ST-001..007,015** estão em §6.21.1; R04/R07 schemas executáveis e G5-ST permanecem ANX-147/181. IDs D-ST-008..014 ausentes no R08 — não inventar.

### 6.21.1. A1 — disposição transitiva strategies (ANX-206)

Fonte primária: [R08 decision log](./structure-debate/strategies/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.21); esta subseção não revalida G3/G5 nem executa backtest/deploy.

**Saldo R08:** 8 decisões registradas · aceitas v1: 7 · deferida/G1: 1 (D-ST-007) · **lacuna:** D-ST-008..014 não constam no R08.

#### D-ST-001..007, D-ST-015 (R08)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-ST-001 | Dono StrategyVersion/Deployment/Signal/BacktestRun | Aceito v1 | ANX-147 | spec003 Factory |
| D-ST-002 | Signal ≠ TradeIntent | Aceito v1 | ANX-147/149 | Sem ordem implícita |
| D-ST-003 | Promoção via evaluation event | Aceito v1 | ANX-160/147 | evaluation gate P08 |
| D-ST-004 | SIMULATED+PAPER only v1 | Aceito v1 | ANX-147 | REAL rejeitado |
| D-ST-005 | MarketDataPort — não replica preços | Aceito v1 | ANX-146/147 | Dono market-data |
| D-ST-006 | graph:strategies:v1 async | Aceito v1 | ANX-138/32 | Sem dual-write |
| D-ST-007 | research-python job protocol defer S3 | Deferido S3 | ANX-90 | ANX-147 S3+ |
| D-ST-015 | RLS defer P09 — application guards | Aceito v1 | ANX-131/147 | Paridade org |

**Nota de ownership (ANX-147):** avaliação/certificação em evaluation; aprovação institucional em governance; deployment/promoção/rollback de StrategyVersion permanece em strategies (§3, contrato evolução).

**Rodadas R01–R07:** R08 parcial — PC-G0 8/10; R09/R10 pendentes na rodada. Homologação G3/G5, backtest runner e deploy PAPER permanecem ANX-147/181.

#### Lacunas R08 (sem decisão registrada)

| ID | Classificação | Disposição | Limite |
| --- | --- | --- | --- |
| D-ST-008..014 | Ausente no R08 | ANX-147/206 | Não inventar numeração; recuperar em R04–R07 se existir |

## 6.22. Rastreio por capacidade — capital R09/R10

Fontes: [R09](./structure-debate/capital/R09-dev-plan.md) e [R10](./structure-debate/capital/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-CAP-001..012, D-CAP-015** está em **§6.22.1** (ANX-207). Fonte primária: [R08 decision log](./structure-debate/capital/R08-decision-log.md). Inventário parcial: register-capital-account, propose-allocation, reserve-for-intent e ports UoW/journal/grant. ANX-148 executa continuação.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 account/schema/contracts | Parcial: register-capital-account.ts presente | ANX-148/132: conta/moeda/agency/modo, schemas/erros, registro idempotente e estado+journal+outbox atômicos |
| R09 S2 Allocation | Parcial: propose-allocation.ts presente; ciclo completo não demonstrado | ANX-148: alocação aprovada/versionada, limites por conta/moeda e autoridade, nenhuma proposta reserva capital implicitamente |
| R09 reserve / G3-CAP-S2-01 | Parcial: reserve-for-intent.ts presente, HELD/expiresAt/intentHash observados na §6.6 | ANX-148: disponível insuficiente nega sem efeitos, saldo por moeda e reserva vinculada à intenção imutável |
| R09 G3-CAP-S2-02 / G5-CAP-02 | Não verificado em execução | ANX-148/136: grant inválido/epoch stale negados também no efeito e replay; resultado histórico não renova autoridade |
| R09 FI02 / G3-CAP-S2-03 | Não verificado | ANX-148: duas reservas concorrentes não excedem disponível; lock/CAS e rollback provados no PG real isolado |
| R09 REAL / G3-CAP-S2-04 | Não verificado | ANX-148: modo REAL rejeitado no slice, segregação de contas SIMULATED/PAPER e nenhuma reserva contra capital real |
| R09 release / G3-CAP-S2-05 | Não demonstrado no inventário | ANX-148: release idempotente, valor exato remanescente após fills parciais/cancelamento, sem saldo duplicado |
| R09 consume / G3-CAP-S2-06 / G5-CAP-03 | Não demonstrado no inventário | ANX-148/151: consume após release rejeitado, intentHash estável, double consume retry sem duplicação; consumo parcial reconcilia com fill confirmado |
| R09 revoke / G3-CAP-S2-07 | Não demonstrado | ANX-148/136: grant revoked libera HELD conforme contrato; race com dispatch/fill deve preservar obrigação já confirmada, não apagar consumo/ledger |
| R09 lifecycle EXPIRED | Timestamp observado não prova worker de expiração | ANX-148/133: relógio/fencing, expiração concorrente com release/consume e reexecução segura; transições terminais não reabrem reserva |
| R09 S3 / G3-CAP-S3-01 | Consumer não demonstrado no inventário | ANX-148/152: accounting.ledger.posted correlacionado e deduplicado; available apenas após settled segundo contrato, sem segundo ledger em capital |
| R09 S4 balance.snapshot/HTTP available | Não demonstrado | ANX-148: snapshot rastreável a fatos/revisão, disponibilidade consultável com scope e stale explícito; não inventar saldo diante de atraso |
| R09 FX / G3-CAP-S4-01 | Não demonstrado | ANX-148/146: FX as-of/baseCurrency, proveniência/tempo, arredondamento por moeda; câmbio ausente/stale não aumenta disponível silenciosamente |
| R09 G5-CAP-01 / R10 RLS D-CAP-015 | Não verificado | ANX-148/131: command journal/replay cross-tenant negados, RLS PG com roles/contexto, sem reutilizar saldo/reserva de outra agency |
| R09 S5 / R10 graph:capital:v1 | Deferido; stub histórico não prova projeção operacional | ANX-138: projetar eventos autorizados, checkpoint/rebuild e ACL, sem ledger no grafo ou stub em produção |
| R10 G2–G6, PC-G0-01..10, spec003/FI02 e handoff | Histórico documental; integração citada no R09 não executada aqui | **D-CAP-001..012,015** em §6.22.1 (ANX-207); G5-CAP não executado |

**D-CAP-001..012,015** estão em §6.22.1; FI02 executável, settled/FX e G5-CAP permanecem ANX-148/181. Nenhum saldo, reserva, fill ou ledger foi alterado neste incremento. Lacuna: D-CAP-013..014 ausentes no R08.

### 6.22.1. A1 — disposição transitiva capital (ANX-207)

Fonte primária: [R08 decision log](./structure-debate/capital/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.22); esta subseção não revalida G3/G5 nem executa reserva/ledger real.

**Saldo R08:** 13 decisões registradas · aceitas v1: 13 · **lacuna:** D-CAP-013..014 não constam no R08.

#### D-CAP-001..012, D-CAP-015 (R08)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-CAP-001 | Dono CapitalAccount, Allocation, CapitalReservation | Aceito v1 | ANX-148 | spec003/FI02 |
| D-CAP-002 | Allocation = mandato; não duplica saldo | Aceito v1 | ANX-148 | Sem double-count |
| D-CAP-003 | Reserva global por conta — FI02 | Aceito v1 | ANX-148 G3-S2-03 | Concorrência PG |
| D-CAP-004 | Grant em governance; capital só grantId | Aceito v1 | ANX-136/148 | Fail-closed |
| D-CAP-005 | Ledger em accounting; BalanceView derivada | Aceito v1 | ANX-152/148 | Sem ledger em capital |
| D-CAP-006 | Position em portfolios | Aceito v1 | ANX-148 | Dono portfolios |
| D-CAP-007 | SIMULATED+PAPER only v1 | Aceito v1 | ANX-148 | REAL rejeitado |
| D-CAP-008 | PG autoritativo; zero SQLite saldo | Aceito v1 | ANX-148 | ADR0004 |
| D-CAP-009 | FX via MarketDataPort | Aceito v1 | ANX-146/148 | as-of explícito |
| D-CAP-010 | reservation events + balance.snapshot | Aceito v1 | ANX-148/132 | Eventos v1 |
| D-CAP-011 | strategies budget → capital Allocation | Aceito v1 | ANX-147/148 | Mandato, não saldo |
| D-CAP-012 | graph:capital:v1 async | Aceito v1 | ANX-138/32 | Sem dual-write |
| D-CAP-015 | RLS defer P09 — application guards | Aceito v1 | ANX-131/148 | G5-CAP-01 |

**Rodadas R01–R07:** R08 registrado; R09/R10 pendentes na rodada. Homologação G3/G5, lifecycle reserva completo e integração accounting permanecem ANX-148/181.

#### Lacunas R08 (sem decisão registrada)

| ID | Classificação | Disposição | Limite |
| --- | --- | --- | --- |
| D-CAP-013..014 | Ausente no R08 | ANX-148/207 | Não inventar numeração; recuperar em R04–R07 se existir |

## 6.23. Rastreio por capacidade — decisions R09/R10

Fontes: [R09](./structure-debate/decisions/R09-dev-plan.md) e [R10](./structure-debate/decisions/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-DC-001..015** está em **§6.23.1** (ANX-208). Fonte primária: [R08 decision log](./structure-debate/decisions/R08-decision-log.md). Inventário parcial: propose-decision, check-authority e submit-intent, com UoW/journal. ANX-149 executa delta.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 decision/proposal/intent/schema/contracts | Parcial por comandos presentes; schema completo não revalidado | ANX-149/132: identidades/versões, campos/erros e state machine, ensureSchema idempotente e estado+journal+outbox |
| R09 S2 propose / G3-DC-S2-01 | Parcial: propose-decision.ts presente | ANX-149: cria Decision com proveniência, duplicata não cria nova decisão/intenção, payload conflitante e rollback |
| R09 checkAuthority / G3-DC-S2-04 | Parcial: check-authority.ts presente | ANX-149/136: scope e epoch atuais, stale negado, evidência de autorização não equivale a permit de execução |
| R09 submit / G3-DC-S2-02 | Parcial: submit-intent.ts observado na §6.7 | ANX-149: intentHash/versão imutáveis, revisão/expiração invalidam aprovação/execução; replay concorrente não altera intenção |
| R09 G3-DC-S2-03 / R10 G4 cross-tenant | Não verificado em execução | ANX-149/131: escopo nos commands/journal/replay/queries, nenhum resultado de outra agency, RLS testado separadamente |
| R09 S3 Disposition/approval / G3-DC-S2-05 | Não demonstrado no inventário | ANX-149/136: aprovador independente verificável, hash/digest aprovado, expiração/revogação e conflito de interesse; autor não aprova a própria mudança por inferência |
| R09 S3 WAITING_HUMAN hook | Não demonstrado | ANX-149/140: Task/Run espera em orchestration, disposition da decisão em decisions, resposta tardia/duplicada/revisada não executa intenção obsoleta |
| R09 S2/S4 / G3-DC-S2-06/07 | Conflito conhecido: R09 exige risco/reserva antes de submit; command observado exige AUTHORITY_CHECKED | ANX-127/149/150/148: consolidar ordem/semântica antes de implementação, DC_SUBMIT_PRECONDITION sem risco e rejeição sem reserva conforme contrato escolhido; não criar ciclo nem remover check silenciosamente |
| R09 G3-DC-S5-01 consumer não SUBMITTED | Não verificado | ANX-149/151: consumer ignora/rejeita estado impróprio conforme contrato, sem ordem/consumo de capital; evento sozinho não dispensa revalidação |
| R09 S5 EvidenceManifest/knowledge consumer | Não demonstrado | ANX-149/142: fontes e versão/dataset/hash vinculados, ACL e revogação, manifest reproduzível, conteúdo externo não altera autoridade |
| R09 S6 / R10 PC-G0-08 graph defer S5 | Deferido; rótulos de slice diferem, não justificam duplicação | ANX-138/149: graph:decisions:v1 derivado, lineage/checkpoint/rebuild sem mover dono Decision/TradeIntent |
| R10 G5-DC-01..03, RLS D-DC-015 e PC-G0-01..10 | Histórico referenciado, cenários G5 não detalhados nestes R09/R10 | **D-DC-001..015** em §6.23.1 (ANX-208); G5-DC não executado |

Nenhuma intenção, aprovação, reserva ou ordem foi criada neste incremento. **D-DC-001..015** estão em §6.23.1; conflito submit pré-risco/reserva (§6.23 tabela) e G5-DC permanecem ANX-127/149/181 — sem escolher semântica silenciosa.

### 6.23.1. A1 — disposição transitiva decisions (ANX-208)

Fonte primária: [R08 decision log](./structure-debate/decisions/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.23); esta subseção não revalida G3/G5 nem executa submit/approval real.

**Saldo R08:** 15 decisões · aceitas v1: 15.

#### D-DC-001..015 (R08)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-DC-001 | Dono DecisionRecord, Proposal, TradeIntent, Disposition, AuthorityRef | Aceito v1 | ANX-149 | spec003 |
| D-DC-002 | TradeIntent imutável pós-submit; alteração = novo hash | Aceito v1 | ANX-149 | intentHash |
| D-DC-003 | governance Grant separado — AuthorityRef snapshot only | Aceito v1 | ANX-136/149 | Sem grant inline |
| D-DC-004 | orchestration Task/Run separado — correlationId link | Aceito v1 | ANX-140/149 | Não move board |
| D-DC-005 | agents Proposal source; decisions materializa intent | Aceito v1 | ANX-139/149 | Dono intent |
| D-DC-006 | knowledge Evidence storage; decisions EvidenceManifest refs | Aceito v1 | ANX-142/149 | Sem conteúdo inline |
| D-DC-007 | risk RiskCheck separado; state via evento | Aceito v1 | ANX-150/149 | P06 §2.1 ordem |
| D-DC-008 | audit Flight Recorder; decisions manifestHash only | Aceito v1 | ANX-149/154 | Sem payload bruto |
| D-DC-009 | PG autoritativo; zero SQLite | Aceito v1 | ANX-149 | ADR0004 |
| D-DC-010 | SIMULATED+PAPER only v1 | Aceito v1 | ANX-149 | REAL rejeitado |
| D-DC-011 | Independent approver policy (FI03) | Aceito v1 | ANX-149/136 | G3-DC-S2-05 |
| D-DC-012 | Epoch stale recheck antes RESERVED/READY | Aceito v1 | ANX-136/149 | Fail-closed |
| D-DC-013 | command_journal ownerDomain=decisions | Aceito v1 | ANX-149 | HTTP idempotency |
| D-DC-014 | graph projeção async agent→evidence→decision→intent | Aceito v1 | ANX-138/149 | graph:decisions:v1 |
| D-DC-015 | RLS defer P09 — application-only tenancy | Aceito v1 | ANX-131/149 | G5-DC-01 |

**Rodadas R01–R07:** R08 registrado. Homologação G3/G5, cadeia pré-submit P06 §2.1 e conflito submit/risco/reserva permanecem ANX-149/181.

## 6.24. Rastreio por capacidade — risk R09/R10

Fontes: [R09](./structure-debate/risk/R09-dev-plan.md) e [R10](./structure-debate/risk/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-RK-001..010** está em **§6.24.1** (ANX-209). Fonte primária: [R08 decision log](./structure-debate/risk/R08-decision-log.md). Inventário parcial: activate-limit-policy e run-pre-trade-check, com ports epoch/UoW/journal. Continuação ANX-150; preservar ANX-122.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 policy/check/permit/schema/contracts | Parcial: activate-limit-policy.ts e ports presentes | ANX-150/132: policy versionada, config obrigatória, schema/erros e estado+journal+outbox; ativação autorizada não amplia limites por iniciativa do agente |
| R09 S2 / G3-RK-S2-01 PASS emite permit | Parcial: run-pre-trade-check.ts observado na §6.7 emite só PASS | ANX-150/151: permit ligado a intentHash, conta/modo/versão/epochs/validade; emissão não dispensa consumo single-use/revalidação execution |
| R09 G3-RK-S2-02 CONFIG_REQUIRED | Não verificado em execução | ANX-150: configuração ausente nega com motivo, sem default permissivo, sem permit e sem erro engolido |
| R09 G3-RK-S2-03 cross-tenant | Não verificado | ANX-150/131: policy/check/permit/journal/replay isolados por escopo; erro sem exposição de dados de outro tenant |
| R09 G3-RK-S2-04 epoch stale | Parcial: validação no caminho novo observada na §6.7 | ANX-150/136/151: replay histórico não vira autorização atual; revogação concorrente com submit/efeito, UNKNOWN/stale fail-closed |
| R09 G3-RK-S2-05 limite excedido | Parcial: maxNotional observado não prova todos os limites | ANX-150/148/153: exposição agregada stocks+cripto, moeda/FX/freshness e risco existente; concorrência não permite ultrapassar limite por checks isolados |
| R09 S3 kill switch/epoch/consumer | Não demonstrado no inventário como conjunto | ANX-150: owner risk, ativação propaga e invalida permits, corrida antes/depois do dispatch; reset exige autoridade e auditoria, sem auto-reset |
| R09 S4 post-trade | Deferido, não demonstrado | ANX-150/151/152: checks após fills/reconciliação e incidentes, sem reescrever ledger nem tratar pós-check como autorização retroativa |
| R09 S5 / R10 graph:risk:v1 | Deferido ao owner graph | ANX-138: eventos/checkpoints/rebuild, nenhuma autoridade exclusiva no cache/grafo atrasado |
| R10 G4 bypass/stale/cross-tenant e G5-RK-01..03 | Referências históricas, três cenários G5 não detalhados aqui | ANX-150/181: recuperar R07 e evidências independentes no candidato, testar bypass sem efeitos em produção |
| R10 RLS D-RK-015 / PC-G0-01..10/spec003 | Planejado/histórico; D-RK-015 não consta no R08 | **D-RK-001..010** em §6.24.1 (ANX-209); RLS/G5-RK não executados |

A ANX-150 adiciona exposure/freshness multiativo, UNKNOWN, reset autorizado e regressão ANX-122 ao plano histórico. **D-RK-001..010** estão em §6.24.1; D-RK-015 (RLS) citado no R10 não consta no R08. G5-RK e fórmulas executáveis permanecem ANX-150/181.

### 6.24.1. A1 — disposição transitiva risk (ANX-209)

Fonte primária: [R08 decision log](./structure-debate/risk/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.24); esta subseção não revalida G3/G5 nem executa pre-trade real.

**Saldo R08:** 10 decisões · aceitas v1: 10 · **nota:** D-RK-015 (RLS) referenciado no R10, ausente no R08.

#### D-RK-001..010 (R08)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-RK-001 | Dono LimitPolicy, ExposureSnapshot, RiskCheckResult, RiskPermit | Aceito v1 | ANX-150 | spec003 |
| D-RK-002 | decisions TradeIntent separado — risk valida intentHash only | Aceito v1 | ANX-149/150 | P06 §2.1 |
| D-RK-003 | governance MandateVersion declarativo; risk LimitPolicy executável | Aceito v1 | ANX-136/150 | Sem policy em gov |
| D-RK-004 | capital reserva; risk consulta não muta | Aceito v1 | ANX-148/150 | Read-only |
| D-RK-005 | execution revalida RiskPermit + ExecutionPermit + epochs | Aceito v1 | ANX-151/150 | Single-use |
| D-RK-006 | CONFIG_REQUIRED fail-closed (spec 003) | Aceito v1 | ANX-150 G3-S2-02 | Sem default permissivo |
| D-RK-007 | Kill switch bump riskEpoch sem apagar histórico | Aceito v1 | ANX-150 S3 | Reset autorizado |
| D-RK-008 | PG autoritativo; zero SQLite | Aceito v1 | ANX-150 | ADR0004 |
| D-RK-009 | SIMULATED+PAPER only v1 | Aceito v1 | ANX-150 | REAL rejeitado |
| D-RK-010 | Pre-trade obrigatório; post-trade defer S4 | Aceito v1 | ANX-150/151 | S4 deferido |

**Rodadas R01–R07:** R08 registrado. Homologação G3/G5, kill switch operacional e post-trade permanecem ANX-150/181.

## 6.25. Rastreio por capacidade — execution R09/R10

Fontes: [R09](./structure-debate/execution/R09-dev-plan.md) e [R10](./structure-debate/execution/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-EX-001..012** está em **§6.25.1** (ANX-210). Fonte primária: [R08 decision log](./structure-debate/execution/R08-decision-log.md). Inventário parcial: open-execution-session e submit-order, ports permit/venue-fill/UoW/journal. ANX-151 executa delta; ANX-163 PAPER; ANX-161 adapters.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 session/order/fill/adapter_ref/contracts | Parcial: comandos e ports presentes, schema completo não revalidado | ANX-151/132: identidade/tenant/conta/modo, ensureSchema, estados/erros e adapter referenciado; seed simulado não habilita venue live |
| R09 S2 openSession | Parcial: open-execution-session.ts presente | ANX-151: sessão vinculada a conta/modo/adapter/autorização, imutabilidade pertinente e lifecycle; fechar sessão não apaga ordens pendentes |
| R09 G3-EX-S2-01 submit SIMULATED | Parcial: §6.7 observou fill síncrono na TX | ANX-151/163: order SUBMITTED+fill.confirmed coerentes e atômicos no simulado; não extrapolar TX local para dispatch remoto |
| R09 G3-EX-S2-02 RiskPermit | Parcial: risk-permit-validation port presente | ANX-151/150: sem permit EX_PERMIT_BYPASS; intentHash/conta/side/instrumento/quantidade/preço/epochs/validade, single-use e fencing revalidados antes do efeito |
| R09 G3-EX-S2-03 reservation cross-tenant | Não verificado | ANX-151/148: EX_CROSS_TENANT sem ordem/consumo, reserva corresponde à intenção e moeda, replay não lê outra conta |
| R09 G3-EX-S2-04 clientOrderId duplicado | Não verificado em execução | ANX-151: mesmo orderId no replay, payload conflitante negado, chave escopada e concorrência protegida; retry incerto não cria segunda ordem |
| R09 G3-EX-S2-05 / S4 duplicate venueFillId | Não verificado | ANX-151/152: EX_DUPLICATE_FILL/disposição contratual, mesma confirmação não duplica evento/ledger, identificação venue+conta e payload divergente rastreáveis |
| R09 G3-EX-S2-06 REAL | Não verificado | ANX-151: EX_MODE_FORBIDDEN no slice; fixtures TradeIntent/permits isoladas, sem flags REAL_EXECUTION/LIVE_TRADING |
| R09 S3 cancelOrder/partial fills | Não demonstrado no inventário | ANX-151/148: corrida cancel/fill, parciais e release exato do remanescente, cancel solicitado não equivale a cancel confirmado |
| R09 S3 capital reservation hook | Planejado por contrato, não escrita lateral | ANX-151/148: fatos fill/cancel confirmados levam ao handler do owner capital, sem alterar tabelas privadas nem duplicar ledger |
| R09 S4 ReconciliationCase venue | Não demonstrado | ANX-151: timeout/crash após dispatch→UNKNOWN até evidência, consultar ordem/fill por correlação antes de retry, resolução auditada sem inventar resultado |
| R09 S5 execution-go dispatch/report | Deferido | ANX-151/161/162: protocolo versionado, ack/reject/cancel/replace/report, negociação de capacidade e adapter homologado; engine externo não recebe autoridade institucional própria |
| R09 S6 graph:execution:v1 | Deferido ao owner graph | ANX-138: Order/Fill como projeção derivada, checkpoint/rebuild/ACL, nunca ledger autoritativo |
| R10 G4 secrets/bypass/cross-tenant / G5-EX-01..05 | Referências históricas, cinco cenários G5 não enumerados aqui | ANX-151/129/181: recuperar R07 e reproduzir em sandbox, credenciais isoladas e respostas redigidas; não herdar PASS textual |
| R10 PC-G0-01..10 / spec003/P06/upstreams | Histórico documental | **D-EX-001..012** em §6.25.1 (ANX-210); G5-EX não executado |

O delta da ANX-151 inclui ack/reject/cancel/replace, UNKNOWN e crash recovery além do simulador inicial. **D-EX-001..012** estão em §6.25.1; G5-EX e integração executável permanecem ANX-151/161/162/181. Placement ADR0006 aprovado; EffectGate não executado.

### 6.25.1. A1 — disposição transitiva execution (ANX-210)

Fonte primária: [R08 decision log](./structure-debate/execution/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.25); esta subseção não revalida G3/G5 nem executa submit/fill real.

**Saldo R08:** 12 decisões · aceitas v1: 11 · deferida: 1 (D-EX-010 execution-go S3).

#### D-EX-001..012 (R08)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-EX-001 | Dono Order, Fill, ExecutionSession, VenueAdapterRef | Aceito v1 | ANX-151 | spec003/P06 |
| D-EX-002 | decisions TradeIntent separado — execution valida intentHash only | Aceito v1 | ANX-149/151 | P06 §2.1 |
| D-EX-003 | Submit atômico: consume RiskPermit + ExecutionPermit + reservation | Aceito v1 | ANX-151/150/148 | TX única |
| D-EX-004 | Fill→accounting/portfolios via execution.fill.confirmed.v1 async | Aceito v1 | ANX-152/153/151 | Sem ledger inline |
| D-EX-005 | capital reservation referenciada; consumo no projector fill | Aceito v1 | ANX-148/151 | Dono capital |
| D-EX-006 | connections dono secretRef; execution só VenueAdapterRef | Aceito v1 | ANX-141/129/151 | Sem secrets |
| D-EX-007 | Duplicate fill idempotente / reject com ReconciliationCase | Aceito v1 | ANX-151 G3-S2-05 | EX_DUPLICATE_FILL |
| D-EX-008 | PG autoritativo; zero SQLite order/fill | Aceito v1 | ANX-151 | ADR0004 |
| D-EX-009 | SIMULATED+PAPER only v1; REAL/LIVE_TRADING rejeitado | Aceito v1 | ANX-151 | EX_MODE_FORBIDDEN |
| D-EX-010 | execution-go defer S3; simulator inline TS em S1–S2 | Deferido S3 | ANX-151/161/162 | S1–S2 TS |
| D-EX-011 | ReconciliationCase venue owner execution; financeiro accounting | Aceito v1 | ANX-151 S4 | UNKNOWN SLA |
| D-EX-012 | clientOrderId idempotência por org+adapter | Aceito v1 | ANX-151 G3-S2-04 | Replay seguro |

**Rodadas R01–R07:** R08 registrado. Homologação G3/G5, execution-go e adapters reais permanecem ANX-151/161/162/181.

## 6.26. Rastreio por capacidade — accounting R09/R10

Fontes: [R09](./structure-debate/accounting/R09-dev-plan.md) e [R10](./structure-debate/accounting/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-ACC-001..012, D-ACC-015** está em **§6.26.1** (ANX-211). Fonte primária: [R08 decision log](./structure-debate/accounting/R08-decision-log.md). Inventário parcial: post-trade-fill, post-ledger-entry, fill-confirmed-consumer e balance-validation/UoW/journal. ANX-152 executa delta.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 chart/journal/schema/contracts/seed | Parcial por presença dos commands; schema/seed completos não revalidados | ANX-152/132: ChartOfAccounts por org, natureza de contas, moeda/precisão e versões; ensureSchema idempotente sem sobrescrever plano existente |
| R09 S2 fill projector/ledger.posted | Parcial: fill-confirmed-consumer e post-trade-fill presentes | ANX-152/151: evento confirmado original rastreável, postagem+journal+outbox atômicos; sourceRef correto, sem float monetário |
| R09 G3-ACC-S2-01 balanced | Parcial: balance-validation presente; §6.8 registra cash/clearing a confrontar | ANX-152: balanceamento e natureza/sinais corretos por política monetária; soma zero não demonstra interpretação econômica |
| R09 G3-ACC-S2-02 duplicate | Não verificado em execução | ANX-152: mesma idempotency/fill gera mesma entry, corrida e payload conflitante; fonte por venue/conta sem colisão entre tenants |
| R09 G3-ACC-S2-03 tenant / G4 grant | Não verificado | ANX-152/131/136: entrada/consulta/replay isolados, autoria/grant auditáveis, sem lançamento privado cross-module |
| R09 G3-ACC-S2-04 REAL | Não verificado | ANX-152: REAL rejeitado no slice, contas/modos segregados, fixture simulated não gera capital real |
| R09 G3-ACC-S2-05 unbalanced | Não verificado | ANX-152: entrada desbalanceada rejeitada sem persistência parcial; arredondamento/FX/taxas conforme contrato, nunca ajuste silencioso |
| R09 S3 fee postings | Não demonstrado no inventário | ANX-152: taxas por moeda/fill, revisão/correção idempotente, proveniência e precisão; não inferir taxa zero por campo ausente |
| R09 S3 balance snapshot | Não demonstrado | ANX-152/148/153: projeção de saldo reproduzível, checkpoint/as-of, leitura não vira segundo ledger; divergência/stale explícitos |
| R09 S4 reconciliation OPEN/RESOLVE/HTTP | Não demonstrado | ANX-152: caso financeiro com fatos/evidências/autoridade, resolução auditada, HTTP autorizado; reconciliação de venue continua execution |
| R09 S5 graph projector | Deferido, stub não autoriza produção | ANX-138: graph:accounting:v1 derivado e reconstruível, ledger autoritativo PG exclusivamente accounting |
| R09 S6 billing.invoice.paid consumer | Deferido após billing | ANX-152/156: evento pago deduplicado, segregação comercial/trading e reversões; invoice emitida não é paga |
| R10 SQLite ban/RLS | Restrição de autoridade e evolução planejada | ANX-152/131: nenhum ledger SQLite, políticas/roles PG e provas de isolamento; aplicação-only não equivale a RLS |
| R10 G5-ACC-01..03/PC-G0-01..10/spec003 | Histórico referenciado, cenários G5 não detalhados aqui | **D-ACC-001..012,015** em §6.26.1 (ANX-211); G5-ACC não executado |

Reversões imutáveis, FX e corporate actions da ANX-152 permanecem requisitos adicionais. **D-ACC-001..012,015** estão em §6.26.1; lacuna D-ACC-013..014 no R08. G5-ACC permanece ANX-152/181.

### 6.26.1. A1 — disposição transitiva accounting (ANX-211)

Fonte primária: [R08 decision log](./structure-debate/accounting/R08-decision-log.md) (relido 2026-09-08). Commands parciais existem (§6.26); esta subseção não revalida G3/G5 nem executa posting real.

**Saldo R08:** 13 decisões · aceitas v1: 13 · **lacuna:** D-ACC-013..014 ausentes no R08.

#### D-ACC-001..012, D-ACC-015 (R08)

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-ACC-001 | Dono JournalEntry, LedgerPosting, FeePosting, ReconciliationCase financeiro | Aceito v1 | ANX-152 | spec003 |
| D-ACC-002 | Partida dobrada; posted imutável — Reversal para correção | Aceito v1 | ANX-152 | Sem apagar histórico |
| D-ACC-003 | Ledger PG autoritativo; zero SQLite journal | Aceito v1 | ANX-152 | ADR0004 |
| D-ACC-004 | capital BalanceView derivada de accounting.ledger.posted.v1 | Aceito v1 | ANX-148/152 | Projeção |
| D-ACC-005 | billing dono Invoice; accounting projector pós invoice.paid | Aceito v1 | ANX-156/152 | S6 defer |
| D-ACC-006 | market-data dono preço; accounting só priceRef | Aceito v1 | ANX-146/152 | Sem preço inline |
| D-ACC-007 | Fill→posting assíncrono projector + idempotência | Aceito v1 | ANX-151/152 | G3-ACC-S2-02 |
| D-ACC-008 | Fee venue vs platform fee — agregados distintos | Aceito v1 | ANX-152 S3 | Sem taxa zero implícita |
| D-ACC-009 | SIMULATED+PAPER only v1; REAL reject | Aceito v1 | ANX-152 | G3-ACC-S2-04 |
| D-ACC-010 | graph:accounting:v1 async projeção linhagem | Aceito v1 | ANX-138/152 | S5 defer |
| D-ACC-011 | connections usage → billing → accounting (não direto) | Aceito v1 | ANX-156/141 | Sem atalho |
| D-ACC-012 | ReconciliationCase ownerDomain=accounting | Aceito v1 | ANX-152 S4 | Venue em execution |
| D-ACC-015 | RLS defer P09 — application-only tenancy | Aceito v1 | ANX-131/152 | G5-ACC-01 |

**Rodadas R01–R07:** R08 registrado. Homologação G3/G5, billing consumer e reversões FX permanecem ANX-152/181.

#### Lacunas R08 (sem decisão registrada)

| ID | Classificação | Disposição | Limite |
| --- | --- | --- | --- |
| D-ACC-013..014 | Ausente no R08 | ANX-152/211 | Não inventar numeração; recuperar em R04–R07 se existir |

## 6.27. Rastreio por capacidade — portfolios R09/R10

Fontes: [R09](./structure-debate/portfolios/R09-dev-plan.md) e [R10](./structure-debate/portfolios/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-PF-001..015** está em **§6.27.1** (ANX-212). Fonte primária: [R08 decision log](./structure-debate/portfolios/R08-decision-log.md). Inventário parcial: create-portfolio, apply-fill-to-position, fill-confirmed-consumer e UoW/journal. ANX-153 executa delta.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 portfolio/position/holding/contracts | Parcial: create-portfolio.ts presente; schema completo não revalidado | ANX-153/132: contas/modos/moedas e chaves, ensureSchema idempotente, ports e contratos/erros, sem ledger duplicado |
| R09 S2 fill apply / G3-PF-S2-01 | Parcial: apply-fill-to-position.ts e consumer presentes | ANX-153/151: quantidade/lotes corretos por fill, evento position.updated e atomicidade; defaults LONG/TRADING observados §6.8 exigem escopo explícito |
| R09 G3-PF-S2-02 duplicate | Parcial: dedupe por fill observado §6.8, execução não verificada | ANX-153: mesma revisão no replay, payload conflitante/corrida e nenhum lote duplicado |
| R09 G3-PF-S2-03 tenant / G4 grant | Não verificado | ANX-153/131: scope nos commands/queries/replay inclusive caminho raced, origem de fill/conta confiável e grant pertinente |
| R09 G3-PF-S2-04 REAL | Não verificado | ANX-153: modo REAL rejeitado no slice, dados SIMULATED/PAPER separados sem converter posição fictícia em real |
| R09 G3-PF-S2-05 uniqueness | Não verificado em execução | ANX-153: chave posição única e concorrência PG; distinguir conflito único de erro geral e transação abortada, sem catch permissivo |
| R09 S3 ValuationSnapshot/valuation.confirmed | Não demonstrado no inventário | ANX-153/146: preços/FX/as-of/baseCurrency, snapshots reproduzíveis e stale explícito, evento confirmado somente após critérios satisfeitos |
| R09 S4 / G3-PF-S4-01 ledger lag | Não demonstrado | ANX-153/152: divergência/atraso abre PositionReconciliationCase OPEN com evidência/checkpoint, sem inventar cash |
| R09 G3-PF-S4-02 fill before ledger | Não demonstrado | ANX-153: cash provisório distinguido do liquidado, não aumenta disponibilidade autoritativa; convergência após ledger |
| R09 G3-PF-S4-03 duplicate ledger | Não demonstrado | ANX-153/152: entrada duplicada não dobra cash, ordenação/replay e reversões consistentes |
| R09 S5 RebalancePlan propose/approve | Não demonstrado | ANX-153/136/149: plano versionado e aprovação governada, execução via intenções/risco/capital/execution; rebalance não opera venue diretamente |
| R09 S5 graph:portfolios:v1 | Deferido; stub não é runtime | ANX-138: projeção/checkpoint/rebuild/ACL, sem posição autoritativa no Neo4j |
| R09 S6 exposure/Timescale NAV opcional | Deferido, decisão explícita necessária | ANX-153/154/150: snapshot de exposição/valuation no owner portfolios, performance deriva retornos; NAV series opcional com dono/consumidores definidos, sem duplicar métrica autoritativa |
| R10 SQLite ban/RLS | Restrição/planejado | ANX-153/131: posições compartilhadas não autoritativas em SQLite; roles/policies PG e isolamento real, não só filtro de aplicação |
| R09 fixtures / R10 G5-PF-01..03, PC-G0-01..10/spec003 | Histórico e cenários transitivos não verificados | **D-PF-001..015** em §6.27.1 (ANX-212); G5-PF não executado |

Lotes, FX/corporate actions e consolidação stocks+cripto da ANX-153 continuam no delta. **D-PF-001..015** estão em §6.27.1; G5-PF permanece ANX-153/181.

### 6.27.1. A1 — disposição transitiva portfolios (ANX-212)

Fonte primária: [R08 decision log](./structure-debate/portfolios/R08-decision-log.md) (relido 2026-09-08).

**Saldo R08:** 15 decisões · aceitas v1: 15.

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-PF-001 | Dono Portfolio, Position, Holding, ValuationSnapshot, RebalancePlan | Aceito v1 | ANX-153 | spec003 |
| D-PF-002 | Position key (capitalAccountId, instrumentId, positionSide, book) | Aceito v1 | ANX-153 G3-S2-05 | Uma canônica/key |
| D-PF-003 | Posição PG autoritativa; zero SQLite state | Aceito v1 | ANX-153 | ADR0004 |
| D-PF-004 | capital Allocation/Reservation separados — mandateRef only | Aceito v1 | ANX-148/153 | Sem reserva aqui |
| D-PF-005 | accounting ledger separado — consome ledger.posted cash reconcile | Aceito v1 | ANX-152/153 | G3-PF-S4 |
| D-PF-006 | strategies Deployment/Signal separados — Holding attribution | Aceito v1 | ANX-147/153 | Sem ordem |
| D-PF-007 | Fill→position assíncrono projector + idempotência | Aceito v1 | ANX-151/153 | G3-PF-S2-02 |
| D-PF-008 | ValuationSnapshot CONFIRMED imutável; market-data priceRef | Aceito v1 | ANX-146/153 S3 | stale explícito |
| D-PF-009 | RebalancePlan não executa ordem — downstream decisions/execution | Aceito v1 | ANX-153 S5 | Aprovação gov |
| D-PF-010 | SIMULATED+PAPER only v1; REAL reject | Aceito v1 | ANX-153 | G3-PF-S2-04 |
| D-PF-011 | graph:portfolios:v1 async projeção Neo4j | Aceito v1 | ANX-138/153 | S5 defer |
| D-PF-012 | command_journal/outbox ownerDomain=portfolios | Aceito v1 | ANX-153 | HTTP idempotency |
| D-PF-013 | organizations tenancy — portfolio capitalAccount same ownerUserId | Aceito v1 | ANX-135/153 | G3-PF-S2-03 |
| D-PF-014 | PositionReconciliationCase ownerDomain=portfolios | Aceito v1 | ANX-153 S4 | G3-PF-S4-01 |
| D-PF-015 | RLS defer P09 — application-only tenancy | Aceito v1 | ANX-131/153 | G5-PF-01 |

## 6.28. Rastreio por capacidade — performance R09/R10

Fontes: [R09](./structure-debate/performance/R09-dev-plan.md) e [R10](./structure-debate/performance/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-PERF-001..005** está em **§6.28.1** (ANX-213). Fonte primária: [R08 decision log](./structure-debate/performance/R08-decision-log.md). Inventário parcial: record-outcome-snapshot, ledger-posted-consumer e ports UoW/journal. ANX-154 executa delta.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 OfficialMetricDefinition/schema/contracts | Não demonstrado integralmente no inventário | ANX-154/132: definições/fórmulas versionadas, unidades/moeda/período/calendário, schemas/erros e proveniência; não chamar qualquer agregado de métrica oficial |
| R09 S2 ledger / G3-PERF-S2-01 | Parcial: ledger-posted-consumer e snapshot presentes; §6.8 observou linesSummary/valueDate | ANX-154/152: realizado deriva de fatos corretos, fees/FX e reversões, sem tratar snapshot de lançamento como P&L calculado |
| R09 S2 position / G3-PERF-S2-02 | Não demonstrado no inventário de consumers | ANX-154/153: localizar equivalente, exposição derivada da posição/valuation e convergência ledger+position; não escrever estado privado de portfolios |
| R09 G3-PERF-S2-03 stale position | Não verificado | ANX-154: snapshot stale não confirmado como atual, freshness/as-of explícitos e erro/disposição conforme contrato |
| R09 G3-PERF-S2-04 tenant | Não verificado em execução | ANX-154/131: métricas/snapshots/journal/replay isolados por agency, autorização também em agregação e backfill |
| R09 S3 OutcomeSnapshot/HTTP | Parcial: command presente, HTTP não revalidado | ANX-154: snapshot reproduzível com referências/checkpoints, HTTP versionado/autorizado e erro por dados incompletos |
| R09 S4 Timescale series/rebuild / G3-PERF-S4-01 | Não demonstrado | ANX-154: backfill/rebuild idempotentes, versão de fórmula/dataset, correções fora de ordem e períodos consistentes, sem duplicar série |
| R09 G5-PERF-01 duplicate ledger | Parcial: dedupe por journalEntryId observado §6.8 | ANX-154: replay concorrente não dobra resultado; commandId aleatório não implica ausência de dedupe, testar chave causal |
| R09 G5-PERF-02 divergence | Não verificado | ANX-154/153/152: snapshot divergente ledger/posição sinalizado, não inventar reconciliação silenciosa para fechar P&L |
| R09 S5 graph | Deferido; stub não é produto | ANX-138: projeção derivada, checkpoint/rebuild, ACL e lineage sem ledger/métrica autoritativa Neo4j |
| R10 PC-G0 10/10 e PASS G2–G6 | Afirmação genérica referenciando R04–R09, sem relatório/candidato detalhado no R10 | **D-PERF-001..005** em §6.28.1 (ANX-213); G5-PERF não executado |

**D-PERF-001..005** estão em §6.28.1; fórmulas/oráculos executáveis permanecem ANX-154/181.

### 6.28.1. A1 — disposição transitiva performance (ANX-213)

Fonte primária: [R08 decision log](./structure-debate/performance/R08-decision-log.md) (relido 2026-09-08).

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-PERF-001 | performance dono agregados R03 | Aceito v1 | ANX-154 | spec003 |
| D-PERF-002 | Métricas oficiais; não reescreve ledger nem posição | Aceito v1 | ANX-154/152/153 | Derivado |
| D-PERF-003 | PG autoritativo | Aceito v1 | ANX-154 | ADR0004 |
| D-PERF-004 | OfficialMetricDefinition versionada; rebuild idempotente | Aceito v1 | ANX-154 S4 | Fórmula aprovada |
| D-PERF-005 | graph:performance:v1 async | Aceito v1 | ANX-138/154 | S5 defer |

## 6.29. Rastreio por capacidade — audit R09/R10

Fontes: [R09](./structure-debate/audit/R09-dev-plan.md) e [R10](./structure-debate/audit/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-AUD-001..005** está em **§6.29.1** (ANX-214). Fonte primária: [R08 decision log](./structure-debate/audit/R08-decision-log.md). Inventário parcial: ingest-domain-event-tap, domain-event-tap-consumer e UoW/journal. Continuação ANX-155.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 manifest/replay schema | Não revalidado integralmente | ANX-155/132: manifests versionados, referências/digests/escopo, schema e erros, persistência auditável sem copiar secrets |
| R09 S2 / G3-AUD-S2-01 tap dedupe | Parcial: ingest/consumer presentes; sourceEventId dedupe observado §6.9 | ANX-155/130: replay/flood/race não duplicam fato, payload divergente identificado e ordering/proveniência preservados |
| R09 S3 replay session/audit.replay | Não demonstrado no inventário | ANX-155/136: grant/scope/validade, sessão e acesso registrados, revogação durante leitura aplicada; não conceder autoridade pelos próprios dados replayados |
| R09 G3-AUD-S3-01 read-only | Não verificado | ANX-155: reconstruir explicação sem chamar handlers de efeito, ordem/provider/ledger/consumer externo; teste negativo demonstra zero efeito |
| R09 G5-AUD-01 export cross-tenant | Não verificado | ANX-155/131/158: export autorizado por scope, filtros/redaction e trilha, sem registros de outra agency; retenção/expiração do pacote explícitas |
| R09 G5-AUD-02 mutable chunk rejected | Parcial: payloadHash armazenado não prova verificação, conforme §6.9 | ANX-155: calcular/verificar digest contra fonte confiável, chunk alterado rejeitado e falha auditada; não confiar no hash fornecido pelo mesmo conteúdo |
| R09 S4 HTTP | Não verificado integralmente | ANX-155: busca/leitura/export/replay com contratos e erros, paridade humano/agente e limites de consulta |
| R09 S4 graph | Deferido; stub não é runtime | ANX-138: lineage derivada/checkpoint/rebuild/ACL; audit não substitui journals autoritativos dos domínios |
| R10 PC-G0 10/10 e PASS G2–G6 | Resumo histórico referenciando R04–R09 sem parecer detalhado | **D-AUD-001..005** em §6.29.1 (ANX-214); G5-AUD não executado |

**D-AUD-001..005** estão em §6.29.1; replay/export real permanecem ANX-155/181.

### 6.29.1. A1 — disposição transitiva audit (ANX-214)

Fonte primária: [R08 decision log](./structure-debate/audit/R08-decision-log.md) (relido 2026-09-08).

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-AUD-001 | audit dono agregados R03 | Aceito v1 | ANX-155 | Flight Recorder |
| D-AUD-002 | Flight Recorder e DeltaRef ownerDomain=audit; não segundo ledger | Aceito v1 | ANX-155 | Sem autoridade financeira |
| D-AUD-003 | PG autoritativo | Aceito v1 | ANX-155 | ADR0004 |
| D-AUD-004 | DeltaRef payload imutável; replay exige grant audit.replay read-only | Aceito v1 | ANX-155/136 G3-S3 | Zero efeito |
| D-AUD-005 | graph:audit:v1 async | Aceito v1 | ANX-138/155 | S4 defer |

## 6.30. Rastreio por capacidade — billing R09/R10

Fontes: [R09](./structure-debate/billing/R09-dev-plan.md) e [R10](./structure-debate/billing/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-BIL-001..005** está em **§6.30.1** (ANX-215). Fonte primária: [R08 decision log](./structure-debate/billing/R08-decision-log.md). Inventário parcial: create-subscription, issue-invoice, usage-recorded-consumer e UoW/journal. ANX-156 executa delta.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 schema/contracts | Parcial por commands presentes; schema completo não revalidado | ANX-156/132: planos/assinaturas/invoices/usage e eventos/erros versionados, valor/moeda/priceVersion, estado+journal+outbox e isolamento |
| R09 S2 connections.usage.recorded projector | Parcial: consumer presente, dedupe usageRecordId observado §6.9 | ANX-156/141: uso causal reconcilia invoice, replay/ordering/correções e custos incertos explícitos; leitura+incremento concorrentes não perdem uso |
| R09 S3 HTTP | Não verificado integralmente | ANX-156: operações e consultas autorizadas por tenant/papel, idempotência/erros e entitlements; não expor dados comerciais de outro tenant |
| R09 S4 graph | Deferido; stub não homologa runtime | ANX-138: projeção derivada/checkpoint/rebuild/ACL, sem invoice autoritativa no grafo |
| R10 PC-G0 10/10, PASS G2–G6 e handoff | Genérico/histórico, remete R04–R09 sem critérios/testes detalhados | ANX-127/156/181: recuperar contratos/decisões/matrizes e pareceres por candidato; nenhum teste inferido do resumo |
| ANX-156 planos/assinaturas/entitlements | Parcial: create-subscription presente, lifecycle completo não provado | ANX-156/135: transições/preço versionado, acesso proporcional e quotas via contrato público; cobrança não concede autoridade de trading |
| ANX-156 invoices/usage reconciliation | Parcial: issue-invoice presente | ANX-156: emissão congela os fatos/cálculo conforme contrato, corrida consumo/emissão definida, invoice emitida não significa paga |
| ANX-156 cancelamentos/refunds/webhooks | Não demonstrado no inventário | ANX-156: origem/assinatura, duplicata/out-of-order, refund/reversal ligados ao pagamento, idempotência e sandbox autorizado; nenhuma cobrança real por autorização implícita |
| ANX-156 segregação trading/entitlements | Não verificado em execução | ANX-156/152/157: capital financeiro isolado, accounting e partners consomem fatos publicados sem escrita privada; reversão comercial rastreável |

**D-BIL-001..005** estão em §6.30.1; ciclo comercial executável permanece ANX-156/181. Nenhum vendor de pagamento foi escolhido.

### 6.30.1. A1 — disposição transitiva billing (ANX-215)

Fonte primária: [R08 decision log](./structure-debate/billing/R08-decision-log.md) (relido 2026-09-08).

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-BIL-001 | billing dono agregados R03 | Aceito v1 | ANX-156 | Comercial |
| D-BIL-002 | Dono Subscription/Invoice/Refund; consome connections.usage.recorded.v1 async | Aceito v1 | ANX-156/141 | Sem ledger |
| D-BIL-003 | PG autoritativo | Aceito v1 | ANX-156 | ADR0004 |
| D-BIL-004 | UsageAggregation idempotente por usageRecordId | Aceito v1 | ANX-156 S2 | InvoiceLine ref |
| D-BIL-005 | graph:billing:v1 async | Aceito v1 | ANX-138/156 | S4 defer |

## 6.31. Rastreio por capacidade — partners R09/R10

Fontes: [R09](./structure-debate/partners/R09-dev-plan.md) e [R10](./structure-debate/partners/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-PTR-001..005** está em **§6.31.2** (ANX-216). Fonte primária: [R08 decision log](./structure-debate/partners/R08-decision-log.md). Disposição issued/paid permanece em **§6.31.1**. Inventário parcial: register-partner/accrue-commission e ports UoW/journal. ANX-157 executa delta.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 partner/commission/payout schema | Parcial: register-partner presente; schema completo não revalidado | ANX-157/132: atribuição/identidade/regra versionada, estados/valores/moeda, atomicidade e contratos sem dados privados desnecessários |
| R09 S2 / G3-PTR-S2-01 commission on paid | Conflito conhecido: accrue-commission usa bridge invoiceIssued observado §6.9; R09 exige paid | ANX-127/157/156: consolidar cálculo provisório versus elegibilidade, decisão/migração explícitas; emissão não autoriza payout |
| R09 S3 / G3-PTR-S3-01 refund reversal | Não demonstrado no inventário | ANX-157/156: reversão idempotente ligada à invoice/pagamento/regra original, parcial/integral e ordering, sem apagar histórico |
| R09 payout lifecycle / G3-PTR-S3-02 FAILED retry | Não demonstrado | ANX-157/136: aprovação, estados e idempotência; FAILED confirmado distinto de UNKNOWN, não repetir transferência incerta; somente sandbox autorizado |
| R09 G3-PTR-S3-03 tenant | Não verificado | ANX-157/131: parceiro vê apenas escopo permitido em comandos/queries/replay/export, sem dados de outro parceiro/agency |
| R09 S4 HTTP | Não verificado integralmente | ANX-157/167: APIs e console Partner com comissões calculadas/elegíveis/pagas distinguidas, erros e aprovação verificáveis |
| R09 S4 graph | Deferido; stub não é runtime | ANX-138: projeção/referral/lineage derivada e ACL, sem estado comercial autoritativo Neo4j |
| R10 PC-G0 10/10 e PASS G2–G6 | Histórico genérico remete R04–R09 | **D-PTR-001..005** em §6.31.2 (ANX-216); issued/paid em §6.31.1 |

Atribuição, elegibilidade, antifraude, ajustes/clawback e registro comercial da ANX-157 permanecem no delta. “Ledger comercial” na issue significa rastreio de obrigações/comissões do owner partners, não novo ledger financeiro que substitui accounting; formalizar interface de postings conforme contrato. Nenhuma comissão/payout/refund ou teste financeiro foi executado, e nenhum vendor foi escolhido. Rastreio transitivo R04–R08 e resolução invoiceIssued/paid continuam pendentes.

### 6.31.1. Disposição issued/paid e interface contábil — ANX-127

**Fontes e precedência:** [partners R04](./structure-debate/partners/R04-contracts-events.md) define consumo de `billing.invoice.paid.v1` e `billing.refund.processed.v1`; [R08 D-PTR-002/004](./structure-debate/partners/R08-decision-log.md) mantém comissão em partners e idempotência invoice/referral; R09 S2/G3-PTR-S2-01 exige commission on paid. Esses contratos de planejamento orientam a correção, não a conveniência do bridge atual. Em 2026-09-08, `accrue-commission.ts` foi relido: createInvoiceIssuedConsumer usa BillingInvoiceIssuedBridge e mapInvoiceIssuedToAccrualInput para chamar accrueCommission, que grava accrual e publica commission.accrued. Inspeção estática, sem emissão ou pagamento.

**Disposição:** invoice issued comprova emissão, não recebimento. Não dispara comissão elegível nem autoriza payout. A origem de elegibilidade prevista é o fato de pagamento validado por billing, vinculado à invoice e à regra comercial aplicável em partners. Uma estimativa sobre invoice emitida, se implementada, deve ser explicitamente provisória e não reutilizar accrued/paid como promessa de liquidação. Fatura paga, comissão reconhecida e repasse liquidado são fatos diferentes; o primeiro não prova os seguintes.

**Ownership:** billing valida e publica seus fatos comerciais; partners calcula/acompanha obrigações de comissão e reversões por regra versionada; accounting valida e registra os lançamentos financeiros conforme seu contrato. Evento partners não concede acesso ao repositório contábil. “Ledger comercial” significa histórico de obrigações de partners, não segundo ledger financeiro. A interface deve vincular fato de origem, tenant, invoice/referral, moeda, valor e regra, com resposta/evento contábil rastreável. Scheduling de payout não é settlement e não reduz saldo por si. O plano de contas e momento exato de reconhecimento permanecem no slice accounting, sem regra fiscal inventada aqui.

**Migração e compatibilidade planejadas (ANX-156/157/152/132):** inventariar bridge, produtores, consumidores, journal, accruals e postings já existentes. Desabilitar a criação de novas comissões elegíveis a partir de issued no cutover; habilitar paid somente com schema/autenticidade/causalidade e deduplicação testados. Não renomear issued para paid, reconstruir pagamento por valor de invoice ou apagar histórico. Accrual legado sem prova de pagamento fica explicitamente não comprovado para payout; reconciliação pode vinculá-lo a pagamento verificável ou produzir ajuste auditável. Paid posterior não pode duplicar a mesma obrigação invoice/referral já reconciliada.

Postings financeiros existentes exigem revisão e eventual ajuste compensatório pelo dono accounting, nunca delete ou escrita direta de partners. Refund/reversal referencia fato original, respeita moeda/regra e processa duplicatas, parcialidade e eventos fora de ordem. Regras para pagamentos parciais e base comissionável devem ser fechadas no contrato comercial antes de habilitar esse caso, sem presumir que toda invoice foi paga integralmente.

Leitores contábeis e comerciais compatíveis devem preceder o novo produtor. Rollback suspende novos accruals/payouts afetados, preservando inbox/journal e obrigações confirmadas; não reativa o bridge issued como caminho de elegibilidade. FAILED confirmado e UNKNOWN não são equivalentes: transferência incerta exige reconciliação, não retry cego. Esta entrega não agenda nem executa cobrança, refund ou repasse.

**Oráculos delegados:** issued isolado não cria elegibilidade; paid válido gera uma obrigação idempotente; paid duplicado ou tardio após legado reconciliado não duplica; tenant/referral incorreto é negado; refund repetido não duplica reversão; payout scheduled não aparece como settled; emissão de evento comercial não prova posting financeiro; crash/replay preserva correlação e diferenças ficam explícitas até reconciliação. ANX-156/157/152/132 devem executar os casos em sandbox autorizado. Disposição documental sujeita à revisão independente; nenhum schema, consumer ou migration foi alterado.

### 6.31.2. A1 — disposição transitiva partners (ANX-216)

Fonte primária: [R08 decision log](./structure-debate/partners/R08-decision-log.md) (relido 2026-09-08). Conflito issued/paid: §6.31.1.

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-PTR-001 | partners dono agregados R03 | Aceito v1 | ANX-157 | Comissões |
| D-PTR-002 | Dono commission; ledger via partners.commission.accrued.v1 | Aceito v1 | ANX-157/152 | Não duplica accounting |
| D-PTR-003 | PG autoritativo | Aceito v1 | ANX-157 | ADR0004 |
| D-PTR-004 | Commission idempotente por invoiceId+referralId | Aceito v1 | ANX-157 S2 | Paid não issued |
| D-PTR-005 | graph:partners:v1 async | Aceito v1 | ANX-138/157 | S4 defer |

## 6.32. Rastreio por capacidade — operations R09/R10

Fontes: [R09](./structure-debate/operations/R09-dev-plan.md) e [R10](./structure-debate/operations/R10-g0-handoff.md), relidos em 2026-09-08. O rastreio transitivo **D-OPS-001..005** está em **§6.32.1** (ANX-217). Fonte primária: [R08 decision log](./structure-debate/operations/R08-decision-log.md). Inventário parcial: register-health-check/create-incident e ports UoW/journal. Continuação ANX-158; ANX-169/170 tratam restore e readiness operacional.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| R09 S1 incident/export/health schema | Parcial: create-incident/register-health-check presentes | ANX-158/132: estados, autoridade, scopes, contratos/erros e estado+journal+outbox; presença de create não prova lifecycle |
| R09 S2 audit.manifest consumer | Não demonstrado no inventário | ANX-158/155: ingestão por contrato, digest/ACL e dedupe, manifest alterado/tenant errado não gera operação |
| R09 S2 health probes | Parcial: registro existe, probe real não demonstrado | ANX-158/170: origem/checkedAt/stale e erro/timeout observáveis; corrigir semântica replay apontada §6.9 sem chamar registro informado de probe executado |
| R09 S3 export lifecycle / G3-OPS-S3-01 / G5-OPS-01 | Não demonstrado | ANX-158/155/133: job idempotente, duplicata/retry/checkpoint/cancelamento e pacote autorizado; duas tentativas não criam duas operações não controladas |
| R09 S3 retention ACL / G3-OPS-S3-02 | Não demonstrado | ANX-158: política/escopo/hold, pedido indevido negado e auditado; prazo ausente não autoriza deleção |
| R09 G5-OPS-02 cross-tenant manifest | Não verificado | ANX-158/131/155: manifest/artefato/export de outra agency negados em criação, consulta e download, incluindo replay |
| R09 S4 HTTP | Não verificado integralmente | ANX-158/165/166: API por papel/scope, contratos/erros/aprovação, visibilidade de pending/failed em vez de sucesso fictício |
| R09 S4 graph | Deferido; stub não é runtime | ANX-138: incident/procedure lineage derivada, eventos/checkpoint/rebuild e ACL |
| R10 PC-G0 10/10 e PASS G2–G6 | Histórico genérico referenciando R04–R09 | ANX-127/158/181: recuperar critérios e pareceres/candidato, sem herdar evidência de execução |
| ANX-158 runbooks/incident lifecycle | Parcial: create-incident presente, restante não demonstrado | ANX-158: triagem/escalonamento/resolução e procedimentos versionados com responsáveis/evidência; não apagar incidentes para “resolver” |
| ANX-158 legal hold/export/deleção | Não demonstrado | ANX-158: política aprovada, retenção de obrigações, preview/escopo e approval de ação perigosa, evidência de execução e limites; sem inventar prazos legais |
| ANX-158 recovery sem LLM / ANX-169/170 | Planejado, provas operacionais não executadas | ANX-169: restore em ambiente isolado e runbook determinístico; ANX-170: SLI/SLO/carga/custo medidos, nenhuma prontidão24/7 por documento |
| ANX-158 ações privilegiadas | Não verificado | ANX-158/136: grants/epoch/aprovação/revogação, audit antes/depois e rollback autorizado; operations coordena sem assumir estado privado de todos os módulos |

**D-OPS-001..005** estão em §6.32.1; probes/export/retenção executáveis permanecem ANX-158/169/170. Este planejamento não autoriza execução de runbooks perigosos nem alteração de produção.

### 6.32.1. A1 — disposição transitiva operations (ANX-217)

Fonte primária: [R08 decision log](./structure-debate/operations/R08-decision-log.md) (relido 2026-09-08).

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-OPS-001 | operations dono agregados R03 | Aceito v1 | ANX-158 | spec008 |
| D-OPS-002 | Dono incidentes/export/health; não audit replay nem kill switch | Aceito v1 | ANX-158/155 | Registry ADR0006 |
| D-OPS-003 | PG autoritativo | Aceito v1 | ANX-158 | ADR0004 |
| D-OPS-004 | ServiceHealthSnapshot de probes; export referencia audit deltaRefId | Aceito v1 | ANX-158/155 | Probe real ≠ registro |
| D-OPS-005 | graph:operations:v1 async | Aceito v1 | ANX-138/158 | S4 defer |

## 6.33. Rastreio por capacidade — simulation e evaluation R09/R10

Fontes relidas integralmente em 2026-09-08: [simulation R09](./structure-debate/simulation/R09-dev-plan.md), [R10](./structure-debate/simulation/R10-g0-handoff.md), [evaluation R09](./structure-debate/evaluation/R09-dev-plan.md) e [R10](./structure-debate/evaluation/R10-g0-handoff.md). O rastreio transitivo **D-SIM-001..005** está em **§6.33.1** (ANX-218); **D-EVL-001..005** em **§6.33.2** (ANX-219). Fontes primárias: [simulation R08](./structure-debate/simulation/R08-decision-log.md) e [evaluation R08](./structure-debate/evaluation/R08-decision-log.md). Inventário parcial: create-simulation-run/backtest-requested-consumer e record-evaluation-score/outcome-recorded-consumer. Continuação ANX-159/160.

| Requisito / fonte | Classificação e evidência | Continuação / oráculo |
| --- | --- | --- |
| SIM S1 schema/contracts/sandbox config | Parcial: create-simulation-run presente; flags de isolamento não provam sandbox (§6.9) | ANX-159/132: manifest/config versionados, tenant e inputs, sem credencial/endpoint live no runtime isolado |
| SIM S2 requested→started→completed / G3-SIM-S2-01 | Parcial: consumer/create presentes, STARTED observado §6.9 | ANX-159: runner executa e conclui/falha com evidência; registro STARTED não é execução concluída |
| SIM G3-SIM-S2-02 duplicate request | Parcial: backtestRequestId dedupe observado anteriormente | ANX-159: replay/race não duplicam run/custo/eventos, payload conflitante e crash/restart testados |
| SIM S3 completed/checkpoint / G5-SIM-04 | Não demonstrado | ANX-159: seed+dataset+clock+versão de modelo reproduzem resultado/checkpoint, completed somente após validação, fontes de não determinismo declaradas |
| SIM G5-SIM-01 path traversal | Não verificado | ANX-159: paths de sandbox/artefatos confinados, entradas maliciosas negadas em fixtures sem acesso a dados reais |
| SIM G5-SIM-02 hash tamper | Não verificado | ANX-159: dataset/manifest alterado→FAILED, sem continuar com resultado aparentemente válido |
| SIM G5-SIM-03 tenant isolation | Não verificado | ANX-159/131: run/dataset/checkpoint/artefatos isolados, nenhum estado de outro tenant ou ambiente |
| SIM S4 HTTP/graph | Não revalidado/deferido | ANX-159/138: API autorizada e projeção derivada, stub não é runtime, run simulado não escreve Order/Fill autoritativos fora do ciclo execution |
| ANX-159 fill/slippage/fees/failure scenarios | Planejado além do R09 resumido | ANX-159/147/151: modelos versionados, relógio/mercado/hipóteses explicitados, cenários negativos e diferenças PAPER/REAL; nenhum realismo presumido pela seed |
| EVL S1 schema/contracts | Parcial: record-evaluation-score presente, schema completo não revalidado | ANX-160/132: dataset/scorecard/judge/version/digest, erros e atomicidade |
| EVL S2 simulation+agents/scoring / G3-EVL-S2-01 | Parcial: outcome-recorded-consumer presente, simulation/agents consumers não demonstrados | ANX-160/159/139: completed legítimo desencadeia avaliação deduplicada, actor/tenant/candidato explícitos; outcome_notional observado §6.9 não prova qualidade |
| EVL S3 certification / G3-EVL-S3-01 | Não demonstrado | ANX-160: critérios satisfeitos, certificado vinculado à versão/dataset, validade/expiração/revogação/drift, sem autoaprovação |
| EVL S3 promotion.recommended / G3-EVL-S3-02 | Não demonstrado | ANX-160/136/171: recomendação para governance, regressão impede promoção, owner da versão aplica mudança aprovada; certificação não concede grant |
| EVL G3-EVL-S2-03 tenant | Não verificado | ANX-160/131: input/score/certificado/replay/consulta de outro tenant negados, reputação não expõe dados privados |
| EVL S4 HTTP/graph | Não revalidado/deferido | ANX-160/138: API por contratos e ACL, projeção derivada/rebuild, sem estado de promoção autoritativo no grafo |
| ANX-160 scorecards/reputação/reprodução | Planejado, não provado por notional | ANX-160: avaliação agente/estratégia reproduzível/auditada, versão de critérios, teste de regressão/drift e reputação com proveniência |
| Ambos R10 PC-G0 10/10 e PASS G2–G6 | Resumos históricos remetem R04–R09 sem evidência detalhada | **D-SIM-001..005** §6.33.1 (ANX-218); **D-EVL-001..005** §6.33.2 (ANX-219) |

**D-SIM-001..005** e **D-EVL-001..005** estão nas subseções abaixo; runner/score/certificação executáveis permanecem ANX-159/160. Não foram inventados critérios numéricos.

### 6.33.1. A1 — disposição transitiva simulation (ANX-218)

Fonte primária: [R08 decision log](./structure-debate/simulation/R08-decision-log.md) (relido 2026-09-08).

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-SIM-001 | simulation dono agregados R03 | Aceito v1 | ANX-159 | spec004 |
| D-SIM-002 | Dono SimulationRun isolado; sem promoção produção | Aceito v1 | ANX-159/160 | Sandbox ≠ live |
| D-SIM-003 | PG autoritativo | Aceito v1 | ANX-159 | ADR0004 |
| D-SIM-004 | Twin fidelity tiers; research-python via SimulationRun port | Aceito v1 | ANX-159 | G5-SIM |
| D-SIM-005 | graph:simulation:v1 async | Aceito v1 | ANX-138/159 | S4 defer |

### 6.33.2. A1 — disposição transitiva evaluation (ANX-219)

Fonte primária: [R08 decision log](./structure-debate/evaluation/R08-decision-log.md) (relido 2026-09-08).

| ID | Decisão (resumo) | Classificação | Disposição | Limite |
| --- | --- | --- | --- | --- |
| D-EVL-001 | evaluation dono agregados R03 | Aceito v1 | ANX-160 | spec004 |
| D-EVL-002 | Dono scoring P08; promoção via governance | Aceito v1 | ANX-160/136 | P09 §6.1 |
| D-EVL-003 | PG autoritativo | Aceito v1 | ANX-160 | ADR0004 |
| D-EVL-004 | ScoringPolicy OP01-OP08; agent vs strategy scores separados | Aceito v1 | ANX-160 | Critérios versionados |
| D-EVL-005 | graph:evaluation:v1 async | Aceito v1 | ANX-138/160 | S4 defer |

Com este incremento, os **23 módulos** possuem desdobramento dos requisitos explicitados em seus R09/R10 nas §§6.12–6.33 (simulation/evaluation compartilham §6.33). Isso é cobertura documental dos agrupamentos consultados, **não** reconciliação completa das capacidades referenciadas transitivamente, schemas/decisões ou aprovação ANX-127. Continuam as condições de encerramento da §6.1: cobertura restante, conflitos/migrações e pacote independente do conjunto. Placement do gateway distribuído foi aprovado (ADR0006, 2026-09-08); pendem revalidação G1 integrada, implementação e migração (ANX-161/162).

## 6.34. Lista finita de fechamento documental — ANX-127

Auditoria independente de fechamento registrada por Dirac no comentário ANX-127 `2612becf-5984-499b-8241-ab4ff0268ab0`, sobre matriz com SHA-256 `8a8bdc01057b089af0ad8f51378a684fea71259a9340dbc7960d297e07f4d2f3` (candidato anterior à inclusão desta seção). Parecer: PASS restrito da atualização da §6.1; nenhum novo agrupamento explícito faltante identificado; **sem PASS integral/transitivo**. A inclusão desta seção não herda aprovação daquele digest.

### Decisão humana — resolvida em 2026-09-08

Usuário confirmou “sim” à distribuição nos 23 módulos. [ADR0006](../../brain/project-docs/decisions/0006-distribute-external-gateways-within-baseline.md) registra o aceite; [spec do gateway — Placement aprovado](./system-capabilities/p05-p06-external-adapter-gateway-spec.md) detalha registry/escritor/migração/rollback. O parágrafo seguinte preserva o impedimento histórico de C2, agora removido por resposta explícita, não por continuação automática.

**Checkpoint histórico (pré-ADR0006):** o placement do gateway era a única escolha humana imediata identificada nesta auditoria. As alternativas e impactos estão no comentário ANX-127 `8a0f2a7b-9b34-4fc6-a086-d13822e839e3`: distribuição entre os 23 donos ou novo domínio mediante ADR/árvore. O ADR0003 de tools permanece proposto; nem ele nem a existência de adapter-gateway no source aprovam um domínio adicional. **Estado vigente (2026-09-08):** distribuição nos 23 módulos aprovada pelo usuário e registrada no ADR0006; registry técnico em operations, execução em execution, dados em market-data; escritor único, compatibilidade, migração e rollback na spec gateway — ver §6.1. Revalidação G1 integrada, implementação e gates G2+ permanecem distintos da decisão humana.

### Trabalho documental executável após a decisão de placement (ADR0006)

| Pacote | Limite e fonte | Evidência exigida / responsável |
| --- | --- | --- |
| Referências transitivas | Apenas referências já apontadas nas §§6.12–6.33; não expandir para pesquisa ilimitada | ANX-127: referência → requisito/grupo → filho ou disposição. Marcar o que não foi lido; separar detalhe de implementação delegado de conflito que exige resolução documental |
| Conflitos conhecidos | Lista fechada abaixo nesta auditoria; novos achados exigem evidência e justificativa de escopo | ANX-127 com donos afetados: fonte prevalente, decisão aplicável, impacto, migração/compatibilidade ou justificativa de não aplicação. Encaminhamento genérico ao executor não basta |
| Pacote integrado | Matriz, fila/roadmap e contratos operacionais efetivamente alterados | ANX-127 e revisores: critério → artefato/seção/digest → parecer independente do candidato. Revalidar mudanças afetadas; não herdar PASS de snapshots |

Disposições dos cinco conflitos — pareceres restritos históricos:

| Conflito | Disposição e escopo revisado | Parecer ANX-127 / SHA-256 do artefato revisado |
| --- | --- | --- |
| Submit, risco/reserva e permits | P06 §2.1, referência nesta matriz; ANX-148/149/150/151/132/163/136 | `400da37b-3588-45ac-a45e-d0b9bb8acc36`; P06 `599dd4f3a902c0a6812b654f31e78161fcccd111dcf6ed876c0f4b8706962030` |
| Issued/paid e partners/accounting | Matriz §6.31.1 e referência §6.34; ANX-152/156/157/132 | `7542eb8e-3e79-4832-9509-63b3d6504ef0`; matriz `471fe53a922ccd6c7f9b737c510a9a228f1bdecefeb60ca6485b5d4e5e633109` |
| Preço corrente versus REAL | P06 §§1.1/10, matriz §§6.20/6.34; ANX-145/146/132/161/163 | `1c5076a6-c9c0-464e-9765-cae58ef83a4f`; P06 `9343e907009bcb57aae4277cb2a23618f3cde80b04881bf45762ac920ca6bbe1` |
| Publicação/backtest/promoção | P09 §6.1 e referência §6.34; ANX-147/160/171/132/136 | `ac51f462-7d28-4ef8-a763-93bc9d51e129`; P09 `4b23b67cf93f1b8aab8dd19bcc912c0f7f29fa8227f83bd8b4d6f3e454e3a65a` |
| Envelopes e UUID/string | Plano P01/P02 de compatibilidade; associação financeira com execution (ADR0006/P01P02); ANX-130/132/161 | `923d4cd8-6841-4aa5-a0f8-ce05b2695115`; P01/P02 `566216e7ef5081ed5e05cd1790f97337f6ab3234f23e4fbc1f475acb3eba489f` |

Todos são **G1 PASS restrito documental**, não implementação ou aprovação integrada. Digests registram o candidato de cada parecer; alterações posteriores exigem revalidação de impacto. C1 integrado recebeu CHANGES_REQUIRED (`13399514-1dd4-41e5-b9a4-7989c0dff49c`): ownership antigo, emissor EffectGate e saldo de pareceres; correções geram novo candidato. Placement do gateway foi aprovado em 2026-09-08 (ADR0006); revalidação G1 integrada, implementação e gates G2+ permanecem pendentes e distintos da decisão humana. A5 e correção da §6.1 já realizadas não voltam como trabalho novo.

### Limite entre planejamento e implementação

Código, schemas executáveis, integração PG/Neo4j/NATS, providers, PAPER, consoles, restore e readiness estão delegados aos filhos do programa ANX-126. Sua execução futura não bloqueia, por si, a entrega do backlog. O planejamento precisa demonstrar cobertura e dependências, não alegar produto homologado. Os gates proporcionais do pacote documental continuam necessários; REAL/L3/L4 exigem autorização própria.

## 6.35. Disposição das referências transitivas já identificadas

Esta é a lista finita extraída das pendências das §§6.12–6.33, não uma declaração de leitura integral de R01–R08. “R04–R08” abaixo refere-se às rodadas do mesmo módulo nos diretórios dos R09/R10 vinculados à seção indicada; o executor deve resolver o caminho existente, sem criar documento para satisfazer uma referência. Os agrupamentos já têm filhos no programa ANX-126. Campos/schemas, cenários e decisões detalhados são trabalho do G0/contrato desses filhos, **antes de código**, não permissão para implementar sem fonte.

| Módulo / fonte da pendência | Referência → requisito/grupo a detalhar | Filho / disposição |
| --- | --- | --- |
| identity §6.12 | D-IDN-001..024 → **§6.12.1** (ANX-197); R01–R05 structure-debate; R06–R08 com limite em §6.12.1 | ANX-134 executa P1/deferidos; schemas ANX-132; DEP/H/PC-G0 revalidação em ANX-134/181 |
| organizations §6.13 | D-ORG-001..044 → **§6.13.1** (ANX-198); queries/saga/G3–G5 executáveis em ANX-135 | ANX-135 executa delta; isolamento ANX-131; parecer G6 via ANX-181 |
| governance §6.14 | D-GOV-001..010 + D-R6-GOV + PC-G0 → **§6.14.1** (ANX-199); conflitos ExecutionPermit/PLATFORM abertos | ANX-136/137 executa delta; permits P06 §2.1 em ANX-149/150/151 |
| graph §6.15 | D-GR-001..044 + T01–T20 → **§6.15.1** (ANX-200); schemas/F0 executáveis em ANX-138 | ANX-138; não converter disposição documental em teste executado |
| agents §6.16 | D-AGT-001..014 + AGT-R06 → **§6.16.1** (ANX-201); G5-AGT executável em ANX-139 | ANX-139/132; OpenBots ANX-124/125→144; teammates ANX-143 separados |
| orchestration §6.17 | D-ORC-001..056 → **§6.17.1** (ANX-202); G5/checklist20 executável em ANX-140 | ANX-140/132; runtime ANX-133; Dashi dev-only não é dep universal |
| connections §6.18 | D-CX-001..064 → **§6.18.1** (ANX-203); R04/DL-CX2 executável em ANX-141 | ANX-141/132; G5-CX e invoke real não executados |
| knowledge §6.19 | D-KN-001..020 → **§6.19.1** (ANX-204); spec002/R04 executável em ANX-142 | ANX-142/132; G5-KN e embedding real não executados |
| market-data §6.20 | D-MD-001..018 → **§6.20.1** (ANX-205); spec003/R12 executável em ANX-145/146 | ANX-145/146/132; G5-MD e feeds reais não executados |
| strategies §6.21 | D-ST-001..007,015 → **§6.21.1** (ANX-206); lacuna 008..014 no R08 | ANX-147/132/181; G5-ST e backtest não executados |
| capital §6.22 | D-CAP-001..012,015 → **§6.22.1** (ANX-207); lacuna 013..014 no R08 | ANX-148; G5-CAP e lifecycle reserva não executados |
| decisions §6.23 | D-DC-001..015 → **§6.23.1** (ANX-208); conflito submit/risco em §6.23 | ANX-149/136; G5-DC e cadeia integrada não executados |
| risk §6.24 | D-RK-001..010 → **§6.24.1** (ANX-209); D-RK-015 RLS ausente no R08 | ANX-150; G5-RK e pre-trade real não executados |
| execution §6.25 | D-EX-001..012 → **§6.25.1** (ANX-210); ADR0006 placement | ANX-151/161/162; G5-EX e adapters reais não executados |
| accounting §6.26 | D-ACC-001..012,015 → **§6.26.1** (ANX-211); lacuna 013..014 no R08 | ANX-152; G5-ACC e posting real não executados |
| portfolios §6.27 | D-PF-001..015 → **§6.27.1** (ANX-212) | ANX-153; G5-PF e valuation real não executados |
| performance §6.28 | D-PERF-001..005 → **§6.28.1** (ANX-213) | ANX-154; fórmulas/oráculos executáveis em ANX-154/181 |
| audit §6.29 | D-AUD-001..005 → **§6.29.1** (ANX-214) | ANX-155; integridade/replay executável em ANX-155 |
| billing §6.30 | D-BIL-001..005 → **§6.30.1** (ANX-215) | ANX-156/132; issued/paid em §6.31.1 |
| partners §6.31 | D-PTR-001..005 → **§6.31.2** (ANX-216); issued/paid §6.31.1 | ANX-157/132; interface sem duplicar ledger |
| operations §6.32 | D-OPS-001..005 → **§6.32.1** (ANX-217) | ANX-158; restore ANX-169 e SLO ANX-170 |
| simulation §6.33 | D-SIM-001..005 → **§6.33.1** (ANX-218) | ANX-159; runner real, não flags de sandbox |
| evaluation §6.33 | D-EVL-001..005 → **§6.33.2** (ANX-219) | ANX-160; promoção via governance P09 §6.1 |

**Estado das leituras:** todos os R09/R10 foram consultados conforme seções de origem. Para os cinco conflitos, também foram relidas as fontes explicitadas nas respectivas disposições; isso não significa leitura integral de todas as rodadas de cada linha. As demais referências transitivas não estão atestadas nesta consolidação. A tabela delega o detalhamento rastreável, não declara esses requisitos aderentes.

**Obrigação de handoff dos filhos:** registrar referência/seção/status decisório → requisito → arquivo/símbolo → teste/comando → resultado. Se a referência estiver ausente, contraditória ou não trouxer o requisito afirmado no R10, registrar o caso e resolver antes do comportamento afetado; usar escopo independente quando houver. ADR aceito prevalece, checklist de debate não substitui parecer do candidato. ANX-181 organiza críticos; os gates independentes do programa continuam necessários.

**Histórico da cadeia ANX-127:** os incrementos A1 dos 23 módulos (§6.12.1–6.33.2; ANX-197–219), placement ADR0006 e disposições dos cinco conflitos têm registros próprios. O status `done` dos filhos é um fato do board, não prova de revisão integrada. G1 C4 `018e91eb`, A4 `2ccab708` e G2–G6 abaixo são pareceres históricos limitados aos respectivos candidatos; não aprovam o run atual. A migração issued/paid (§6.31.1) e os testes de produto permanecem nas tarefas de implementação.

## 6.36. Histórico do pacote incremental A4 e candidatos C4–C8

Esta seção preserva a proveniência dos pareceres, **não os transforma em aprovações do arquivo atual**. `PASS_WITH_CONDITIONS` é a classificação literal encontrada nos registros antigos; não é uma nova disposição normativa. O [pipeline obrigatório](../../AGENTS.md) exige PASS, CHANGES_REQUIRED, BLOCKED ou NOT_APPLICABLE justificado, independência verificável e revalidação de mudanças.

| Registro histórico | Candidato explicitado no parecer | Referência no board | Alcance e limitação |
| --- | --- | --- | --- |
| G1 C4, F1/F2/F3/B1 | C4 `d31f823d37042b45245245f7639d4bb5e0946a335c69e7f3c41566048410200d` | ANX-127 `018e91eb-bae0-4d64-8e80-83308366d046` | Restrições C1–C3; não comprova G1 integral/transitivo de outro candidato |
| A4 | C4 pré-§6.36 `d31f823d37042b45245245f7639d4bb5e0946a335c69e7f3c41566048410200d`; pós-§6.36 `c371208b12283214df7bbcd02f484b381e011069a583b525a3331ca659706bd6` | ANX-127 `2ccab708` | C5 era próximo passo naquele parecer; `bcfec1c4` / `55e3adb4` registram candidatos posteriores, não o alvo revisado |
| G2 | C6 `67a7254316a7924e39e897c018d62aa99f3f96a002275ceb61a183a95c4f3552` | ANX-182 `989c4cef` | Parecer histórico, não reatribuir a C8 |
| G3 | C6, mesmo hash do G2 | ANX-183 `00e53b57` | Parecer documental; produto/E2E não executados |
| G4 | C7 `7ff36445e997ed6437be47ce01b827af7b69abed7dc37594265a47c17fabf7ca` | ANX-184 `1f744480` | Não reatribuir a C8 |
| G5 | C8 pré-G6 `0a976d7ca1cdc3f7456ea68452712e7aa096ab5037ef3cb8516cd1359fcd177b` | ANX-185 `e62ab0a9` | Tabletop documental; não eficácia de runtime |
| G6 | C8 integrado `5bad03946eef066f77148412bf42424c66886baa96e63c970b286e062bf1c801` | ANX-186 `51190da1-ba4e-4969-b6b4-4d6538a70a35` | Agregação histórica; declarações de independência/revalidação precisam de prova por revisor, não bastando o mesmo thread para todas as equipes |

**Proveniência dos históricos:** `018e91eb` foi publicado pela thread `cursor-orchestrator-20260908`, não pela execução Dirac `01a082b7-c442-7780-b323-d4aaa17508b7` deste run. A4 `2ccab708` e G2–G6 `989c4cef` / `00e53b57` / `1f744480` / `e62ab0a9` / `51190da1` foram publicados pela thread `cursor-anxionos-20d6a526`; esses registros não comprovam por si independência entre equipes. Os pareceres do roster real da §6.37 são separados e não assumem a autoria ou o alcance daqueles históricos.

O aceite histórico G7 do C6 (ANX-127 `e2305e26`) permanece preservado, sem ser estendido a candidatos posteriores. A lista dos filhos A1 e suas disposições permanece nas §§6.12.1–6.35. Pareceres restritos dos cinco conflitos continuam identificados na §6.34; a correção desta narrativa não altera aqueles contratos nem implementa as tarefas.

## 6.37. Run vigente de revalidação documental — ANX-186

O usuário solicitou concluir as revisões; G0 e coordenação estão registrados na ANX-186 (`87be61b9`). O roster independente (`41bf2dd4`) identifica coordenador, crítico Dirac, Code Review Hubble, QA Singer, Security Darwin e Red Team Chandrasekhar. O run revisa **o pacote documental**: esta matriz, [fila](./module-queue.md), [roadmap](./execution-roadmap.md), [P01/P02](./system-capabilities/p01-p02-contracts-and-gates.md), [gateway](./system-capabilities/p05-p06-external-adapter-gateway-spec.md), [P06](./system-capabilities/p06-financial-lifecycle-contract.md), [operações](./system-capabilities/p08-operations-slos-recovery-contract.md) e [evolução P09](./p09-evolution-rollback-contract.md).

A ANX-186 conserva anexos recuperáveis e hashes do pacote de entrada (`0aba7db9`). Cada correção gera novo candidato: seu hash final, checkpoint/anexo, achados e disposições são registrados **no board, fora do corpo avaliado**, evitando alterar o próprio candidato para anunciar seu PASS. As fontes canônicas e sua precedência permanecem nas §§3/5 e no AGENTS.md.

- Cobertura exigida: os 23 owners e os agrupamentos/referências finitos das §§6.12–6.35 possuem fonte, classificação e tarefa/disposição; lacuna de fonte não é requisito inventado nem comportamento liberado.
- Conflitos: disposição, impacto, compatibilidade/migração e rollback devem ser coerentes no conjunto; o código/testes futuros não são condição para entregar o backlog.
- Revisões: G1 → G2 → G3 → G4 → G5 → G6, com parecer independente do mesmo candidato ou revalidação explícita de impacto. Análises preliminares em paralelo não liberam gates.
- Evidência: resultado ausente, não verificável ou de outro digest não é PASS. Achados impeditivos retornam para correção; alterações exigem revalidação dos gates afetados.
- Encerramento: consultar os pareceres deste run na ANX-186. Esta seção fixa o protocolo e não afirma antecipadamente aprovação de gates nem aceite G7.

As dependências de implementação do programa, inclusive ANX-171, permanecem válidas para a integração do **produto**. A revisão documental aqui delimitada não encerra essas dependências, não autoriza mover tarefas de implementação para done e não homologa engines, capital real, operação 24/7 ou L3/L4.

## 7. Referências

- [Mapa de capacidades](./system-capabilities/CAPABILITY-MAP.md)
- [Checklist estrutural](./system-capabilities/MODULE-STRUCTURE-CHECKLIST.md)
- [Roadmap de execução](./execution-roadmap.md)
- [Pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md)
- [Contrato P05 Connections](./system-capabilities/p05-connections-binding-inference-contract.md)
- [Contrato P06 financeiro](./system-capabilities/p06-financial-lifecycle-contract.md)
- [Contrato P07 agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Contrato P08 operacional](./system-capabilities/p08-operations-slos-recovery-contract.md)
