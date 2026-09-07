---
type: planning-note
title: Institutional Graph Schema v1
description: Tipos, assinaturas de relações, propriedades, cardinalidades e invariantes do grafo.
status: draft
cluster: anxionos
version: "1.0"
tags:
  - graph
  - schema
  - planning
---
# Institutional Graph Schema v1

Contrato de planejamento que completa o [modelo conceitual](./anxionos-graph-domain-model.md), regido pelo [SDD](../project-docs/specs/001-institutional-contract/spec.md). Não é migração instalada. Versão semântica 1.0; vocabulário derivado dos fluxos, não da meta arbitrária de quantidade.

## Tipos comuns, escopo e tempo

NodeKey = (scopeType, scopeId, type, id). id é UUID opaco estável; sem ID de banco como identidade externa. scopeType = PLATFORM | ORGANIZATION | AGENCY | USER | PUBLIC. Todos têm platformId; organizationId/agencyId só quando aplicáveis, nunca inventar agencyId para nó global. Envelope obrigatório: NodeKey, schemaVersion inteiro≥1, ownerDomain, status enumerado pelo tipo, revision≥1, createdAt, recordedAt, classification (PUBLIC/INTERNAL/CONFIDENTIAL/SECRET), provenanceEventId. Recursos secretos armazenam somente referências; texto/chave nunca no grafo.

Versioned recebe versionId, version≥1, contentHash, effectiveFrom/effectiveUntil, recordedFrom/recordedUntil e originEventId. Intervalo semiaberto [from, until); null no fim = sem prazo. Correção fecha recordedUntil anterior e insere outra versão, preservando valid time. Revisão conhecida em knownAt e válida em validAt é única por entidade lógica. Remover é archive/tombstone; apagar fisicamente somente pelo contrato de retenção.

Money = {decimal:string,currency:ISO-or-asset-id,scale:int}; Quantity = decimal:string + unit/asset; limites usam >=0 e unidade obrigatória; sem IEEE float para quantia financeira. Ratio decimal em intervalo documentado; Timestamp UTC com offset normalizado. IDs de modelo/ativo/venue são namespaces diferentes. Resource é união dos NodeKeys concretos autorizados, não label universal que dispensa validação.

Edge envelope: edgeId, edgeType, fromKey, toKey, scope, schemaVersion, revision, validFrom, validUntil, recordedFrom, recordedUntil, eventId, actorPrincipalId, reasonCode; policyVersionId quando governada. publishedAccessGrantId obrigatório para relação que cruza scopes privados. Toda edge sensível é temporal; histórico de relações descritivas também é mantido. Uma edge não pode ter vigência mais ampla que seus grants/endpoints relevantes.

## Tipos de nós e payload mínimo

Todos os campos desta tabela são obrigatórios salvo “?” ou condição explícita. Arrays podem ser vazios somente quando o estado permite. Campos volumosos são objectRef+hash; políticas/capabilities referenciam versões. Tipos do catálogo Connections herdam o contrato especializado vinculado, sem duplicar schema divergente.

| Domínio | Tipos e payload específico |
| --- | --- |
| Identity | Platform{name}; Organization{name,ownerUserId}; Agency{name,ownerUserId,marketConfigVersion,blueprintVersionId}; User{identitySubject,displayName}; Department{name}; Team{name}; Membership{principalId,scope,roleIds,validFrom,validUntil?}; CompanyBlueprintVersion{version,roleTemplates,requiredRoles}; OnboardingRun{idempotencyKey,step,status,errorCode?} |
| Governance | Role{name,version,capabilityIds}; Capability{action,resourceTypes}; AuthorityGrant{effect:ALLOW/DENY,principalId,resourceSelector,actions,limits,delegable,authorityEpoch,validFrom,validUntil?}; Delegation{issuerId,recipientId,parentGrantIds,actions,resourceSelector,limits,depth,validUntil}; PolicyVersion{policyKind,version,ruleSetHash,rulesRef}; MandateVersion{ownerUserId,portfolioIds,marketDomains,riskLimits,autonomyPolicyVersion}; Approval{subjectHash,approverId,decision,expiresAt,authorityEpoch}; RiskCheck{intentHash,validatorId,policyVersions,riskEpoch,result,reasons,snapshotRef} |
| Agents | Agent{name,kind:AGENCY/PLATFORM,lifecycle,ownerScope}; AgentVersion{version,roleId,systemInstructionRef/hash,skillVersions,bindingIds,autonomyPolicyId}; Runtime{kind,endpointRef,health}; SkillVersion{version,manifestHash,toolCapabilities}; Goal{objective,metric,target,deadline?,status}; Task{taskType,requirements,goalIds,assignedAgentId?,status,deadline,budget,dependencyIds}; Run{taskId,attempt,agentVersionId,status,leaseEpoch,startedAt,endedAt?}; Session{principalId,contextPolicyId,expiry}; ToolInvocation{runId,toolVersion,argumentsHash,permitId?,resultRef?,status} |
| Knowledge | Document{ownerScope,title,sourceUri,classification}; DocumentVersion{version,contentHash,objectRef,mimeType,sourceAt,ingestedAt}; Evidence{sourceRefs,claimRange,contentHash,validAt,knownAt,confidence,licenseRef?}; Observation{sourceId,instrumentId?,windowStart,windowEnd,objectRef,hash,qualityFlags}; Memory{kind,contentRef,sourceEvidenceIds,confidence,expiresAt?,status}; KnowledgeClaim{textRef,evidenceIds,confidence,verificationStatus}; DatasetVersion{version,manifestHash,objectRef,licenseRef,splitPolicy}; KnowledgeCollection{name,ACLPolicyVersion,embeddingSpaceId}; EmbeddingSpace{modelVersion,dimensions,normalization,pooling,distanceMetric,schemaVersion}; ContextManifest{subjectId,taskId,items,policyVersion,checkpoint,tokenBudget,hash} |
| Markets | MarketDomain{code:STOCKS/CRYPTO}; Venue{venueKey,kind:BROKER/EXCHANGE,dataRegion}; Market{venueId,domainId,sessionCalendarVersion}; Asset{assetKey,kind,identityEvidence}; Instrument{venueId,symbol,baseAssetId,quoteAssetId,kind,tickSize,lotSize,minNotional?,calendarVersion,validFrom,validUntil?}; MarketEvent{eventKind,eventTime,receivedAt,sourceId,evidenceRef}; CorrelationObservation{assetA,assetB,methodVersion,window,sampleCount,coefficient,qualityFlags} |
| Capital | CapitalAccount{ownerUserId,venueId,externalAccountRef,baseCurrency,verificationStatus}; CapitalAllocation{accountId,portfolioId,amount,currency,status,reservationId}; Portfolio{name,ownerUserId,baseCurrency,valuationPolicyVersion}; Position{accountId,instrumentId,positionSide,quantity,costBasis,valuationVersion}; LedgerEntry{transactionId,accountId,bookAccount,assetId,amount,direction,sourceEventId,reversalOf?} |
| Strategy | Strategy{name,ownerScope}; StrategyVersion{version,codeOrRulesHash,requirements,parametersHash,universeSpec,riskBudget,validity}; Signal{strategyVersionId,observationIds,generatedAt,expiresAt,valueRef}; Deployment{strategyVersionId,portfolioId,agentIds,allocationLimit,state}; BacktestRun{strategyVersionId,datasetVersionId,executionAssumptions,seed,resultRef,status}; Certification{subjectVersionId,evaluationIds,rubricVersion,validUntil,result} |
| Decision/Execution | Decision{makerId,portfolioId,contextManifestId,strategyVersionId?,mandateVersionId,rationaleRef,createdAt}; TradeIntent{decisionId,accountId,instrumentId,side,quantity,orderType,priceBounds,timeInForce,intentHash,status}; ExecutionEngine{adapterId,version,capabilities}; Order{intentId,clientOrderId,accountId,instrumentId,state,orderedQuantity,filledQuantity,revision}; SubmissionAttempt{orderId,attempt,permitId,clientOrderId,status,sentAt?}; ExecutionReport{orderId,venueEventId,venueSequence?,eventTime,receivedAt,state,payloadRef}; Fill{orderId,venueFillId,quantity,price,fee,filledAt,status}; ReconciliationCase{resourceKeys,expected,observed,classification,status,resolutionRef?} |
| Outcomes | Outcome{portfolioId,windowStart,windowEnd,valuationVersion,externalFlows,pnl,status}; PerformanceAttribution{outcomeId,methodVersion,contributions,residual,currency,evidenceIds} |
| Evaluation | Evaluation{subjectVersions,taskType,domain,rubricVersion,datasetVersionId,scores,sampleCount,evidenceRef}; ReputationSnapshot{subjectId,domain,taskType,asOf,score,uncertainty,effectiveSample,decayPolicyVersion}; ChangeProposal{kind,baselineRevisions,patchHash,patchRef,expectedEffects,approvalPolicy,status}; GraphSnapshot{checkpoint,validAt,knownAt,scope,manifestHash,objectRef}; SimulationRun{snapshotId,proposalId,scenarioVersion,seed,resultRef?,status} |
| Operations | Incident{severity,status,resourceKeys,detectedAt,evidenceRef}; DomainEventRef{eventId,aggregateId,aggregateRevision,payloadHash,journalRef}; AuditEvent{eventId,actor,action,scope,recordedAt,outcome}; DataRetentionPolicy{version,classRules,holdPolicy,residenceRegions}; ExportJob{scope,requesterId,manifestRef?,status,expiresAt} |
| Commercial | Partner{principalId,status}; Campaign{partnerId,attributionPolicyVersion}; Referral{campaignId,referredSubscriptionId,attributedAt}; Commission{referralId,invoiceId,ruleVersion,amount,state}; Payout{commissionIds,externalKey,amount,status}; Subscription{agencyId,ownerUserId,planVersion,gatewayId,status}; Invoice{subscriptionId,externalId,amount,currency,status} |
| Connections identity | Provider{providerKey,name}; AIProviderAccount{ownerPrincipalId,upstreamAccountKey,status}; ProviderSubscription{accountId,entitlements,renewalAt?,quotaPolicyRef}; Connection{accountId?,endpointId,authMethod,credentialRefId?,capacityResourceId,fundingSourceId,status}; Endpoint{urlRef,protocol,region,trustPolicyId}; CredentialRef{vaultRef,credentialKind,generation,status}; ConnectionPool{consumerScope,connectionIds,policyVersion}; OwnerProviderPool{ownerUserId,providerId,connectionIds} |
| Connections registry | Model{namespace,canonicalId}; ModelVersion{modelId,versionId,identityEvidence}; ModelReference{literal,verificationStatus,candidates}; ModelGroupAssignment{modelVersionId,group,evidence,asOf}; ContextProfileVersion{version,operation,limits,sourceEvidence}; ModelCapabilityEvidence{modelOfferingId,capability,value,source,observedAt,expiresAt?}; TaskSuitabilityProfileVersion{version,taskTypes,evaluationRefs}; CatalogRelease{providerId,revision,contentHash,observedAt,status}; ModelOffering{modelVersionId,providerId,variantId,operations,pricingRef,freeDeclaration,accessStatus,readiness}; OfferingAccessGrant{offeringId,consumerScope,ownerId,authorityEpoch,validity} |
| Connections execution | AgentModelBinding{agentVersionId,purpose,modelVersionId,operation,profileVersionId,validity}; TaskRequirementsSnapshot{taskType,complexity,requiredCapabilities,inputEstimate,dataClass,purpose,hash}; TaskRoutingPolicyVersion/RoutingPolicyVersion{version,constraints,eligibleAccountRules,costPolicyRef}; InferenceProfileVersion{version,operation,requestedParameters,adaptationPolicy}; ParameterSchemaVersion{version,offeringId,operation,fields,supportEvidence}; EffectiveInferenceConfig{profileVersion,requested,effective,diffs,hash}; InferenceRequest{consumerPrincipal,taskId,bindingId,operation,requirementsHash,status}; RoutingDecision{requestId,candidates,exclusions,selectedRoute,policyVersions}; InferenceAttempt{requestId,connectionId,accountKey,leaseId,generation,status}; UsageRecord{attemptId,units,cost,currency,priceVersion,estimateStatus,externalUsageId?} |

Detalhes executáveis de campo, enums e estados Connections permanecem em [operacional](./anxionos-connections-operational-contract.md), [inferência](./anxionos-inference-config.md), [catálogo](./anxionos-model-catalog.md), [multimodal](./anxionos-multimodal-inference.md), [cooldown](./anxionos-free-cooldown.md) e [automação](./anxionos-catalog-automation.md). QuotaReservation, AccountLease, CooldownState, HealthSample, ModelJob e ArtifactManifest são agregados operacionais desses contratos: expõem NodeKey estável ou DomainEventRef quando institucionalmente relevantes, sem projetar cada medição. Broker/Exchange são Venue.kind; Capital é alocação/ledger, não dinheiro duplicado; ModelPerformance é Evaluation/ReputationSnapshot; Credential nunca significa segredo no grafo.

## Catálogo de relações

São 124 assinaturas tipadas, 119 nomes de relação. Reuso de nome só com assinatura validada. A notação esquerda/direita “1/N” significa: um nó de origem pode ter N destinos; cada destino tem uma origem ativa nessa assinatura. “N/1” é o inverso; “N/N” permite ambos múltiplos. “N/0..1” limita cada origem a no máximo um destino. A obrigatoriedade de relação depende do estado: nós draft podem ainda não ter vínculos; READY/ACTIVE devem satisfazer todas as relações obrigatórias do seu fluxo. Cardinalidades são por validAt/knownAt, não contagem de histórico.

Domínios escritores: I Identity, G Governance, A Agents, K Knowledge, M Market, F Investment/Accounting, X Execution, C Connections, E Evaluation, O Operations, B Commercial. Escritor emite evento; projector aplica. Scope deve ser compatível e endpoints existentes no checkpoint ou pendência de projeção explícita.

| ID | Assinatura | Cardinalidade | Escritor | Propriedade/regra adicional |
| --- | --- | --- | --- | --- |
| E001 | Platform → CONTAINS_ORGANIZATION → Organization | 1/N | I | organizationId |
| E002 | Organization → CONTAINS_AGENCY → Agency | 1/N | I | ownerUserId igual |
| E003 | User → OWNS_COMPANY → Agency | 1/N | I | exatamente um Owner por Agency |
| E004 | Agency → BOOTSTRAPPED_FROM → CompanyBlueprintVersion | N/1 | I | blueprintVersion |
| E005 | Agency → HAS_ONBOARDING → OnboardingRun | 1/N | I | idempotencyKey |
| E006 | Agency → HAS_DEPARTMENT → Department | 1/N | I | mesmo scope |
| E007 | Department → HAS_TEAM → Team | 1/N | I | mesmo scope |
| E008 | Agency → HAS_MEMBERSHIP → Membership | 1/N | I | intervalo |
| E009 | Membership → PRINCIPAL → User | N/1 | I | principal visível |
| E010 | Membership → HAS_ROLE → Role | N/N | G | roleVersion |
| E011 | Role → HAS_CAPABILITY → Capability | N/N | G | action |
| E012 | Agency → HAS_AGENT → Agent | 1/N | I | kind=AGENCY |
| E013 | Platform → OPERATES_AGENT → Agent | 1/N | I | kind=PLATFORM |
| E014 | Agent → REPORTS_TO → Agent | N/0..1 | G | acyclic; reporting≠authority |
| E015 | Team → HAS_MEMBER → Agent | N/N | I | membership interval |
| E016 | Agency → OPERATES_IN → MarketDomain | N/N | I | ENABLED/DRAINING/DISABLED |
| E017 | AuthorityGrant → TO_PRINCIPAL → User / Agent | N/1 | G | effective subject |
| E018 | AuthorityGrant → GRANTS_CAPABILITY → Capability | N/N | G | allow/deny |
| E019 | AuthorityGrant → ON_RESOURCE → Resource | N/1 | G | scope matches |
| E020 | AuthorityGrant → CONSTRAINED_BY → PolicyVersion / MandateVersion | N/N | G | intersection |
| E021 | AuthorityGrant → GRANTED_BY → User / Agent | N/1 | G | no self expansion |
| E022 | Delegation → DELEGATED_FROM → User / Agent | N/1 | G | issuer |
| E023 | Delegation → DELEGATED_TO → User / Agent | N/1 | G | recipient≠issuer |
| E024 | Delegation → DERIVES_GRANT → AuthorityGrant | N/N | G | narrower interval/limits |
| E025 | Approval → APPROVED_BY → User / Agent | N/1 | G | separation of duties |
| E026 | Approval → FOR_INTENT → TradeIntent / ChangeProposal | N/1 | G | payloadHash |
| E027 | Agent → HAS_AGENT_VERSION → AgentVersion | 1/N | A | version ordinal |
| E028 | AgentVersion → USES_SKILL → SkillVersion | N/N | A | digest |
| E029 | Agent → PURSUES_GOAL → Goal | N/N | A | normalize to PURSUES_GOAL |
| E030 | Goal → HAS_SUBGOAL → Goal | 1/N | A | acyclic |
| E031 | Task → ADVANCES_GOAL → Goal | N/N | A | contribution criterion |
| E032 | Task → ASSIGNED_TO → Agent | N/0..1 | A | lease epoch |
| E033 | Task → DEPENDS_ON_TASK → Task | N/N | A | acyclic; required/optional |
| E034 | Task → HAS_RUN → Run | 1/N | A | attempt |
| E035 | Run → USES_AGENT_VERSION → AgentVersion | N/1 | A | immutable |
| E036 | Run → HAS_SESSION → Session | N/0..1 | A | session isolation |
| E037 | Run → INVOKES_TOOL → ToolInvocation | 1/N | A | intent + permit |
| E038 | Agent → HAS_MEMORY → Memory | 1/N | K | scope/classification |
| E039 | Memory → SUPPORTED_BY_EVIDENCE → Evidence | N/N | K | confidence + expiry |
| E040 | KnowledgeClaim → SUPPORTED_BY_EVIDENCE → Evidence | N/N | K | claim≠verified fact |
| E041 | Document → HAS_DOCUMENT_VERSION → DocumentVersion | 1/N | K | contentHash |
| E042 | Evidence → DERIVED_FROM_DOCUMENT → DocumentVersion | N/N | K | chunk/range |
| E043 | Evidence → DERIVED_FROM_OBSERVATION → Observation | N/N | M | source window |
| E044 | KnowledgeCollection → CONTAINS_DOCUMENT → Document | 1/N | K | ACL intersection |
| E045 | KnowledgeCollection → USES_EMBEDDING_SPACE → EmbeddingSpace | N/1 | K | model/dimensions/pooling |
| E046 | ContextManifest → INCLUDES_EVIDENCE → Evidence | N/N | K | tokenCost/rank/provenance |
| E047 | CapitalAccount → OWNED_BY → User | N/1 | F | verified titular |
| E048 | Agency → USES_CAPITAL_ACCOUNT → CapitalAccount | N/N | F | owner matches |
| E049 | CapitalAllocation → FROM_CAPITAL_ACCOUNT → CapitalAccount | N/1 | F | amount/currency |
| E050 | CapitalAllocation → TO_PORTFOLIO → Portfolio | N/1 | F | no double spend |
| E051 | Portfolio → MANAGED_BY → Agent | N/N | F | delegation≠ownership |
| E052 | Portfolio → HAS_DEPLOYMENT → Deployment | 1/N | F | capital limit |
| E053 | Deployment → USES_STRATEGY_VERSION → StrategyVersion | N/1 | F | immutable version |
| E054 | Strategy → HAS_STRATEGY_VERSION → StrategyVersion | 1/N | F | digest |
| E055 | StrategyVersion → REQUIRES_CAPABILITY → Capability | N/N | F | task requirements |
| E056 | Deployment → EXECUTED_BY_AGENT → Agent | N/N | F | authorized scope |
| E057 | Instrument → REPRESENTS_ASSET → Asset | N/N | M | base/quote/underlying role |
| E058 | Instrument → TRADED_ON → Market | N/1 | M | venue symbol + validity |
| E059 | Market → AT_VENUE → Venue | N/1 | M | venue identity |
| E060 | Market → IN_DOMAIN → MarketDomain | N/1 | M | STOCKS/CRYPTO |
| E061 | Market → OBSERVED_BY → Agent | N/N | M | feed permission |
| E062 | Asset → CORRELATED_WITH → Asset | N/N | M | method/window/coefficient/sample; canonical pair |
| E063 | MarketEvent → AFFECTS_ASSET → Asset | N/N | M | hypothesis/confidence |
| E064 | Signal → FROM_OBSERVATION → Observation | N/N | M | asOf/source |
| E065 | Signal → GENERATED_BY_STRATEGY → StrategyVersion | N/1 | F | run id |
| E066 | Decision → MADE_BY → Agent / User | N/1 | F | effective identity |
| E067 | Decision → FOR_PORTFOLIO → Portfolio | N/1 | F | scope |
| E068 | Decision → BASED_ON → Signal / Evidence | N/N | F | evidence timestamp |
| E069 | Decision → USES_STRATEGY_VERSION → StrategyVersion | N/0..1 | F | required for strategy-driven |
| E070 | Decision → USES_CONTEXT → ContextManifest | N/1 | F | hash |
| E071 | Decision → USES_INFERENCE → InferenceRequest | N/N | C | exact attempts |
| E072 | Decision → UNDER_MANDATE → MandateVersion | N/1 | F | current validated version |
| E073 | Decision → PROPOSES_INTENT → TradeIntent | 1/N | F | immutable payloadHash |
| E074 | TradeIntent → CHECKED_BY → RiskCheck | 1/N | F | new checks per revision |
| E075 | RiskCheck → USES_RISK_POLICY → PolicyVersion | N/N | G | independent validator |
| E076 | RiskCheck → PERFORMED_BY → Agent / User | N/1 | G | not proposal actor |
| E077 | TradeIntent → MATERIALIZES_ORDER → Order | 1/N | X | one command/order child key |
| E078 | Order → ON_INSTRUMENT → Instrument | N/1 | X | exact venue identity |
| E079 | Order → ON_CAPITAL_ACCOUNT → CapitalAccount | N/1 | X | Owner funds |
| E080 | Order → HAS_SUBMISSION_ATTEMPT → SubmissionAttempt | 1/N | X | clientOrderId stable |
| E081 | SubmissionAttempt → SENT_BY_ENGINE → ExecutionEngine | N/1 | X | one-use permit |
| E082 | Order → HAS_EXECUTION_REPORT → ExecutionReport | 1/N | X | venueEventId |
| E083 | Order → FILLED_AS → Fill | 1/N | X | account/venue/fillId unique |
| E084 | Fill → AFFECTS_POSITION → Position | N/1 | F | signed quantity |
| E085 | Fill → POSTS_LEDGER → LedgerEntry | 1/N | F | balanced transactionId |
| E086 | ReconciliationCase → RECONCILES_RESOURCE → Order / Fill / Position / CapitalAccount | N/N | F | observed discrepancy |
| E087 | Outcome → FOR_PORTFOLIO → Portfolio | N/1 | F | time window |
| E088 | PerformanceAttribution → ATTRIBUTES_OUTCOME → Outcome | N/1 | F | method version |
| E089 | PerformanceAttribution → CONTRIBUTION_FROM → Decision / Fill / StrategyVersion | N/N | F | amount/currency/method; not proven causality |
| E090 | Provider → HAS_AI_ACCOUNT → AIProviderAccount | 1/N | C | upstreamAccountKey |
| E091 | AIProviderAccount → OWNED_BY → User / Platform | N/1 | C | titular |
| E092 | Connection → USES_AI_ACCOUNT → AIProviderAccount | N/1 | C | actual upstream identity |
| E093 | Connection → USES_ENDPOINT → Endpoint | N/1 | C | trust/region |
| E094 | Connection → USES_CREDENTIAL → CredentialRef | N/1 | C | reference only |
| E095 | AIProviderAccount → HAS_PROVIDER_SUBSCRIPTION → ProviderSubscription | 1/N | C | entitlement |
| E096 | Model → HAS_MODEL_VERSION → ModelVersion | 1/N | C | provider version claim |
| E097 | ModelOffering → OFFERS_MODEL → ModelVersion | N/1 | C | no inferred alias equivalence |
| E098 | ModelOffering → SERVED_VIA → Connection | N/N | C | route capability evidence |
| E099 | ModelOffering → HAS_CAPABILITY_EVIDENCE → ModelCapabilityEvidence | 1/N | C | source/asOf |
| E100 | ModelVersion → CLASSIFIED_AS → ModelGroupAssignment | 1/N | C | group + evidence version |
| E101 | ModelOffering → HAS_CONTEXT_PROFILE → ContextProfileVersion | N/1 | C | operation-specific limits |
| E102 | AgentVersion → HAS_MODEL_BINDING → AgentModelBinding | 1/N | C | unique active purpose |
| E103 | AgentModelBinding → SELECTS_MODEL → ModelVersion | N/1 | C | fixed, no silent substitution |
| E104 | OfferingAccessGrant → PERMITS_OFFERING → ModelOffering | N/N | C | consumer scope + grant |
| E105 | OfferingAccessGrant → TO_PRINCIPAL → User / Agent / Platform | N/N | C | private vs SYSTEM_FREE |
| E106 | ConnectionPool → CONTAINS_CONNECTION → Connection | N/N | C | owner boundary |
| E107 | InferenceRequest → HAS_ROUTING_DECISION → RoutingDecision | 1/N | C | each attempt eligibility |
| E108 | RoutingDecision → HAS_INFERENCE_ATTEMPT → InferenceAttempt | 1/N | C | actual account sequence |
| E109 | InferenceAttempt → ATTEMPTED_VIA → Connection | N/1 | C | lease/fencing |
| E110 | InferenceAttempt → GENERATED_USAGE → UsageRecord | 1/N | C | dedup + estimated/actual |
| E111 | Evaluation → EVALUATES → Run / AgentVersion / ModelVersion / StrategyVersion | N/N | E | rubric/dataset/domain |
| E112 | Certification → BASED_ON_EVALUATION → Evaluation | N/N | E | threshold version |
| E113 | ReputationSnapshot → AGGREGATES_EVALUATION → Evaluation | N/N | E | sample/decay/uncertainty |
| E114 | ChangeProposal → CHANGES_RESOURCE → Resource | N/N | G | baseline revision + patch |
| E115 | SimulationRun → USES_SNAPSHOT → GraphSnapshot | N/1 | E | isolated scenario |
| E116 | SimulationRun → TESTS_CHANGE → ChangeProposal | N/1 | E | no external effects |
| E117 | Incident → IMPACTS_RESOURCE → Resource | N/N | O | severity + evidence |
| E118 | AuditEvent → REFERENCES_EVENT → DomainEventRef | N/1 | O | journal eventId |
| E119 | Partner → HAS_CAMPAIGN → Campaign | 1/N | B | owner scope |
| E120 | Referral → ATTRIBUTED_TO → Campaign | N/1 | B | attribution policy |
| E121 | Commission → EARNED_FROM → Referral | N/1 | B | eligible invoice + rule |
| E122 | Payout → SETTLES_COMMISSION → Commission | 1/N | B | amount/currency |
| E123 | Agency → HAS_SUBSCRIPTION → Subscription | 1/N | B | platform billing |
| E124 | Subscription → HAS_INVOICE → Invoice | 1/N | B | gateway identity |

Para CORRELATED_WITH, a edge referencia correlationObservationId e replica apenas os campos necessários para filtros; contribuição simétrica usa par canônico (menorAssetKey,maiorAssetKey), evitando duplicar exposição. Relações genericamente CAUSED/CREATED/USES do anexo são aliases de apresentação, não tipos persistidos. “Causou” exige evidência causal explícita e método; BASED_ON/CONTRIBUTION_FROM não a substituem.

Connection.authMethod=NONE exige credentialRefId=null e pode ter accountId=null; capacityResourceId/fundingSourceId continuam obrigatórios. As relações USES_AI_ACCOUNT/USES_CREDENTIAL são obrigatórias somente quando existe conta/credencial real exigida pela autenticação. Sem autenticação não criar AIProviderAccount fictícia. Account rotation aplica-se a contas contribuídas; oferta pública sem conta usa scheduler de capacidade, conforme contrato operacional.

## Regras de integridade e autorização

1. Agency READY exige um Owner humano, MarketConfig válida e CEO provisionado do blueprint. PlatformAgent não pode receber HAS_AGENT de Agency; alterar quem o administra não muda kind.
2. Grant efetivo é interseção de cadeia, escopo, mandato, limites, vigência e políticas; deny prevalece. REPORTS_TO não concede trade. Delegação acíclica e profundidade máxima configurada no grant original.
3. Permissão financeira não é CAN_TRADE booleano no Asset. AuthorityGrant inclui maxNotional{amount,currency,valuationPolicy}, maxLeverage, maxOpenOrders, allowedInstruments, approvalRequired, validUntil, grantedBy, policyVersion. Limites monetários requerem preço/FX válido; desconhecido falha fechado.
4. Decision executável exige maker, portfolio, contexto, mandato, intent, política de risco e aprovação quando requerida. StrategyVersion é obrigatória para decisões de estratégia; decisão operacional humana identifica seu workflow em vez de fabricar estratégia.
5. Fill deduplicado afeta uma Position canônica por conta/instrumento/side; várias estratégias participam por atribuição de lotes, não por duplicar Position. Nenhuma soma mistura snapshots de tempos diferentes.
6. AIProviderAccount e CapitalAccount não se relacionam por equivalência implícita. Contas pagas/free de outro Owner só chegam a PLATFORM com grant; AGENCY usa próprias ou SYSTEM_FREE explicitamente publicado.
7. HAS_MODEL_BINDING único por agentVersion/purpose/operação no intervalo. ALTERAR binding cria versão; eventos de descoberta de modelo não a alteram.
8. Critical edge não é eliminada: revogar fecha validUntil e registra reason/actor/event. Correção retroativa preserva knownAt.
9. Níveis de classificação propagam por derivação; baixar classificação exige comando autorizado e evidência. ACL de Knowledge filtra antes de recuperar conteúdo.
10. Cada evento tem um domínio proprietário; projeção não concede direito de emitir comandos em nome desse domínio.

## Índices e constraints lógicas

Unique NodeKey; unique (type,scope,id,revision) para histórico; unique edgeId/revision; unique (aggregateId,aggregateRevision), eventId e inbox(consumer,eventId). Índices de partida: (scope,type,id), (scope,status), (scope,validFrom,validUntil), (scope,recordedFrom,recordedUntil), (scope,edgeType,fromKey), (scope,edgeType,toKey), (principalId,capability,resourceSelector,authorityEpoch), (accountKey,providerId), (modelVersionId,operation), (portfolioId,instrumentId), (correlationId,eventId).

Constraints de relação, tipos, cardinalidade temporal e ausência de ciclos são validadas no domínio em transação e novamente pelo projector; não assumir que índice Neo4j elimina sobreposição bitemporal. Registry de schema JSON Schema/Zod por tipo gera validadores de comando, evento e SDK; produção rejeita additionalProperties não declaradas nos payloads sensíveis. API não aceita arbitrary label/type.

## Eventos, migração e conformidade

Nome canônico de evento: domain.entity.action.v1; exemplos identity.agency.created.v1, governance.grant.revoked.v1, agents.task.assigned.v1, investment.intent.approved.v1, execution.fill.recorded.v1, connections.catalog.published.v1. EventSchema referencia tipos do registry; mudanças aditivas compatíveis preservam versão, mudança semântica cria v2/upcaster. Projeção só pode materializar relações permitidas pelo evento/ownerDomain.

Bootstrap cria constraints → seed types/roles/capabilities → importar entidades → relações → validar → servir. Importação de aliases gera mapping report com sourceRef; não unir Account/Model por nome. Quarentena de referências não resolvidas não permite ALLOW. Backfill preserva IDs/eventId e timestamps originais; correções de origem usam recordedAt atual. Nova geração reconstrói e compara invariantes antes de trocar leitura.

Aceites SC01: rejeitar tipo/edge desconhecidos e cruzamento privado; SC02: detectar segundo Owner/grant temporal sobreposto; SC03: replay idempotente sem novos fills; SC04: histórico de revogação/correção; SC05: validar todas as assinaturas e índices de partida; SC06: importar aliases com conflito explícito; SC07: nenhum tick ou secret projetado; SC08: desabilitar tipo usado bloqueia migração até upcaster/consumer compatível. São testes especificados, ainda não executados.
