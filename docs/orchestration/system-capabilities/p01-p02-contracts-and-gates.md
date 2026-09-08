---
title: P01/P02 — Contratos institucionais e gates de execução
description: Especificação formal dos contratos, estados e gates necessários para uma plataforma multi-tenant governada por agentes e usuários.
type: design
status: draft
owner: Produto e engenharia
issue: ANX-45
tags:
  - contracts
  - eventing
  - governance
  - agents
  - execution
---
# P01/P02 — Contratos institucionais e gates de execução

**Issue:** ANX-45  
**Status:** draft para revisão do usuário  
**Escopo:** contratos e controles de fundação; nenhuma implementação, credencial real, capital real ou autonomia L3/L4.

Esta especificação transforma a meta-revisão em critérios verificáveis. Ela complementa o [mapa de capacidades](./CAPABILITY-MAP.md), o [desenho de modos de execução](./execution-modes-and-asset-classes.md), o [checklist estrutural](./MODULE-STRUCTURE-CHECKLIST.md) e a fila em [module-queue.md](../module-queue.md). As fontes locais de arquitetura e ciclo de investimento permanecem os caminhos `brain/notes/anxionos-backend-structure.md`, `brain/project-docs/specs/001-institutional-contract/spec.md` e `brain/project-docs/specs/003-investment-lifecycle/spec.md`.

## Resultado esperado

P01/P02 devem deixar explícitos:

- quem pode solicitar, aprovar, executar, reconciliar e interromper uma ação;
- qual contrato é aceito na borda e qual evento prova a mudança de estado;
- como idempotência, leases, checkpoints, retries e `UNKNOWN` preservam segurança;
- como o mesmo caso de uso atende UI humana e ferramenta de agente;
- como `SIMULATED`, `PAPER` e `REAL` são isolados por tenant, conta, classe de ativo e venue.

## Limites normativos

1. PostgreSQL é autoridade transacional; Neo4j é projeção/contexto/autorização derivada, nunca ledger financeiro.
2. Todo estado autoritativo tem journal e outbox atômicos no domínio proprietário.
3. Agentes não recebem Cypher, credenciais, grants implícitos ou autoridade pelo payload.
4. Falha de provider, timeout ou resposta ambígua não autoriza retry cego.
5. Nenhum caminho de `SIMULATED` ou `PAPER` pode obter credencial de produção por fallback.
6. L3/L4 e `REAL` permanecem desabilitados até os gates de produto, segurança, operação e aceite previstos no pipeline G0–G7.

## Contrato de envelope

Comandos e eventos versionados devem carregar, no mínimo:

| Campo | Regra |
| --- | --- |
| `messageId` | Identificador único da mensagem |
| `messageType` | Tipo estável e namespaced |
| `schemaVersion` | Versão explícita e compatível |
| `occurredAt` | Timestamp do produtor |
| `correlationId` / `causationId` | Rastreamento da operação e causa |
| `actorPrincipalId` | Identidade derivada da sessão ou worker |
| `tenantId` / `agencyId` | Escopo institucional obrigatório quando aplicável |
| `channel` | `ui`, `sdk`, `worker`, `system` |
| `aggregateId` / `aggregateRevision` | Concorrência otimista e ordenação |
| `idempotencyKey` | Deduplicação conforme a política do contrato |
| `payload` | Conteúdo validado pelo schema do tipo |

Campos sensíveis não entram em eventos, prompts ou grafo. A validação ocorre na borda e novamente antes de persistir ou despachar.

### Compatibilidade de envelopes e idempotência — reconciliação ANX-127

**Evidência estática (2026-09-08):** `backend/packages/contracts/src/envelope-v02.ts` define envelope 0.2.0, chave UUID obrigatória para command e opcional para event. `adapter-gateway/commands.ts` aceita chave string de 1 a 128 caracteres; commandId continua UUID. O helper `upgradeDomainEventEnvelopeToV02` preserva eventId como messageId e exige contexto adicional. Não se infere compatibilidade universal pela existência desse helper.

**Disposição de contrato:** versão do envelope, versão do payload e identidade idempotente são conceitos distintos. A coexistência 0.1.0/0.2.0 não autoriza alterar a versão de uma mensagem persistida nem aceitar qualquer payload. Cada rota/subscription declara versões e messageTypes suportados; o schema específico e o escopo institucional são validados além do envelope genérico. A atualização de eventos requer contexto com proveniência, nunca ator/tenant inventado para satisfazer um schema.

**UUID versus chave do adapter:** não estreitar silenciosamente o contrato do adapter nem alargar o envelope publicado. As chaves pertencem a contratos distintos: a integração deve preservar a chave opaca original e associá-la a uma identidade institucional UUID estável. Reentregas da mesma operação reutilizam essa associação; gerar um UUID novo por retry é proibido. Não usar truncamento, normalização de caixa, substituição ou hash não especificado como conversão implícita. Sem associação verificável e contrato de integração compatível, rejeitar antes de efeito externo.

A associação deve ser persistida atomicamente pelo dono do comando/dispatch, com escopo explícito de tenant, operação, modo e binding/conta/adapter aplicáveis; não criar um registro global que una operações de contas diferentes. O mesmo identificador com payload semanticamente diferente produz conflito, não replay de sucesso. A política de comparação e a chave única devem ser especificadas/testadas no slice executável. Pacotes de contracts/eventing oferecem schemas/mecanismo, não passam a possuir esse estado. O placement físico do gateway continua pendente na ANX-127; a implementação da associação nesse caminho depende dessa decisão.

**Migração e compatibilidade planejadas:** ANX-130/132/161 inventariam produtores, leitores e registros de deduplicação. Habilitar primeiro leitores com suporte explícito e validação por versão, depois novos produtores. Preservar ids, causalidade, chaves originais e journal; upgrade de leitura não republica automaticamente um efeito como novo comando. Registros legados só recebem associação quando a identidade puder ser demonstrada; ambiguidade exige reconciliação. Não limpar inbox/journal ou expirar associações enquanto houver retry/replay/UNKNOWN suportado. A janela de retenção deve cobrir a política documentada desses caminhos, sem prazo arbitrário nesta entrega.

Rollback interrompe o produtor incompatível e preserva associações/eventos já aceitos; não volta a gerar ids distintos nem restaura um consumidor que interprete o mesmo efeito como novo. Eventos sem contexto suficiente permanecem explicitamente incompatíveis com a conversão, sem perda do original.

**Oráculos delegados:** chave opaca não UUID preservada; retry após crash recupera a mesma associação; corrida cria uma única identidade; payload conflitante é negado; contas/tenants/modos distintos não colidem; versões não suportadas falham antes do efeito; upgrade conserva identidade e não duplica consumo; rollback e UNKNOWN mantêm reconciliação. Formato exato da associação/schema e migrations pertencem ao pacote executável ANX-130/132/161. Esta disposição aguarda revisão independente; não implementa bridge, não altera schemas e não comprova atomicidade ou integração real.

## CapabilityManifest

Cada capacidade exposta à UI, SDK ou agente deve publicar:

| Campo | Finalidade |
| --- | --- |
| `capabilityId` / `version` | Identidade e evolução do contrato |
| `ownerModule` | Ownership de estado e regra |
| `inputSchema` / `outputSchema` | Validação e documentação |
| `requiredGrants` | Autoridade mínima |
| `allowedChannels` | Contextos de invocação |
| `allowedExecutionModes` | Ambientes permitidos |
| `effectClass` | `READ_ONLY`, `REVERSIBLE`, `EXTERNAL_EFFECT`, `IRREVERSIBLE` |
| `idempotencyPolicy` | Chave, janela e comportamento de duplicata |
| `approvalPolicy` | Aprovação humana ou institucional |
| `budgetPolicy` / `timeoutPolicy` | Quotas, prazo e comportamento de expiração |
| `auditPolicy` | Evidências antes, durante e depois |

O manifesto é catálogo de contrato; não concede autoridade. Grants, epochs, risco e estado atual são revalidados no handler.

## TradeIntent e ExecutionPermit

`TradeIntent` imutável deve identificar tenant, agência, ator, classe de ativo, instrumento, venue, conta, modo, lado, quantidade, tipo de ordem, limites, slippage, estratégia/versão, epochs, hash, idempotency key e expiração.

`ExecutionPermit` deve ser emitido somente após governance e risk. É específico para ambiente, conta, ativo e venue; referencia o hash do intent; limita quantidade/preço/slippage/prazo; fixa `authorityEpoch` e `riskEpoch`; é single-use e revogável. Mudança de modo exige novo intent e novo permit.

## Máquina de estados operacional

```text
PROPOSED
  -> AUTHORIZED
  -> RISK_CHECKED
  -> WAITING_APPROVAL
  -> PERMITTED
  -> DISPATCHED
  -> CONFIRMED | FAILED | UNKNOWN
  -> RECONCILING
  -> CLOSED
```

Transições inválidas são rejeitadas. `UNKNOWN` exige consulta de status, reconciliação por identificador idempotente e decisão explícita antes de qualquer nova tentativa. `WAITING_HUMAN_INPUT` é estado persistido do workflow, nunca apenas estado visual.

## Fluxo humano e agente

UI, SDK e adaptador de ferramenta chamam o mesmo application handler. O canal é registrado na auditoria, mas não altera invariantes. O agente recebe ferramentas tipadas e resultados mínimos necessários; nunca repositórios privados, Cypher livre ou segredos.

## Critérios de aceite documental

- [ ] Cada contrato possui owner, schema, versão, idempotência e política de erro.
- [ ] Cada comando mutável possui grant, epoch, approval, budget e audit policy.
- [ ] Estados e transições incluem rejeição, revogação, expiração, `UNKNOWN` e reconciliação.
- [ ] Stocks e cripto compartilham o núcleo, mas isolam conta, ledger, reserva, adapter, política e kill switch.
- [ ] Nenhuma decisão de desenho depende de fallback silencioso de modelo, provider, conta ou ambiente.
- [ ] O backlog vincula cada lacuna a uma issue existente ou a uma nova issue sem duplicação.
- [ ] G2–G7 continuam pendentes; documentação não é evidência de implementação.

## Decisões pendentes antes de P03/P04

1. Taxonomia final de `effectClass` e quais classes exigem aprovação humana.
2. Política de compatibilidade e depreciação de schemas de eventos.
3. Semântica exata de lease, fencing token, checkpoint e DLQ.
4. Fonte e qualidade mínima de market data para cada simulador.
5. Modelo de valuation, FX, corporate actions, funding e settlement por classe.
6. Requisitos objetivos de SLO, RPO, RTO, retenção e exportação.
7. Evidência necessária para habilitar qualquer ambiente `REAL`; a decisão não está tomada.

## Fora do escopo

Capital real, execução live, L3/L4, autoexpansão de grants/orçamento/políticas, Kubernetes/active-active sem evidência, e qualquer conexão com credencial de produção.
