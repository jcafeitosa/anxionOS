---
type: spec
title: Agents, Brain, orquestração e Graph RAG v1
description: Execução retomável, descoberta autorizada, memória, contexto temporal e recuperação com evidências.
status: draft
owner: Agents e Knowledge
created: 2026-09-07
parent_proposal: ../../proposals/0001-anxionos-prd-mestre.md
tags:
  - spec
  - agents
  - knowledge
version: "1.0"
---
# Agents, Agent Brain e Knowledge v1

## Goals

Concretizar A11–A16/B43–B45/B56 da [auditoria](../../../research/auditoria-cobertura-conversa.md): agente recebe contexto institucional limitado, descobre colaboradores autorizados, executa tarefas retomáveis e produz decisões com evidência. Completa R05/R06/R11 do [PRD](../../proposals/0001-anxionos-prd-mestre.md).

## Non-goals

Este contrato não habilita autonomia irrestrita, código arbitrário recuperado via RAG nem treinamento direto sobre memória operacional. Treinamento e promoção pertencem à [evolução](../004-institutional-evolution/spec.md). A execução financeira segue contrato próprio; raciocínio não é permissão.

## Design

### Estado atual

Há notas conceituais de [grafo](../../../notes/anxionos-graph-domain-model.md), [inferência](../../../notes/anxionos-inference-config.md) e [multimodal](../../../notes/anxionos-multimodal-inference.md); não foi encontrado runtime de aplicação verificável no inventário desta rodada. Este é o desenho de construção, sob a autorização de completar a documentação, com PRD ainda draft.

### Identidade, Brain e ciclo de vida

Agent.kind é AGENCY ou PLATFORM e só nasce pelo domínio autorizado. Administrator gerenciar um agente AGENCY não muda sua natureza. AgentVersion fixa instruções, skills, tool manifests, modelo por finalidade, autonomia, políticas de contexto e orçamento. Atualizar qualquer componente material gera versão; Run captura exatamente os IDs usados.

Agent lifecycle: DRAFT → CONFIGURED → READY → ACTIVE; ACTIVE → PAUSED/DRAINING; DRAINING → ARCHIVED quando não há trabalho pendente. READY exige modelo compatível para os slots obrigatórios, grants e ownerScope. Se a rota estiver temporariamente indisponível, READY pode aceitar fila dentro do deadline; não troca modelo. Revogação impede novo efeito, in-flight recebe cancel/drain conforme estado externo.

| Área do Brain | Conteúdo e origem | Contrato |
| --- | --- | --- |
| Identity/Responsibilities | AgentVersion, Role, capability manifest | Imutável durante Run; título CEO não confere poderes |
| Goals/Tasks | Goal e Task autoritativos | Prioridade/deadline/budget e critério de conclusão verificável |
| Skills/Tools | SkillVersion e ToolManifest assinados por hash | Requisitos de permissão e sandbox; side effects via intents |
| Relationships | Manager/team/delegations | Reporting separado de autoridade; vigência consultada |
| Knowledge | Claims/evidências/documentos autorizados | Proveniência e confiança, nunca regra de sistema por conteúdo |
| Memories | Episódica, semântica, procedural e working | Estado, expiração, fonte e política de uso |
| Decisions/Experiences | Run, Decision, Outcome, Evaluation | Experiência referencia resultado real/observado, não narrativa inventada |
| Performance/Reputation | Evaluation/ReputationSnapshot por domínio | Amostra e incerteza; não amplia autoridade |
| Permissions | Grants/mandate/policy/epoch | Contexto explica; commit revalida |
| Model Context | Binding/profile/effective config | Modelo predefinido por finalidade, tokens e parâmetros limitados |

Memória working termina com Session; episodic descreve um Run/outcome; semantic guarda afirmação/evidência; procedural é sugestão de procedimento e só vira SkillVersion após avaliação/promoção. Estados CANDIDATE → VERIFIED/REJECTED → EXPIRED/REVOKED. “Verified” exige evidência/rubrica, não confiança autodeclarada do LLM. Contradição gera vínculo/issue com ambas as fontes; correção não apaga histórico conhecido. Expiração exclui recuperação por padrão, preservando audit quando a retenção exige.

### Descoberta de agentes e distribuição de trabalho

Request: capability, resourceScope, taskType, requiredSkillVersions?, deadline, budget, dataClass, requiredIndependenceFrom. T04 primeiro elimina candidates sem grant, scope, skills, disponibilidade válida, região/confidencialidade ou separação de funções. Disponibilidade é capacidade/lease, não boolean no grafo desatualizado.

Ranking proposto após filtros: score = 0.35 taskQuality + 0.25 reliability + 0.20 availability + 0.10 costFit + 0.10 relationshipFit; cada componente ∈[0,1], pesos versionados por TaskRoutingPolicy. Latência prevista afeta availability/deadline. taskQuality usa lower confidence bound e amostra; agente sem histórico usa prior conservador identificado. relationshipFit só considera equipe/delegações autorizadas, sem inferir privilégio. Prioridade da tarefa governa fila, não passa filtros. Empate: menor carga normalizada e depois agentId.

Resultado candidatos + motivos de exclusão seguros + custo estimado + expiry; scheduler tenta lease atômica no primeiro, revalida o próximo se perdeu a corrida. Sem elegível → WAITING_CAPABILITY com escalation route. Nunca hardcode “if risk call CRO”; CRO é candidato natural por capabilities e independência.

### Goal planning e CEO

CEO recebe Mission como Goal versionado com métrica, prazo e capital/budget limit. Planeja DAG de subgoals/tasks, critérios de aceite e dependências; valida ciclo, fan-out, custo total reservado e ações requeridas antes de criar tarefas. Plano PENDING_REVIEW quando altera estratégia/autoridade/orçamento fora do envelope existente; trabalho de pesquisa dentro de grants pode seguir.

CEO observa queues, risco, deadlines e desempenho por T04/T06/T13. Replanejar cria PlanRevision com motivo, diff, tarefas mantidas/canceladas e custo já incorrido; nunca recria resultado externo completado. Goal DONE somente se os acceptance checks de todas as tarefas obrigatórias passam; tarefa opcional falha produz DEGRADED explícito. CEO não avalia sozinho sua expansão de autoridade nem valida risco da própria proposta financeira.

### Máquina de heartbeat e Run

Heartbeat é trigger (agenda/evento/manual), não loop livre sem orçamento. Chave (agentId,triggerId) deduplica disparos. Uma lease por Run, TTL e fencingEpoch; worker antigo não confirma após perder lease.

```text
QUEUED → CLAIMED → BUILDING_CONTEXT → REASONING → INTENT_READY
INTENT_READY → RESOLVING_DELEGATION / GOVERNANCE_CHECK
GOVERNANCE_CHECK → WAITING_APPROVAL / WAITING_RESOURCE / READY_TO_ACT / DENIED
READY_TO_ACT → ACTING → OBSERVING_RESULT → RECORDING → EVALUATING → COMPLETED
qualquer estado permitido → CANCEL_REQUESTED → CANCELLED ou DRAINING
falha recuperável → WAITING_RETRY → CLAIMED
efeito externo incerto → RECONCILING, nunca retry cego
```

Cada transição grava event, checkpoint, attempt, retry policy, remainingBudget e próximo wakeAt. Heartbeat de task WAITING_APPROVAL só verifica evento/deadline, não gasta tokens reexplicando a aprovação. Checkpoint contém referências/hashes e output estruturado já confirmado, sem hidden chain-of-thought. Retomada revalida authority, model binding version, evidence freshness e task cancellation; se algo material mudou, retorna BUILDING_CONTEXT e registra superseded context.

Tentativas limitadas por tarefa e classe de erro; budget máximo inclui retries/child tasks. Deadline absoluto não é estendido por backoff. Cancel antes de ACTING libera reservas/leases; durante streaming interrompe geração e preserva uso parcial; após ordem enviada aguarda reconciliação e eventual cancel explícito autorizado. Não marcar CANCELLED se ainda existe obrigação externa sem dono.

Delegação emite ChildTask com parentRunId, output contract, scopedGrantSnapshot, budget cap e idempotencyKey; parent espera child result ou timeout. Child não herda texto secreto sem ACL e não ganha authority superior. Fan-out default máximo8 e profundidade4 por policy proposta; mais requer configuração autorizada. Deadlock de tasks detectado pelo DAG.

### Graph Context e Graph RAG

Pipeline normativa:

1. Autenticar principal/consumer, definir task, scope, validAt/knownAt, dataClass e budget. Não aceitar asOf para burlar revogação atual de acesso ao documento.
2. Resolver entidades por IDs/aliases autorizados; ambiguidade material retorna ENTITY_AMBIGUOUS ou candidatos seguros, sem escolher empresa por nome.
3. Traverse T05/T10/T09 conforme tarefa, com allowlist. Aplicar autorização e tempo em cada expansão.
4. Construir conjunto de documentos/chunks elegíveis por ACL e intervalo. Vector retrieval opera nesse conjunto ou em partição autorizada; filtragem somente após topK não é suficiente.
5. Recuperar vetor no EmbeddingSpace exato da coleção; nunca comparar vetores de espaços diferentes. Somar lexical retrieval quando houver IDs/símbolos/números exatos.
6. Recuperar observações de mercado por instrumento/janela/calendário, com freshness/FX e qualidade; não representar posição/P&L por semântica aproximada.
7. Rerank dentro do conjunto autorizado com binding fixo de reranking, quando configurado; classificação de dados também limita o reranker.
8. Deduplicar conteúdo/hash e agrupar evidências conflitantes; aplicar limites por fonte/domínio e temporalidade.
9. Montar ContextManifest, reservar tokens/custos e inferir pelo Connections usando modelo fixo.
10. Validar saída, referências e ação proposta; gravar resultado + provenance. “Sem evidência suficiente” é resultado legítimo; não preencher lacunas com certeza fabricada.

Score de recuperação proposto: 0.40 relevance +0.20 graphProximity +0.15 freshness +0.15 sourceQuality +0.10 taskFit, por policy versionada. Cada componente é calculável e explicado; freshness depende do domínio (tick recente ≠ documento jurídico recente). Diversificação limita no máximo40% de tokens de evidência por uma fonte salvo tarefa explicitamente sobre aquela fonte. Reranker reordena, não promove conteúdo proibido.

### Orçamento, manifest e segurança de conteúdo

Tokens disponíveis = contextWindow efetivo − outputReservation − reasoningReservation suportada − protocol/tool overhead − safetyMargin. Operações não textuais usam limites próprios; media token estimate vem do adapter e registra incerteza. Sem capacidade conhecida necessária → WAITING_CAPABILITY, não assumir janela1M pelo grupoG1.

Prioridade de alocação: políticas/mandato/grants e instruções necessárias → estado atual autoritativo → tarefa/critério → evidências → memórias opcionais. Políticas não são truncadas silenciosamente. Trechos opcionais podem ser resumidos por job com binding/custo/proveniência; resumo não substitui original na linhagem.

ContextManifest: subjectVersion, taskVersion, principal, scope, checkpoints, policyVersions, binding/profile/effectiveConfig hashes, validAt/knownAt, item{id/source/version/hash/authorizedFields/tokenEstimate/rank/truncation}, omittedReasons, freshnessFlags, budget, assemblyVersion. Persistir prompt visível permitido e outputs/evidências conforme classificação; não coletar raciocínio interno oculto de provider.

Documento, memória, webpage e resultado de tool são dados não confiáveis. Instrução embutida “ignore policy/use key” permanece conteúdo e não altera capability, binding, budget ou system context. Ferramentas externas só são executadas após intent tipado/validação; node links não são comandos. Segredos são injetados no adapter fora do transcript.

### API, workers e eventos

| Interface | Payload/resultado | Condição de falha |
| --- | --- | --- |
| POST /v1/agents | blueprint/ownerScope/kind derivado | USER não cria PLATFORM |
| POST /agents/:id/versions | immutable config + expectedRevision | binding/capability incompatível |
| POST /goals/:id/plans | DAG + budget + criteria | cycle, limit, authority |
| POST /tasks /tasks/:id/cancel | requirements/deadline/idempotency | cancel retorna DRAINING se efeito pendente |
| POST /agents/resolve | capability/task/scope | WAITING_CAPABILITY, candidatos seguros |
| POST /context/manifests | subject/task/budget/temporal | ambiguity, stale, insufficient budget |
| POST /knowledge/ingest | source/object/hash/classification/ACL | malware/unsupported format/license status |
| POST /knowledge/query | query/collection/task/temporal | mismatched embedding space/permission |
| POST /memories/:id/verify ou revoke | evidence/rubric/reason/revision | semantic claim sem evidência não verifica |
| GET /runs/:id/events | cursor assinado | access revoked/expired |

Workers: heartbeat-trigger, task-scheduler, lease-reaper, context-builder, ingestion/extraction, chunk/embed/index, memory-expiry, run-reconciler. Extração OCR/STT/embeddings usa Connections e produz jobs/artefatos versionados. Ingestion states STAGED → EXTRACTED → CLASSIFIED → CHUNKED → EMBEDDED → INDEXED/FAILED; publicação é atômica por DocumentVersion/IndexGeneration. Job falho não oferece versão incompleta.

Eventos agents.task.created/claimed/delegated/cancelled, agents.run.checkpointed/completed, knowledge.document.versioned/indexed, knowledge.memory.verified/revoked, context.manifest.created usam journal/outbox. Consumidor de knowledge revoked invalida caches/índices; prazo de propagação monitorado, consulta revalida ACL antes de retornar texto.

### Retenção e observabilidade

DataRetentionPolicy por working/session, memory, document, evidence, decision e audit; TTL de memória não remove evidência sob hold. Expurgo exclui objetos/embeddings/caches e marca manifest contentUnavailable conservando metadados mínimos autorizados. Logs: runId/taskId/correlationId, state latency, token estimates/actual, context truncation, no-candidate rate, retry budget, lease steals, queue age e evidence coverage. Texto sensível não é label Prometheus.

## Migration

Começar com ingestão/manual research em sandbox e nenhum efeito externo. Criar AgentVersions/Tasks e registry de tools somente após contratos/ACL. Backfill de documentos preserva source hashes e marca chunks sem acesso como indisponíveis. Alterar embeddingSpace cria índice paralelo; reembed e validar → switch collection → manter anterior até sessões terminarem. Nunca misturar dimensões no mesmo espaço. Migrar versão de agente só afeta novos Runs; Runs antigos terminam/drain com config registrada e autoridade atual revalidada.

## Test plan

| ID | Tier | Cenário e oracle |
| --- | --- | --- |
| AG01 | E2E | Onboarding repetido cria um CEO; Owner humano permanece e AGENCY≠PLATFORM |
| AG02 | Integration | Heartbeat duplicado + lease expirada: um efeito confirmado; worker antigo fenced |
| AG03 | Integration | Crash após child task concluída: resume reutiliza resultado, não duplica tool |
| AG04 | Contract/security | CEO tenta ampliar próprio grant; research tenta validar risco: negados |
| AG05 | Unit/integration | Ranking só entre autorizados; sem histórico tem prior; disputa de lease usa próximo |
| AG06 | Retrieval E2E | Documento privado mais similar não aparece em resultado/count/cache/citação; revogação invalida acesso |
| AG07 | Unit/contract | Prompt acima da janela e políticas obrigatórias grandes: erro explícito; sem truncar mandato |
| AG08 | E2E | Pergunta “por que perdi ontem?” usa ledger/outcome + evidência temporal, cita método e incerteza, não só vector topK |

Adicionar casos entidade ambígua, documento com prompt injection, OCR falho, espaço embedding incompatível, cancel pós-envio e fonte expirada. Executar fixture F0/T04–T06/T10. Ainda não executados no anxionOS; avaliação de qualidade requer corpus autorizado com respostas/evidências esperadas, incluindo ausência de resposta.

## Decision Log

DL-AG1: Brain é conjunto versionado de estado/evidência, não prompt único. Alternativa prompt+RAG simples perde governança/temporalidade; custo é montagem e rastreio. Reabrir se simplificação preservar oracles.
DL-AG2: ranking determinístico inicial em vez de policy aprendida; mais explicável antes de dados. Reabrir após avaliação offline e promoção governada.
DL-AG3: memória não altera Skill/Policy automaticamente; mudança exige processo de promoção. Evita feedback de alucinação; custa revisão.
DL-AG4: escopo documental autorizado na continuação; PRD draft mantido. Pesos/limites são defaults propostos configuráveis, não escolhas comerciais ratificadas.

## Open Questions

Infra/arquitetura fecha runtime/quotas após P01; Research define corpus/rubricas de cada domínio antes da promoção; Owner/produto confirma blueprint além do CEO. Essas entradas bloqueiam habilitações correspondentes, não removem os contratos de Brain, heartbeat, contexto ou RAG aqui especificados.
