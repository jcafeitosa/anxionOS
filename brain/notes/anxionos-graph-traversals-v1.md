---
type: planning-note
title: Graph traversals v1 — vinte contratos críticos
description: T01–T20 com parâmetros, planos lógicos, fixtures, oracles, isolamento e benchmark.
status: draft
cluster: anxionos
version: "1.0"
tags:
  - graph
  - queries
  - acceptance
---
# Graph traversals v1 — T01 a T20

Companion do [schema](./anxionos-graph-schema-v1.md) e da [API institucional](../project-docs/specs/001-institutional-contract/spec.md). Cada Txx é uma query registrada no Kernel com parâmetros tipados, plano lógico, saída e oracle de teste. O agente envia traversalId, nunca texto Cypher. O adapter traduz estes planos para consultas parametrizadas privadas.

## Semântica comum

visible(node, principal, scope, validAt, knownAt) aplica ACL e publicação explícita. active(edge,t,k) exige validFrom≤t<validUntil e recordedFrom≤k<recordedUntil, com null=∞. Ambos endpoints e a edge precisam passar. Principals de serviço não contornam o scope do usuário em cujo nome operam.

expand(set, edgeTypes, direction, depth) percorre somente allowlist, deduplica NodeKey/edgeId, ordena por id e aplica budget antes de expandir. join sempre preserva scope. groupMoney usa decimal e moeda/valuationVersion, nunca agrega moedas sem FX documentado. collectEvidence retorna hashes/referências autorizadas; não infere causalidade. Pseudocódigo descreve semântica normativa, não função já implementada.

Saídas comuns: queryId, queryVersion, validAt, knownAt, projectionGeneration, checkpoint, complete, reasons, cursor. Budget excedido em exploração → complete=false/QUERY_LIMIT e continuação; em autoridade, risco ou cálculo financeiro para execução → erro sem ALLOW/valor conclusivo. Histórico pode ser completo em checkpoint antigo se assim solicitado; “agora” exige freshness atual. Bulk ids invisíveis são omitidos sem revelar contagem privada.

## Fixture institucional determinística F0

Instantes UTC: t0=2026-09-01T00:00:00Z, t1=2026-09-07T14:00:00Z, t2=14:32:00Z, t3=14:33:00Z no mesmo dia. Escopos AgencyA/OwnerU1 e AgencyB/OwnerU2. CEO_A, Quant_A, Risk_A, Exec_A são AGENCY de A; PlatformAnalyst é PLATFORM. U1 possui CA1, AI1 e AI2; U2 possui CA2 e AI3. UpstreamKey(AI1)=K1, AI2=K2, AI3=K3; uma segunda credencial AI1b também aponta K1.

PortfolioP1 de U1 usa CA1. StrategyS1v1 via DeploymentD1 é gerenciada por Quant_A; GoalG1 contém TaskResearch → TaskRisk → TaskExecute. Quant_A pode research.create e intent.propose, não order.submit. Risk_A pode risk.validate e não intent.propose nesse fluxo. Exec_A pode order.submit em P1 sob GrantX, mandato M1 e PolicyR1. GrantX válido [t0,t3); epoch7 até t3 e8 após. ApprovalAP1 do Owner cobre exatamente intentHash H1, quantidade2, limite105 e expira15:00Z. RiskCheckRC1 PASS para H1 em epoch4. OrderO1 materializa IntentI1 da DecisionD1, contexto Ctx1, evidência Ev1, sinal Sig1 e StrategyS1v1. Modelo de D1 = ModelM v1 via binding B1; PromptHash PH1 e inputManifest IH1.

FillF1 compra2 unidades de InstrumentX a100, taxa2USD; FillF2 vende1 a110, taxa1USD. Preço final105, FXUSD=1; PositionX tem1 unidade e costBasis100 sem taxas capitalizadas; taxas contabilizadas em despesas. P1 inicia1000USD, sem fluxo externo: caixa907, ativo105, NAV1012, realized10, unrealized5, fees3, netPnl12. StrategyS1 recebe100% dos lotes; associação de outro agente ao mesmo P1 não duplica1012. CA1 também pode possuir posição Y sem vínculo a S1 para testar filtro.

LedgerL1/L2 se vinculam aos fills. ReconciliationR1 registra venue balance908 versus ledger907, diferença1, OPEN; discrepância não altera ledger silenciosamente. OutcomeOU1 refere a janela e valuationV1. AttributionAT1 atribui12 a S1 com método NET_TRADE_PNL_V1 e residual0.

ModelM v1 está disponível em AI1,AI2,AI3. AGENCY U1 usa apenasK1/K2, além de OfferingSystemFree publicada por Platform; paidFreeToken em AI3 não a torna pública. PLATFORM tem grants paraK1/K2/K3; lastAccount=K1. TaskCost1 em AI1 custo0.10USD aparece em dois eventos duplicados, mesma UsageRecord; TaskCost2 em AI2 custo0.20. ReferralRef1→CampaignC1→PartnerPT1; InvoiceINV1 paga100, comissão regra10%, CommissionCM1=10, PayoutPY1=10 confirmado.

SnapshotSS1 no checkpoint100; ChangeCP1 propõe revogar GrantX; após captura live checkpoint101 muda RiskPolicyR1→R2. Capacidade de agency não pode ser cruzada porque ambos os Owners têm mesmo nome de display.

## Contratos das queries

### T01 — Autoridade de execução atual

Entrada actorId=Exec_A, action=order.submit, resource=I1, intentHash=H1, validAt=t2, expectedEpoch7. Plano: visible I1/P1/CA1 → grants TO_PRINCIPAL/GRANTS_CAPABILITY/ON_RESOURCE → expand DERIVES_GRANT com ciclo guard → intersect mandato/policies/limites → deny precedence → risk/approval hash+expiry → proof. Saída ALLOW, GrantX/M1/R1/AP1, authorityEpoch7, riskEpoch4, expiresAt mínimo de todas as validades. Em t3 → DENY AUTHORITY_REVOKED. Quant_A → DENY MISSING_CAPABILITY. Efeito externo revalida prova em transação; stale projection não é ALLOW.

### T02 — Autoridade histórica bitemporal

Entrada actor/resource/action, validAt=t2, knownAt=t2 ou t4. Fixture adicional: em t4 corrige-se GrantX para término t2−1s. Plano usa active(t,k) sobre grants/policies e apresenta a versão então conhecida. Oracle: knownAt=t2 permitia; knownAt=t4 informa que a correção hoje conhecida nega em t2. Saída inclui dois tempos e correctionEvent; não reescreve a decisão histórica nem confunde autorização observada com verdade corrigida.

### T03 — Explicação de negação/aprovação

Entrada Quant_A/order.submit/I1 ou Exec_A/I1 sem AP1. Plano igual T01, com reason tree por etapa e referências somente visíveis. Oracle Quant_A DENY MISSING_CAPABILITY; Exec_A REQUIRE_APPROVAL se policy exige AP1 e demais checks passam. Deny explícito vence approval. Não listar grant de AgencyB nem quantidade de candidatos ocultos.

### T04 — Descoberta de agentes

Entrada capability=risk.validate, taskType=portfolio-risk, scope=A, deadline e orçamento. Plano scope candidates → active capabilities/delegation → segregation filter → availability lease/capacity → evaluation/domain score → stable rank. Oracle Risk_A elegível; Quant_A/Exec_A/B excluídos por capability/scope. Ranking retorna componentes explicados; nunca transforma reputação em autorização. Concorrência de assignment é resolvida por lease transacional, não por posição na lista.

### T05 — Contexto de agente/tarefa

Entrada agentVersion de Quant_A, TaskResearch, tokenBudget=8000, validAt=t2. Plano identidade/mandato/grants → goals/tasks → P1/positions/risk → strategy/signals/decisions → memories/evidence → manifest. Oracle contém M1,S1v1,Ev1 e P1 com versão; CA2/AI3 ausentes; custo do manifesto≤budget. Se políticas obrigatórias excedem budget → CONTEXT_BUDGET_TOO_SMALL, sem truncá-las. Conteúdo segue a [pipeline AG](../project-docs/specs/002-agents-knowledge/spec.md).

### T06 — Objetivos e dependências

Entrada GoalG1, depth≤6. Plano HAS_SUBGOAL + ADVANCES_GOAL reverso + DEPENDS_ON_TASK; topological sort com detecção de ciclo; estado deriva de critérios de aceite, não autodeclaração do agente. Oracle TaskExecute bloqueada enquanto TaskRisk não passar; completar Research não completa GoalG1. Ciclo injetado TaskResearch→TaskExecute → INVALID_DEPENDENCY_GRAPH com caminho autorizado.

### T07 — Capital sob responsabilidade de um agente

Entrada Quant_A, valuationV1,t2. Plano MANAGED_BY/EXECUTED_BY_AGENT reversos → deployments → portfolios → allocations → accounts owner → canonical positions/ledger. Saída distingue capital alocado, reservado, efetivamente exposto e NAV; não soma alocação+NAV. Oracle P1/CA1/OwnerU1, NAV1012 e allocation cap conforme fixture; mesma conta por dois caminhos aparece uma vez. CA2 proibida.

### T08 — Estratégias e deployments

Entrada StrategyS1v1 ou P1, status filter. Plano HAS_DEPLOYMENT/USES_STRATEGY_VERSION e EXECUTED_BY_AGENT → related intents/orders/positions via attribution. Oracle D1 ligaS1v1,P1,Quant_A; S1v2 draft não substitui v1. Suspensa continua ligada a fills passados e posições abertas; nova proposta bloqueada conforme estado.

### T09 — Exposição consolidada por ativo

Entrada OwnerU1 ou AgencyA, AssetX, valuationV1. Plano portfolios autorizados → contas únicas → posições canônicas → ON_INSTRUMENT/REPRESENTS_ASSET → pricing snapshot → sum signed q×price×multiplier×FX; reportar gross=sum abs, net=sum signed. Derivativos exigem método/delta e separação gross notional vs delta exposure. Oracle fixture X gross=net=105USD; dois deployments não resultam210. Preço/FX ausente → UNVALUED, sem número final elegível para risco.

### T10 — Linhagem de decisão

Entrada D1. Plano MADE_BY, FOR_PORTFOLIO, BASED_ON, USES_CONTEXT/INFERENCE/STRATEGY_VERSION, UNDER_MANDATE → versões de agent/skill/model/policy e hashes. Oracle D1→Ev1/Sig1/S1v1/Ctx1/ModelM v1/PH1/IH1. Ev1 ausente → integrity violation, não “sem evidência necessária”. Conteúdo de prompt recuperável somente por ACL; hash/proveniência não revela segredo.

### T11 — Fill até autorização

Entrada F1. Plano FILLED_AS reverso → O1 → MATERIALIZES_ORDER reverso → I1 → CHECKED_BY/Approval FOR_INTENT reverso → Decision PROPOSES_INTENT reverso → submit permit record. Oracle retorna H1/AP1/RC1/GrantX epoch7 e submittedAt. Permissão hoje revogada não apaga a prova usada ontem. Fill de venue sem ordem conhecida abre reconciliação UNMATCHED_FILL e não fabrica decisão.

### T12 — Atribuição de resultado

Entrada OU1, methodVersion NET_TRADE_PNL_V1. Plano ATTRIBUTES_OUTCOME reverso → CONTRIBUTION_FROM → fills/lot assignment/fees; reconcile sum(contributions)+residual=netPnl. Oracle12USD=realized10+unrealized5−fees3; residual0; sem afirmar que o modelo causou lucro. Método diferente produz outro report, não mutação de OU1. Evidence insuficiente conserva residual/UNATTRIBUTED.

### T13 — Impacto de desligar agente ou suspender estratégia

Entrada subject=Quant_A ou S1v1, action=SUSPEND_NEW_WORK. Plano dependências tipadas de tasks/deployments/portfolio/orders/positions/accounts + pending approvals; dedup recursos e lotes; classify blockedNewWork/drain/needsReassignment. Oracle D1/P1/CA1, posiçãoX1 e NAV1012; não cancela O1 nem vende X automaticamente. Relatório incompleto bloqueia apply de mudança crítica e oferece job completo.

### T14 — Impacto de revogar conexão

Entrada ConnectionAI1, generation. Plano SERVED_VIA reverso → ModelOfferings → bindings elegíveis → agents/tasks → queued/inflight attempts; testar rotas alternativas do mesmo modelo/operação. Oracle tasks U1 têmK2 se elegível; AI1b não conta conta independente se também revogada por accountKey. Listar requests afetados, budgets reservados e reauthorization; não disparar retry de streaming parcial.

### T15 — Rotas elegíveis para binding fixo

Entrada consumerKind, owner, B1, requirementsSnapshot. Plano binding → ModelM v1 → offerings → scope/entitlements/grants → capabilities/profile/data policy → health/cooldown/quota/budget → accounts deduplicadas. Oracle AGENCY U1=[K1,K2]; K3 nunca, mesmo free privado. PLATFORM lastK1 selecionaK2 ouK3 por fair scheduling; somenteK1 disponível → SINGLE_ACCOUNT_WAIT. SYSTEM_FREE é grant/oferta publicada, não permissão de visualizar conta.

### T16 — Trace de roteamento

Entrada inferenceRequestId. Plano HAS_ROUTING_DECISION → HAS_INFERENCE_ATTEMPT → ATTEMPTED_VIA e config/usage por attempt. Saída candidates/exclusions/modelVersion/operation/requested-vs-effective/lease/accountKey masked/latencies. Oracle attempt2 preservaModelM v1; cada tentativa tem sua elegibilidade; reason=RATE_LIMIT não vira downgrade. Usuário não vê traces de PlatformAnalyst com prompts internos; recebe seu consumo debitado e dados operacionais autorizados.

### T17 — Consumo e custos

Entrada scope=A, intervalo, groupBy=agent/task/model/provider. Plano UsageRecord autoritativo único por charge key → attempts/requests → task/agent/scope; separar estimado, reconciliado, subscrição e API. Oracle0.30USD, não0.40 por evento duplicado de TaskCost1. Custo pago da subscrição não é tokenPrice=0. Valores sem preço ficam UNKNOWN e não somem do relatório.

### T18 — Reconciliação e divergências

Entrada CA1 ou P1, status=OPEN. Plano RECONCILES_RESOURCE reverso → casos → evidence venue/local snapshots → owners/tasks de resolução. Oracle R1: expected907,observed908,difference+1USD, sem alterar NAV1012 automaticamente. Caso resolvido por ajuste exige LedgerEntry balanceada, justificativa e aprovação; reexecutar mesma resolução não lança ajuste duplicado.

### T19 — Mudança simulada de autoridade

Entrada SS1/CP1. Plano carregar snapshot isolado → aplicar patch validado → recomputar T01/T07/T13 e segregação → diff before/after e requiredApprovals; sem enviar domínio real. Oracle revogar GrantX remove caminho de execução e mantém Owner/capital; live checkpoint101≠100 → apply STALE_BASELINE, requer rebase/reavaliação. Nunca promove snapshot inteiro por overwrite.

### T20 — Atribuição comercial

Entrada ReferralRef1 ou PayoutPY1, scope de PartnerPT1. Plano referral→campaign→partner, commission→invoice/rule, payout→commissions. Oracle invoice100,rate10%,commission10,payout10; refund integral gera reversal−10 e saldo devido conforme política, não apaga payout confirmado. Partner recebe somente campos comerciais permitidos, nunca P1/positions/contasIA.

## Tradução de query e prova de isolamento

O registry armazena por Txx: input schema, edge allowlist, plano, permission requirements, output schema, maxDepth/maxVisited, cacheability e test fixture version. Adapter injeta scope em todo anchor e expansão; não basta filtrar a raiz. Exemplo lógico T11:

```text
fill = getVisible(F1)
order = expand({fill}, FILLED_AS, IN, 1)
intent = expand(order, MATERIALIZES_ORDER, IN, 1)
checks = expand(intent, CHECKED_BY, OUT, 1)
approvals = expand(intent, FOR_INTENT, IN, 1)
decision = expand(intent, PROPOSES_INTENT, IN, 1)
return authorizedFields(fill, order, intent, checks, approvals, decision)
```

Consultas compiladas não retornam objetos intermediários privados em debug. Toda implementação possui teste “mesmo ID/displayName em outro tenant”, edge atravessando scope, cursor reaproveitado por outro principal e projeção com authorityEpoch antigo. T01/T03/T15 são cacheáveis somente com chave incluindo epochs, binding/profile/requirements hashes e janelas/estado; despacho revalida sempre.

## Plano de benchmark e execução

Fixture F0 estabelece resultados funcionais; dataset de carga é sintético e separado: 100 agencies, 1000 agentes/agency, 100 portfolios/agency, 100000 decisões/agency, 10 evidências/decisão, distribuição assimétrica com um hub grande e casos revogados/corrigidos. Registrar hardware, versões, edição/licença, tamanho em disco, índices, cardinalidades reais geradas e duração de warm-up. Essa escala é ensaio proposto, não demanda do produto conhecida.

Executar cada Txx com100 amostras distribuídas e concorrência1/10/50; medir p50/p95/p99, erro, visitados, bytes, cache hit/miss e lag. Separar now/asOf, hot cache/cold cache, tenant pequeno/hub. Meta inicial: sync limitado p95≤500ms; T01 final incluída em orçamento do comando sem rede externa; jobs longos ack≤1s e deadline configurado. Ajustar metas só com relatório explícito, nunca reduzir correção/isolamento para atingir latência.

Falhas: Neo4j indisponível/lag, outbox duplicada, lacuna de eventos, checkpoint trocado durante paginação, budget atingido, relógio fora de tolerância, revogação entre consulta/envio. Completion gate: todos os20 oracles + testes adversariais + rebuild equivalência + relatório de carga. Ainda não executado: código do Kernel/fixture loader/bench não existe nesta entrega documental.
