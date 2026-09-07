---
type: spec
title: Contrato institucional v1 — SDD e entrega end to end
description: Autoridade, stack, API, leis, UX, migração e critérios verificáveis do produto completo.
status: draft
owner: Produto e engenharia
created: 2026-09-07
parent_proposal: ../../proposals/0001-anxionos-prd-mestre.md
tags:
  - spec
  - anxionos
  - graph
version: "1.0"
---
# Contrato institucional v1 — índice do SDD

## Goals

Fechar AC01–AC07 da [auditoria](../../../research/auditoria-cobertura-conversa.md) com contratos de dados, autoridade, execução, falhas e verificação. O Owner recebe uma empresa governada; agentes operam pelo grafo; engenharia consegue decompor a construção sem inventar as fronteiras essenciais. Deriva do [PRD mestre](../../proposals/0001-anxionos-prd-mestre.md) e da instrução de continuar até cobrir toda a conversa.

## Non-goals

Esta entrega documenta o produto completo; não implanta serviços nem certifica conectores. Homologação de vendors, valores comerciais e desempenho medido pertencem à execução do plano. Recursos F7 estão especificados, sem antecipar sua ativação.

## Design

### Estado atual e autorização do trabalho

A inspeção do workspace nesta rodada encontrou opencode.json fora do conteúdo de planejamento, sem código de aplicação inventariado; specs/ e decisions/ estavam vazios. Existem PRD, notas de domínio, extração do 9Router e reproduções isoladas descritas nas pesquisas. Não há uma aplicação anxionOS verificada à qual atribuir estes comportamentos.

O PRD continua draft. O pedido “continue até cobrir 100%” autoriza concluir o desenho e o planejamento agora; esta especificação é draft derivado desse pedido, não aprovação retroativa de todo o PRD nem liberação de produção. Escolhas técnicas novas abaixo constituem baseline proposto e revisável.

### Mapa canônico

| Contrato | Responsabilidade |
| --- | --- |
| [Schema v1](../../../notes/anxionos-graph-schema-v1.md) | Tipos, atributos, relações, cardinalidades, invariantes e evolução |
| [Traversals v1](../../../notes/anxionos-graph-traversals-v1.md) | T01–T20, entradas, algoritmos, fixtures, resultados e carga |
| [Agents e Knowledge](../002-agents-knowledge/spec.md) | Brain, descoberta, CEO, heartbeat, memória, Graph RAG e contexto |
| [Investment lifecycle](../003-investment-lifecycle/spec.md) | Mercado, capital próprio, estratégia, risco, ordens, ledger, impacto e flight recorder |
| [Evolução institucional](../004-institutional-evolution/spec.md) | Reputação, avaliação, treinamento, promoção, auto-organização e Digital Twin |
| [Connections integration](../005-connections-integration/spec.md) | APIs, runtimes locais, Strategy bindings, ensembles e execução da extração |
| [Registro de arquitetura](../../decisions/0001-graph-operational-domain-authority.md) | Centralidade operacional do grafo e baseline de autoridade física |
| [Roadmap](../../../notes/anxionos-planejamento-end-to-end.md) | Fases, dependências, frentes e critérios de lançamento |

Em conflito, requisitos posteriores do usuário prevalecem sobre o anexo original. Dentro do desenho técnico v1, estes contratos especializados completam o PRD e a nota conceitual; Connections conserva seus contratos especializados de catálogo, inferência, multimodal, free/cooldown e automação.

### Organização do backend aceita

O usuário aprovou explicitamente a [estrutura modular](../../../notes/anxionos-backend-structure.md). O [registro0002](../../decisions/0002-adopt-modular-backend-layout.md) fixa apps/modules/services/packages/tests/deploy e 23 módulos. Esta decisão de organização é aceita; demais baselines técnicos conservam seus estados próprios. O ownership físico de cada agregado segue a tabela de fronteiras dessa estrutura.

### Um proprietário por fato

Proposta: PostgreSQL confirma mudanças de agregados institucionais, financeiros e Connections. A mesma transação grava estado, evento durável e outbox; não existe dual write obrigatório com Neo4j ou NATS. Neo4j materializa o grafo operacional para navegação, contexto, autoridade explicável, dependências e histórico. A autorização final compara a prova do grafo com epochs/revisões autoritativas antes do efeito externo. O grafo continua central ao modelo operacional; não há quatro escritores independentes para o mesmo fato.

| Fato | Escritor e confirmação | Leitura/projeção |
| --- | --- | --- |
| Owner, membership, grants, mandatos | Identity/Governance, transação PostgreSQL | Grafo e read models |
| AgentVersion, Goals, Tasks, decisões | Agents/Investment, agregado + journal | Grafo, filas, contexto |
| Conta, reserva, intenção, ordem, fill, ledger | Capital/Execution/Accounting, PostgreSQL | Grafo, painel, analytics |
| Connections, grants, binding, lease, quota, custo | Connections, PostgreSQL | Grafo/telemetria, conforme contrato operacional |
| Observação de mercado | Market, ingestão identificada em Timescale + arquivo quando aplicável | Séries; grafo referencia janelas/sinais, nunca cada tick |
| Documento/artefato e versão | Knowledge, metadados PostgreSQL + objeto verificado por hash | pgvector e grafo, reconstruíveis |
| Evento institucional | Journal do domínio, commit junto ao agregado | NATS transporta; projeções consomem |

Market ingest não precisa produzir evento institucional por tick. Snapshot de evidência que uma decisão usou possui referência durável, hash, fonte e tempos; um evento institucional confirma sua disponibilidade. Metadados e objetos usam staging → hash verified → committed; garbage collector remove staging órfão após TTL. Nunca publicar referência a objeto incompleto.

### Envelope de comando e evento

Comando: commandId, idempotencyKey, actorPrincipalId, effectiveSubjectId, scope, aggregateId, expectedRevision, action, payloadSchemaVersion, payload, deadline, correlationId. A identidade PLATFORM/AGENCY vem da sessão validada; cliente não pode defini-la livremente. Mesma chave + mesmo hash retorna o resultado original; mesma chave + hash diferente → IDEMPOTENCY_CONFLICT.

Evento: eventId, aggregateType/id, aggregateRevision, eventType/version, scope, occurredAt, recordedAt, actor, causationId, correlationId, commandId, payload, payloadHash. Unicidade (aggregateId, revision); ordenação por agregado, não suposta ordem global NATS. Dados sensíveis no payload seguem classificação; segredo nunca é evento.

Comando bloqueia/valida versões de todos os recursos que consome na ordem canônica de IDs. Atomicidade entre domínios usa saga e reservas explícitas; nunca prometer transação distribuída. Grant revogado incrementa authorityEpoch. Atualização de risco incrementa riskEpoch. Executor só aceita permit de uso único, vinculado a intentHash, account, quantity/price bounds, epochs e expiração; a aquisição/revalidação transacional antecede envio. Um efeito já enviado não é desfeito por revogação posterior: registrar corrida, reconciliar e permitir mitigação autorizada.

### Eventos, replay e recuperação

Outbox PENDING → PUBLISHED com confirmação; falha entre publish e marcação duplica entrega, não fato. Consumer mantém inbox eventId e checkpoint por agregado na mesma transação da projeção. Evento fora de ordem aguarda lacuna; timeout abre ProjectionGap. DLQ preserva payload protegido, causa e tentativas; não pula silenciosamente atualização de autoridade. Reprocessar usa mesma identidade.

Reconstrução: schema versionado + snapshot assinado por hash + eventos subsequentes; upcasters puros, sem chamadas externas. Projetar para nova generation; comparar contagens, hashes de agregados e T01–T20; trocar alias somente após checkpoint alcançado. Leitura retorna projectionGeneration, checkpoint e asOf. Grafo atrasado pode servir visualização com stale flag, nunca confirmar permissão sensível sem epoch atual.

Journal durável e objetos de auditoria têm política de retenção própria; JetStream é transporte com retenção operacional, não arquivo legal infinito. Restore inclui journal, snapshots, objetos, configuração de secrets por referência e índices reconstruíveis. Reconciliação consulta também venues, pois replay local não conhece efeitos externos perdidos.

### Stack proposta e fronteiras

| Camada | Baseline de projeto | Critério de adoção/substituição |
| --- | --- | --- |
| Web | Astro para shell/conteúdo; React + TypeScript para consoles e Graph Explorer | Interações acessíveis, SSE, isolamento de sessões e custo de bundle |
| API/control plane | Bun, Elysia, Zod, Drizzle | Contract tests, compatibilidade libs/OTel e estabilidade do runtime; Node é alternativa se o spike falhar |
| Graph | Neo4j por adapter privado | Constraint/temporalidade lógica, desempenho T01–T20 e licença/topologia compatíveis; sem depender de Graph Types de edição não verificada |
| Transações/mercado/vetores | PostgreSQL + TimescaleDB + pgvector | Compatibilidade de versões/extensões fixada na implementação; separação física quando contenção demonstrada |
| Eventos/cache | NATS JetStream; Redis para cache/coordenação não autoritativa | Perder Redis não perde dinheiro, grants ou leases confirmadas |
| Agentes | TypeScript no control plane; Go para workers quando necessário; Python para pesquisa/ML | Protocolo de tarefa comum; evitar múltiplos runtimes sem carga que justifique |
| Execution | Go inicialmente; Rust apenas serviço especializado com justificativa medida | Sem LLM/graph remoto por tick; reconciliação e determinismo priorizados |
| Artefatos/secrets | Object storage compatível com S3; secret manager com interface própria | Hash, criptografia, políticas, rotação e recuperação verificadas |
| Operação | OpenTelemetry, Prometheus, Grafana; Docker | Kubernetes somente quando escala/HA/equipe justificarem operação |

São escolhas de desenho, não afirmações sobre versões/capacidades atuais homologadas. Fixar lockfiles, imagens por digest, licenças e matriz de compatibilidade no spike P01; não inventar números de versão. Topologia inicial: um grafo lógico com scope obrigatório, índice composto e acesso somente pelo Kernel. Tenant dedicado é opção operacional via adapter; mesmo contrato. Testes adversariais de isolamento são gate antes de dados reais.

### Três caminhos e metas iniciais

Metas abaixo são propostas de ensaio, não desempenho medido nem promessa comercial.

| Caminho | Inclui | Dependência permitida | Orçamento inicial a validar |
| --- | --- | --- | --- |
| Hot | feed → estado da estratégia determinística → risco local → fila de execução | Cache local de políticas/limites com validade e fencing; confirmação financeira antes de envio | p95 processamento interno ≤20 ms, sem rede da venue; sem promessa HFT |
| Warm | intent, coordenação, graph authority/context, portfolio monitor | APIs de domínio, grafo e snapshots atuais | p95 consulta limitada ≤500 ms; comando local ≤300 ms sem inferência |
| Intelligence | research, RAG, backtest, evaluation, treinamento | Jobs canceláveis com orçamento, dependências e evidências | Ack ≤1 s; deadline por job de segundos a horas, declarado ao usuário |

Permit expirado, feed stale ou indisponibilidade do caminho de confirmação impede novo envio. UI pode continuar lendo. Metas de catálogo continuam no contrato CA, não se confundem com relógio de ocorrência da mudança no provider.

### API semântica do Graph Kernel

Prefixo /v1/graph. API REST/SDK tipada, sem Cypher arbitrário nem DSL com expressões executáveis. GraphQuery v1 aceita traversalId registrado, parâmetros validados e filtros enumerados; query planner escolhe adapter.

Envelope de leitura: scope derivado, validAt, knownAt, minCheckpoint opcional, pageSize (1–100, default50), cursor opaco assinado, deadlineMs (máx2000 sync), maxDepth (default3, máx6) e maxVisited (default2000, máx10000). Históricos/snapshots usam jobs até100000 nós, com quota. Estes limites são defaults versionados; aumento requer política administrativa, nunca prompt. Cursor vincula principal, scope, queryHash, tempos e generation; alteração → CURSOR_EXPIRED. Ordenação estável por chave de negócio + id.

| Método semântico | Entrada principal | Saída/efeito |
| --- | --- | --- |
| node.get / nodes.batchGet | IDs, fieldMask permitido | Nós visíveis, revisões; objeto invisível responde NOT_FOUND |
| node.create/update/archive | Tipo, payload, expectedRevision | Dispatcher envia comando ao domínio proprietário; resultado commandId, revision, projectionPending |
| relation.create/revoke/version | Tipo registrado, endpoints, intervalo, revisão | Comando governado; revoke fecha intervalo, nunca apaga histórico |
| traversal.neighbors/traverse | ID/Txx, direction, edgeTypes permitidos | Page de nós/arestas com checkpoint, truncated e continuation |
| traversal.shortestPath | from/to, edge allowlist, limite | Menor caminho por hops entre entidades visíveis; desempate ID; não concede autoridade |
| findDependencies/findImpact | sujeito, scenario/asOf | ImpactReport completo ou explicitamente incompleto |
| findCausalChain / lineage.get | Decision/Fill/Outcome/eventId | Evidências e relações com tipo de atribuição; não inferência causal disfarçada |
| authorization.can/explain/resolveAuthority | actor/action/resource/intentHash | ALLOW/DENY/REQUIRE_APPROVAL, reasons, grant/policy versions, epoch, expiry |
| context.buildForAgent/Decision/Portfolio | subject, objective, budget | ContextManifest autorizado e referências |
| temporal.asOf/history | subject, validAt, knownAt, cursor | Revisões e intervalos; correções preservadas |
| intelligence.findAgents/Capabilities/Knowledge | capability/task/scope | Candidatos filtrados e reason codes |
| simulation.snapshot/diff | allowed scope, baseline checkpoint, changes | Job/snapshot/report; aplicação por comando separado |

Erros: INVALID_ARGUMENT, NOT_FOUND, FORBIDDEN_ACTION (somente para recursos já visíveis), REVISION_CONFLICT, IDEMPOTENCY_CONFLICT, STALE_PROJECTION, AUTHORITY_REVOKED, APPROVAL_REQUIRED, BUDGET_EXCEEDED, QUERY_LIMIT, DEADLINE_EXCEEDED, UNSUPPORTED_SCHEMA, DEPENDENCY_UNAVAILABLE. Resposta: code, safeMessage, correlationId, retryable, retryAfter quando conhecido. Resultado parcial jamais fundamenta ALLOW; autorização incompleta falha fechada. Sem counts de objetos privados em erros ou paginação.

### Quinze leis como requisitos testáveis

| Lei | Contrato de cumprimento | Aceite |
| --- | --- | --- |
| 01 Identidade estável | Envelope + unique scope/type/id | GK01 duplicata rejeitada |
| 02 Relações explícitas | Catálogo tipado/evento obrigatório | GK02 edge desconhecida rejeitada |
| 03 Autoridade resolvível | T01–T03 + epochs | GK03 revogação entre leitura/envio bloqueia |
| 04 Temporalidade crítica | Intervalos valid/recorded | GK04 histórico antes/depois da correção |
| 05 Sem acesso direto de agente | Kernel/SDK e service principals | GK05 credencial de agente não autentica no banco |
| 06 Capabilities/intents | Dispatcher tipado | GK06 payload não autoriza ação |
| 07 Linhagem crítica | DecisionManifest | FI09 evidência ausente impede envio |
| 08 Decisão executável explicável | Versões/mandato/política/permit | FI04 hash aprovado difere → rejeitar |
| 09 Sem ticks no grafo | Market windows/observations | FI01 burst não cria nó por tick |
| 10 Mutação por evento | Domain commit + projector | GK07 replay idempotente |
| 11 Agency isolada | Scope endpoints + acesso publicado | GK08 cross-tenant negado, inclusive paginação |
| 12 Reconstrução | Journal/snapshot/upcasters | GK09 rebuild equivale ao checkpoint |
| 13 Sem autoexpansão | Grant/delegation intersection | AG04 agente não promove próprio poder |
| 14 Risco independente | Separação de funções/identidades | FI03 autor da proposta não valida próprio risco |
| 15 Execução independente | Executor só consome permit | FI05 estratégia não submete diretamente |

### Plano de entrega e evidência

| Pacote | Dependência | Entrega verificável | Responsável por função |
| --- | --- | --- | --- |
| P01 Baseline | Nenhuma | Spike stack/edição/licenças; fixture isolamento; decisão de topologia | Arquitetura/infra |
| P02 Foundation | P01 | Schemas, journal/outbox/inbox, grants/epochs, rebuild GK01–GK09 | Backend/segurança |
| P03 Kernel | P02 | API e T01–T20 com fixtures e bench | Graph/backend |
| P04 Agency/Agents | P02/P03 | Onboarding, Brain, heartbeat, RAG AG01–AG08 | Produto/agents |
| P05 Connections | P02, contratos existentes | Rotas, catálogo, cooldown, SDK e CX01–CX10 | Inference |
| P06 Investment | P03/P04/P05 | Market→paper→risk→order→reconcile FI01–FI12 | Investment/exec |
| P07 Commercial/UX | P04/P05/P06 | Owner/admin/operator/partner, billing e export UI01–UI06 | Web/comercial |
| P08 Evolution | P04/P06 + dados avaliados | Reputação/twin/promoção EV01–EV08 e ensembles | Research/governance |
| P09 Launch | P01–P07 | Recovery, tenancy, budget e E2E sem incidente aberto impeditivo | Operações/Owner |

Tarefas específicas por pacote estão nos Test plans dos contratos; implementação depende de capacidade/prioridade aprovadas, sem datas inventadas. F7/P08 continua no escopo completo, podendo ser entregue após primeiro lançamento. Sem criar plan/tasks vazios antes de greenlight de código.

### UX, comercial e encerramento end to end

Onboarding é saga idempotente: assinatura confirmada por webhook verificado → AgencyDraft/Owner → nome/mercados → blueprint C-level (CEO obrigatório) → contas/model bindings → mandato → company READY. Falha em provider deixa CONNECTIONS_PENDING retomável sem duplicar assinatura/empresa/agentes. Capital é conectado em etapa própria; configurar IA não autoriza movimentar fundos.

Company Settings permite stocks/crypto/both; retirada usa DRAINING do contrato financeiro. Convite propõe membership revogável, sem coproprietário nem troca do titular do capital. Proposta técnica: plano define maxCompanies; default inicial1, ajustável comercialmente. Cada Agency tem um Owner; Organization agrupa empresas do mesmo titular no baseline, sem compartilhamento implícito de contas entre titulares.

Company Dashboard expõe oito vistas Agency/Capital/Agent/Strategy/Risk/Execution/Knowledge/Decision, filtros temporais e tabela equivalente acessível. Nó abre painel de detalhes, versões, tarefas, autoridade, incidentes e ações autorizadas. Restringir grafo com paginação, expandir por demanda e avisar resultado parcial. P&L abre attribution → fills → orders → decisão → evidências. Platform Dashboard mostra todas as contas de todos os usuários e seus indicadores disponíveis; nunca o segredo. Operator Console oferece incidentes, aprovações e reconciliação com scope explícito. Partner Dashboard só vê referrals/comissões/agregados autorizados.

Billing Subscription é diferente de ProviderSubscription. Invoice/PaymentAdjustment e eventos do gateway têm idempotência pelo providerEventId. Comissão nasce de atribuição comercial versionada, pagamento elegível e regra percentual/fixa registrada; devolução gera reversão, não apaga payout. Payout PENDING → APPROVED → SUBMITTED → CONFIRMED ou UNKNOWN/RECONCILING; único externalKey. Não deduzir comissão do capital de trading. Preços, impostos, contrato comercial e gateway são configuração de lançamento, não valores presumidos.

Cancelamento de assinatura restringe novas tarefas conforme grace policy, preserva console de incidentes, leitura/exportação permitida e ações de redução de risco já autorizadas; não liquida automaticamente posições. ExportJob inclui metadados/proveniência e hashes, com revalidação de acesso ao download. Exclusão revoga sessões/grants/secrets, aplica retention/legal hold a dados retidos, expurga índices/embeddings derivados e mantém tombstones mínimos onde necessário. Restore deve reaplicar tombstones antes de servir leitura. Regiões e prazos são DataRetentionPolicy versionada por classe e contrato, não constantes irreversíveis.

## Migration

Projeto sem aplicação verificada: bootstrap schemas e eventos v1 em ambiente isolado; importar somente fontes como Knowledge não executável. Não importar secrets, tokens, cooldowns ou IDs do 9Router como identidade autoritativa. Ao existir produção: expand schema → backfill novo projectionGeneration → validar contagens/fixtures/checkpoint → shadow reads → canary → switch → manter geração anterior para rollback. Mudanças de significado exigem novo tipo/versão, nunca reinterpretar evento antigo. Remoção destrutiva somente após retenção e consumidores compatíveis.

## Test plan

GK01–GK09 acima: unit para validação/tempo; integration com PostgreSQL/Neo4j/NATS reais para commit, replay e revogação; E2E para isolamento/ações. Matar worker entre commit/publish/ack, duplicar/reordenar eventos e reconstruir do zero.

UI01 onboarding repetido produz uma Agency/Owner/equipe; UI02 trocar mercado com posição preserva drain; UI03 Owner não vê conta alheia por URL/search/export; UI04 admin vê indicadores globais sem segredo; UI05 webhook duplicado/refund produz uma cobrança/comissão e reversão; UI06 cancelar/excluir/exportar não perde reconciliação nem recria dados excluídos em restore.

P09 inclui restauração cronometrada, perda de Redis/NATS/Neo4j, rotação de segredo, pico de catálogo e concorrência de envio. RPO/RTO e latências somente publicados após relatório com dataset, máquinas, percentis e falhas. Esta rodada valida documentos e rastreabilidade; estes testes de sistema não foram executados.

## Decision Log

DL01 (2026-09-07): escopo documental confirmado pela instrução de continuar; PRD/specs permanecem draft, sem ratificação de implantação. Reabrir se o usuário alterar escopo.
DL02: grafo operacional com journal autoritativo por domínio evita split-brain entre bancos; custa projeção/freshness control. Alternativas: tudo no grafo ou Postgres sem graph core. Reabrir se spike demonstrar melhor opção preservando contratos.
DL03: API semântica versionada em lugar de Cypher exposto; perde flexibilidade ad hoc em troca de isolamento e orçamento previsível. Reabrir somente para console administrativo separado e auditado.
DL04: baseline financeiro conservador e autonomia por capability, não título C-level. Reabrir por política versionada e avaliação, sem violar Owner/capital próprio.
DL05: retenção parametrizada com gate de lançamento, não número universal inventado; custo é implantação exigir configuração explícita. Reabrir com contrato de dados/jurisdição definidos.

## Open Questions

| ID | Estado / bloqueio | Evidência que fecha | Decisor |
| --- | --- | --- | --- |
| L01 | Edição/topologia/licenças e versões propostas; bloqueia deploy, desenho especificado | Spike P01 + custos + licença | Arquitetura/Owner |
| L02 | Integrações reais stocks/crypto e providers; bloqueia habilitação de cada adapter | Suite contratual e sandbox homologado | Integrações/risco |
| L03 | Preços, plano/maxCompanies, equipe/datas; bloqueia compromisso comercial | Configuração comercial e capacidade | Owner/produto |
| L04 | Retenção/residência/RPO/RTO/thresholds monetários; bloqueia operação real | Política preenchida + restore/bench | Segurança/operações/Owner |
| L05 | C-levels além de CEO; blueprint proposto especificado, configuração não confirmada | Seleção/versionamento do blueprint | Produto/Owner |

Nenhum campo obrigatório de lançamento recebe permissive default quando ausente. A existência desses gates não omite funcionalidade: comportamento, responsável e evidência estão definidos; aprovação/homologação não são “cobertura documental”.
