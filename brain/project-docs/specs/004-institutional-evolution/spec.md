---
type: spec
title: Evolução institucional — reputação, aprendizado e Digital Twin
description: Avaliação contextual, treinamento governado, auto-organização, simulação, promoção e rollback.
status: draft
owner: Evaluation e Governance
created: 2026-09-07
parent_proposal: ../../proposals/0001-anxionos-prd-mestre.md
tags:
  - spec
  - evaluation
  - simulation
version: "1.0"
---
# Evolução institucional v1 — avaliação, reputação e Digital Twin

## Goals

Fechar AC03 e o loop Outcome → Evaluation → Learning → mudança governada do [PRD R20](../../proposals/0001-anxionos-prd-mestre.md). Operador compara agentes/modelos por domínio, simula mudanças e promove somente versões avaliadas. F7 é parte especificada do produto completo, não promessa de autoaperfeiçoamento sem controle.

## Non-goals

Score não concede autoridade, consenso de modelos não aprova trade e simulação não altera produção. Não há treino com dados privados por padrão nem promoção automática de modelo/binding pelo router. São fronteiras necessárias à identidade, capital próprio e modelos predefinidos.

## Design

### Estado atual

Evaluation, reputação e snapshots eram conceitos de grafo/roadmap; não há pipeline de treinamento/simulação implantado verificado. Este draft complementa [Agents](../002-agents-knowledge/spec.md), [Investment](../003-investment-lifecycle/spec.md) e [Connections](../005-connections-integration/spec.md), sob a instrução de completar o planejamento.

### Evaluation e reputação contextual

Evaluation vincula subjectVersions (AgentVersion/ModelVersion/StrategyVersion/SkillVersion), taskType, domínio, idioma/modality, dataset split, rubricVersion, context/config, dificuldade e recursos utilizados. Resultado mede qualidade da tarefa, cumprimento do contrato, confiabilidade, risco, latência e custo separadamente; custo menor não equivale a qualidade maior.

| Dimensão | Métrica/denominador | Exclusões e leitura |
| --- | --- | --- |
| Reliability | successfulContractCompletions / eligibleAttempts | Timeout/provider outage separado de erro do agente; nenhum descarte silencioso |
| Decision quality | rubric score com evidência e avaliador | Resultado financeiro isolado não prova boa decisão |
| Risk accuracy | falsos negativos/positivos em dataset rotulado + severidade | Priorizar falhas materiais; classe sem amostra = UNKNOWN |
| Execution quality | slippage, fill ratio, reject rate, deadline adherence | Condicionar por liquidez/venue/order type, não comparar tarefas diferentes |
| Prediction quality | calibration/Brier ou erro definido por problema | Label window e feedback delay; sem olhar futuro no treino |
| Governance compliance | violações verificadas / oportunidades aplicáveis | Violação crítica bloqueia certificação independentemente da média |
| Economics/latency | custo por tarefa aceita; p50/p95 | Modelo/conta/operação, estimado versus reconciliado |

ReputationSnapshot por (subjectVersion,domain,taskType,rubricVersion,asOf) agrega scores normalizados com policy versionada. Peso de observação w=qualityWeight×exp(−ln2×age/halfLife); halfLife proposta30dias para routing/reliability, ajustável por domínio. effectiveSample=(sum w)^2/sum(w²). Amostra<20 por célula recebe INSUFFICIENT_DATA e prior conservador, nunca98.3 arbitrário.

Para sucesso binário, prior Beta(1,1) + sucessos/falhas ponderados produz posterior; seleção usa quantil inferior definido pela policy. Para scores contínuos, registrar média ponderada/intervalo por bootstrap agrupado por task/source, com seed e método. Não converter métricas heterogêneas em único score sem pesos/versionamento; UI mostra componentes, amostra e intervalo. Mudança relevante de versão não herda reputação integral automaticamente: provenance link + prior transfer explícito avaliado.

Feedback de usuários e julgamentos de LLM são evidências com origem/peso, não truth labels universais. Impedir avaliação de si próprio e múltiplos votos derivados do mesmo output contarem como amostras independentes. Deduplicar task/result IDs. Detectar distribuição alterada e drift por domínio; resultados em teste separado podem suspender certificação/recomendação.

### Loop de aprendizado e promoção

Observed outcomes → curated EvaluationDatasetVersion → offline evaluation → candidate change → validation/holdout → ChangeProposal → independent review/approval → canary/shadow → promotion or rollback. LearningOutcome pode recomendar prompt, skill, roteamento de contas, inference profile, estratégia ou modelo; cada alvo tem ownerDomain/autoridade. Connections não modifica AgentModelBinding em resposta a score.

Candidate states DRAFT → EVALUATING → ELIGIBLE → PROPOSED → APPROVED → CANARY → PROMOTED; REJECTED/ROLLED_BACK/SUSPENDED mantêm evidência. Gate: compatibilidade/segurança/governança sem regressão impeditiva, qualidade no mínimo threshold da rubrica, limites custo/latência, cobertura de tarefas afetadas e amostra mínima. Thresholds são EvaluationPolicy obrigatória por caso de uso; ausentes bloqueiam promoção, sem escolher números financeiros por conta própria.

Canary atribui coorte por hash de subject/task, registra baseline/candidate e evita double side effects. Para decisões financeiras, shadow não envia ordens e comparação usa mesmo dataset/snapshot; promover só altera novas tasks/deployments aprovados. Rollback aponta para versão anterior com novo evento; não apaga uso/custo nem reverte fill de mercado.

### Treinamento e dataset governance

TrainingJob só nasce de comando autorizado, com dataset manifest, direitos de uso/classificação, purpose, provider/local destination policy, split protocol, budget e binding/compute target. Dados de outra Agency não entram por serem visíveis ao administrador. PLATFORM poder usar contas dos usuários para inferência não concede direito de treinar com dados financeiros/privados desses usuários.

Pipeline: select authorized source versions → redact/separate secret-bearing artifacts → dedupe/label → leakage checks → immutable train/validation/test split → training → artifact hash/model registration → eval → proposal. Job status QUEUED/RUNNING/CANCEL_REQUESTED/CANCELLED/SUCCEEDED/FAILED; checkpoint e budget cobrados por unidade específica. Cancelar não desfaz custo já consumido. Artifact registra base model/license/training code/env/data hashes; registrar novo modelo não o torna binding de nenhum agente.

Raw prompts/memórias não viram corpus automaticamente. Retenção/revogação aciona impact assessment: retirar amostras futuras e índices, avaliar artefatos já treinados conforme policy/contrato, sem prometer “desaprender” dado por simples exclusão. Dataset lineage responde quais jobs/modelos derivaram daquela fonte.

### Auto-organização

CEO detecta queue age/SLO breach, capacity mismatch, recurring dependency bottleneck e tasks sem capability. ObservationWindow evita reorganizar por um pico; proposta inclui dados, hipóteses, alternativas e custo. Ações possíveis: redistribuir tarefas dentro de grants existentes; criar/pausar equipe ou agente; sugerir nova Skill/Binding; propor mudar reporting/delegation.

Reassignment dentro de scope/authority/budget pode seguir policy já concedida; criar capability, ampliar capital/budget, modificar segregação ou conceder authority requer aprovação independente. CEO não executa patch genérico no grafo.

ChangeProposal contém kind, requester, patch de comandos tipados, baseline revisions/epochs, objetivo, affected resources, ImpactReport, simulation result, cost, requiredApprovals, expiry e rollback plan. Estados DRAFT → ANALYZED → SIMULATED → WAITING_APPROVAL → APPROVED → APPLYING → APPLIED/REJECTED/STALE/FAILED_PARTIAL. Patch crítico incompleto/stale não aplica. Budget computa custo de provisionar e operar agentes, incluindo inference; “execution idle” não autoriza transferir risk authority.

### Agency Digital Twin e snapshots

GraphSnapshot é manifesto consistente de scope, checkpoint por aggregate partition, validAt/knownAt, schema versions, node/edge IDs/revisions e object hashes. Captura espera watermark dos domínios necessários ou retorna INCOMPLETE, sem alegar instante global atômico fictício. Inclui ledger/positions/market windows/task queues/model offering state e policies referenciados, conforme cenário. Secrets substituídos por referências sem capacidade de resolução.

SimulationRun opera em namespace isolado, service principal sem outbound trading/secrets de produção; adapters usam fixtures/replay. Dados privados conservam ACL. Cenário especifica patch, workload, clocks, random seed, assumptions, model/cost snapshots, market path e evaluation rubric. Usar LLM para analisar cenário passa por Connections com budget/custo real registrado, mas ferramentas de efeito ficam simuladas.

Saída: before/after reachableResources/capabilities/authority paths; violations/conflicts; tasks blocked/reassigned; capital allocated/reserved/exposed por moeda e valuation; concentração/gross/net; queue throughput/wait predictions; estimatedcost e interval/assumptions; requiredApprovals. Distinção: “conta alcançável” não significa “fundos transferidos”; performance simulada não é retorno previsto garantido.

### Diff, rebase, aplicação e rollback

Diff compara NodeKey/edgeId e effective properties, separa added/revoked/versioned, identifica mudanças indiretamente alcançáveis (T19) e preserva distinção authority/reporting. Formulação de conflito:
- baselineRevision≠currentRevision em recurso afetado;
- authority/risk epoch mudou;
- dependência/obrigação externa nova;
- approval expirou ou patchHash mudou.

Qualquer condição → STALE, sem last-write-wins. Rebase reaplica intenção da mudança a novo snapshot, recalcula impacto/riscos e pede aprovações compatíveis com novo hash. Não transportar APPROVED para patch diferente.

Apply consome ChangeProposal aprovado e emite comandos de domínio com expectedRevision, idempotencyKey por step e ordem de dependência. Mudanças no mesmo agregado podem ser atômicas; saga multiagregado registra checkpoints/compensações e bloqueia dependentes em falha parcial. Nunca trocar banco de produção por snapshot de teste.

Rollback é plano compensatório autorizado: restaurar versão/config ou revogar grants criados, retornar tarefas não iniciadas, drenar agentes provisionados. Não desfaz trades, mensagens ou custo; esses exigem ações compensatórias próprias e reconciliação. “Rollback failed” vira Incident com ownership, não APPLIED fictício. Snapshot/patch/result permanecem auditáveis segundo retenção.

### APIs, workers e observabilidade

POST /evaluations, /datasets/versions, /training-jobs, /change-proposals, /simulations; POST /change-proposals/:id/rebase|approve|apply|rollback; GET /reputation?subject&domain&taskType&asOf. Todos usam scope derivado, versões e idempotência; simulação não aceita live=true de um agente.

Workers evaluation-runner, feedback-curator, reputation-aggregator, drift-monitor, training-orchestrator, simulation-runner, change-saga, canary-monitor. Eventos evaluation.completed, reputation.updated, proposal.stale/approved/applied, simulation.completed, training.completed, promotion.rolled_back. Métricas: effective sample, rubric pass rates, critical violations, drift, self-eval rejections, promotion regressions, stale proposals, rollback partials e simulation cost.

## Migration

F7 inicia com avaliação offline sem uso operacional de scores. Backfill de resultados só usa fontes verificáveis; casos sem dataset/rubric ficam LEGACY_UNSCORED. Shadow ranking compara escolha atual e candidata sem alterar tarefas. Habilitar reputação por policy versionada após validação; canary pequeno e rollback. Digital Twin começa read-only snapshot/diff, depois simulação, depois aplicação governada. Não importar cenário como estado vivo. TrainingJob opt-in por autoridade/dataset, sem migração automática de transcripts.

## Test plan

| ID | Tier | Resultado exigido |
| --- | --- | --- |
| EV01 | Unit | Mesmo dataset/seed/policy produz mesmo score e effectiveSample; sem amostra não inventa nota |
| EV02 | Integration | Duplicação de feedback/self-evaluation não aumenta reputação; erro crítico bloqueia promoção |
| EV03 | E2E | Melhor score só recomenda mudança; binding/authority permanecem até comando aprovado |
| EV04 | Dataset/security | Documento de AgencyB ou secret não entra em training de A; split sem leakage conhecido |
| EV05 | Sandbox | Simulation tenta resolver secret/enviar order: negado; nenhum efeito externo |
| EV06 | Concurrency | Snapshot100 e live101 → STALE; rebase muda hash e revalida aprovações |
| EV07 | Saga/fault | Falha no terceiro passo preserva checkpoint, compensa o reversível, abre incidente no irreversível |
| EV08 | E2E | CEO propõe equipe por gargalo; Owner aprova patch; canary falha e rollback preserva custo/histórico |

Usar T13/T19 e F0. Validar scores por task/source cluster, não só média global; simulação quantitativa compara contra scenario oracle, não texto convincente do LLM. Testes ainda não executados no produto.

## Decision Log

DL-EV1: reputação por domínio/tarefa/versão com amostra/intervalo em lugar de ranking absoluto; custa dados e UI mais rica, evita precisão falsa.
DL-EV2: aprendizado gera proposta, não escrita direta de grants/bindings; custa tempo de promoção e preserva controle.
DL-EV3: snapshot lógico com watermarks e saga de aplicação em vez de clone sobrescrevendo produção; custa coordenação, evita perder eventos concorrentes.
DL-EV4: treinamento exige autorização de dados separada de uso da conta de inferência; necessário porque acesso a compute não é propriedade de conteúdo.
Todas em 2026-09-07 como baseline documental proposto; reabrir por evidência de desempenho/correção preservando invariantes do Owner e segregação.

## Open Questions

Research define rubricas/datasets/thresholds por domínio antes de promover; operações mede half-life e drift thresholds; Owner aprova políticas de mudança/treinamento aplicáveis. Ausência de dados bloqueia reputação operacional/promoção, não o registro de avaliações. Recursos permanecem F7/P08 com critérios completos, sem simular implementação já concluída.
