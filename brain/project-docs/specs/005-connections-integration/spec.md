---
type: spec
title: Connections — integrações, runtimes, workflows e execução
description: Escopos, fairness, modelos fixos, adapters locais, Strategy bindings, ensembles e pacotes de extração.
status: draft
owner: Connections e Inference
created: 2026-09-07
parent_proposal: ../../proposals/0001-anxionos-prd-mestre.md
tags:
  - spec
  - connections
  - routing
version: "1.0"
---
# Connections v1 — integração e implementação do módulo

## Goals

Fechar AC06, C14/C17/C20/C25–C27/C30 da [auditoria](../../../research/auditoria-cobertura-conversa.md). Definir interfaces e pacotes de implementação para o módulo de modelos/API/assinaturas, incluindo runtimes locais, Strategy bindings, ensembles e aprendizado governado. Preserva os modelos predefinidos por agente e o uso de contas solicitado pelo usuário.

## Non-goals

Não transformar extração do 9Router em cópia cega de seu modelo de confiança, não habilitar conectores sem homologação e não trocar modelo por preço/cooldown/qualidade sem binding explícito. Cascata/ensemble são workflows configurados; não fallback implícito do router.

## Design

### Estado atual e contratos de origem

Existe [Connections v0.12](../../../notes/anxionos-connections.md), contrato [operacional](../../../notes/anxionos-connections-operational-contract.md), [inferência](../../../notes/anxionos-inference-config.md), [catálogo](../../../notes/anxionos-model-catalog.md), [multimodal](../../../notes/anxionos-multimodal-inference.md), [free/cooldown](../../../notes/anxionos-free-cooldown.md) e [automação](../../../notes/anxionos-catalog-automation.md). A [matriz 9Router](../../../research/9router-functional-coverage.md) cobre36 famílias no snapshot eb712ca; pesquisas/reproduções upstream não equivalem ao backend implementado. O inventário atual não encontrou aplicação anxionOS verificável.

Esta spec é camada de integração, não substitui definições de campos/falhas daqueles contratos. Referência 9Router tem versão fixada na pesquisa; nenhum número de providers ou nome ilustrativo de modelo é promessa de suporte atual.

### Matriz de propriedade e consumo

| Quem consome | Contas privadas permitidas | SYSTEM_FREE | Balanceamento |
| --- | --- | --- | --- |
| Owner/humano ou agente AGENCY de U1 | Todas elegíveis de U1, inclusive múltiplas API/assinatura por provider | Ofertas explicitamente publicadas | Entre contas próprias; nunca conta privada U2 |
| Agente PLATFORM criado pelos admins | Contas elegíveis dos usuários e plataforma sob grants/policies | Sim | Alternância global de contas reais por despacho, com fairness |
| Admin usando agente AGENCY | Continua identidade AGENCY e limites do titular | Sim | Administração não muda consumerKind |
| Organization | Agrupamento administrativo de empresas do mesmo Owner no baseline | Conforme grants de consumo | Não é pool universal de contas dos membros |

Connection.ownerPrincipalId identifica titular; visibilityScope identifica quem vê metadados; consumerScope quem pode usar; fundingScope quem suporta custo; essas dimensões são separadas. Organization/Agency/User podem restringir política herdada, nunca ampliar direito a conta alheia. Se futura colaboração incluir outro usuário, membership concede ações sobre a empresa explicitamente autorizadas, não propriedade da conta IA/capital do Owner; chamadas “do usuário” continuam vinculadas ao titular/consumer autorizado. Compartilhamento adicional entre clientes exige mudança de produto e não nasce da hierarquia.

PLATFORM recebe elegibilidade de uso, não segredo ou licença para ler conteúdo das tasks do titular. Grant temporal por conta/oferta/action/consumer, limite/custo e revogação; runtime identifica demanda da plataforma no UsageRecord. Usuário vê informações disponíveis da própria conta, inclusive consumo atribuível a PLATFORM, sem prompts de outros tenants; admin vê inventário global e traces conforme privilege. SYSTEM_FREE expõe oferta, capacidades, disponibilidade e restrições, não identidade/credencial da conta de origem.

### Modelo fixo, tipo de tarefa e fairness

AgentModelBinding versionado por purpose/operation aponta ModelVersion exata. Requirements da tarefa determinam elegibilidade da oferta, effort/thinking/config suportada e conta; não escolhem livremente outro modelo. Configuração do agente pode usar catálogo/grupos/reputação para recomendar binding; mudança é comando autorizado.

AGENCY scheduler seleciona OwnerProviderPool elegível por modelo/operação/entitlement, data policy, quota, cooldown, deadline e budget. Mantém cursor por Owner, escolhendo a conta elegível menos recentemente despachada e desempate estável, conforme contrato operacional; uma única conta própria pode ser reutilizada. Não usar uma key rotacionada como “nova conta”. Contas com quotaGroup compartilhado reservam no mesmo grupo para evitar conflito.

PLATFORM preserva o coordenador lógico e a sequência global do contrato operacional: filtra contas elegíveis, exclui lastDispatchedUpstreamAccountKey e escolhe a conta menos recentemente despachada, com desempate estável por ID. Na mesma transação aloca sequência, lease, quota/budget e atualiza lastAccount. Dois workers simultâneos não escolhem a mesma conta por leitura velha. Identidade duplicada por credencial conserva a mesma chave. Fairness de fila por consumidor e reservas do titular atuam na admissão, sem substituir essa ordem de seleção de contas.

SYSTEM_FREE sem autenticação usa capacityResourceId e quotas por consumidor, sem inventar conta nem prometer alternância entre contas inexistentes. Essa distribuição é distinta da rotação PLATFORM em contas contribuídas. Somente uma conta contribuída elegível e igual à anterior → SINGLE_ACCOUNT_WAIT até outra elegível/deadline, sem violar alternância silenciosamente. Concorrência pode manter requests anteriores em voo; requisito é alternância de despachos, não exclusividade eterna da conta. Retry antes de envio não avança sequência; envio incerto é contabilizado como despachado e exige tratamento de estado. Reserva de capacidade para uso do titular evita que PLATFORM monopolize seu pool; valores são AccountSharingPolicy versionada/configurável, ausentes bloqueiam grant de consumo que dependa deles.

### Strategy, Knowledge e slots

StrategyVersion.inferenceRequirements por fase contém taskType, operation, requiredCapabilities, context/output bounds, dataClass, latency class, complexity e requiredPurpose. Deployment valida todos os slots obrigatórios contra AgentVersion/binding; snapshot registra StrategyVersion+TaskRequirements+Binding+InferenceProfile. Model offering nova pode satisfazer o mesmo binding se identidade verificada; alias textual não prova equivalência.

Slots exemplo: reasoning.default, reasoning.planning, reasoning.special, speech.tts, speech.stt, retrieval.rerank. Coleção Knowledge fixa EmbeddingSpace próprio (modelo/dimensions/normalization/pooling); embeddings de um agente não substituem esse binding. Modelo caro só em purpose PLANNING/SPECIAL derivado do workflow validado no servidor e com threshold/budget; um prompt não declara a própria exceção. Complexity sugere perfil e ordem de fila dentro da política, nunca aumenta max_tokens/effort/budget por conta própria.

G1–G4 são grupos solicitados pelo usuário com referências ilustrativas, independentes de preço/janela. Modelos nãoLLM têm NOT_APPLICABLE. Janela UNKNOWN não é G1. Descoberta de novos modelos pode publicar imediatamente oferta compatível seguindo CA; não altera slots existentes.

### Runtime Adapter Contract e matriz local

RuntimeAdapter versão1:
- describeCapabilities(operation) → protocolos, campos suportados, limites e proveniência;
- discoverModels(connection,cursor/etag) → modelos/ofertas e completude da listagem;
- normalizeRequest(binding,requirements,effectiveConfig) → payload validado + diferenças explícitas;
- invoke/stream ou submitJob/pollJob/cancelJob → eventos normalizados;
- parseUsage, classifyError, extractRateLimit, healthProbe;
- resolveIdentity/entitlement quando suportado e credential injection fora de transcript.

Adapter não promete capacidade ausente no protocolo. Estados por runtime/operação: CANDIDATE → CONTRACT_DEFINED → TESTING → VERIFIED → ENABLED ou DEGRADED/DISABLED. Matriz abaixo é alvo de implementação, não verificação de capacidades atuais dos produtos.

| Runtime alvo | Integração proposta | Gate específico antes de ENABLED |
| --- | --- | --- |
| vLLM | Endpoint privado HTTP pelo adapter compatível declarado pelo servidor | Model IDs, chat/completion/embeddings conforme operação real, streaming/tools/usage/cancel e version pin |
| Ollama | Adapter nativo e/ou compatível por endpoint registrado | Modelo/digest, lifecycle pull/load, context real/configurado, stream/parser e limites por operação |
| LM Studio | Endpoint local/private explicitamente configurado | Model identity, servidor ativo, lifecycle/unload, access control e incompatibilidades documentadas |
| Apple Foundation Models | Bridge local dedicado quando APIs/plataforma permitirem | Disponibilidade por dispositivo/OS, autorização do usuário local, operações reais, limitação de contexto e distribuição; não fingir endpoint HTTP padrão |
| Custom inference | Manifest+adapter versionados pelo administrador | Contrato completo de payload/auth/limits/error/usage/provenance e sandbox |
| GPU cluster privado | Endpoint inference + scheduler/capacity adapter | Tenant isolation, queue/admission, warmup/cancel/job, GPU time/cost, health e failover de mesmo modelo |

Sem probe/model identity/capability evidence suficiente: catalogado como pendente para aquela operação, sem bloquear modelos independentes. Custo local considera compute/energia/amortização quando configurado; grátis de API não implica compute gratuito. Endpoint local de usuário só é utilizável pela plataforma quando rede/agent bridge, grant, política de dados e disponibilidade permitirem; não presumir acesso à máquina a partir do servidor.

EndpointPolicy valida URL, DNS resolvido, redirects, protocolo, certificado e rede permitida; bloquear SSRF/metadata endpoints. Redes privadas só com allowlist/admin configuration; credential nunca acompanha redirect para host não aprovado. HealthProbe tem quota/budget pequeno e não faz pull de modelo gigante implicitamente. Carregar/download de pesos é comando explícito com tamanho/licença/custo registrados.

### Ensemble e cascata sem romper binding

EnsembleWorkflowVersion fixa membros, cada um com AgentVersion/ModelBinding/operation, requirements, judge binding, thresholds, deadline e budget total. Um membro pode usar modelo distinto porque é agente/slot explicitamente configurado; o router de cada membro continua preservando seu modelo. Single-agent “troca livre para tentar acertar” não integra baseline.

Execução: validar elegibilidade de todos → reservar orçamento agregado máximo → despachar membros conforme policy → validar outputs contra schema/rubric → dedupe correlated sources → judge → structured outcome → independent governance/risk se ação externa. Estados COLLECTING → JUDGING → ACCEPTED/DISAGREEMENT/INSUFFICIENT_EVIDENCE/FAILED/CANCELLED. Uso parcial de cada membro é cobrado/atribuído separadamente.

Quórum conta respostas válidas, não apenas HTTP200. Membros com mesmo modelo/base/corpus são correlacionados e exibidos como tal; votos não são amostras independentes. Policy pode exigir diversidade mínima de provider/model family/fontes, mas não pode improvisar binding se faltarem. Judge recebe evidências e respostas com procedência, não authority. Critério inclui schema correctness, reference support, factual rubric e disagreements materiais; confiança autodeclarada não basta.

Timeout de um membro: continuar somente se quorum mínimo e requisitos de diversidade/evidência permanecem satisfeitos; senão INSUFFICIENT_EVIDENCE. Judge indisponível: WAITING_RESOURCE/deadline, sem transformar maioria em aprovação se policy exige judge. Rejeição de conteúdo/policy não dispara modelo alternativo para contornar restrição. Fall back de conexão preserva modelo; streaming parcial não se mescla a outro output.

Cascata é DAG de tarefas com slots fixos (ex. classificador → reasoning), gate objetivo por schema/rubric e budget; pequena/média/grande são configuração anterior, não escolha dinâmica por marketing. Comparar offline com baseline single-model antes de habilitar; registrar latência/custo/ganho e incerteza. Ensembles pertencem F7/P08, com integração preparada no mesmo InferenceRequest contract.

### SDK e API pública interna

Prefixo /v1/connections. Auth deriva consumerKind/principal/scope, nunca aceita header de cliente como prova PLATFORM. DTOs são schemas versionados de packages/contracts; erros incluem requestId, safeReason, retryable e retryAfter quando conhecido. SDK TypeScript inicial, Go para execution/control consumers e Python para research, gerados dos mesmos contratos quando aplicável; sem expor objetos de storage.

| Recurso/operação | Contrato |
| --- | --- |
| providers / accounts / connections | CRUD governado de metadados; Owner own-only, admin inventário global; secrets write-only/ref |
| accounts/:id/authorize | Handshake suportado pelo adapter; state/PKCE quando protocolo usa OAuth; scopes/expiry/generation |
| accounts/:id/grants / pools | Uso PLATFORM e restrições do titular; revogação incrementa epoch |
| models / offerings / catalog-releases | Filtros operação/free declarado/readiness/grupo/contexto/owner eligibility; cursor/etag |
| bindings / profiles | Versão/expectedRevision, compatibilidade, requested/effective params |
| routing:explain | Dry-run de elegibilidade/custo; não reserva nem garante rota futura |
| inference:invoke / stream | BindingId, taskId, operation, typedInput, deadline, idempotencyKey |
| inference-jobs / artifacts | Submit/status/cancel; artifact download reautoriza e expira |
| requests/:id/trace | Candidate exclusions, attempts/config/usage, campos por scope |
| cooldowns / health | Leitura do titular/admin; reset administrativo não supera bloqueio upstream conhecido |
| usage / budgets / quotas | Estimado/real, unidade/moeda, períodos, atribuição e reservas |
| adapters / discovery-runs | Admin registra/verifica adapter; auto discovery não precisa aprovação por modelo compatível |

Compatibilidade OpenAI-like é façade versionada para operações suportadas; erros explícitos para campos não mapeáveis. Não fingir equivalência de todos protocolos. Streaming normaliza start/delta/tool-call/usage/end/error com sequence; payload parcial finalizado é PARTIAL, não SUCCESS vazio. Tool IDs/arguments são validados e provider reasoning não vaza como texto/tool por erro de parser.

### Workers, pacotes e extração 9Router

| Pacote | Origem a extrair/adaptar | Entrega e aceitação |
| --- | --- | --- |
| CX-P1 Registry/DTO | Famílias registry/providers/models/discovery da matriz36 | Tipos com IDs/proveniência, aliases sem merges indevidos; schemas gerados |
| CX-P2 Adapters/Auth | Providers/protocols/OAuth/API/local/translation | Um adapter por capability real; testes request/stream/error/usage/secrets |
| CX-P3 Runtime | Routing/fallback/pools/quota/cooldown/health | Leasing/fencing/fairness; invariantes operacionais e CF01–CF16 |
| CX-P4 Profiles | Effort/thinking/tools/context/normalization | Param schemas por offering e EffectiveConfig; testes do contrato de inferência |
| CX-P5 Catalog | Free detection/watch/sync/pricing/modalities | CF/CA e catálogo; ativação por readiness, sem rebind |
| CX-P6 Economics/UI | Usage/cost/metrics/dashboard/audit | Ledger reconciliado e Owner/admin views sem vazamento |
| CX-P7 Advanced | Fusion/evaluation/local runtime/job operations | Ensemble/judge/cascata tipados e gates de homologação |

A [matriz funcional36](../../../research/9router-functional-coverage.md) permanece checklist por família com evidência e destino; nenhuma família desaparece por não estar repetida aqui. Para cada item registrar upstreamPath@commit, licença/dependências, keep/adapt/reimplement/defer, contrato de destino, teste e resultado. Recursos upstream incompatíveis com isolamento/modelo fixo recebem adaptação ou rejeição justificada; cobertura significa destino explícito, não preservação literal de bugs.

Workers: catalog watcher (event/conditional poll/full reconcile), model classifier, offering publisher, quota monitor, health probe, cooldown recovery, lease reaper, credential refresh, usage reconciler, job poller, artifact expiry, routing telemetry e evaluation feedback. Controle concorrente por provider/account/generation; worker obsoleto não publica snapshot velho. Watchers mantêm última versão boa em falha e tratam listagem parcial sem retirar modelos. Add/remove/capability/price changes são diff versionado. Removed fica unavailable/deprecated sem apagar histórico; reappearance preserva identidade verificável.

Scheduler de catálogo usa proposta5min±10% polling e reconciliação6h onde não há evento, conforme CA; mudança só pode ser imediata após detecção. Publish compatible entry automático; nome/grupo/preço desconhecido não vira certeza. Readiness localizada por operação/acesso: campos obrigatórios faltantes bloqueiam aquele uso, classificação de qualidade UNCLASSIFIED não bloqueia tarefa compatível básica.

### Estrutura e ownership

A [árvore do backend](../../../notes/anxionos-backend-structure.md) define modules/connections/{domain,application,infrastructure,graph,api,workers,tests}. Provider integrations financeiras pertencem execution/market-data; connections gerencia inteligência. Billing de assinatura da plataforma é outro módulo; ProviderSubscription aqui representa acesso do usuário ao provider.

Model usage/custo e avaliação alimentam ReputationSnapshot via eventos; recommendation de mudança gera ChangeProposal. Policy aprendida de seleção de contas pode ser avaliada/shadowed/promovida; nunca muda consumer scopes, modelo fixo ou limites de autoridade como efeito colateral.

## Migration

Importar 9Router somente por workflow admin/Owner com preview e mapping report, versão/schema/hash. Secrets migrados para cofre fora do documento; IDs locais viram mapping, duplicatas por upstreamAccountKey são resolvidas antes de pools. Importar configuração não importa sessões logadas de outros usuários nem transforma free flag antigo em SYSTEM_FREE.

Rollout: DTO/contracts → mocked adapters → um provider API e um subscription adapter homologado em sandbox → routing shadow sem chamada extra → canary owner-pool → PLATFORM grants/fairness → auto catalog → multimodal/jobs → advanced F7. Sequência não reduz escopo final. Rollback desabilita adapter/rota/publicação afetada, conserva custos/leases/requests UNKNOWN e reconcilia; não reseta cooldown para mascarar falha.

## Test plan

| ID | Tier | Cenário/resultado |
| --- | --- | --- |
| CX01 | Concurrency | PLATFORM requests paralelas alternam K1/K2/K3 por sequência; credencial duplicada K1b não altera conta |
| CX02 | Isolation E2E | U1 não usa nem vê AI3 de U2, inclusive free; admin vê inventário; PLATFORM tem trace/grant próprio |
| CX03 | Contract | Same binding, 429/timeout/cooldown: troca conta permitida, nunca modelo; single account espera |
| CX04 | Quota/fault | API+assinatura no mesmo quotaGroup não excedem reserva; worker stale não libera lease novo |
| CX05 | Catalog | Modelo novo compatível publicado; tag free curta/zero decimal preservados; erro/lista parcial não remove catálogo |
| CX06 | Parameter | Effort/thinking incompatível retorna erro/diff autorizado, nunca aumento silencioso; modelo caro ROUTINE negado |
| CX07 | Adapter | Cada runtime alvo tem suite por operação; unsupported/local offline não finge suporte nem resolve secret fora do adapter |
| CX08 | Ensemble | Timeout/judge indisponível/quórum correlacionado não produz aprovação; todos custos parciais atribuídos |
| CX09 | Integration | Strategy binding incompatível bloqueia deployment; nova oferta não rebind; embedding space não mistura dimensões |
| CX10 | Recovery/E2E | Import→uso→revogação→restore conserva identidade, ledger, cooldown generation e ACL |

Executar em conjunto os aceites operacionais, CF/CA/MM e inferência dos contratos vinculados; esta tabela adiciona cenários de integração, não substitui suites. Nenhum resultado de homologação é inferido da documentação da NVIDIA/9Router ou de modelo publicamente listado.

## Decision Log

DL-CX1: manter scopes visibility/consumption/funding distintos; evita confundir admin visibility com uso privado de clientes.
DL-CX2: fairness de admissão por consumidor e seleção da conta elegível menos recentemente despachada com sequência global PLATFORM; custo é coordenação/espera quando só uma conta. Reabrir política só por requisito explícito, sem relaxar alternância silenciosamente.
DL-CX3: ensembles/cascatas como workflows de bindings fixos; mais configuração e rastreabilidade, preserva regra posterior do usuário.
DL-CX4: runtime local por adapter/capability gate, não alias “OpenAI-compatible” universal; maior custo de homologação e menos falhas silenciosas.
DL-CX5: extração upstream por contrato/destino/teste; copiar integralmente código e estado importaria o modelo de confiança errado.
Baseline documental de 2026-09-07; implantação continua separada de autorização para completar o desenho.

## Open Questions

Integrações decide operações/versões verificadas em cada adapter; Owner/ops configura quotas compartilháveis, reservas para titular e thresholds monetários; Research valida ensemble/rubricas antes de promoção. Ausência de configuração obrigatória bloqueia a rota/workflow correspondente, mantendo catálogo/read-only. Não permanece uma lacuna de comportamento para accounts, modelos fixos, multiaccount, free ou cooldown.
