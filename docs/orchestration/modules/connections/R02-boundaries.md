---
type: debate
---

# R02 — Fronteiras: `modules/connections`

**Módulo:** connections (P05 Connections)  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P05  
**Data:** 2026-09-08  
**Issue debate:** ANX-83 · contrato P05: ANX-62 · gate implementação: ANX-36

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R2)

**In:** Binding, AIAccount, quotas, leases, adapters, usage/health. **Out:** não é dono de Run, AgentVersion, Grant, invoice, ledger, RAG.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto. Sem REAL_EXECUTION nesta fase documental.

## Ownership

| Superfície | Dono |
| --- | --- |
| Binding / adapter / quota | **connections** |
| adapter-gateway | **KEEP** |
| Secrets | **packages/secrets** |

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre connections e os módulos vizinhos (agents, governance, billing, accounting, orchestration, graph); tornar **REAL_EXECUTION** invariante testável; proibir secrets em DTOs/eventos/grafo; ratificar ownership ADR0002; registrar alternativas, riscos e perguntas para R03.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário documental e de código |
| [spec 005](../../../../brain/project-docs/specs/005-connections-integration/spec.md) | Fairness, adapters, scopes, API `/v1/connections` |
| [p05-connections-binding-inference-contract.md](../../system-capabilities/p05-connections-binding-inference-contract.md) | Tipos de connection, binding, fail-closed (ANX-62) |
| `brain/notes/anxionos-backend-structure.md` | Árvore subdividida, tabela fronteiras L193–210 |
| `brain/notes/anxionos-storage-ownership.md` | PG/Neo4j/SQLite por agregado |
| [agents/R02-boundaries.md](../../structure-debate/agents/R02-boundaries.md) | Espelho P04 — inferência/provider → connections |
| [graph/R02-boundaries.md](../../structure-debate/graph/R02-boundaries.md) | T16/T17 — usage autoritativo em connections |
| [billing/R01-context.md](../../structure-debate/billing/R01-context.md) | Invoice plataforma vs usage IA |
| ADR0002 | Layout modular, regras 1–12 |

## Debate R2 (diálogo atribuído)

**Arquiteto:** connections é dono do **limite externo governado** — ProviderSubscription, AIAccount, ConnectionBinding versionado, quotas/leases/cooldowns, usage records, runtime adapters e routing/pools de inferência. Resolve binding autorizado, entrega dados normalizados e devolve resultados com proveniência.

**Crítico:** O que **não** entra aqui? E o que acontece com `REAL_EXECUTION`?

**Arquiteto:** Agent/AgentVersion/skills → **agents**. Goal/Task/Run/lease → **orchestration**. Grant/epoch/consent → **governance**. Invoice assinatura plataforma → **billing**. Ledger capital/trading → **accounting**. Projeção Neo4j provider→conta→modelo → **graph**. `REAL_EXECUTION` é **proibido** nesta versão — sem binding, sem adapter, sem rota.

**Security:** Secrets nunca em DTO, evento, prompt, transcript ou nó Neo4j. Binding referencia `secretId` apenas; resolução ocorre em `packages/secrets` + infra do adapter na invocação.

**Executor:** Escopo debate e contrato ANX-62: **SIMULATED** e **PAPER** apenas. PAPER_ACCOUNT e MODEL são permitidos; broker/exchange live não.

**Crítico (billing):** Usage record é connections; invoice é billing. Conexão emite evento idempotente; billing agrega período — não duplica usage autoritativo.

**Síntese Orquestrador:** Fronteira aceita; invariantes REAL_EXECUTION e secrets fechados para R03/R04.

---

## Decisão: escopo de ambiente (SIMULATED / PAPER)

| Opção | Veredito | Racional |
| --- | --- | --- |
| **A — SIMULATED + PAPER apenas (v1 debate)** | ✅ **Adotado** | ANX-62, R01 e spec 005 alinham debate sem credenciais REAL/live; reduz superfície de ataque e dependência execution P06 |
| B — Incluir REAL_EXECUTION com feature flag | ❌ Rejeitado para v1 | Viola mandato explícito do contrato P05 e crítico R01; reabrir só com ADR + gate G7 dedicado |
| C — REAL via proxy em execution | ❌ Rejeitado | ADR0002: integrações financeiras/venue pertencem execution/market-data; connections gerencia inteligência e bindings de modelo/API, não ordens live |

**Consequências:**

1. Nenhum `ConnectionKind.REAL_EXECUTION` pode ser criado, validado ou ativado via API/comando nesta versão.
2. Adapters de broker/exchange live **não** são registrados em `connections/infrastructure/adapters/`.
3. Testes de contrato devem falhar se schema ou factory aceitar `REAL_EXECUTION`.
4. Migração futura exige novo binding kind, ADR, security review e epic separado — não inferida de PAPER.

---

## Invariante REAL_EXECUTION (proibido)

| ID | Invariante | Verificação (R04/R09) |
| --- | --- | --- |
| **CX-R02-INV-01** | `ConnectionKind` enum/contrato **não** inclui valor persistível `REAL_EXECUTION` em rotas de criação/ativação v1 | Schema Zod + teste contrato rejeita literal |
| **CX-R02-INV-02** | Resolver de binding retorna erro tipado `CONNECTION_KIND_NOT_SUPPORTED` se kind legado/importado for `REAL_EXECUTION` | Teste application fail-closed |
| **CX-R02-INV-03** | Nenhum worker connections despacha para adapter com `effectClass=LIVE_TRADING` ou equivalente | Teste worker + allowlist de effectClass |
| **CX-R02-INV-04** | Import/migração 9Router mapeia entradas live para `deferred` ou `rejected` — nunca ACTIVE silencioso | Teste CX10 recovery (spec 005) |
| **CX-R02-INV-05** | Documentação pública e OpenAPI não listam `REAL_EXECUTION` como opção habilitável | Lint docs + snapshot OpenAPI |

Tipos **permitidos** nesta fase (contrato ANX-62): `MARKET_DATA`, `SIMULATION`, `PAPER_ACCOUNT`, `MODEL`, `KNOWLEDGE`, `TASKBOARD`.

---

## Invariante secrets (proibido em superfícies públicas)

| ID | Invariante | Dono da resolução |
| --- | --- | --- |
| **CX-R02-SEC-01** | DTOs públicos (`@anxionos/contracts/connections`) carregam `secretRef` / `secretId`, nunca valor de credencial | connections API + contracts |
| **CX-R02-SEC-02** | Eventos `connections.*.v1` não incluem API key, OAuth token, refresh token, PEM ou payload de handshake | connections outbox |
| **CX-R02-SEC-03** | Projeção Neo4j não armazena secret em propriedade de nó — apenas ids opacos e metadados de rotação (`generation`, `expiresAt`) | graph projector `graph:connections:v1` |
| **CX-R02-SEC-04** | `InferenceRequest` trace/transcript redige credencial; adapter injeta secret **dentro** do boundary infra, após grant+epoch | adapter + packages/secrets |
| **CX-R02-SEC-05** | Redirect OAuth não propaga credential para host não aprovado (EndpointPolicy) | connections + spec 005 SSRF |

---

## O módulo POSSUI (estado autoritativo)

| Agregado / artefato | Responsabilidade | Storage |
| --- | --- | --- |
| `Provider` / `ProviderSubscription` | Catálogo de famílias e assinatura do **usuário** ao provider (não invoice plataforma) | PG |
| `AIAccount` | Conta IA/API do titular; scopes visibility/consumption/funding separados | PG |
| `ModelOffering` / `CatalogRelease` | Ofertas, readiness, free flag, grupos G1–G4 | PG (+ cache SQLite descartável) |
| `ConnectionBinding` | Binding versionado DRAFT→REVOKED; referência secret por id | PG |
| `InferenceProfile` / routing pools | Fairness PLATFORM vs AGENCY; sequência global; OwnerProviderPool | PG |
| `Quota` / `Lease` / `Cooldown` / `Budget` | Reservas, fencing, cooldown generation | PG |
| `UsageRecord` | Consumo estimado/real por request; unidade/moeda; atribuição consumer | PG |
| `RuntimeAdapter` registry | describe/health/invoke/normalize — contrato por capability | código + PG metadata |
| `HealthProbe` / circuit state | Estado por connection/account/runtime | PG |
| Journal + outbox | `connections.*.v1` com `ownerDomain: connections` | PG via eventing |
| Workers | catalog watcher, lease reaper, credential refresh, usage reconciler, etc. | `connections/workers/` |

---

## Matriz fronteira: connections × módulos alvo

### vs **agents** (P04)

| Tema | connections | agents |
| --- | --- | --- |
| Agent, AgentVersion, Skill | ❌ | ✅ dono |
| AgentModelBinding (purpose/operation → ModelVersion) | ✅ resolve elegibilidade + invoke | ✅ declara binding no AgentVersion |
| Brain facade / invocação governada | ✅ executa inferência via binding | ✅ orquestra chamada sem estado Run |
| Prompts, instruções, skills refs | ❌ | ✅ |
| Provider API keys no AgentVersion | ❌ proibido | ❌ proibido |

### vs **governance** (P02)

| Tema | connections | governance |
| --- | --- | --- |
| Grant, consent, authorityEpoch, mandate | ❌ valida refs | ✅ dono |
| Binding activation sem grant válido | ❌ fail-closed | — |
| ChangeProposal para mudança de binding | ❌ emite fato / solicita | ✅ aprova quando INSTITUTIONAL |
| T01 ALLOW efetivo | ❌ | ✅ + graph kernel |
| Revogação incrementa epoch | ❌ reage invalidando bindings | ✅ dono do epoch |

### vs **billing** (P07)

| Tema | connections | billing |
| --- | --- | --- |
| UsageRecord autoritativo (IA/provider) | ✅ dono | ❌ lê/agrega |
| Subscription/Invoice **plataforma** | ❌ | ✅ dono |
| ProviderSubscription (acesso usuário ao provider) | ✅ dono | ❌ |
| Webhook pagamento Stripe/etc. | ❌ | ✅ |
| Evento `connections.usage.recorded.v1` | ✅ emite | ✅ consome para faturamento |

### vs **accounting** (P06)

| Tema | connections | accounting |
| --- | --- | --- |
| Ledger capital, saldos trading, taxas venue | ❌ | ✅ dono |
| Consumo IA / custo inferência | ✅ UsageRecord | ❌ não mistura com ledger trading |
| PAPER_ACCOUNT efeitos paper | ✅ via adapter SIMULATED/PAPER | ❌ ledger real |
| Reconciliação fills/ordens | ❌ | ✅ (+ execution) |

### vs **orchestration** (P04)

| Tema | connections | orchestration |
| --- | --- | --- |
| Goal, Task, Run, lease, heartbeat | ❌ | ✅ dono |
| Inference invoke durante Run | ✅ via ConnectionResolver | ✅ solicita com taskId/trace |
| WAITING_HUMAN_INPUT (AP04) | ✅ adapter human-in-the-loop quando binding TASKBOARD/MODEL | ✅ estado de Run |
| Checkout ANX-* taskboard | ❌ adapter TASKBOARD sync apenas | ✅ mirror workflow |
| Delegação hierárquica TREE/CIRCULAR | ❌ | ✅ (+ governance) |

### vs **graph** (P03)

| Tema | connections | graph |
| --- | --- | --- |
| Nós provider→conta→oferta→modelo→agente/task | ❌ emite eventos | ✅ projeção Neo4j |
| Usage/custo linhagem (T16/T17 sub-planos) | ✅ fonte autoritativa usage | ✅ traverse composto |
| Credencial Neo4j | ❌ | ✅ adapter privado kernel |
| Cypher / traversalId arbitrário | ❌ | ✅ registry T01–T20 |
| Dispatcher `node.create` para Connection | ❌ connections comanda PG | ✅ projeta após evento |

---

## O módulo NÃO POSSUI (consolidado ADR0002)

| Item | Dono correto | Notas |
| --- | --- | --- |
| Agent, AgentVersion, skills, BrainFacade | **agents** | Binding declarado em agents; invoke em connections |
| Goal, Task, Run, scheduler, lease | **orchestration** | taskId correlaciona usage |
| Grant, mandate, authorityEpoch, Approval | **governance** | Binding valida epoch/grant |
| Invoice, refund, webhook billing plataforma | **billing** | Lê usage; não duplica |
| Ledger, journal capital, reconciliação trading | **accounting** | Separação consumo IA vs capital |
| Order, Fill, venue reconciliation live | **execution** | Fora de escopo REAL v1 |
| RiskPolicy, kill switch | **risk** | Connections respeita deny upstream |
| Memory, Evidence, Document, embedding space owner | **knowledge** | Connections fornece modelo de embedding via binding |
| Nós/arestas Neo4j | **graph** | Projeção `graph:connections:v1` |
| Secrets (valor) | **packages/secrets** | Ref por id apenas |
| REAL_EXECUTION / broker live | **proibido v1** | Ver invariantes CX-R02-INV-* |
| Estratégia, deployment, backtest | **strategies** | InferenceRequirements vêm de StrategyVersion |
| Certificação/reputação modelo | **evaluation** | Consome eventos; não altera binding |

---

## Fronteira explícita: connections × agents × orchestration × governance

| Fronteira | connections | agents | orchestration | governance |
| --- | --- | --- | --- | --- |
| Declarar AgentModelBinding | ❌ | ✅ | ❌ | ❌ |
| Resolver binding + invoke modelo | ✅ | ❌ | solicita | ❌ |
| Validar grant antes de invoke | ✅ fail-closed | ❌ | passa contexto | ✅ emite grant |
| Persistir estado Run | ❌ | ❌ | ✅ | ❌ |
| Publicar AgentVersion | ❌ | ✅ | ❌ | pode exigir approval |
| Rotacionar secret provider | ✅ worker + secrets | ❌ | ❌ | ❌ |
| Revogar grant | ❌ reage | ❌ | ❌ | ✅ |

---

## ADR0002 — ownership e imports proibidos

### Regras aplicáveis (resumo)

| Regra ADR0002 | Aplicação em connections |
| --- | --- |
| domain não importa frameworks/providers | `domain/*` sem Drizzle, fetch, Neo4j, better-auth |
| módulos comunicam por contrato público/evento | `index.ts` + `@anxionos/contracts`; sem repo privado cross-module |
| estado + journal + outbox atômicos | UoW PG por agregado connections |
| secrets só infra autorizada | `infrastructure/adapters/*` + `packages/secrets` |
| projeções grafo de eventos com ownerDomain | `ownerDomain: connections` em todo evento |

### Imports proibidos (cross-module)

| Origem (connections) | Destino | Veredito |
| --- | --- | --- |
| `domain/*` | `agents/*`, `orchestration/*`, `governance/*` repositories | ❌ |
| `application/*` | repositório privado de outro módulo | ❌ |
| `connections` | driver Neo4j direto | ❌ — eventos → graph |
| `connections` | tabelas `billing_*`, `accounting_*` | ❌ |
| `agents` / `orchestration` | `connections/infrastructure/**` | ❌ — só `index.ts` + ports |
| DTO/evento/graph | valor de secret | ❌ CX-R02-SEC-* |

**Permitido:**

- `connections` → `@anxionos/contracts`, `@anxionos/eventing`, `@anxionos/database`, `@anxionos/secrets` (port), `@anxionos/observability`
- `orchestration` / `agents` → `@anxionos/connections` (`resolveBinding`, `invokeInference` — R04)
- `graph` → consumer inbox de eventos `connections.*`

---

## Alternativas consideradas

| ID | Alternativa | Veredito | Racional |
| --- | --- | --- | --- |
| **ALT-CX-01** | Unificar usage IA e ledger accounting numa tabela | ❌ | Viola backend-structure: accounting não mistura consumo IA com capital |
| **ALT-CX-02** | Billing dono de ProviderSubscription | ❌ | Subscription usuário↔provider é connections; invoice plataforma é billing |
| **ALT-CX-03** | Agents resolve provider/credencial diretamente | ❌ | Viola agents R02; credencial só connections+secrets |
| **ALT-CX-04** | Graph dono de quotas/cooldown para traverse T16 | ❌ | Estado autoritativo PG em connections; graph projeta leitura |
| **ALT-CX-05** | Routing/pools em orchestration | ❌ | Fairness de conta/modelo é domínio connections (spec 005 DL-CX2) |
| **ALT-CX-06** | REAL_EXECUTION atrás de env `ENABLE_LIVE` | ❌ v1 | Sem ADR; contradiz ANX-62 |

---

## Riscos (preview — detalhe em R07)

| ID | Risco | Severidade | Mitigação R02 |
| --- | --- | --- | --- |
| **RK-CX-01** | SSRF via EndpointPolicy/local bridge | Alta | EndpointPolicy + allowlist; spec 005 |
| **RK-CX-02** | Race quota PLATFORM fairness | Alta | Sequência global + lease mesma transação (DL-CX2) |
| **RK-CX-03** | Secret vazado em evento/trace | Crítica | CX-R02-SEC-* + security review R04 |
| **RK-CX-04** | Binding stale após revoke grant | Média | Validar epoch em todo resolve; fail-closed |
| **RK-CX-05** | Import 9Router reativa REAL silencioso | Alta | CX-R02-INV-04 |

---

## Perguntas abertas → R03 (domain sketch)

1. **Agregado raiz:** `ConnectionBinding` vs `AIAccount` — qual comando cria binding e quem versiona pools?
2. **Ports públicos:** `ConnectionResolver`, `RuntimeAdapter`, `UsageRecorder` — assinaturas exatas no `index.ts`?
3. **AgentModelBinding:** tipo compartilhado em contracts — connections valida ou agents emite snapshot?
4. **TASKBOARD adapter:** fronteira com orchestration mirror — idempotência de sync?
5. **EmbeddingSpace:** binding fixo em knowledge vs offering em connections — dono do agregado?
6. **EffectClass taxonomy:** enum único em contracts alinhado a SIMULATED/PAPER sem slot REAL?

---

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Matriz possui/não possui vs agents, governance, billing, accounting, orchestration, graph | ✅ |
| AC-R02-02 | Invariante REAL_EXECUTION proibido documentado com IDs testáveis (CX-R02-INV-01..05) | ✅ |
| AC-R02-03 | Invariante secrets fora de DTOs/eventos/grafo (CX-R02-SEC-01..05) | ✅ |
| AC-R02-04 | Ownership ADR0002 e imports proibidos explícitos | ✅ |
| AC-R02-05 | Alternativas consideradas com veredito | ✅ |
| AC-R02-06 | Riscos preview e perguntas encaminhadas a R03 | ✅ |
| AC-R02-07 | R01-context.md referenciado; sem contradição com ANX-62 | ✅ |

---

## Saída R2

✅ Boundary doc aprovado para **R03 — Modelo de domínio** ([R03-domain-sketch.md](./R03-domain-sketch.md)).

**Próximo:** agregados Binding, AIAccount, Usage; ports `ConnectionResolver`, `RuntimeAdapter`; invariantes de domínio e eventos `connections.*.v1` (sketch).
