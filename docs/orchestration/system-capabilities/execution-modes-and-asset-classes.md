---
title: Modos de execução e classes de ativos
description: Desenho normativo para operação simulada, paper e real em stocks, cripto e carteiras multi-asset.
type: design
status: draft
owner: Produto e engenharia
issue: ANX-45
tags:
  - execution
  - simulation
  - stocks
  - crypto
  - risk
  - agents
---

# Modos de execução e classes de ativos

**Issue:** ANX-45  
**Status:** draft de desenho para revisão  
**Escopo:** stocks, cripto e estratégias multi-asset, sem habilitar capital real.

## Decisão

O sistema deve usar um pipeline comum de decisão, risco, autorização, execução, contabilidade e auditoria. O ambiente de execução, a classe de ativo, a conta e a venue devem ser atributos obrigatórios do contrato.

Os modos são isolados:

- **SIMULATED:** backtest, replay histórico ou simulação com dados atuais; não produz efeitos externos.
- **PAPER:** usa dados atuais e simula execução; não envia ordens a broker ou exchange.
- **REAL:** envia ordens a uma venue homologada e movimenta capital real.

Uma operação nunca pode mudar silenciosamente de `SIMULATED` ou `PAPER` para `REAL`. A mudança exige novo `TradeIntent`, nova checagem de risco, novo permit e aprovação aplicável.

A proposta preserva a regra de que PostgreSQL é autoridade transacional, Neo4j é projeção/contexto e cada domínio mantém seu estado, journal e outbox (`brain/notes/anxionos-backend-structure.md`). O Graph Kernel não é ledger nem origem final de autorização financeira ([funcionalidades do Graph Kernel](./modules/graph.md)).

## Pipeline comum

```text
Market Data
    ↓
StrategyVersion
    ↓
Decision / TradeIntent imutável
    ↓
Governance + Risk
    ↓
ExecutionPermit
    ↓
SIMULATED/PAPER venue ou broker/exchange REAL
    ↓
Order / Fill / UNKNOWN
    ↓
Accounting + Portfolio + Performance
    ↓
Audit + Reconciliation
```

O mesmo caso de uso de aplicação deve ser invocável pela UI e pelo SDK/CapabilityManifest. O canal de origem muda a auditoria, mas não muda as regras de domínio ([checklist estrutural](./MODULE-STRUCTURE-CHECKLIST.md)).

## Contratos mínimos

### Instrument

```text
Instrument
- instrumentId
- assetClass: STOCK | CRYPTO
- symbol
- venue
- baseCurrency
- quoteCurrency
- tickSize
- lotSize
- tradingCalendar
- custodyModel
- settlementModel
- status
```

### TradeIntent

```text
TradeIntent
- intentId
- actorPrincipalId
- tenantId / agencyId
- assetClass
- instrumentId
- venue
- accountId
- executionMode: SIMULATED | PAPER | REAL
- side
- quantity
- orderType
- limitPrice / protectionBounds
- maxSlippage
- quoteCurrency
- strategyVersion
- authorityEpoch
- riskEpoch
- intentHash
- idempotencyKey
- expiresAt
```

O agente nunca deve fornecer autoridade pelo payload. O sistema deriva identidade, tenant, grants e limites da sessão e do grafo de autoridade; o commit/dispatch revalida os epochs atuais (`brain/project-docs/specs/001-institutional-contract/spec.md`, `brain/project-docs/specs/003-investment-lifecycle/spec.md`).

### ExecutionPermit

O permit deve ser:

- específico para ambiente, conta, ativo e venue;
- vinculado ao `intentHash`;
- limitado por quantidade, preço, slippage e prazo;
- ligado aos `authorityEpoch` e `riskEpoch`;
- utilizável uma única vez;
- invalidado por revogação, kill switch, política stale ou mudança de risco.

Resposta incerta da venue produz estado `UNKNOWN` ou `RECONCILING`. O sistema reconcilia antes de repetir e nunca faz retry cego (`brain/project-docs/specs/003-investment-lifecycle/spec.md`).

## SIMULATED e PAPER

### SIMULATED

O simulador deve suportar:

- dados históricos e replay;
- spread, slippage e latência;
- liquidez e partial fills;
- rejeições;
- taxas;
- limites de preço e quantidade;
- sessões e feriados;
- mercado 24/7;
- dividendos, splits e corporate actions;
- funding, staking, airdrops e eventos específicos de cripto quando aplicáveis;
- falhas, atrasos e respostas `UNKNOWN`.

Backtest não certifica sozinho uma estratégia. Seu resultado deve ser um artefato de `simulation` ou `evaluation`, com dados, versão da estratégia, parâmetros, custos, hipóteses e limitações.

### PAPER

O modo paper utiliza market data atual, mas envia a ordem apenas para um `SimulatedExecutionVenue`. Serve para validar:

- comportamento do agente;
- limites;
- roteamento;
- approval gates;
- observabilidade;
- reconciliação;
- UX;
- latência e recuperação.

Paper não comprova que uma broker ou exchange real aceitará a ordem. Não deve usar credenciais reais nem apresentar saldo simulado como capital disponível.

## Stocks

O módulo `market-data` deve representar instrumentos, feeds, qualidade, calendário, sessões, leilões e corporate actions. `execution` deve encapsular as regras da broker/venue, enquanto `accounting` registra settlement, taxas, dividendos e ajustes sem alterar lançamentos históricos.

Riscos específicos:

- sessão fechada ou feriado;
- circuit breaker e halts;
- lotes e tick sizes;
- liquidez e gap;
- dividendos, splits, fusões e reorganizações;
- settlement e falhas de reconciliação da corretora;
- exposição por emissor, setor, país e moeda.

## Cripto

O módulo `market-data` deve tratar pares, order books, trades, funding e qualidade do feed. `connections` e `execution` devem separar exchange, wallet, custody provider e qualquer transferência on-chain.

Riscos específicos:

- exchange indisponível ou insolvente;
- congestionamento de rede;
- divergência entre exchanges;
- custódia e rotação de credenciais;
- fees de trading e rede;
- precisão decimal por ativo/par;
- forks, airdrops, staking e bridges;
- liquidação, margem, perpétuos e funding.

A primeira versão real recomendada deve excluir alavancagem, short, derivativos, bridges, staking, transferências automáticas e smart contracts.

## Stocks e cripto juntos

A experiência pode exibir uma carteira consolidada, mas a autoridade operacional permanece separada:

```text
Agency
└── Investment Program
    ├── Stocks Book
    │   ├── Broker Account
    │   ├── Stock Positions
    │   └── Stock Ledger
    ├── Crypto Book
    │   ├── Exchange/Wallet Accounts
    │   ├── Crypto Positions
    │   └── Crypto Ledger
    └── Consolidated Portfolio View
```

A visão consolidada pode mostrar patrimônio, P&L, exposição, liquidez, correlação e concentração. Porém, não deve existir um saldo operacional misto.

Devem permanecer independentes:

- contas e reservas;
- credenciais;
- permits;
- adapters;
- limites e políticas;
- reconciliação;
- ledgers;
- kill switches;
- limites de exposição por venue.

Uma estratégia multi-asset pode gerar uma decisão de alocação única, mas deve produzir intents separados:

```text
Multi-asset allocation
    ├── TradeIntent STOCK
    └── TradeIntent CRYPTO
```

Assim, o sistema pode bloquear cripto por falha de exchange e executar stocks, ou fazer o inverso, sem perder causalidade nem misturar estados.

## Motores externos e política de integração

A plataforma adotará motores externos por meio de adapters/runtimes isolados, com contratos versionados e capability manifests por engine. Nenhum motor externo será autoridade sobre tenant, grants, orçamento, reservas, ledger, portfolio ou decisão de promoção. O anxionOS continuará sendo o dono de TradeIntent, ExecutionPermit, OrderIntent, idempotência, reconciliação institucional, auditoria e kill switch.

A classificação abaixo evita tratar componentes de naturezas diferentes como equivalentes:

| Componente | Papel no anxionOS | Asset class / uso previsto | Limite arquitetural |
|---|---|---|---|
| [NautilusTrader](https://nautilustrader.io/docs/latest/) | Runtime de pesquisa, backtest determinístico, simulação e execução através de adapters | Multi-asset e multi-venue; candidato principal para convergência SIMULATED/PAPER | Executar em sandbox/worker isolado; eventos externos passam pelo EffectGate e reconciliação do anxionOS |
| [GoCryptoTrader](https://github.com/thrasher-corp/gocryptotrader) | Runtime/adaptador cripto em Go, com unified exchange API, backtest e portfolio tooling | Cripto spot inicialmente; futuros/margem somente após capability e risco específicos | Não recebe grants ou ledger; versão e suporte por exchange precisam de homologação própria |
| [XChange](https://github.com/knowm/XChange) | Biblioteca Java de acesso uniforme a exchanges | Cripto; market data e trading API | Não é motor autônomo; deve ser encapsulada como connector runtime, sem decisão de estratégia |
| [Hummingbot](https://hummingbot.org/docs/) | Runtime de estratégias e executors, especialmente market making, com connectors CLOB/DEX | Cripto CEX/DEX; PAPER/SIMULATED primeiro | Gateway/connector não pode movimentar ativos sem permit explícito; transferências on-chain ficam fora do primeiro REAL |
| [Freqtrade](https://docs.freqtrade.io/en/latest/) | Bot/runtime cripto com backtesting, dry-run, otimização e live trade | Cripto spot inicialmente | dry-run não é sandbox de venue; a configuração do engine não substitui o executionMode institucional |
| [Cryptofeed](https://github.com/bmoscon/cryptofeed) | Ingestão de market data, order book, trades, funding e callbacks | Cripto; fonte de dados para TimescaleDB/replay/simulação | Preferencialmente somente data-plane; qualquer REST privado/order placement exige capability separada e não é habilitado por padrão |
| [MetaTrader 5](https://www.mql5.com/en/docs/python_metatrader5) | Gateway/terminal para dados, ordens e posições de uma conta MT5 | Instrumentos disponibilizados pelo broker MT5, incluindo FX/CFD e eventualmente stocks/cripto | Terminal e broker são dependências externas; conta, símbolo, margem, settlement e permissões devem ser validados por adapter |

### Contrato comum do adapter

Cada integração deve declarar, antes de ser habilitada:

- engineId, engineVersion, runtime, imagem/artefato e checksum;
- classes de ativos, venues, símbolos, tipos de ordem e ambientes suportados;
- capacidades separadas de marketData, simulation, orderSubmit, orderCancel, accountRead, positionRead e transfer;
- normalização reversível entre símbolos, precisão, timezone, timestamps e estados de ordem;
- limites, rate limits, custos, latência esperada, reconexão e comportamento em timeout;
- método de reconciliação de ordens, fills, posições, saldo e eventos atrasados;
- isolamento de secrets, conta e tenant, com rotação e revogação;
- testes de contrato, idempotência, duplicação, UNKNOWN, restart e kill switch;
- owner, suporte, licença, proveniência e decisão de homologação.

O adapter deve converter o TradeIntent autorizado em uma ordem externa e devolver eventos observáveis. OrderSubmitted nunca significa fill ou aceite definitivo. Timeout, desconexão ou resposta ambígua produz UNKNOWN; a reconciliação precede qualquer nova tentativa.

### Orquestração por ambiente

- **SIMULATED:** engine sem credenciais privadas; dados históricos/replay e execução virtual. NautilusTrader e Cryptofeed são candidatos naturais, enquanto os demais podem ser usados apenas por fixtures ou simuladores explicitamente isolados.
- **PAPER:** market data real ou replay controlado, execução virtual no SimulatedExecutionVenue; nenhum engine pode inferir que o broker/exchange aceitaria a ordem.
- **REAL:** inicialmente desabilitado. Quando autorizado por gates independentes, cada engine terá conta, venue, permit, limites e kill switch próprios. Não haverá fallback automático entre engines ou contas.
- **Multi-asset:** uma decisão pode gerar intents separados por asset class; um engine de cripto nunca executa uma intent de stocks, e MT5 não será tratado como prova de acesso a qualquer classe oferecida por seu broker.

### Estratégia de seleção

O anxionOS seleciona um engine explicitamente por capability e contexto, em ordem registrada no ExecutionPlan. O agente pode propor, mas não escolher silenciosamente engine, provider, conta, venue ou ambiente. Se nenhum engine homologado satisfizer as capacidades, a execução vai para WAITING_HUMAN_INPUT ou é rejeitada fail-closed.

## Responsabilidade dos módulos

| Módulo | Responsabilidade neste desenho |
| --- | --- |
| `market-data` | Instrumentos, feeds, qualidade, freshness, calendários e observações |
| `strategies` | StrategyVersion, sinais, backtest e intenção de alocação |
| `decisions` | Decisão, evidências, TradeIntent e aprovação de intenção |
| `risk` | Limites, RiskCheck, exposição, kill switch e bloqueios |
| `capital` | Contas, titularidade, reservas e alocações |
| `execution` | Orders, fills, adapters, venue state e reconciliação de execução |
| `accounting` | Ledger double-entry, taxas, settlement e ajustes imutáveis |
| `portfolios` | Posições, valuation e exposição derivadas |
| `performance` | P&L, attribution e métricas |
| `simulation` | Snapshots, cenários, replay e diff |
| `evaluation` | Certificação, reputação e promoção controlada |
| `connections` | Provider, binding, quota, cooldown, custo e secrets |
| `audit` | Linhagem, manifest, replay autorizado e evidência |
| `orchestration` | Run, checkpoint, lease, aprovação humana e retomada |

Essa divisão complementa o mapa mestre de capacidades de 23 módulos ([CAPABILITY-MAP](./CAPABILITY-MAP.md)).

## Regras de segurança

1. `executionMode` é obrigatório e imutável no `TradeIntent`.
2. SIMULATED/PAPER nunca recebem credenciais de broker ou exchange.
3. REAL exige adapter homologado, conta explícita e permit válido.
4. Dado stale, política ausente, grant revogado ou estado `UNKNOWN` bloqueiam novo efeito.
5. Stocks e cripto não compartilham ledger nem reserva operacional.
6. O agente não escolhe silenciosamente provider, conta, venue, modelo ou modo.
7. Toda ordem real tem causalidade até estratégia, evidência, decisão, risco e aprovação.
8. O kill switch deve existir globalmente, por agência, por asset class, por estratégia e por venue.
9. A promoção SIMULATED → PAPER → REAL é uma transição governada, não uma configuração livre.
10. Nenhum backtest, reputação ou memória pode conceder autoridade financeira automaticamente.

## Roadmap de habilitação

| Fase | Escopo | Saída mínima |
| --- | --- | --- |
| 1 | SIMULATED stocks | Backtest reproduzível e custos explícitos |
| 2 | SIMULATED cripto | Replay 24/7 e regras específicas |
| 3 | PAPER multi-asset | Pipeline completo sem capital real |
| 4 | REAL stocks | Uma broker homologada, sem alavancagem |
| 5 | REAL cripto | Uma exchange homologada, sem transferências |
| 6 | Multi-asset real | Intents e ledgers separados, visão consolidada |
| 7 | Expansão | Novas venues após reconciliação e gates independentes |

A ordem segue o roadmap institucional P01–P09 e os gates de risco, autoridade, reconciliação e operação (`brain/project-docs/specs/001-institutional-contract/spec.md`, `brain/project-docs/specs/003-investment-lifecycle/spec.md`).

## Critérios de prontidão

Nenhum modo real deve ser considerado pronto sem evidência executada de:

- isolamento de tenant e conta;
- idempotência e reservas concorrentes;
- permit de uso único;
- revogação durante execução;
- kill switch;
- duplicação e atraso de fills;
- estado `UNKNOWN` e reconciliação;
- ledger balanceado;
- rebuild e replay;
- divergência de market data;
- falha de broker/exchange;
- auditoria completa;
- recovery e rollback;
- aprovação independente conforme o pipeline G0–G7.

O primeiro alvo de produto deve ser **SIMULATED/PAPER multi-asset**, com onboarding, agente, aprovação humana, execução simulada e auditoria ponta a ponta. Capital real fica explicitamente fora desse incremento.
