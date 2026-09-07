---
type: spec
title: Investment lifecycle — mercado, capital, risco, execução e auditoria
description: Contratos financeiros e operacionais com ledger, estados, segregação, replay e atribuição.
status: draft
owner: Investment, Risk e Execution
created: 2026-09-07
parent_proposal: ../../proposals/0001-anxionos-prd-mestre.md
tags:
  - spec
  - investment
  - audit
version: "1.0"
---
# Investment lifecycle v1 — mercado até aprendizado

## Goals

Especificar R12–R18 do [PRD](../../proposals/0001-anxionos-prd-mestre.md) e fechar AC05: observar mercados, criar estratégia, propor decisão, controlar risco, executar, reconciliar e explicar resultado com capital do próprio Owner. Definir operações quantitativas sem confundir relações com contabilidade.

## Non-goals

Este documento não habilita capital real, escolhe broker, recomenda investimento ou promete retorno/HFT. Cada adapter/mercado só é ativado após contrato homologado e mandato configurado. O produto completo inclui stocks e cripto; a entrega pode habilitar integrações progressivamente.

## Design

### Estado atual e dependências

O [grafo conceitual](../../../notes/anxionos-graph-domain-model.md) e o roadmap descrevem módulos, sem código de trading verificado no workspace. Esta especificação draft detalha o desenho autorizado; depende do [SDD/autoridade](../001-institutional-contract/spec.md), [schema](../../../notes/anxionos-graph-schema-v1.md), Agents e Connections. A [fixture F0](../../../notes/anxionos-graph-traversals-v1.md) estabelece resultados numéricos esperados.

### Market Data e identidade

Asset é entidade econômica; Instrument é contrato negociável com venue/symbol/validity. BTC spot, perpetual e ETF não são o mesmo Instrument; ticker de stock não identifica emissor globalmente. Registry usa venueKey+instrumentKey+validFrom, identificadores de origem e corporate-action history. InstrumentSpec versiona lotSize, tickSize, multiplier, settlementAsset, minNotional, trading status, allowedOrderTypes e calendar/timezone.

Market observation: sourceId, sourceEventId/sequence, instrumentId, eventTime, receiveTime, qualityFlags, payloadRef, ingestionRevision. Dedupe por fonte/sequence ou hash de identidade quando fonte não fornece ID; correções preservam old revision e knownAt. Fonte informa snapshot/delta e mecanismo de recuperação. Gap de orderbook invalida book, solicita snapshot e reconstrói somente com sequência compatível; não publica livro aparentemente atual com delta perdido.

Ticks/candles/trades/orderbooks/funding e métricas temporais ficam em Timescale/arquivo/cache conforme frequência. Grafo recebe Instrument, MarketEvent, janela Observation, Signal, incident e referência de qualidade. Candle carrega intervalo, timezone/session policy e ajustado/não ajustado; backtest declara versão de corporate actions. Split/dividend/funding/fees geram eventos contábeis específicos quando aplicáveis, não são inferidos de mudança de preço.

MarketEvent inclui anúncio/macro/funding/corporate action e evidência de origem. AFFECTS_ASSET é hipótese com confidence/method, não fato causal automático. CORRELATED_WITH exige método (ex.: Pearson de retornos log), frequência/janela, timezone, tratamento de missing, amostra mínima, coeficiente∈[-1,1] e asOf; nunca usar correlação calculada com dados futuros no backtest. Recalcular cria observação/versão. Identidade do par é canônica; não tratar correlação como autorização ou substituto de risco.

FreshnessPolicy por operation/instrument/source define maxAge/maxClockSkew e comportamento. Dado stale/sem FX bloqueia nova exposição; UI preserva último valor com idade. Replay ingere dataset fixado sem chamar mercado ao vivo. Market licenses/access flags acompanham origem e export policy.

### Configuração stocks/crypto e retirada

MarketConfigVersion enumera domínios. Habilitar stocks/crypto torna configuração disponível, não concede order.submit. Transição ENABLED → DRAINING bloqueia novas estratégias/intents que aumentem exposição nesse domínio; permite observação/reconciliação, cancelamentos e reduções explicitamente autorizadas. DISABLED somente quando não restam ordens abertas, posições/obrigações sob gestão e jobs dependentes impeditivos; caso contrário mantém DRAINING com lista de pendências.

Retirar a seleção não envia venda, não cancela ordens automaticamente e não apaga histórico. Owner pode emitir plano de encerramento separado. Reabilitar cria nova versão e exige revalidar mandato/contas/estratégias; não reativa deployments suspensos silenciosamente. Aceite proposto para Q13, sujeito à configuração de política, com comportamento seguro quando faltam parâmetros.

### Capital próprio, alocação e ledger

CapitalAccount possui titular verificado ownerUserId e externalAccountRef; Agency só conecta conta do mesmo Owner. Agente MANAGES/EXECUTED_BY não é proprietário. Organizations não misturam fundos de usuários. Uma conta física pode financiar vários portfolios do mesmo Owner por subledger; cap disponível é global da conta e evita dupla reserva entre portfolios.

Ledger usa decimal exato e partida dobrada por ativo/moeda: cada transactionId soma débitos=créditos por unidade. Compra/venda tem pernas de ativo e caixa; não somar USD+BTC para equilibrar. Valuation em moeda-base é projeção, não lançamento que elimina saldo nativo. Fees/taxes/funding/transfers/dividends/corporate actions têm sourceEventId único; correção usa reversão referenciada + novo lançamento, nunca update destrutivo de entrada já confirmada.

Allocation representa mandato/limite de uso, não duplica saldo depositado. Estados PROPOSED → RESERVED → ACTIVE → RELEASING → CLOSED/REJECTED. Reserva transacional por account/asset/portfolio/revision inclui obrigações de ordens abertas, saldos bloqueados, fees estimadas e buffer de preço configurado. Available = settled balance − encumbrances − pending reservations, seguindo tipo de conta/margem; unsettled cash não é automaticamente disponível. Modelo de margem fica em adapter/PolicyVersion; ausente bloqueia operação de margem, sem supor2x.

Position key = capitalAccountId+instrumentId+positionSide+book; quantity signed e costBasis com método versionado. Lotes têm allocation/deployment attribution para dividir responsabilidade; uma Position canônica não se duplica por duas arestas MANAGED_BY. Cross-margin/reuso de colateral exige modelo explícito com stress; não inferir independência de portfolios na mesma conta.

### Strategy Factory

StrategyVersion inclui source/rules hash, parameters, universe, feature definitions, schedule, data requirements, inference requirements, risk budget e entry/exit logic. Estados DRAFT → BACKTESTED → EVALUATED → CERTIFIED → PAPER → APPROVED_FOR_LIVE → ACTIVE; SUSPENDED/RETIRED são transições governadas. Nem backtest positivo nem modelo mais caro promove automaticamente.

BacktestRun fixa dataset/time range, corporate-action treatment, timezone/calendar, strategy/model/skill versions, fees/slippage/latency/liquidity assumptions e seed. Split temporal train/validation/test e walk-forward quando aplicável; nunca reutilizar holdout para escolher parâmetros sem registrar novo protocolo. Resultado inclui drawdown, turnover, exposure, costs e incerteza, não só retorno. Simulação de fill não é fill real.

TaskRequirementsSnapshot deriva da StrategyVersion para cada fase: research/reasoning/code/embedding etc. Deployment usa AgentModelBinding fixo por finalidade e valida capacidades, janela e policy; incompatibilidade bloqueia/pede configuração, não escolhe outro modelo. Sinal carrega generatedAt/expiresAt e evidências; expiração impede nova decisão baseada em stale signal sem reavaliação.

### Segregação e autonomia

| Ação | Proponente de investimento/estratégia | Validador de risco independente | Execution service | Owner/operador autorizado |
| --- | --- | --- | --- | --- |
| Pesquisar/propor estratégia/intenção | Permitida no grant | Pode analisar, mas não autovalida proposta própria | Não | Permitida no grant |
| Validar risco da intenção | Não para sua própria proposta | Sim, política determinística + identidade distinta | Verifica permit, não reescreve risco | Exceção só por workflow versionado; não bypass silencioso |
| Aprovar mandato/orçamento/expansão | Proposta apenas | Parecer/veto no próprio domínio | Não | Owner conforme policy |
| Submeter/cancelar ordem | Não diretamente | Não diretamente | Sim, permit/intent bounds | Comando pelo mesmo Execution service |
| Aumentar própria autoridade | Não | Não | Não | Governança humana definida |
| Reconciliar/ajustar ledger | Não alterar registros | Revisão se material | Reporta evidência | Operador independente, ajuste auditado |

Separação avalia effectivePrincipal, service identity, grant chain e autoria; trocar nome de role/modelo não cria independência. O mesmo humano pode ser Owner e fonte de decisão manual, mas aprovação independente exigida pela policy não pode ser satisfeita pela mesma identidade. Ausência de revisor requerido mantém WAITING_APPROVAL. Modelo ensemble não substitui Risk Engine ou Owner.

AutonomyPolicy proposta: L0 observe; L1 research/propose; L2 paper execution; L3 live within approved bounds; L4 organizational proposal. Não são hierarquia cumulativa automática: capacidades concedidas individualmente. Default inicial dos C-levels L1, simulador L2 somente após configuração; L3 depende de mandato, integração, limites e aceite operacional. L4 só propõe mudanças. CEO nunca recebe order.submit por título.

### Decision, risco, aprovação e ordem

Decision guarda maker/version, portfolio, strategyVersion quando aplicável, ContextManifest, evidence/signal/model/skill versions, rationale visível e intent(s). TradeIntent é imutável por hash: account,instrument,side,quantity,orderType,limit/stop/slippage bounds,timeInForce,marketConfigVersion,mandateVersion e purpose. Alterar quantidade/preço fora do envelope cria novo intent/hash e invalida aprovação.

Fluxo: PROPOSED → AUTHORITY_CHECKED → RISK_CHECKED → WAITING_APPROVAL/APPROVED → RESERVED → READY → SUBMITTED. DENIED/EXPIRED/CANCELLED são terminais de intenção, sem apagar filhos. RiskCheck usa preços/FX/positions/reservations autoritativas e policy/riskEpoch; avalia instrumento, notional/leverage, concentração, liquidez, maxLoss/drawdown gates, open orders, freshness e circuit breakers configurados. Valores/limites obrigatórios ausentes → DENY CONFIG_REQUIRED. LLM pode explicar/solicitar análise, não substituir cálculo determinístico.

Approval referencia intentHash, approver, policyVersion, expiry e scope. Mudança material de risco/mandato/policy, expiração ou epoch stale exige recheck; approval pode sobreviver só se sua policy explicitamente define bounds compatíveis e o hash aprovado não muda. Reserve e final check são atômicos com limites/grants relevantes. ExecutionPermit de uso único vincula intent/account/bounds/epochs/deadline e clientOrderId. Revalidar no início do dispatch, registrar authorizationCheckedAt e sentAt; uma revogação após envio vira incidente/mitigação, não promessa de desfazer pacote na rede.

Order state:
```text
CREATED → SUBMITTING → ACKNOWLEDGED → PARTIALLY_FILLED → FILLED
SUBMITTING → REJECTED / UNKNOWN
ACKNOWLEDGED/PARTIALLY_FILLED → CANCEL_PENDING → CANCELLED
CANCEL_PENDING → PARTIALLY_FILLED/FILLED (fill tardio permanece válido)
UNKNOWN → RECONCILING → estado confirmado pela venue
```

clientOrderId estável por intenção+order child index. Timeout pós-envio não significa rejeição; consultar por ID antes de nova tentativa. Mesmo sem suporte de idempotência upstream, nunca enviar novamente após estado incerto sem resolução. Partial fill atualiza filledQty cumulativa usando fills deduplicados; cancel rejeitado não anula fill. Bust/correction de fill gera reversão/versão com evidência da venue. Replacement de ordem registra old/new IDs, reserva delta e aprovação exigida; não duplica exposição entre cancel e replace.

Eventos podem chegar fora de ordem: terminal FILLED não volta ACKNOWLEDGED por evento antigo; cumQty não reduz salvo correction explícita. EventTime/venueSequence/receivedAt são mantidos; state reducer por adapter testa seu protocolo. Nova order só usa tipos/timeInForce/cancel features homologados.

### Reconciliação e controle operacional

Workers independentes comparam open orders, fills, positions, cash, fees e ledger; streaming + polling com checkpoint de venue. Casos: missing local, missing remote, duplicate, quantity mismatch, price/fee correction, unknown submission, transfer/unsettled discrepancy. Cada caso tem severidade, recursos, expected/observed, evidence, owner, status e próxima ação; sem ajustar automaticamente dinheiro para “bater saldo”.

Estados OPEN → INVESTIGATING → PROPOSED_RESOLUTION → APPROVED quando requerida → APPLIED → VERIFIED → CLOSED. Ajuste contábil é transação balanceada com idempotencyKey; reexecutar não duplica. Quebra material bloqueia aumento de exposição do escopo afetado, preservando observação/cancel/redução autorizada. Kill switch escopa platform/agency/account/strategy/instrument, prioriza veto e incrementa epoch; desligar strategy não encerra reconciler.

### Valuation, performance e atribuição

ValuationSnapshot fixa prices/FX/multipliers/positions/cash/corporate-action versions e quality flags. NAV em base = sum(cashAsset×FX)+sum(markedPositions×FX)−liabilities, respeitando modelo de instrumento. Somar derivativos exige settlement/margin model; “q×price” do spot não serve universalmente.

PnL líquido da janela = NAV_final−NAV_inicial−netExternalFlows; performance retorno deve declarar método TWR/MWR e tratamento de timing de fluxos. Realized/unrealized/fees/funding/FX/residual são componentes conciliáveis ao total, sem dupla contagem. Drawdown deriva de série de equity definida (flow-adjusted quando necessário), pico/janela e método versionados. Exposição gross e net são distintas; delta exposure de derivativo tem risk model/time próprios.

Oracle spot F0: compra2×100 +fee2; vende1×110−fee1; caixa final907, posição1×105=105, NAV1012; realized10+unrealized5−fees3=12. Attribution por lote atribui12 a StrategyS1; dois agentes responsáveis não produzem24. Se divisão do lote entre estratégias é60/40, contributions7.2/4.8 e residual0, sem atribuir duas vezes100%.

AttributionMethodVersion nomeia regra, componentes, weights e residual; soma contribuições+residual=PnL. Decision lineage prova sequência de registros, não causalidade econômica. “Modelo causou perda” só pode ser hipótese explícita ou estudo causal com método/evidência, não traversal BASED_ON. Outcome incompleto/stale fica PROVISIONAL, nunca apresentado como reconciliado.

### Impact Analysis e Institutional Flight Recorder

ImpactReport(subject,action,asOf,scenario) lista tasks/dependencies, strategies/deployments, portfolios/accounts, open orders/positions, allocated/reserved/exposed capital e required interventions. Deduplica recursos e lotes, soma moedas sob mesma valuationVersion, separa gross/net e shared-capital overlap. Sem valuation não inventa “capital afetado”: retorna unknown components. complete=false impede aplicação de mudança crítica; pode continuar em job. Impacto de revogar grant/connection usa alternativas ainda elegíveis, mantendo binding fixo.

FlightRecorderManifest por Decision/Intent inclui: actor/agent/skill/model/profile versions; prompt visível permitido/input/context hashes; sources, market/price/FX snapshots e timestamps; strategy/mandate/risk/authority/approval/permit; orders/attempts/reports/fills/ledger/reconciliation/outcome; software build/dataset IDs; method de atribuição e event chain. Objetos protegidos por hash, ACL, retenção e encryption; chave API nunca aparece. Registrar conteúdo e hashes suficientes para auditar entrada/saída, não hidden reasoning.

Replay operacional reconstrói estados com eventos e reducers versionados. Replay de estratégia usa dados/assumptions fixados em sandbox. Reexecutar inferência pode divergir mesmo com versão/seed; comparar output registrado e nova execução como Evaluation distinta. Auditoria visual navega de P&L ao sinal/fonte e mostra missing evidence, correção e informação conhecida à época.

Retenção: classes raw market, normalized market, decision evidence, financial journal, secrets references, telemetry. DataRetentionPolicy obriga prazo, região, hold e export rules por classe antes de uso real. Snapshot usado por decisão não expira só porque raw tick TTL acabou; hold/evidence policy controla. Expurgo de material permitido mantém manifesto indicando indisponibilidade, sem alegar replay completo posterior.

### APIs e workers

Market: registerInstrument, ingestObservation, getWindow, subscribe, reportGap. Strategy: createVersion, runBacktest, evaluate, certify, deploy/suspend. Capital: verifyAccountOwner, reserveAllocation, releaseAllocation, getBalance/Exposure/Valuation. Risk: checkIntent, approveIntent, revokeApproval, activateKillSwitch. Execution: submitIntent, cancelOrder, replaceOrder, getStatus, reconcileAccount. Audit: getDecisionManifest, getCausalChain, calculateAttribution, analyzeImpact, requestReplay.

Todos comandos usam envelope do SDD, expectedRevision e idempotência. Respostas desconhecidas externas retornam UNKNOWN com caseId, não200 “executado”. Eventos próprios investment.intent.*, risk.check.*, execution.order.*, execution.fill.*, accounting.transaction.*, audit.manifest.* alimentam grafo/analytics após commit.

Workers: instrument/catalog sync; market ingest/gap repair; signal/backtest; risk-check; approval expiry; execution dispatch; fill ingestion; reconciliation; valuation/attribution; audit archive. Execution não depende da UI estar aberta. Métricas incluem stale feed, rejected intent por razão, permit expiry, unknown orders, reconciliation age, unmatched fills, ledger imbalance (deve zero), exposure freshness e orphan evidence.

## Migration

Novo sistema começa em simulação sem secrets de venue de produção. Loader cria instrumentos/contas fake/ledger inicial balanceado e fixture F0. Etapas: read-only venue sandbox → paper → shadow intents sem envio → canary com mandato/limites configurados → live incremental. Mudança de adapter ou estratégia cria versão e novo gate; não migra ordem UNKNOWN para novo executor sem reconciliação. Importação de histórico marca external-origin e evidência disponível; nunca fabrica Decision/Approval passada. Rollback suspende novas intenções e preserva workers de fills/reconciliação até drenar.

## Test plan

| ID | Tier | Oracle |
| --- | --- | --- |
| FI01 | Integration | Burst de ticks + gap: nenhum nó por tick; book inválido bloqueia estratégia até resync |
| FI02 | Concurrency | Duas estratégias reservam saldo100 simultaneamente para80 cada: no máximo uma passa |
| FI03 | Security | Autor da proposta não valida próprio risco; role rename não contorna independência |
| FI04 | Contract | Aprovação H1 não autoriza H2/preço fora bounds/epoch revogado |
| FI05 | E2E | Strategy não envia diretamente; executor sem permit não envia; permit só consumido uma vez |
| FI06 | Fault injection | Timeout após envio→UNKNOWN→lookup; venue recebe uma ordem, sem retry cego |
| FI07 | Integration | Fill duplicado/tardio após cancel e correction: quantidade/ledger corretos, história preservada |
| FI08 | Accounting | F0 NAV1012/PnL12; debits=credits por ativo; fees/FX sem dupla contagem |
| FI09 | E2E | Missing evidence/policy/market freshness bloqueia envio e explica motivo |
| FI10 | E2E | Retirada stocks com posição→DRAINING, sem liquidação automática; histórico continua |
| FI11 | Integration | Divergência + ajuste repetido: um lançamento autorizado e caso VERIFIED |
| FI12 | Recovery | Rebuild gera mesmos hashes/valores no checkpoint; efeito externo perdido reaparece na reconciliação |

Testes de horários de bolsa, split/dividend, funding, margem e tipos de ordem são obrigatórios por adapter habilitado. Sem homologação real não afirmar cobertura operacional desses protocolos. Nesta rodada são critérios documentados, não execuções de teste.

## Decision Log

DL-FI1: capital canônico no ledger/account, responsabilidade por atribuição; evita double count ao aceitar custo de joins/valuation. Reabrir se modelo de produto mudar para copropriedade (não autorizado atualmente).
DL-FI2: final check transacional + permit e reconciliação, não grafo eventual sozinho. Reabrir apenas com prova de consistência equivalente.
DL-FI3: retirada de mercado por drain, não liquidação implícita; preserva intenção do Owner e obrigações. Reabrir por workflow explícito de encerramento.
DL-FI4: default autonomia proposta L1/L2 simulada, grants específicos para live. Mudança exige policy/avaliação/autoridade, não aprendizado automático.
DL-FI5: journal imutável com reversões e métodos de atribuição versionados. Alternativa updates simples perde audit; custo é storage e reconciliação mais detalhados.

## Open Questions

Integrações, jurisdição/contrato de operação, modelos de margem, mercados específicos, prazos de retenção e valores de limites continuam gates de habilitação sob Owner/risco/operações. O desenho define o que ocorre enquanto ausentes: não habilitar a operação correspondente; pesquisa/paper e documentação podem continuar. Evidência de fechamento: adapter suite, política preenchida, account ownership, ledger/restore e aprovação de lançamento.
