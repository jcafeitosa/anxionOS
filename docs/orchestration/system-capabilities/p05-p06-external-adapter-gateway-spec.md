---
title: "Spec — Docker Adapter Gateway multi-engine"
description: "Contrato e plano normativo para executar engines externos em containers isolados sob controle do anxionOS."
type: spec
status: draft
owner: "Produto e engenharia"
issue: ANX-117
tags:
  - adapters
  - docker
  - execution
  - simulation
  - paper
  - multi-engine
---

# Spec — Docker Adapter Gateway multi-engine

## Estado e escopo

Esta especificação implementa a decisão arquitetural aprovada na conversa e registrada na ANX-54. O primeiro incremento cria a fundação Docker e o contrato comum de adapters para operar somente em SIMULATED. PAPER será habilitado apenas depois de evidência específica; REAL, capital real, transferências, alavancagem e autonomia L3/L4 permanecem fora deste escopo.

O sistema precisa permitir que usuários e agentes usem o mesmo application handler para propor, aprovar, simular, observar, pausar e reconciliar operações. Nenhum usuário ou agente acessa diretamente os processos externos.

## Problema

Engines externos possuem modelos diferentes de estratégia, market data, ordens, contas, símbolos, clocks, estados e recuperação. Conectá-los diretamente às rotas ou ao ledger criaria autoridade duplicada, fallback silencioso e dificuldade de isolamento. O anxionOS precisa transformar cada engine em uma capacidade explicitamente declarada e revogável, preservando causalidade institucional.

## Objetivos

- executar runtimes externos em containers ou gateways isolados;
- normalizar comandos, eventos, capacidades e estados sem apagar semântica da venue;
- selecionar engine, versão, capability, tenant, conta, venue e ambiente explicitamente;
- manter PostgreSQL como autoridade transacional e o ledger como autoridade financeira;
- usar NATS/eventing para mensagens versionadas, correlação e causação;
- permitir parity entre UI, SDK e agentes;
- tratar timeout, crash, duplicação, atraso e desconexão como estados observáveis;
- suportar NautilusTrader primeiro e permitir os demais engines sem alterar o contrato central;
- fornecer health, readiness, metrics, logs estruturados, tracing e auditoria;
- tornar cada adapter reversível, versionado e sujeito a homologação independente.

## Não objetivos

- enviar ordens para contas reais;
- guardar secrets em imagem, evento, prompt, grafo ou configuração versionada;
- transformar um engine em autoridade de grants, orçamento, reserva, ledger, portfolio ou kill switch;
- oferecer fallback automático entre engines, providers, contas ou venues;
- implementar todos os adapters nesta issue;
- executar transferências on-chain, smart contracts, staking, short, margem ou derivativos;
- introduzir Kubernetes ou active-active sem requisito e evidência de escala.

## Arquitetura

~~~text
UI / SDK / Agent tool
        |
        v
Application Handler anxionOS
        |
        +--> TradeIntent -> RiskCheck -> ExecutionPermit -> EffectGate
        |
        v
Adapter Gateway / dispatcher
        |
        +--> adapter-nautilus (container)
        +--> adapter-gocryptotrader (container futuro)
        +--> adapter-hummingbot (container futuro)
        +--> adapter-freqtrade (container futuro)
        +--> adapter-xchange (container futuro)
        +--> adapter-cryptofeed (data container futuro)
        +--> adapter-mt5 (gateway separado futuro)
        |
        v
NATS commands/events
        |
        +--> execution state and reconciliation
        +--> PostgreSQL journal/outbox
        +--> TimescaleDB market data
        +--> audit and observability
~~~

O gateway é um dispatcher sem regra financeira própria. Ele aceita somente um ExecutionPermit válido, verifica a capability do adapter e publica um comando com idempotency key. O processo externo não recebe conexão direta com PostgreSQL, Neo4j ou serviços de secrets. Respostas retornam por eventos assinados pelo adapter, com eventId, correlationId, causationId, adapterId, adapterVersion, environment e checkpoint.

## Contrato de capability

Cada adapter publicado fornece um manifesto imutável:

~~~yaml
adapterId: nautilus
adapterVersion: exact-version
runtime: python-rust
imageDigest: sha256:...
environments:
  - SIMULATED
assetClasses:
  - STOCK
  - CRYPTO
capabilities:
  marketData: true
  simulation: true
  orderSubmit: false
  orderCancel: false
  accountRead: false
  positionRead: false
  transfer: false
limits:
  maxConcurrentRuns: configured-value
  supportedOrderTypes: [...]
health:
  liveness: endpoint-or-process-check
  readiness: capability-and-dependency-check
reconciliation:
  supportedStates: [...]
owner: execution-team
approval: pending-independent-homologation
~~~

Os campos de exemplo acima são forma do contrato; valores efetivos precisam ser fornecidos pelo adapter e validados pelo schema. Uma capability ausente ou desconhecida é rejeitada. No primeiro incremento, orderSubmit deve permanecer false em produção e qualquer execução deve usar o SimulatedExecutionVenue explicitamente.

## Comandos e eventos

### AdapterCommand v1

Campos obrigatórios:

- commandId e idempotencyKey;
- tenantId, agencyId, actorId e actorType;
- executionMode;
- adapterId, adapterVersion e imageDigest;
- assetClass, venueRef, accountRef e instrumentRef;
- tradeIntentId, executionPermitId e permitHash;
- order parameters normalizados;
- correlationId, causationId, createdAt e expiresAt;
- policyVersion, grantEpoch, riskSnapshotId e budgetReservationId;
- requestedCapabilities.

Rejeitar comando se faltar qualquer vínculo institucional, se o permit estiver expirado/revogado/reutilizado, se o epoch estiver stale, se a capability não estiver declarada ou se o ambiente não coincidir exatamente.

### AdapterEvent v1

Todo evento deve incluir:

- eventId, eventType, eventVersion, sequence e checkpoint;
- commandId, correlationId e causationId;
- adapterId, adapterVersion, imageDigest e environment;
- timestamp do engine e timestamp de ingestão;
- resultado normalizado e payload específico preservado;
- outcome: ACCEPTED, REJECTED, PARTIAL, FILLED, CANCELED, FAILED, UNKNOWN ou RECONCILED;
- erro tipado quando aplicável;
- evidência de reconciliação e sourceRef.

O gateway nunca converte uma resposta de transporte em FILLED. UNKNOWN exige reconciliação antes de qualquer novo dispatch.

### Autorização do retorno do runtime — ANX-161/162

Autenticar ou verificar a assinatura do adapter prova a origem, não a autoridade para reportar qualquer comando/feed. Antes de aplicar um evento, execution (resultado financeiro) ou market-data (observação) deve vincular a identidade autenticada do runtime ao binding e ao dispatch/subscription persistidos pelo caminho autorizado. Esse vínculo confiável, independente dos campos autodeclarados no payload, deve corresponder a tenant/agency, conta, modo, adapter/versão e capability. `adapterId`, `commandId`, `tenantId` ou `accountRef` recebidos nunca concedem autoridade por si.

O transporte deve restringir publish/subscribe ao escopo e à capability do runtime, com configuração derivada do binding autorizado e verificação pelo dono no recebimento. Um runtime data-only não pode publicar resultados financeiros. Retorno ausente de autenticação, assinatura inválida, origem de outro binding ou conta/modo divergente é rejeitado ou posto em quarentena auditável, sem alterar estado financeiro; payload e evidência ficam sujeitos a redaction/ACL e retenção autorizadas.

Suspensão/revogação bloqueia novos efeitos, mas não apaga obrigações já emitidas. Fills tardios e reconciliação de dispatch existente seguem um caminho de recebimento autorizado e causalmente vinculado ao dispatch original; não concedem novo permit nem são descartados apenas porque o permit original expirou. Origem não verificável permanece em quarentena e exige reconciliação por fonte autorizada, sem inventar sucesso ou repetir ordem.

**Conformance obrigatório — ANX-161/162, com ANX-151/145 nos donos:** assinatura ausente/inválida; runtime A usando commandId/subscription de B; data-only emitindo FILLED/RECONCILED financeiro; conta/modo/tenant divergente; replay duplicado; fill tardio legítimo após suspensão. Oráculos: rejeição/quarentena sem mutação financeira para origem/escopo inválidos, deduplicação do fato válido, registro tardio legítimo sem novo efeito e trilha causal preservada. Algoritmo de autenticação, subject mapping e schemas exatos serão fixados/testados no slice; esta especificação não homologa os runtimes.

## Isolamento Docker

Cada adapter terá imagem própria, usuário não-root, filesystem read-only, limites de CPU/memória/processos, rede mínima, healthcheck e shutdown gracioso. O compose de desenvolvimento/staging deve:

- iniciar somente serviços necessários ao modo escolhido;
- separar redes de control-plane, data-plane e observabilidade;
- montar apenas diretórios de dados explicitamente nomeados;
- injetar configuração por ambiente sem secrets em arquivos versionados;
- impedir acesso do container ao socket Docker;
- registrar image digest e configuração efetiva no audit manifest;
- expirar containers de runs terminados e preservar artefatos conforme retenção;
- falhar se um serviço SIMULATED tentar resolver uma credencial ou endpoint REAL.

MT5 não será colocado no mesmo caminho Linux por inferência: será especificado como gateway host/VM separado, com binding explícito e health/reconciliation próprios.

## Fluxo SIMULATED

1. Usuário ou agente chama o application handler.
2. O handler deriva actor, tenant, grant e budget da sessão.
3. Estratégia/decisão produz TradeIntent imutável.
4. Conforme [P06 §2.1](./p06-financial-lifecycle-contract.md), risk produz RiskCheck/RiskPermit, capital mantém a reserva e governance emite ExecutionPermit institucional para o modo autorizado. Execution revalida e consome antes do efeito; EffectGate é mecanismo de verificação, não emissor de autoridade. Neste fluxo, o modo é somente SIMULATED.
5. Gateway verifica manifesto, checksum, ambiente e idempotencyKey.
6. Adapter executa contra dados históricos/replay e execução virtual.
7. Eventos são validados, persistidos no journal/outbox e projetados.
8. Execution e accounting atualizam somente o estado simulado.
9. Portfolio/performance derivam posição e P&L simulados.
10. Audit registra causalidade, logs, versão, inputs, outputs e reconciliação.
11. Agente e usuário recebem o mesmo resultado pelo application handler.

## Paridade e controle avançado

Ações disponíveis para usuário e agente são as mesmas: criar intenção, solicitar simulação, aprovar, pausar, cancelar quando suportado, consultar estado, pedir reconciliação, abrir takeover humano e encerrar run. A diferença é a autoridade do actor e o presentation layer.

O agente pode sugerir parâmetros e engine, mas o handler deve exigir seleção explícita ou política previamente aprovada. Não pode escolher silenciosamente provider, conta, venue, modo, adapter ou versão. Toda promoção de SIMULATED para PAPER precisa de nova decisão, novo permit e novo gate; não é mutação automática.

## Falhas e recuperação

- duplicação de comando: responder com o resultado idempotente já registrado;
- crash antes de confirmação: marcar dispatch como UNKNOWN e reconciliar;
- timeout: não reenviar cegamente;
- adapter unhealthy: bloquear novos comandos e preservar runs;
- evento atrasado: aceitar somente se a sequência/checkpoint e causalidade forem válidos;
- evento inválido: quarentena/DLQ com motivo e sem alterar ledger;
- revogação ou kill switch: fencing impede novos efeitos e o run passa a WAITING_HUMAN_INPUT;
- shutdown: checkpoint antes de encerrar e retomada somente após revalidação de epoch/permit;
- divergência entre engine e anxionOS: abrir incidente de reconciliação, sem ajustar histórico silenciosamente.

## Testes e critérios de aceite

A issue somente poderá ir para revisão quando houver:

- schema tests para manifesto, AdapterCommand v1 e AdapterEvent v1;
- contract tests do gateway contra um adapter SIMULATED;
- teste de rejeição para capability ausente, checksum divergente, tenant divergente, permit stale e ambiente incompatível;
- teste de idempotência e duplicate delivery;
- teste de timeout/UNKNOWN que prova ausência de retry cego;
- teste de kill switch, epoch bump, shutdown e retomada;
- teste negativo provando que SIMULATED não acessa endpoint ou secret REAL;
- teste de parity entre fluxo de usuário e tool de agente no mesmo handler;
- teste de reconciliação de fills e posições simulados;
- Docker health/readiness test com limites e rede;
- auditoria com causalidade completa;
- parecer independente do crítico, Code Review, QA, Security e Red Team conforme G0–G7.

Nenhum teste local de container substitui homologação de venue ou autoriza REAL.

## Market Data Gateway

Os engines externos também podem fornecer dados históricos, ticks, candles, trades, order books, funding, open interest, liquidações, calendários e outros sinais de mercado. Esses recursos entram por um **Market Data Gateway** separado do Adapter Gateway de execução. O gateway de dados é data-plane; não pode submeter ordens, criar permits ou alterar o ledger.

~~~text
Feeds externos
  ├── Cryptofeed (streaming cripto)
  ├── NautilusTrader data adapters/catalogs
  ├── GoCryptoTrader/XChange (REST e market data quando homologados)
  ├── Hummingbot connectors
  ├── Freqtrade data downloaders
  └── MT5 terminal/broker data gateway
          |
          v
Market Data Gateway
  ├── raw immutable capture
  ├── schema/symbol/time normalization
  ├── quality and freshness checks
  ├── deduplication and gap detection
  ├── TimescaleDB / object data catalog
  ├── replay and backtest catalog
  └── versioned events to strategies, agents and simulation
~~~

### Dois caminhos de dados

- **Histórico:** importar arquivos ou APIs com sourceRef, período, instrumento, timezone, granularidade, corporate actions quando aplicável, licença e checksum. A carga deve ser imutável e reprodutível; correções geram nova versão do dataset.
- **Tempo real:** consumir WebSocket, stream ou polling com timestamp da fonte e timestamp de ingestão. O sistema registra latência, sequência, reconnect, gaps, duplicatas, atraso e qualidade do feed. Dados stale ou incompletos são marcados e não podem ser usados como preço autorizador sem política explícita.

### Contrato de MarketDataEvent

Todo evento de dados deve declarar:

- feedId, providerId, providerVersion e sourceRef;
- assetClass, venueRef, instrumentRef e símbolo original;
- eventType, schemaVersion, sequence e checkpoint;
- eventTime, exchangeTime quando disponível e ingestionTime;
- payload normalizado e payload original quando necessário para auditoria;
- qualidade, freshness, latência, timezone e unidade;
- isReplay, datasetVersion e licenseRef;
- correlationId somente quando derivado de uma execução ou simulação.

A normalização nunca pode apagar precisão, moeda de cotação, lote, tick size, contrato, vencimento, funding ou semântica do venue. Instrumentos ambíguos são rejeitados ou enviados para quarentena, nunca mapeados por aproximação silenciosa.

### Uso pelos módulos

- market-data mantém catálogo, ingestão, qualidade, séries e observações;
- strategies consome versões de dataset e streams autorizados para sinais;
- agents e knowledge consomem dados com sourceRef, freshness e evidência;
- simulation usa histórico e replay determinísticos;
- evaluation registra dataset, engine, versão e parâmetros para reproduzir resultados;
- portfolios e performance usam somente valuation policy explícita e dados com qualidade suficiente;
- audit registra origem, transformação, gaps, decisões de rejeição e versão consumida;
- execution pode consultar preço de referência para validação de risco, mas não pode substituir a reconciliação da venue;
- risk pode bloquear por stale feed, divergência, ausência de benchmark ou quebra de limite.

### Controle, qualidade e resiliência

O Market Data Gateway deverá:

- permitir múltiplos feeds sem declarar equivalência automática;
- comparar fontes e classificar divergência por instrumento/venue;
- detectar gaps, out-of-order, duplicatas, clock drift e stale data;
- manter raw capture e camada normalizada separadas;
- suportar replay no mesmo contrato de eventos;
- aplicar backpressure e limites de custo;
- impedir que um feed privado exponha secrets a agentes ou outros tenants;
- registrar provider, versão, licença e custo de cada dataset;
- bloquear ou degradar explicitamente quando a qualidade não satisfizer a política;
- evitar failover silencioso: troca de feed exige policy/versionamento e evento auditável.

O agente pode pedir dados, escolher uma fonte entre opções aprovadas ou propor uma nova fonte. Não pode afirmar que duas fontes são fungíveis, usar dado stale como atual, alterar o histórico ou habilitar um adapter de execução a partir de uma capability de market data.

### Convergência com execução

Uma decisão pode usar dados históricos e tempo real, mas cada decisão deve registrar:

- dataset/stream e versão consumida;
- janela temporal, timezone e timestamp de corte;
- freshness e qualidade observadas;
- transformações, agregações e features;
- engine e versão que produziram o sinal;
- evidências e modelo de valuation;
- relação com o TradeIntent e o ExecutionPermit.

Preço de referência, sinal, book ou notícia nunca é fill. Fills, posições, saldo, settlement e taxas continuam vindo da execução/reconciliação e dos ledgers autoritativos.
O contrato público do anxionOS será o Adapter Port, e cada engine terá um Anti-Corruption Layer próprio. O núcleo nunca importará SDK, classe, enum ou modelo de domínio de um engine externo. Para adicionar um novo motor, o implementador deverá criar somente um pacote/runtime de adapter, manifesto e fixtures de conformidade; não poderá alterar TradeIntent, ExecutionPermit, ledger ou regras centrais para acomodar peculiaridades locais.

### Camadas estáveis

1. **Core domain:** TradeIntent, ExecutionPermit, EffectGate, Order, Fill, Position, eventos, autoridade e ledger.
2. **Adapter Port:** interfaces versionadas para capabilities, lifecycle, comandos, eventos, health e reconciliação.
3. **Anti-Corruption Layer:** tradução bidirecional entre o contrato comum e símbolos, ordens, clocks, erros e estados do engine.
4. **Runtime adapter:** processo/container que chama o SDK ou protocolo do engine.
5. **Profile:** configuração declarativa por engine, venue, asset class e ambiente, sem regra de negócio embutida.

A inclusão de um engine novo não pode exigir uma dependência do runtime do adapter no application handler. O gateway descobre o adapter pelo registry e negocia capabilities; se a versão do port não for compatível, rejeita o binding antes de qualquer comando.

### Adapter SDK e conformance kit

O repositório deverá oferecer um SDK mínimo e um conformance kit que validem, independentemente do engine:

- manifesto válido e compatível com o schema;
- handshake, capability discovery, liveness, readiness e graceful shutdown;
- correlação command/event e propagação de tenant, actor, permit e executionMode;
- idempotência por commandId/idempotencyKey;
- estados ACCEPTED, REJECTED, PARTIAL, FILLED, CANCELED, FAILED, UNKNOWN e RECONCILED;
- preservação de precisão, timezone, timestamps e identificadores externos;
- reconciliação de ordens, fills, posições e saldo;
- comportamento diante de timeout, reconnect, processo reiniciado, evento duplicado e evento fora de ordem;
- fencing por epoch e bloqueio após kill switch/revogação;
- ausência de acesso indevido a secrets, redes, PostgreSQL, Neo4j e endpoints de outro ambiente;
- métricas, logs estruturados, traces e audit manifest;
- compatibilidade entre versões do Adapter Port.

O kit deve produzir um relatório de conformidade versionado, com PASS/FAIL por capability e limitações explícitas. “Implementa a interface” não é suficiente para homologação.

### Registry e ciclo de vida

O registry de adapters mantém:

- adapterId e versão semântica;
- portVersion e schema/event versions;
- imagem, digest, SBOM e proveniência;
- capabilities positivas e explicitamente negadas;
- asset classes, venues, ambientes e tipos de ordem;
- owners, licença, suporte, dependências e incidentes conhecidos;
- status proposed, testing, approved-simulated, approved-paper, approved-real, suspended ou retired;
- data e evidência da última conformance run.

Um adapter novo nasce proposed, passa por conformance em SIMULATED, depois por revisão independente. PAPER e REAL são promoções separadas, com novos critérios, conta/venue explícitos e revalidação. Revogar ou suspender um adapter deve impedir novos dispatches e preservar reconciliação dos runs existentes.

### Compatibilidade e evolução

O Adapter Port usa compatibilidade explícita:

- mudanças aditivas recebem versão minor;
- remoções ou mudanças semânticas recebem versão major;
- correções compatíveis recebem versão patch;
- eventos mantêm versões e transformadores somente quando a semântica puder ser preservada;
- o gateway rejeita versões incompatíveis em vez de fazer downgrade ou fallback silencioso;
- diferenças de engine ficam no adapter e no profile, nunca em condicionais espalhadas pelos módulos.

Cada adapter deve declarar a matriz de capabilities suportadas e não suportadas. Uma capability parcial é exposta como parcial, com erro tipado e teste correspondente; não pode ser apresentada como suporte genérico.

### Processo para adicionar um engine

1. Registrar o candidato e a motivação em issue ANX própria.
2. Confirmar licença, origem, segurança, runtime, manutenção e requisitos operacionais.
3. Implementar o Adapter Port sem alterar o core.
4. Criar o Anti-Corruption Layer e o manifesto.
5. Executar o conformance kit em fixture SIMULATED.
6. Passar crítico independente, Code Review, QA, Security e Red Team.
7. Publicar imagem imutável, SBOM, digest e relatório.
8. Habilitar somente as capabilities aprovadas.
9. Promover para PAPER em issue separada, se houver necessidade.
10. Repetir todos os gates afetados para qualquer mudança de contrato, imagem ou capability.

O custo de adicionar um engine deve ficar concentrado no adapter, seus testes e seu profile; o custo não pode aparecer como alterações no domínio financeiro ou em cada consumidor do gateway.

## Adapters previstos

A ordem de entrega é:

1. NautilusTrader em SIMULATED, como primeiro adapter multi-asset.
2. Cryptofeed em data-plane para replay e ingestão cripto.
3. GoCryptoTrader e Hummingbot em SIMULATED/PAPER cripto.
4. Freqtrade em SIMULATED/PAPER, sem delegar ao dry-run a semântica institucional.
5. XChange como connector cripto Java, quando houver necessidade comprovada.
6. MT5 como gateway externo controlado, após especificar host/VM, broker, símbolos e reconciliação.
7. Qualquer capability REAL somente por issue própria, homologação e gates independentes.

Fontes de referência operacional: [NautilusTrader](https://nautilustrader.io/docs/latest/), [GoCryptoTrader](https://github.com/thrasher-corp/gocryptotrader), [Hummingbot](https://hummingbot.org/docs/), [Freqtrade](https://docs.freqtrade.io/en/latest/), [XChange](https://github.com/knowm/XChange), [Cryptofeed](https://github.com/bmoscon/cryptofeed) e [MetaTrader 5 Python Integration](https://www.mql5.com/en/docs/python_metatrader5).

## Reconciliação de implementação — ANX-127 / ANX-161

Inspeção estática de 2026-09-08; não homologa runtimes, PAPER, REAL ou capacidades de vendors. ANX-117 é origem histórica; a continuação está em ANX-161 (contrato/SDK), ANX-162 (infra) e ANX-174–180 (engines).

| Tema | Source / diferença observada | Critério de continuação |
| --- | --- | --- |
| Dispatch durável | `backend/modules/adapter-gateway/src/application/commands/dispatch-adapter-command.ts` chama transport dentro da TX antes de gravar dispatch; falha vira AGW_TRANSPORT_FAILED | ANX-161: crash/timeout remoto com estado UNKNOWN e reconciliação; não inferir atomicidade entre PG e processo externo |
| Resultado | Mesmo handler transforma outcome diferente de ACCEPTED em REJECTED no command result | Separar confirmação de transporte de resultado financeiro/job; nenhum FILLED/PARTIAL/UNKNOWN pode ser reinterpretado silenciosamente como rejeição |
| Negotiation / homologação | `backend/packages/contracts/src/adapter-gateway/types.ts`: manifesto tem digest/capabilities/ambiente, mas não portVersion nem status de homologação | Versionar contrato e provar compatibilidade, suspensão e registry antes de novos efeitos; shape de exemplo não equivale a schema publicado |
| Data-plane | `adapterCommandV1Schema` em commands.ts exige order/intent/permit mesmo quando requestedCapabilities inclui marketData | O caminho financeiro descrito acima não é contrato genérico para leitura. Reconciliar contratos separados e autoridade de dados; não fabricar permit financeiro para consulta |
| Ownership | ADAPTER_GATEWAY_OWNER_DOMAIN e persistência própria existem sob modules/adapter-gateway | Disposição atual: ADR0006 mantém os 23 módulos; Placement aprovado abaixo define destinos e migração. O código observado ainda requer migração, não é owner aceito |

As formulações anteriores “sem alterar contrato central/core” descrevem o objetivo de isolar integrações que já cabem no port. **Não são garantia para capacidades com semântica nova**: estas exigem proposta/ADR aplicável, schemas versionados, migração e revisão dos consumidores. Peculiaridades de tradução ficam no adapter; regra institucional nova não pode ser escondida em profile.

Os próximos executores devem rastrear imports, registry/ports, adapters reais, testes e limites do slice antes de implementar o delta. Esta seção registra lacunas do snapshot. A decisão explícita posterior está em Placement aprovado; nenhum código foi alterado por este registro.

## Placement aprovado — ANX-127 / ADR0006

O usuário aprovou em 2026-09-08 a distribuição entre os 23 módulos. Fonte: [ADR0006](../../../brain/project-docs/decisions/0006-distribute-external-gateways-within-baseline.md), complementar ao ADR0002. O placement está aceito; o detalhamento abaixo e a implementação continuam sujeitos aos gates.

### Ownership e escritor único

| Estado / operação | Dono da escrita autoritativa | Limite |
| --- | --- | --- |
| Registro técnico: adapter id/versão, digest, manifesto imutável, port/schema versions, proveniência e referência de conformance | operations, PostgreSQL com journal/outbox, no lifecycle de deploy | Leitura por port público; registro não habilita trading nem guarda credencial |
| Aprovação institucional, grants e epochs | governance | Revalidação no domínio consumidor; catálogo não concede autoridade |
| Provider/account/endpoint/binding e referências de secrets | connections | Artefato referencia conexão, não duplica estado mutável |
| Ativação financeira por versão/conta/modo; dispatch, reports, idempotência e UNKNOWN | execution | Não assume ingestão de feeds nem duplica risco/reserva |
| Ativação de feed, subscription, backfill, observações e checkpoints | market-data, PostgreSQL/Timescale conforme mapa | Consulta o catálogo técnico sem chamar execução financeira |
| Conformance/qualidade e evidências | evaluation quando aplicável; audit mantém manifests; operations referencia resultado de release | Certificado não concede grant ou amplia ambiente |
| Contratos/SDK/transporte/runtime | packages/contracts/sdk/eventing, services e apps composition roots | Sem registro autoritativo paralelo, regras financeiras ou SDK de engine no domínio |

Um runtime multi-capability compartilha o artefato identificado por digest, não o estado de ativação financeira e de feed. Os status proposed/testing/approved-simulated/approved-paper/approved-real descritos acima são visão derivada de registro, homologação e ativação por capability, não campo global que operations possa usar para promover trading. Suspensão técnica impede novos usos sem apagar obrigações nem encerrar cegamente consultas/reconciliação autorizadas. Cache não substitui autoridade atual.

### Migração planejada, não executada

1. ANX-161 inventaria imports/reexports, registry, dispatch/report, tabelas/migrations, journal/outbox/inbox, epochs e idempotência existentes. Classifica cada objeto no mapa acima; ANX-128 verifica boundaries. Não basta renomear adapter-gateway.
2. ANX-158/162 detalham a fatia mínima de catálogo técnico em operations, sem antecipar todo console P07. O contrato dessa fatia precede habilitação de adapters na ANX-161; não criar registry provisório duplicado. ANX-141 preserva connections; ANX-145/146 recebem dados; ANX-151 recebe dispatch financeiro. Respeitar P01/P02 antes dos novos slices.
3. Criar contratos versionados e migrations de cada dono. Fachada temporária no import legado, se necessária, só delega sem regra/persistência própria e tem remoção rastreada ANX-161.
4. Backfill preserva ids, hashes, tenant/conta/modo, causalidade e checkpoints. Eventos históricos mantêm ownerDomain/versão originais e proveniência legada; novos fatos usam o dono escolhido. Não reescrever journal ou republicar fatos como novos efeitos; reconciliar origem/destino.
5. Leitores compatíveis precedem novos escritores. Cutover por classe de estado usa fencing/revisão e exclui o escritor antigo; nunca dois escritores do mesmo agregado. Copiar tabelas não cria transação distribuída com o engine.
6. Dispatch enviado ou UNKNOWN conserva identidade e responsável pela reconciliação até confirmação. Não trocar adapter/conta como retry. Preservar reservas/obrigações e ingestão idempotente de fills tardios.
7. Rollback suspende novas habilitações/dispatches afetados e restaura apenas caminho compatível com escritor único. Preserva estado confirmado, dedupe e evidências; não restaura grants antigos nem desfaz ledger com rollback de código. Remoção de pacote/tabelas legados só após leitura/restore/replay comprovados e slice autorizado; nenhum delete nesta entrega.

### Oráculos e continuidade

ANX-161 coordena ANX-158/162/141/145/146/151/132/128 com matriz objeto→dono→migração→consumidor→teste. Provar registry sem poder de trading; feed autorizado sem permit financeiro; versão incompatível rejeitada; único escritor sob corrida; idempotência/UNKNOWN preservados no corte/rollback; isolamento tenant/conta/modo e paridade humano/agente. ANX-174–180 mantêm homologação por engine; nenhum novo motor ganha suporte por apenas constar no catálogo.

## Dependências e handoff

Depende dos contratos P01/P02, do debate de execution e dos contratos P06. A implementação deve abrir slices próprias para:

- gateway e schemas;
- imagem/runtime Nautilus SIMULATED;
- observabilidade e reconciliação;
- adapters cripto adicionais;
- MT5 gateway.

Cada slice deve ter issue ANX própria e repetir os gates afetados quando alterar contratos ou imagens.
