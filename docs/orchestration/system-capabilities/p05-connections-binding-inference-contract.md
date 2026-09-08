---
title: "P05 — Contrato de Connections, binding e inferência governada"
description: "Contrato de conexões externas, bindings versionados e inferência segura para operações SIMULATED/PAPER."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-62
tags:
  - connections
  - providers
  - binding
  - inference
  - simulation
  - paper
  - governance
---

# P05 — Contrato de Connections, binding e inferência governada

## 1. Objetivo

Connections é o limite controlado entre o anxionOS e qualquer provider, feed, modelo, ferramenta, conta, venue ou serviço externo. O módulo não decide estratégia, risco, autoridade ou ledger. Ele resolve um binding autorizado e observável, entrega dados normalizados e devolve resultados com proveniência.

O contrato cobre somente `SIMULATED` e `PAPER`. Não cria, armazena ou usa credenciais de produção para `REAL`/live.

## 2. Tipos de connection

| Tipo | Exemplo | Efeito permitido nesta fase |
| --- | --- | --- |
| `MARKET_DATA` | histórico, replay, quote corrente | leitura de observações versionadas |
| `SIMULATION` | engine de replay ou cenário sintético | gerar ordens e fills simulados |
| `PAPER_ACCOUNT` | conta virtual segregada | ler saldo/posição e registrar efeitos paper |
| `MODEL` | modelo de inferência | produzir classificação, extração ou proposta |
| `KNOWLEDGE` | índice, memória ou corpus | recuperar contexto autorizado |
| `TASKBOARD` | Dashi ou sistema de trabalho | sincronizar tarefas sem autoridade financeira |
| `REAL_EXECUTION` | broker/exchange live | proibido e sem binding nesta versão |

Uma connection declara `kind`, `providerId`, `environment`, `tenantId`, escopos, capacidades, versão de protocolo, região, limites, health policy e dono institucional.

## 3. Binding versionado

Um `ConnectionBinding` imutável identifica:

- `bindingId`, `connectionId`, provider e adapter version;
- tenant, agency, conta/carteira e finalidade;
- ambiente (`SIMULATED` ou `PAPER`);
- asset classes, instrumentos, venues e moedas permitidos;
- capabilities de leitura/escrita e `effectClass`;
- referência a secret por id, nunca o valor do secret;
- consentimento/grant, `authorityEpoch`, `policyEpoch` e expiração;
- limites de taxa, notional, quantidade e orçamento;
- hash do contrato, criador, revisão e motivo;
- estado: `DRAFT → VALIDATING → ACTIVE → SUSPENDED → REVOKED`.

Alterar provider, conta, ambiente, escopo ou capabilities cria nova versão. Atualização não muta nem revive uma versão revogada. Todo request leva `bindingId`, `bindingVersion`, tenant, trace, correlation e idempotency key.

## 4. Resolução e fail-closed

A resolução segue esta sequência:

1. validar schema e contexto institucional;
2. localizar binding exato, ativo e não expirado;
3. validar grant, consentimento, epochs, modo e fencing;
4. resolver secret somente na infraestrutura autorizada;
5. validar capability específica e limites;
6. chamar o adapter com timeout, cancelamento e trace;
7. validar resposta, proveniência, qualidade e versão;
8. emitir resultado e evento de auditoria antes/depois conforme effect class.

Falha de lookup, grant, secret, policy, health, qualidade, timeout ou versão não gera fallback silencioso. O resultado é erro tipado ou estado `UNKNOWN`, conforme a chamada possa ter produzido efeito. Não trocar provider, conta, modelo, ambiente ou adapter sem decisão explícita e nova autorização.

## 5. Interface do adapter

O adapter deve expor contrato independente do provider:

- `describeCapabilities(binding)`;
- `health(binding)`;
- `readMarketData(request)`;
- `readPaperAccount(request)`;
- `simulateOrder(request)`;
- `reconcile(request)`;
- `infer(request)`;
- `revoke(binding)`.

Cada operação declara `readOnly`, `effectClass`, modo permitido, schemas de entrada/saída, timeout, custo, rate limit, idempotência e política de UNKNOWN. O adapter não recebe contexto bruto do agente, Cypher, credenciais ou prompt não sanitizado.

## 6. Market data e contas

Market data deve retornar observação com `source`, `datasetVersion`, timestamp do provider, timestamp de ingestão, sequência, timezone, qualidade e ajustes. Lacunas, out-of-order, duplicatas e divergência de relógio são sinalizadas; não são preenchidas com zero ou último valor sem política documentada.

Stocks preservam exchange, calendário, feriados, sessão, corporate actions e moeda de cotação. Cripto preserva venue, rede, token, 24/7, precisão, funding e taxas. Uma connection multi-asset não pode apagar essas dimensões.

A leitura de `PAPER_ACCOUNT` é separada por tenant, conta, ambiente e asset class. O saldo retornado não é autoridade de ledger; divergências abrem reconciliação.

## 7. Inferência governada

A capability `infer` recebe somente dados mínimos e autorizados, com classificação de sensibilidade, finalidade, retenção, modelo/provider escolhido e hash do prompt/template. O retorno contém:

- resultado estruturado validado por schema;
- modelo, versão, provider e parâmetros relevantes;
- evidência/contexto referenciado;
- custo, latência, confidence e limites;
- `inferenceId`, timestamp e política aplicada.

A inferência pode recomendar ou extrair, mas não pode elevar grant, mudar modo, enviar ordem, alterar ledger, ampliar orçamento ou escolher secret. Prompt injection, instruções conflitantes, conteúdo não confiável e saída fora do schema resultam em rejeição, isolamento e auditoria. Fallback de modelo é explícito, versionado e sujeito à mesma policy; fallback silencioso é proibido.

## 8. Segurança, tenancy e secrets

- RLS e autorização são aplicadas antes da resolução do binding.
- Secret manager é o único dono do valor secreto; eventos e logs recebem apenas id/hash/redaction.
- Logs registram binding, capability, provider, resultado, latência, custo e erro, nunca tokens ou payload sensível bruto.
- Bindings de tenants, contas, ambientes e regiões não podem ser cruzados.
- Revogação invalida cache, lease e novas chamadas; respostas atrasadas são descartadas por epoch.
- Break-glass exige motivo, aprovador, TTL, escopo mínimo e auditoria; não habilita REAL.
- Health checks não são autorização e uma connection saudável não bypassa governance ou risk.

## 9. Reconciliação e idempotência

Toda chamada mutável usa idempotency key por tenant, binding, operação e intenção. O adapter registra request hash e resultado. Repetição com mesmo hash retorna o mesmo resultado; mesma chave com payload diferente é conflito.

Se a resposta de uma operação com possível efeito for perdida, o estado é `UNKNOWN`. O sistema consulta `reconcile` usando identificadores seguros antes de retry, cancelamento ou nova reserva. Nunca assumir sucesso pelo timeout nem reenviar cegamente.

Divergências de capabilities, saldo paper, market data, ordem simulada, fill ou custos produzem `ConnectionReconciliationCase` com evidência, severidade, owner e resolução.

## 10. Eventos e ownership

| Evento | Produzido por | Uso |
| --- | --- | --- |
| `ConnectionBindingCreated` | connections | auditoria, graph projection, governance |
| `ConnectionBindingActivated` | connections/governance | consumers autorizados |
| `ConnectionBindingSuspended/Revoked` | governance/connections | invalidar cache e chamadas |
| `ProviderHealthChanged` | connections | circuit breaker e operações |
| `MarketDataObserved` | market-data/connections | strategies, simulation, valuation |
| `PaperAccountRead` | connections | capital, portfolios, reconciliation |
| `InferenceCompleted` | connections/inference | knowledge, decisions, audit |
| `ConnectionCallUnknown` | connections | reconciliation e operações |
| `ConnectionReconciled` | reconciliation | audit e governance |

O envelope inclui `eventId`, `ownerDomain`, aggregate, schema version, checkpoint, causation/correlation, tenant, timestamps e redaction metadata. Outbox e journal do domínio são atômicos.

## 11. Paridade de agente e usuário

O console e agentes usam os mesmos application handlers e bindings. Um agente pode consultar capacidades e solicitar uma operação permitida; não pode receber uma versão privilegiada da API. O operador vê provider, binding, policy, custos, health, decisões, erros e reconciliação com evidência suficiente para takeover.

Capacidades mínimas do manifesto incluem `connections.describe`, `connections.health`, `market_data.read`, `paper_account.read`, `simulation.request`, `inference.request` e `connections.reconcile`. Cada uma declara schema, owner, grant, ambiente, efeito, idempotência, approval e audit.

## 12. Critérios e gates

- G0: ownership, bindings, schemas, ameaças e dependências registrados.
- G1: testes demonstram isolamento de tenant/ambiente, revogação, epochs, cache invalidation, erro de capability, idempotência, timeout e UNKNOWN.
- G2: revisão independente de adapter boundary, secrets, schemas, outbox, retries e ownership.
- G3: E2E cobre market data histórico/corrente, paper account, simulation, inferência e reconciliação.
- G4: Security verifica RLS, redaction, prompt injection, SSRF, secret exposure, provider confusion e ausência de REAL.
- G5: Red Team tenta trocar binding, replayar request, promover PAPER, confundir provider, vazar secret e bypassar consentimento em sandbox.
- G6: revalidar o candidato integrado e os artefatos referenciados.
- G7: aceite explícito; documentação não equivale a execução do gate.

## 13. Questões abertas

- catálogo inicial de providers e adapters suportados;
- política de residência, retenção e egress de dados para inferência;
- critérios mínimos de qualidade por feed;
- modelo de circuit breaker e janela de reconciliação;
- granularidade de consentimento para market data, account e inference;
- primeira matriz de instrumentos, venues e moedas de SIMULATED/PAPER.

REAL/live, credenciais reais e execução financeira externa permanecem fora do escopo e não são decisão pendente.

## 14. Referências

- [Modos de execução e classes de ativo](./execution-modes-and-asset-classes.md)
- [Contrato do ciclo financeiro P06](./p06-financial-lifecycle-contract.md)
- [Contratos e gates P01/P02](./p01-p02-contracts-and-gates.md)
- [Roadmap de execução](../execution-roadmap.md)
