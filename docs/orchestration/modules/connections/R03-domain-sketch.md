---
type: debate
---

# R03 — Esboço de domínio: `modules/connections`

**Módulo:** connections (P05 Connections)  
**Rodada:** R3 — Domain model  
**Pacote SDD:** P05  
**Data:** 2026-09-08  
**Issue debate:** ANX-83 · contrato P05: ANX-62 · gate implementação: ANX-36  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md) · [R01-context.md](./R01-context.md) · `brain/project-docs/specs/005-connections-integration/spec.md`

## Objetivo da rodada

Esboçar o modelo de domínio de **connections** após [R02-boundaries.md](./R02-boundaries.md): agregados `ConnectionBinding`, `AIAccount`, `UsageRecord`; ports `ConnectionResolver`, `RuntimeAdapter`, `UsageRecorder`; invariantes de domínio (`CX-R03-INV-*`); sketch de eventos `connections.*.v1` sem secrets; respostas às perguntas abertas de R02. Alinhar com contrato ANX-62 e spec 005 sem duplicar Goal/Task/Run (orchestration) nem AgentVersion (agents).

## Fontes aplicadas

| Fonte | Uso em R3 |
| --- | --- |
| [R02-boundaries.md](./R02-boundaries.md) | Fronteiras, CX-R02-INV-*, CX-R02-SEC-*, perguntas abertas |
| [R01-context.md](./R01-context.md) | Propósito, armazenamento, inventário |
| [p05-connections-binding-inference-contract.md](../../system-capabilities/p05-connections-binding-inference-contract.md) | Tipos de connection, binding, adapter, eventos (ANX-62) |
| `brain/project-docs/specs/005-connections-integration/spec.md` | Fairness, scopes, RuntimeAdapter, API `/v1/connections` |
| [agents/R03-domain-sketch.md](../../structure-debate/agents/R03-domain-sketch.md) | `AgentModelBinding` declarado em agents; invoke em connections |
| [orchestration/R03-domain-sketch.md](../../structure-debate/orchestration/R03-domain-sketch.md) | `taskId`/`runId` correlacionam usage; sem ownership de Run |

## Debate R3 (síntese atribuída)

**Arquiteto:** Três agregados núcleo v1 — `AIAccount` (titular, scopes, subscription ao provider), `ConnectionBinding` (versão imutável por connection/kind/capabilities), `UsageRecord` (consumo autoritativo por request). Entidades satélite: `ModelOffering`, `InferenceProfile`, `QuotaLease`. `RuntimeAdapter` é **porta de infraestrutura**, não agregado.

**Executor:** Ports públicos application: `ConnectionResolver` (resolve + fail-closed), `UsageRecorder` (persist + emit), `RuntimeAdapter` (contrato por capability). Repositories + `ConnectionsUnitOfWork` para estado + journal + outbox atômico.

**Crítico:** `ConnectionBinding` imutável após `ACTIVE`; mudança material cria nova versão. `REAL_EXECUTION` rejeitado no domínio (herda CX-R02-INV-*). Usage é dono connections — billing só consome evento.

**Security:** Payload de evento e trace nunca carregam secret; `secretRef` opaco apenas em PG interno. Adapter injeta credencial dentro do boundary infra após grant+epoch.

**Síntese Orquestrador:** Domain sketch v1 aprovado; R04 normaliza `@anxionos/contracts/connections/*` e catálogo `connections.*.v1`.

---

## Agregado: `AIAccount`

Conta IA/API do titular (`ownerPrincipalId`). Agrupa subscriptions, scopes e pools de fairness. **Agregado raiz** para comandos de conta, grant de consumo PLATFORM e rotação de secret.

```typescript
interface AIAccount {
  id: AIAccountId;
  organizationId: string;
  ownerPrincipalId: string;
  providerId: ProviderId;
  displayName: string;
  status: AIAccountStatus;
  visibilityScope: ScopeRef;
  consumptionScope: ScopeRef;
  fundingScope: ScopeRef;
  secretRef: SecretRef;
  secretGeneration: number;
  authorityEpoch: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

type AIAccountStatus =
  | "DRAFT"
  | "AUTHORIZED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED";

interface SecretRef {
  secretId: string;
  generation: number;
}
```

### Invariantes (`CX-R03-INV-ACC-*`)

| ID | Regra |
| --- | --- |
| CX-R03-INV-ACC-01 | `ownerPrincipalId` é imutável após criação |
| CX-R03-INV-ACC-02 | `visibilityScope`, `consumptionScope` e `fundingScope` são dimensões separadas (DL-CX1) |
| CX-R03-INV-ACC-03 | Organization/Agency pode restringir política herdada, nunca ampliar direito a conta alheia |
| CX-R03-INV-ACC-04 | Rotação de secret incrementa `secretGeneration`; bindings ativos validam generation na resolução |
| CX-R03-INV-ACC-05 | `authorityEpoch` desatualizado invalida novas resoluções sem mutar histórico de usage |
| CX-R03-INV-ACC-06 | Mutações confirmam estado + journal + outbox na mesma transação PG |

---

## Agregado: `ConnectionBinding`

Versão imutável que autoriza uma connection específica (kind, capabilities, effectClass, limites). **Agregado raiz** para lifecycle DRAFT→REVOKED. Referencia `AIAccount` e `secretRef` por id.

```typescript
interface ConnectionBinding {
  id: ConnectionBindingId;
  bindingVersion: number;
  connectionId: ConnectionId;
  aiAccountId: AIAccountId;
  kind: ConnectionKind;
  environment: ConnectionEnvironment;
  adapterId: string;
  adapterVersion: string;
  effectClass: EffectClass;
  capabilities: CapabilityToken[];
  secretRef: SecretRef;
  grantRef: GrantRef;
  authorityEpoch: number;
  policyEpoch: number;
  expiresAt?: Date;
  rateLimits: RateLimitPolicy;
  budgetLimits: BudgetPolicy;
  contractHash: string;
  status: ConnectionBindingStatus;
  revision: number;
  createdAt: Date;
  activatedAt?: Date;
  revokedAt?: Date;
}

type ConnectionKind =
  | "MARKET_DATA"
  | "SIMULATION"
  | "PAPER_ACCOUNT"
  | "MODEL"
  | "KNOWLEDGE"
  | "TASKBOARD";

type ConnectionEnvironment = "SIMULATED" | "PAPER";

type ConnectionBindingStatus =
  | "DRAFT"
  | "VALIDATING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED";

type EffectClass =
  | "READ_ONLY"
  | "SIMULATED_EFFECT"
  | "PAPER_EFFECT"
  | "INFERENCE"
  | "SYNC_METADATA";
```

### Invariantes (`CX-R03-INV-BND-*`)

| ID | Regra |
| --- | --- |
| CX-R03-INV-BND-01 | Versão `ACTIVE` é imutável; alteração material cria novo `bindingVersion` |
| CX-R03-INV-BND-02 | `REVOKED` é terminal — não revive nem muta in-place |
| CX-R03-INV-BND-03 | Ativação exige grant válido + epoch + health mínimo + validação de adapter |
| CX-R03-INV-BND-04 | `kind` e `environment` compatíveis: PAPER_ACCOUNT exige `PAPER`; MODEL aceita SIMULATED ou PAPER conforme offering |
| CX-R03-INV-BND-05 | Resolver fail-closed: sem binding ACTIVE, grant, secret generation ou epoch válido → erro tipado, sem fallback |
| CX-R03-INV-BND-06 | Todo invoke carrega `bindingId`, `bindingVersion`, `idempotencyKey`, `traceId` |
| CX-R03-INV-BND-07 | `ConnectionKind` enum de domínio não inclui `REAL_EXECUTION` (reforça CX-R02-INV-01) |
| CX-R03-INV-BND-08 | Eventos e DTOs públicos omitêm valor de secret (CX-R02-SEC-01..02) |

**Decisão CX-R03-01:** `ConnectionBinding` é agregado raiz do **ciclo de autorização operacional**; `AIAccount` é agregado raiz do **titular e scopes**. Comando `CreateConnectionBinding` referencia `aiAccountId` existente e ACTIVE/authorized.

---

## Entidade: `UsageRecord`

Registro autoritativo de consumo (estimado ou reconciliado) por request/operação. **Não** é ledger accounting nem invoice billing.

```typescript
interface UsageRecord {
  id: UsageRecordId;
  organizationId: string;
  aiAccountId: AIAccountId;
  connectionBindingId: ConnectionBindingId;
  bindingVersion: number;
  inferenceRequestId?: string;
  taskId?: string;
  runId?: string;
  consumerKind: "OWNER" | "AGENCY" | "PLATFORM";
  consumerPrincipalId: string;
  operation: string;
  quantity: Decimal;
  unit: UsageUnit;
  currency?: string;
  estimatedCost?: Decimal;
  actualCost?: Decimal;
  status: UsageRecordStatus;
  idempotencyKey: string;
  recordedAt: Date;
}

type UsageUnit =
  | "TOKENS_IN"
  | "TOKENS_OUT"
  | "REQUEST"
  | "GPU_SECONDS"
  | "CHARACTERS"
  | "OTHER";

type UsageRecordStatus = "ESTIMATED" | "RECONCILED" | "VOID";
```

### Invariantes (`CX-R03-INV-USG-*`)

| ID | Regra |
| --- | --- |
| CX-R03-INV-USG-01 | Idempotência por `(organizationId, idempotencyKey)` — replay retorna mesmo registro |
| CX-R03-INV-USG-02 | `UsageRecord` é fonte autoritativa; billing agrega via evento, não duplica tabela |
| CX-R03-INV-USG-03 | PLATFORM consumer exige grant de consumo explícito no `AIAccount` |
| CX-R03-INV-USG-04 | Accounting não importa usage como saldo capital — separação R02 |
| CX-R03-INV-USG-05 | Emissão de `connections.usage.recorded.v1` na mesma transação UoW que insert PG |

---

## Entidades satélite (sketch v1)

| Entidade | Papel | Notas |
| --- | --- | --- |
| `ProviderSubscription` | Assinatura usuário↔provider (não invoice plataforma) | Filha de `AIAccount` ou 1:1 |
| `ModelOffering` | Oferta/catálogo com readiness, free flag, grupos G1–G4 | Publicação versionada; cache SQLite descartável |
| `InferenceProfile` | Params efetivos (effort/thinking/tools) por binding | Snapshot imutável por request |
| `OwnerProviderPool` | Pool fairness AGENCY por Owner | Cursor least-recently-dispatched (DL-CX2) |
| `PlatformDispatchSequence` | Sequência global PLATFORM + `lastAccount` | Mesma transação que lease/quota |
| `QuotaLease` | Reserva quota/budget com fencing | Worker reaper; CX04 |

Detalhe de storage e tabelas em **R05**.

---

## Port: `ConnectionResolver` (application — export público)

Resolve binding autorizado e monta contexto de invoke **sem** executar adapter. Fail-closed em toda pré-condição.

```typescript
export interface ResolveBindingInput {
  bindingId: string;
  bindingVersion: number;
  operation: string;
  principalId: string;
  consumerKind: "OWNER" | "AGENCY" | "PLATFORM";
  taskId?: string;
  runId?: string;
  authorityEpoch: number;
  idempotencyKey: string;
}

export interface ResolvedBinding {
  binding: ConnectionBinding;
  aiAccount: AIAccount;
  adapterId: string;
  adapterVersion: string;
  secretRef: SecretRef;
  effectiveProfile?: InferenceProfile;
  routingDecisionId: string;
}

export interface ConnectionResolver {
  resolve(input: ResolveBindingInput): Promise<ResolvedBinding>;
  explainRouting(input: ResolveBindingInput): Promise<RoutingExplanation>;
}
```

| Aspecto | Decisão |
| --- | --- |
| Dono | `application/services/connection-resolver.ts` |
| Validações | grant, epoch, health, quota, cooldown, kind, capability |
| Erros tipados | `BINDING_NOT_FOUND`, `BINDING_REVOKED`, `GRANT_INVALID`, `EPOCH_STALE`, `CONNECTION_KIND_NOT_SUPPORTED`, `QUOTA_EXCEEDED` |
| Cross-module | Consulta governance via port `GrantValidationPort` (read-only) |

**Decisão CX-R03-02:** `ConnectionResolver` é o **único** entry point de resolução para orchestration/agents; HTTP `/v1/connections/inference:invoke` delega ao mesmo handler.

---

## Port: `RuntimeAdapter` (domain/infrastructure boundary)

Contrato por capability real — implementações em `infrastructure/adapters/*`.

```typescript
export interface RuntimeAdapter {
  adapterId: string;
  adapterVersion: string;
  describeCapabilities(): AdapterCapabilityManifest;
  healthProbe(ctx: AdapterContext): Promise<HealthProbeResult>;
  invoke(ctx: AdapterContext, request: NormalizedRequest): Promise<AdapterResult>;
  normalizeRequest(
    binding: ConnectionBinding,
    requirements: InferenceRequirements,
    input: unknown,
  ): NormalizedRequest;
  parseUsage(result: AdapterResult): UsageEstimate;
  classifyError(error: unknown): AdapterErrorClass;
}

export interface AdapterContext {
  resolved: ResolvedBinding;
  traceId: string;
  deadline: Date;
}
```

| Aspecto | Decisão |
| --- | --- |
| Registro | `AdapterRegistry` em infra; metadata ENABLED/DEGRADED em PG |
| Secret injection | `SecretPort` de `@anxionos/secrets` — nunca em domain |
| Streaming | `invoke` retorna `AsyncIterable<AdapterEvent>` em R04 |
| REAL / LIVE | Adapter com `effectClass=LIVE_TRADING` **não registrável** v1 |

**Decisão CX-R03-03:** `RuntimeAdapter` é port de **infraestrutura**; domain define tipos e contrato; application orquestra resolve → adapter → usage.

---

## Port: `UsageRecorder` (application)

Persiste usage e emite evento na mesma transação.

```typescript
export interface RecordUsageInput {
  resolved: ResolvedBinding;
  operation: string;
  estimate: UsageEstimate;
  consumerKind: "OWNER" | "AGENCY" | "PLATFORM";
  consumerPrincipalId: string;
  taskId?: string;
  runId?: string;
  inferenceRequestId?: string;
  idempotencyKey: string;
}

export interface UsageRecorder {
  record(input: RecordUsageInput): Promise<UsageRecord>;
  reconcile(usageRecordId: string, actual: UsageEstimate): Promise<UsageRecord>;
}
```

---

## Ports adicionais (domain/)

| Port | Responsabilidade |
| --- | --- |
| `AIAccountRepository` | CRUD + lifecycle AIAccount |
| `ConnectionBindingRepository` | Versionamento binding + status transitions |
| `UsageRecordRepository` | Insert idempotente + reconcile |
| `ModelOfferingRepository` | Catálogo e readiness |
| `QuotaLeaseRepository` | Reserva/liberação quota |
| `ConnectionsUnitOfWork` | Transação estado + journal + outbox |
| `GrantValidationPort` | Valida grant/epoch (adapter governance) |
| `GovernanceEpochPort` | Leitura authorityEpoch atual |
| `SecretPort` | Resolve material secret (infra) |
| `AdapterRegistry` | Lookup adapter por id+version |

---

## Comandos application (esboço)

| Comando | Agregado | Idempotência natural | Evento |
| --- | --- | --- | --- |
| `RegisterAIAccount` | AIAccount | `(ownerPrincipalId, providerId, displayName)` draft | `connections.ai_account.registered.v1` |
| `AuthorizeAIAccount` | AIAccount | `(aiAccountId, expectedRevision)` | `connections.ai_account.authorized.v1` |
| `CreateConnectionBinding` | ConnectionBinding | `(connectionId, bindingVersion)` draft | `connections.binding.created.v1` |
| `ActivateConnectionBinding` | ConnectionBinding | `(bindingId, bindingVersion)` | `connections.binding.activated.v1` |
| `SuspendConnectionBinding` | ConnectionBinding | `(bindingId, targetStatus, expectedRevision)` | `connections.binding.suspended.v1` |
| `RevokeConnectionBinding` | ConnectionBinding | `(bindingId, reasonCode)` | `connections.binding.revoked.v1` |
| `InvokeInference` | — (orquestra) | `idempotencyKey` | `connections.inference.completed.v1` + usage |
| `RecordUsage` | UsageRecord | `idempotencyKey` | `connections.usage.recorded.v1` |

---

## Eventos de domínio (sketch — R04 normaliza schemas)

Envelope: `ownerDomain: "connections"`, `schemaVersion: "0.1.0"`. **Nenhum** evento inclui secret, token ou payload de handshake.

| eventType | aggregate | Payload principal (sem secrets) | Consumidores |
| --- | --- | --- | --- |
| `connections.ai_account.registered.v1` | AIAccount | `aiAccountId`, `ownerPrincipalId`, `providerId`, scopes | graph, audit |
| `connections.ai_account.authorized.v1` | AIAccount | `aiAccountId`, `secretRef` (id+generation apenas), `authorityEpoch` | graph, governance |
| `connections.binding.created.v1` | ConnectionBinding | `bindingId`, `bindingVersion`, `kind`, `connectionId`, `aiAccountId`, `contractHash` | graph, governance |
| `connections.binding.activated.v1` | ConnectionBinding | `bindingId`, `bindingVersion`, `grantRef`, `activatedAt` | graph, agents, orchestration |
| `connections.binding.suspended.v1` | ConnectionBinding | `bindingId`, `reasonCode` | graph, cache invalidation |
| `connections.binding.revoked.v1` | ConnectionBinding | `bindingId`, `authorityEpoch`, `revokedAt` | graph, governance, invalidação |
| `connections.inference.completed.v1` | InferenceRequest | `inferenceRequestId`, `bindingId`, `modelRef`, `latencyMs`, `usageRecordId` | audit, evaluation |
| `connections.inference.failed.v1` | InferenceRequest | `inferenceRequestId`, `errorCode`, `retryable` | orchestration, audit |
| `connections.usage.recorded.v1` | UsageRecord | `usageRecordId`, `aiAccountId`, `quantity`, `unit`, `consumerKind`, `taskId?` | **billing**, graph, audit |
| `connections.quota.exceeded.v1` | QuotaLease | `aiAccountId`, `quotaGroup`, `period` | orchestration, operations |
| `connections.health.changed.v1` | HealthProbe | `connectionId`, `status`, `probeAt` | operations, graph |
| `connections.call.unknown.v1` | InferenceRequest | `inferenceRequestId`, `reconcileHint` | reconciliation worker |

### Exemplo `connections.binding.activated.v1`

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440020",
  "schemaVersion": "0.1.0",
  "ownerDomain": "connections",
  "eventType": "connections.binding.activated.v1",
  "occurredAt": "2026-09-08T08:00:00.000Z",
  "payload": {
    "bindingId": "bnd_01h2x",
    "bindingVersion": 3,
    "connectionId": "conn_9k2",
    "aiAccountId": "acc_7f1",
    "kind": "MODEL",
    "environment": "SIMULATED",
    "grantRef": { "grantId": "grt_abc", "epoch": 12 },
    "contractHash": "sha256:…",
    "activatedAt": "2026-09-08T08:00:00.000Z"
  }
}
```

### Exemplo `connections.usage.recorded.v1`

```json
{
  "eventType": "connections.usage.recorded.v1",
  "payload": {
    "usageRecordId": "usg_01",
    "organizationId": "org_1",
    "aiAccountId": "acc_7f1",
    "connectionBindingId": "bnd_01h2x",
    "bindingVersion": 3,
    "consumerKind": "PLATFORM",
    "consumerPrincipalId": "p_platform_svc",
    "operation": "infer.chat",
    "quantity": "1842",
    "unit": "TOKENS_OUT",
    "currency": "USD",
    "estimatedCost": "0.0041",
    "taskId": "task_orch_99",
    "idempotencyKey": "idem_xyz"
  }
}
```

---

## `AgentModelBinding` — fronteira agents × connections

| Aspecto | Posição R3 |
| --- | --- |
| Declaração | **agents** dono — `AgentVersion.modelSlots` / `AgentModelBinding` em `@anxionos/contracts/agents` |
| Validação na invoke | **connections** valida elegibilidade: offering, operation, purpose, grant, quota |
| Snapshot | `TaskRequirementsSnapshot` + `bindingId`/`bindingVersion` imutáveis por request (spec 005) |
| Tipo compartilhado | `AgentModelBindingRef` em contracts — agents emite; connections resolve |

**Decisão CX-R03-04:** agents **não** chama adapter nem secret; passa `AgentModelBindingRef` + `InferenceRequirements` para `ConnectionResolver`/`invokeInference`.

---

## Respostas às perguntas abertas (R02)

| # | Pergunta | Decisão R3 |
| --- | --- | --- |
| 1 | Agregado raiz: Binding vs AIAccount? | **Dois agregados raiz**: `AIAccount` (titular/scopes/secret ref); `ConnectionBinding` (autorização operacional versionada). Pools fairness em entidades satélite sob `AIAccount` |
| 2 | Ports públicos no `index.ts`? | `resolveBinding`, `explainRouting`, `invokeInference`, `recordUsage` — delegam a ConnectionResolver/UsageRecorder; adapters internos |
| 3 | AgentModelBinding validação? | Tipo em contracts/agents; connections valida elegibilidade na resolução (CX-R03-04) |
| 4 | TASKBOARD adapter idempotência? | Sync por `issueIdentifier` + `eventId` board; mirror orchestration consome — **detalhe R04** |
| 5 | EmbeddingSpace dono? | **knowledge** dono do espaço; connections expõe `ModelOffering` com capability embedding — binding MODEL referencia offering, não space |
| 6 | EffectClass taxonomy? | Enum `EffectClass` em contracts/connections — sem slot `LIVE_TRADING` (CX-R02-INV-03) |

---

## Decisões registradas

| ID | Decisão | Racional |
| --- | --- | --- |
| **CX-R03-01** | Dois agregados raiz: `AIAccount` + `ConnectionBinding` | Separa titular/scopes de autorização versionada |
| **CX-R03-02** | `ConnectionResolver` único entry point de resolução | Fail-closed centralizado; paridade HTTP/SDK/agents |
| **CX-R03-03** | `RuntimeAdapter` port de infra; secret só no boundary | CX-R02-SEC-04; domain puro |
| **CX-R03-04** | `AgentModelBindingRef` declarado em agents, validado em connections | ADR0002 — sem duplicar ownership |
| **CX-R03-05** | Usage emitido em mesma UoW que PG insert | billing consumer idempotente; T16/T17 graph |
| **CX-R03-06** | Fairness PLATFORM: sequência global + lease na mesma transação | DL-CX2; CX01 test plan |

---

## Alternativas consideradas

| ID | Alternativa | Veredito | Racional |
| --- | --- | --- | --- |
| **ALT-CX-R03-01** | `ConnectionBinding` único agregado raiz (AIAccount como VO) | ❌ | Scopes, secret rotation e pools têm lifecycle distinto |
| **ALT-CX-R03-02** | Usage como evento-only sem PG autoritativo | ❌ | billing/graph exigem fonte única; R02 T16/T17 |
| **ALT-CX-R03-03** | Resolver em orchestration | ❌ | Viola R02 — invoke e fairness são connections |
| **ALT-CX-R03-04** | `invokeInference` síncrono apenas | ❌ | Jobs/streaming em R04; sketch prevê async |
| **ALT-CX-R03-05** | EmbeddingSpace em connections | ❌ | knowledge dono; connections só offering MODEL |

---

## Riscos (preview — detalhe R07)

| ID | Risco | Severidade | Mitigação R3 |
| --- | --- | --- | --- |
| **RK-CX-R03-01** | Race quota + dispatch PLATFORM | Alta | CX-R03-06 — lease mesma transação |
| **RK-CX-R03-02** | Binding stale após revoke grant | Média | epoch em todo resolve (CX-R03-INV-BND-05) |
| **RK-CX-R03-03** | Usage duplicado billing | Alta | idempotencyKey + evento único (CX-R03-INV-USG-05) |
| **RK-CX-R03-04** | Adapter registry aceita LIVE | Crítica | EffectClass allowlist + teste CX-R02-INV-03 |

---

## Perguntas abertas → R04 (contratos/eventos)

1. Schemas Zod exatos `@anxionos/contracts/connections/*` e normalização eventType vs ANX-62 naming.
2. HTTP routes `/v1/connections/*` — mapa comando ↔ handler.
3. `InferenceRequirements` compartilhado com strategies/agents — pacote contracts.
4. Streaming `connections.inference.chunk.v1` vs single `completed` — envelope.
5. `GrantValidationPort` — SDK governance vs HTTP interno.
6. OpenAPI snapshot sem `REAL_EXECUTION` (CX-R02-INV-05).

---

## Projeção Neo4j (referência)

Consumer: `graph:connections:v1` (módulo **graph**, P03). connections publica eventos; não importa Neo4j.

| Nó | Fonte evento | Propriedades (sem secrets) |
| --- | --- | --- |
| `:Provider` | catalog/release | `providerId`, `family` |
| `:AIAccount` | `ai_account.*` | `aiAccountId`, `ownerPrincipalId`, scopes |
| `:ConnectionBinding` | `binding.*` | `bindingId`, `version`, `kind`, `status` |
| `:ModelOffering` | catalog events | `offeringId`, `readiness` |
| `:UsageRecord` | `usage.recorded` | `usageRecordId`, `quantity`, `unit` — T16/T17 |

---

## Estrutura de pastas (referência R09)

```text
modules/connections/
├── domain/
│   ├── entities/ai-account.ts
│   ├── entities/connection-binding.ts
│   ├── entities/usage-record.ts
│   ├── ports/connection-resolver.ts
│   ├── ports/runtime-adapter.ts
│   ├── ports/usage-recorder.ts
│   └── ports/*-repository.ts
├── application/
│   ├── commands/
│   ├── queries/
│   └── services/connection-resolver.ts
├── infrastructure/adapters/
├── infrastructure/persistence/
├── api/
├── workers/
└── index.ts
```

---

## Critérios de aceite — R03

| # | Critério | Status |
| --- | --- | --- |
| AC-R03-01 | Agregados `ConnectionBinding`, `AIAccount`, `UsageRecord` com tipos e estados | ✅ |
| AC-R03-02 | Ports `ConnectionResolver`, `RuntimeAdapter`, `UsageRecorder` documentados | ✅ |
| AC-R03-03 | Invariantes domínio `CX-R03-INV-*` (ACC, BND, USG) | ✅ |
| AC-R03-04 | Sketch eventos `connections.*.v1` sem secrets em payload | ✅ |
| AC-R03-05 | Seis perguntas R02 respondidas com decisões CX-R03-* | ✅ |
| AC-R03-06 | Alternativas, riscos preview, perguntas encaminhadas R04 | ✅ |
| AC-R03-07 | Alinhamento ANX-62 e spec 005; sem contradição R02 | ✅ |
| AC-R03-08 | REAL_EXECUTION e LIVE_TRADING ausentes do modelo | ✅ |

---

## Saída R3

✅ Domain sketch v1 aprovado para **R04 — API e eventos** ([R04-contracts.md](./R04-contracts-events.md)).

**Próximo:** schemas `@anxionos/contracts/connections/*`, catálogo HTTP/OpenAPI, normalização envelopes e testes de contrato CX-R02-INV-*.
