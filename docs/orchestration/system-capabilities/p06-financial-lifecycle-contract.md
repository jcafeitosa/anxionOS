---
title: "P06 — Contrato do ciclo financeiro SIMULATED/PAPER"
description: "Contrato executável do ciclo financeiro simulado para stocks, cripto e carteiras multi-asset."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-58
tags:
  - finance
  - simulation
  - paper
  - stocks
  - crypto
  - multi-asset
  - contracts
---

# P06 — Contrato do ciclo financeiro SIMULATED/PAPER

## 1. Objetivo e limites

Este contrato fecha o fluxo financeiro demonstrável sem capital real:

`MarketObservation → StrategyVersion/Signal → Decision/TradeIntent → RiskCheck → CapitalReservation → ExecutionPermit → SimulatedOrder → Fill(s) → AccountingLedger → Position/Valuation/P&L → Reconciliation/Audit`

Os modos permitidos nesta fase são:

- `SIMULATED`: execução contra replay, histórico ou mercado sintético versionado.
- `PAPER`: decisão e execução contra preços correntes sem enviar ordem a uma venue real; custos e fills são modelados.
- `REAL`: apenas vocabulário de fronteira. Não é habilitado, não recebe credenciais e não pode ser alcançado por fallback.

Toda ação de agente e usuário passa pelo mesmo application handler, capability manifest, validação de schema, política, risco, idempotência e auditoria.

### 1.1. Reconciliação ANX-127: dados correntes não são execução REAL

**Fonte e precedência:** o pedido explícito do usuário inclui preços em tempo real e histórico para stocks/cripto. Este contrato §1 já define PAPER com preços correntes; o [desenho dos modos](./execution-modes-and-asset-classes.md), seções Decisão e PAPER, mantém execução virtual. Os textos draft [market-data R09](../structure-debate/market-data/R09-dev-plan.md), G4-MD-01/G5-MD-02, e [R10](../structure-debate/market-data/R10-g0-handoff.md), Out of scope, não podem converter a palavra “live” em proibição genérica de dados correntes.

**Disposição documental:** distinguir origem temporal dos dados de autoridade de execução. Uma observação de preço corrente pode alimentar PAPER sem autorizar ordem, transferência, acesso a conta financeira ou capital real. O modo permanece SIMULATED/PAPER conforme contrato do run; “live” na origem de dados nunca se converte em `executionMode: REAL`. A rejeição de REAL nos schemas do slice permanece válida. A aquisição de feeds continua sujeita a capability, licença, escopo, custo e homologação; esta distinção não habilita um endpoint ou segredo.

**Ownership e impacto:** market-data registra proveniência, timestamps, qualidade e replay; execution preserva o modo da ordem. ANX-145/146 tratam dados; ANX-132/161 tratam contratos públicos e separação read/financeiro; ANX-163 verifica a composição PAPER. Esta disposição não escolhe o placement do gateway nem altera o dono de permits.

**Compatibilidade e migração planejada:** os executores devem mapear campos e consumidores existentes antes do diff. Preservar a validação atual de modo; não renomear REAL para PAPER nem reescrever registros históricos por heurística. Quando origem temporal não estiver representada, especificar evolução versionada com proveniência verificável; registros legados sem evidência permanecem sem origem comprovada e não são usados como cotação corrente autorizadora. Leitores incompatíveis rejeitam o novo contrato explicitamente. Cutover exige leitores compatíveis antes do produtor; rollback interrompe o novo produtor sem reinterpretar payloads já persistidos ou promover modo. Não há migration SQL nesta entrega documental.

**Oráculos delegados, não executados:** dado corrente autorizado + PAPER produz apenas execução virtual; `executionMode: REAL` continua rejeitado; dado histórico/replay não aparece como cotação corrente; ausência de proveniência/freshness impede uso sensível; capability de leitura não permite orderSubmit; usuário e agente recebem as mesmas validações. ANX-145/146/161/163 devem registrar versões e evidências de casos positivos e negativos. Nenhum feed, broker ou exchange foi acionado para esta reconciliação.

## 2. Ownership por módulo

| Etapa | Dono | Autoridade |
| --- | --- | --- |
| Instrumentos, venues e calendários | market-data | catálogo normalizado e qualidade da observação |
| Observações, candles e ticks | market-data | fatos de preço versionados |
| Estratégia e versão imutável | strategies | definição e parâmetros da estratégia |
| Sinal, decisão e TradeIntent | decisions | intenção, racional e vínculo com estratégia |
| Limites, exposição e aprovação | risk | resultado de risco e motivos |
| Saldo disponível e reserva | capital | reserva, liberação e epoch de capital |
| Permissão de efeito | governance | permit, grant, epoch, fencing e modo |
| Simulação de ordens e fills | execution/simulation | estado da ordem, fill, fees e slippage |
| Débito/crédito financeiro | accounting | journal/outbox e ledger imutável |
| Posições e valuation | portfolios/performance | snapshots derivados e P&L |
| Reconciliação e exceções | reconciliation/audit | divergências, UNKNOWN e evidências |

Nenhum módulo escreve no repositório privado de outro módulo. Projeções podem ser reconstruídas a partir do journal/outbox autoritativo.

### 2.1. Reconciliação submit, risco, reserva e permits — ANX-127

**Fontes:** a spec canônica local `brain/project-docs/specs/003-investment-lifecycle/spec.md`, seção Decision, risco, aprovação e ordem, coloca risco/aprovação/reserva antes de READY/SUBMITTED. [Decisions R04](../structure-debate/decisions/R04-contracts-events.md) e [R09 G3-DC-S2-06/07](../structure-debate/decisions/R09-dev-plan.md) exigem pré-condições antes de intent.submitted. [Risk R04](../structure-debate/risk/R04-contracts-events.md) consome esse evento, formando ciclo se for o único início da análise; [R08 D-RK-001/003/004/005](../structure-debate/risk/R08-decision-log.md) distingue RiskPermit, mandato e reserva. [Execution R04](../structure-debate/execution/R04-contracts-events.md) recebe separadamente permits de risk/governance e reserva.

**Disposição de sequência:** proposta/intent imutável e checagem de autoridade precedem a solicitação de análise de risco. Essa solicitação usa contrato público de risk antes de SUBMITTED; não depende exclusivamente de intent.submitted e não envia ordem. O nome/versão de comando ou evento de solicitação será fechado no slice ANX-149/150/132, sem inventar schema publicado nesta documentação. Risco aprovado, aprovação institucional exigida e reserva válida permitem preparação final; submit valida as pré-condições e registra a intenção SUBMITTED. O evento final pode acionar execution e observadores, não a primeira análise indispensável para produzi-lo.

O fluxo preserva a sequência canônica: authority → risk → approval aplicável → reservation → ready/submit. Uma análise preliminar ou disposition anterior não satisfaz automaticamente a aprovação final dos hashes/bounds vigentes. Modificação de intent ou evidência invalidada retorna à etapa pertinente; não remove pré-condição para contornar o ciclo.

| Responsabilidade | Dono e limite |
| --- | --- |
| Decision/TradeIntent/disposition e transição SUBMITTED | decisions; autorização consultada por contrato, sem emitir ordem |
| Mandato, grants, aprovação institucional e authorityEpoch | governance; não substitui cálculo determinístico de risco |
| RiskCheck/RiskPermit, policy executável, riskEpoch e kill switch | risk; não reserva capital e não assina aprovação em nome de governance |
| Reserva e disponibilidade concorrente | capital; obrigações existentes continuam consideradas |
| ExecutionPermit institucional | governance, após pré-condições válidas; vincula intent/risco/reserva/modo/limites/epochs, distinto de RiskPermit |
| Consumo single-use e ordem/dispatch | execution; revalida ambos os permits, reserva, modo e autoridade antes de efeito; transporte não ganha autoridade própria |

“Limites, exposição e aprovação” na tabela anterior significa aprovação do **check de risco**, não transferência da aprovação institucional a risk. RiskPermit não é ExecutionPermit, e approval humana não é nenhum dos dois. O pacote de contracts pode declarar seus tipos sem ser dono dos estados. Single-use permite recuperar resultado idempotente da mesma operação, mas nunca autoriza segundo efeito.

**Concorrência e armazenamento:** reserve/final check precisam preservar os limites relevantes conforme DL-FI2 da spec canônica. Nenhum check feito apenas no início, evento recebido ou cache de epoch demonstra a atomicidade exigida. ANX-148/149/150/151/136 devem especificar locks/CAS, limites transacionais, fencing, expiração e consumo no pacote integrado, por ports públicos e donos respectivos; não simular uma transação distribuída entre módulos/processos com chamadas sequenciais. Falha antes de envio mantém estado recuperável; falha após envio possível resulta em UNKNOWN e reconciliação, preservando obrigações, sem liberação ou retry cego.

**Migração planejada:** inventariar handlers, emissores e consumidores de submitted, risk/permit e reserva. Introduzir e testar o início pré-submit da análise antes de retirar sua dependência exclusiva de submitted. Leitores versionados validam estado e evidências; rejeitam submitted antigo sem prova suficiente. Não retrocriar risk/approval/reservation nem reescrever journal para legitimar intents legados. Intents ainda não despachados podem ser reavaliados por fluxo auditável; ordens já enviadas ou UNKNOWN ficam em reconciliação, sem repetir efeito. Corrigir enums/schemas/eventos exige compatibilidade explícita ANX-132, não renomeação silenciosa de RiskPermit.

Cutover só habilita o novo produtor após consumidores e gates de pré-condição prontos. Rollback bloqueia novas submissões afetadas, preservando fills/reconciliação e reservas de obrigações confirmadas; não restaura o caminho permissivo que aceita AUTHORITY_CHECKED como prova suficiente. Não há código, migration ou alteração de estado operacional nesta entrega.

**Oráculos delegados:** risk pode analisar antes de SUBMITTED; submit sem risco/reserva/aprovação exigida é negado; RiskPermit isolado não despacha; hash/tenant/conta/modo divergente é negado; revogação/expiração entre etapas bloqueia novo efeito; duas reservas concorrentes não excedem capital; dois dispatches não consomem o permit duas vezes; timeout possível após envio gera UNKNOWN sem nova ordem. ANX-163 integra o fluxo PAPER após evidências dos filhos. Esta disposição aguarda revisão independente e não comprova protocolo transacional ou prontidão financeira.

## 3. Contratos mínimos

### Instrument

`instrumentId`, `assetClass` (`STOCK` ou `CRYPTO`), símbolo, venue, moeda de cotação, moeda de liquidação, precisão de preço, lote mínimo, calendário, janela de negociação e regras de taxas.

### MarketObservation

`observationId`, `instrumentId`, `observedAt`, `source`, `sequence`, bid/ask/last ou candle, qualidade, ajuste aplicado, timezone e `datasetVersion`. Observação atrasada, incompleta ou inconsistente não pode ser usada silenciosamente: vira evento de qualidade e pode bloquear a simulação.

### StrategyVersion e Signal

A versão é imutável e contém código/configuração identificável, universo, timeframe, dataset, modelo, parâmetros e hash. O sinal referencia a versão e não autoriza execução.

### Decision e TradeIntent

`TradeIntent` contém `intentId`, conta/carteira, instrumento, lado, quantidade alvo, tipo de ordem simulado, limite de preço, validade, motivo, estratégia, correlação, idempotency key, `mode`, `tenantId` e `traceId`. A intenção expressa desejo; não é ordem nem permissão.

### RiskCheck

Resultado versionado com limites aplicados, exposição pré/pós, concentração, liquidez, perda máxima, notional, volatilidade, cash buffer, motivo de aprovação/recusa e `riskEpoch`. Resultado expirado ou ausente é recusa fail-closed.

### CapitalReservation

Reserva atômica por conta e moeda, com `reservationId`, valor estimado, fees, slippage buffer, TTL, `capitalEpoch`, estado e vínculo ao intent. Reserva precede a submissão; cancelamento, expiração e fill parcial liberam somente o excedente calculado.

### ExecutionPermit

Permit assinado pelo domínio de governança, com `permitId`, hash do intent, hash do risk check, modo, asset class, limites, expiração, grant/epoch, fencing token, correlation id e `singleUse`. Não há permit para REAL nesta fase.

### SimulatedOrder e Fill

A ordem referencia permit e reserva. Estados: `CREATED → ACCEPTED → PARTIALLY_FILLED → FILLED`, ou `REJECTED/CANCELED/EXPIRED/UNKNOWN`. Fill possui identificador da simulação, quantidade, preço, timestamp, fee, slippage, fonte e número de sequência. Fills duplicados são ignorados por chave idempotente; fills parciais são contabilizados incrementalmente.

### LedgerEntry, PositionSnapshot e PerformanceSnapshot

Cada fill produz lançamentos balanceados e idempotentes; a chave do evento impede duplicidade. Posição é derivada do ledger e dos eventos de corporate action/funding aplicáveis. Valuation registra preço, fonte, timestamp, FX e qualidade. P&L separa realizado, não realizado, taxas, slippage e efeitos cambiais.

### ReconciliationCase

Divergência entre intenção, reserva, ordem, fills, ledger, posição ou valuation contém severidade, estado, causa, evidências, proprietário e resolução. `UNKNOWN` exige reconciliação antes de retry, cancelamento ou nova reserva.

## 4. Invariantes e concorrência

1. Não existe ordem sem `RiskCheck`, `CapitalReservation` válida e `ExecutionPermit` não expirado.
2. Permit, intent, risco, reserva e modo são vinculados por hashes, epochs e fencing.
3. Cada transição aceita somente o predecessor esperado; concorrência perde por compare-and-set.
4. Repetição de command/evento é segura por idempotency key e versão esperada.
5. Capital disponível nunca fica negativo; reserva concorrente deve falhar de forma determinística.
6. Ledger é balanceado, append-only e não duplica efeitos.
7. UNKNOWN não é sucesso nem falha; permanece pendente de reconciliação.
8. Stocks, cripto e moedas de liquidação não compartilham silenciosamente conta, precisão, calendário ou regras.
9. Paper não pode promover-se a REAL por configuração, retry, fallback de provider ou agente.
10. Kill switch e fencing revogam novas permissões; não apagam evidência nem inventam fills.

## 5. Diferenças por classe de ativo

### Stocks

O simulador aplica calendário e horário da bolsa, feriados, leilões quando suportados, lotes/quantidades mínimas, spread, slippage e latência. O modelo de liquidação deve declarar se o paper usa disponibilidade imediata ou uma simulação de settlement, sem confundir caixa disponível com caixa a liquidar. Desdobramentos, dividendos e outros corporate actions entram como eventos versionados e auditáveis.

### Cripto

O simulador opera em calendário 24/7, respeita precisão de preço/quantidade, mínimos da venue, taxas, spread, latência, liquidez e fills parciais. Funding, staking, airdrops, transferências e eventos de custódia são extensões explícitas; não entram como saldo implícito. Cada rede, token, stablecoin e venue possui identidade própria.

### Multi-asset

Uma carteira pode conter ambas as classes, mas cada posição mantém `assetClass`, instrumento, venue, moeda e regras de valuation. O motor agrega risco e P&L por carteira, sem colapsar os sub-ledgers. Conversão cambial precisa de observação, timestamp e política de FX identificáveis. Falta de FX bloqueia métricas dependentes, não produz zero silencioso.

## 6. Fidelidade e reprodutibilidade

A simulação declara seu perfil: histórico/replay, mercado corrente paper ou cenário sintético. Entradas, dataset, relógio, latência, spread, slippage, liquidez, rejeições, fees e regras de corporate action/funding são versionados. Um mesmo `simulationRunId` deve ser reexecutável com o mesmo resultado sob o mesmo conjunto de entradas; mudanças de modelo produzem nova versão e não sobrescrevem o resultado anterior.

## 7. Eventos de domínio

| Evento | Produzido por | Consumido por |
| --- | --- | --- |
| `MarketObservationRecorded` | market-data | strategies, simulation, performance |
| `SignalProduced` | strategies | decisions, audit |
| `TradeIntentCreated` | decisions | risk, governance, audit |
| `RiskCheckCompleted` | risk | capital, governance, audit |
| `CapitalReserved/Released` | capital | execution, accounting, audit |
| `ExecutionPermitGranted/Revoked` | governance | execution, audit |
| `SimulatedOrderAccepted/StateChanged` | simulation | accounting, portfolios, reconciliation |
| `SimulatedFillRecorded` | simulation | accounting, portfolios, performance |
| `LedgerPosted` | accounting | portfolios, performance, reconciliation |
| `PositionValuated` | portfolios | performance, audit |
| `ReconciliationOpened/Resolved` | reconciliation | governance, operations, audit |

Todo evento tem envelope versionado, `eventId`, `aggregateId`, `ownerDomain`, `occurredAt`, `causationId`, `correlationId`, tenant, schema version e checkpoint. Secrets, credenciais e prompts não entram no evento.

## 8. Superfície para agentes e consoles

As capacidades expostas são declarativas e limitadas ao manifesto:

- ler catálogo, observações, estratégias, decisões, risco, reservas, ordens simuladas, ledger e P&L conforme escopo;
- propor `TradeIntent` e solicitar simulação;
- explicar risco, permit, fill, ledger e reconciliação com evidência;
- pausar, cancelar ou solicitar intervenção humana somente se o grant permitir.

Agentes não recebem Cypher, credenciais, acesso direto a ledger ou capacidade de elevar modo, grant, orçamento, limites ou provider. O handler humano/agente deve retornar os mesmos erros tipados para permit ausente, epoch obsoleto, saldo insuficiente, schema inválido, idempotência conflitante e UNKNOWN.

## 9. Critérios de aceitação e gates

- G0: issue, ownership, contratos, dependências e crítico registrados.
- G1: testes determinísticos demonstram o fluxo feliz, recusas, concorrência, idempotência, partial fill, fees/slippage, UNKNOWN e kill switch.
- G2: revisão de contratos, ownership, transações, outbox, migração e reconstrução.
- G3: E2E de stocks, cripto e carteira combinada em SIMULATED e PAPER, incluindo falhas e reconciliação.
- G4: tenancy/RLS, grants, secrets, isolamento de modo, prompt injection e ausência de credencial REAL.
- G5: tentativa autorizada de bypass de permit, replay, corrida de reservas, dupla contabilização e promoção PAPER→REAL em sandbox.
- G6: candidato integrado revalidado; evidências devem referir a mesma revisão.
- G7: aceite explícito. Nenhum gate é considerado executado apenas porque a documentação foi escrita.

## 10. Decisões pendentes

- política de valuation e FX, incluindo fallback permitido e bloqueios;
- modelo de settlement para paper de stocks;
- catálogo mínimo de feeds e critérios de qualidade;
- escopo inicial de corporate actions, funding e eventos de custódia;
- limites de instrumentos, venues e moedas no primeiro release;
- formato de replay e retenção dos artefatos de simulação.

Execução REAL (live trading), capital real e autonomia L3/L4 não são decisões pendentes deste contrato; permanecem proibidos até novo escopo, evidência e autorização formal. Dados de mercado correntes para PAPER seguem a distinção da §1.1 e não habilitam trading real.

## 11. Referências

- [Modos de execução e classes de ativo](./execution-modes-and-asset-classes.md)
- [Contratos P01/P02](./p01-p02-contracts-and-gates.md)
- [Roadmap de execução](../execution-roadmap.md)
- [Matriz de prontidão dos gates](../gate-readiness-matrix.md)
