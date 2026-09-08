---
type: debate
---

# R04 — Contratos, eventos e superfície pública: `modules/connections`

**Módulo:** connections (P05 Connections)  
**Rodada:** R4 — Contratos, eventos e exports  
**Pacote SDD:** P05  
**Data:** 2026-09-08  
**Issue debate:** ANX-83 · contrato P05: ANX-62 · gate implementação: ANX-36  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R02-boundaries.md](./R02-boundaries.md) · [p05-connections-binding-inference-contract.md](../../system-capabilities/p05-connections-binding-inference-contract.md) · `brain/project-docs/specs/005-connections-integration/spec.md`

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Security | security-reviewer |
| QA | QA |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Definir a superfície pública de **connections** após [R03-domain-sketch.md](./R03-domain-sketch.md): schemas Zod em `@anxionos/contracts/connections/*`, catálogo de eventos `connections.*.v1` normalizado vs ANX-62, esboço HTTP `/v1/connections/*`, tipo compartilhado `InferenceRequirements`, plano de testes de contrato para invariantes `CX-R02-INV-*`, decisão streaming vs evento terminal, exports de `modules/connections/index.ts`. Encaminhar storage e wiring para R05.

## Fontes aplicadas

| Fonte | Uso em R4 |
| --- | --- |
| [R03-domain-sketch.md](./R03-domain-sketch.md) | Agregados, ports, sketch eventos, CX-R03-* |
| [R02-boundaries.md](./R02-boundaries.md) | CX-R02-INV-*, CX-R02-SEC-*, SIMULATED/PAPER only |
| [p05-connections-binding-inference-contract.md](../../system-capabilities/p05-connections-binding-inference-contract.md) | Tipos connection, binding, eventos PascalCase (ANX-62) |
| `brain/project-docs/specs/005-connections-integration/spec.md` | API `/v1/connections`, InferenceRequirements, streaming |
| [agents/R04-contracts-events.md](../../structure-debate/agents/R04-contracts-events.md) | `AgentModelBindingRef`, padrão contracts |
| [orchestration/R04-contracts-events.md](../../structure-debate/orchestration/R04-contracts-events.md) | Idempotency-Key, `details.code` |
| [identity/R04-contracts-events.md](../../structure-debate/identity/R04-contracts-events.md) | Layout `packages/contracts` |
| `backend/packages/contracts` | `domainEventEnvelopeSchema`, `schemaVersion` 0.1.0 |

## Debate R4 (síntese atribuída)

**Executor:** Contratos em `@anxionos/contracts/connections/` + pacote compartilhado `@anxionos/contracts/inference/requirements.ts` consumido por agents, strategies e connections. HTTP em `apps/api` com validação Zod na borda; use cases em `modules/connections`.

**Code Review:** `eventType` com prefixo `connections.` e sufixo `.v1`. Normalizar nomes PascalCase do ANX-62 (§10) para `connections.<aggregate>.<action>.v1`. Comandos HTTP usam `Idempotency-Key` (UUID) → `commandId` no journal.

**Crítico:** `connectionKindSchema` e `createConnectionBindingCommandSchema` devem **rejeitar** `REAL_EXECUTION` em parse — não apenas omitir do enum documentado. Testes de contrato são gate G1 para CX-R02-INV-01..03.

**Security:** Payloads de evento e DTOs HTTP **proibidos** de carregar valor de secret, token OAuth, PEM ou transcript bruto. `secretRef` limita-se a `{ secretId, generation }`.

**QA:** Plano de testes `backend/tests/contracts/connections-contracts.test.ts` espelha `governance-contracts.test.ts` — schemas, discriminated union de eventos, rejeição REAL_EXECUTION.

**Síntese Orquestrador:** Contratos v1 fechados para lifecycle AIAccount/Binding, inferência e usage; implementação bloqueada até greenlight + ANX-36; R05 cobre PG/outbox.

---

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `schemaVersion` (envelope) | `0.1.0` (herda `packages/contracts`) |
| `ownerDomain` | `"connections"` em todos os eventos |
| `eventType` | `connections.<aggregate>.<action>.v1` |
| Idempotência comandos | Header `Idempotency-Key` (UUID) + chaves naturais por comando |
| Correlação | `correlationId` = `runId` ou `taskId` quando originado em orchestration |
| Tenancy | `organizationId` derivado da sessão; `consumerKind` derivado de grant — **nunca** aceitar header cliente como prova PLATFORM (spec 005) |
| Auth | Better Auth session; grants T01 validados antes de mutação/invoke |
| Erros | `details.code` na borda HTTP; códigos abaixo |

### Códigos de domínio (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| `CX_BINDING_NOT_FOUND` | 404 | Binding inexistente ou fora do scope |
| `CX_BINDING_REVOKED` | 409 | Binding `REVOKED` ou `SUSPENDED` |
| `CX_GRANT_INVALID` | 403 | Grant ausente, revogado ou capability insuficiente |
| `CX_EPOCH_STALE` | 409 | `authorityEpoch` / `policyEpoch` desatualizado |
| `CX_CONNECTION_KIND_NOT_SUPPORTED` | 400 | Kind legado `REAL_EXECUTION` ou não habilitado v1 |
| `CX_EFFECT_CLASS_DENIED` | 400 | `LIVE_TRADING` ou effectClass incompatível |
| `CX_QUOTA_EXCEEDED` | 429 | Quota/budget/cooldown — inclui `retryAfter` quando conhecido |
| `CX_SECRET_GENERATION_STALE` | 409 | `secretGeneration` do binding desatualizado |
| `CX_ADAPTER_UNAVAILABLE` | 503 | Adapter DISABLED/DEGRADED ou health fail-closed |
| `CX_INFERENCE_TIMEOUT` | 504 | Deadline excedido; pode emitir `connections.call.unknown.v1` |
| `CX_IDEMPOTENT_REPLAY` | 200 | Replay documentado — `idempotentReplay: true` |
| `CX_REVISION_CONFLICT` | 409 | `expectedRevision` divergente |

---

## Normalização de eventos — ANX-62 → `connections.*.v1`

O contrato ANX-62 (§10) usa nomes PascalCase legados. O envelope institucional adota `eventType` com domínio e versão.

| ANX-62 (PascalCase) | `eventType` normalizado | Notas |
| --- | --- | --- |
| `ConnectionBindingCreated` | `connections.binding.created.v1` | DRAFT/VALIDATING |
| `ConnectionBindingActivated` | `connections.binding.activated.v1` | Requer grant + epoch |
| `ConnectionBindingSuspended` | `connections.binding.suspended.v1` | — |
| `ConnectionBindingRevoked` | `connections.binding.revoked.v1` | Terminal |
| `ProviderHealthChanged` | `connections.health.changed.v1` | Circuit breaker |
| `MarketDataObserved` | `connections.market_data.observed.v1` | Leitura normalizada; market-data pode reemitir agregado próprio em P06 |
| `PaperAccountRead` | `connections.paper_account.read.v1` | Não é ledger |
| `InferenceCompleted` | `connections.inference.completed.v1` | Terminal de sucesso |
| — (novo R04) | `connections.inference.failed.v1` | Terminal de falha |
| — (novo R04) | `connections.inference.stream.v1` | Chunk SSE — não substitui terminal |
| `ConnectionCallUnknown` | `connections.call.unknown.v1` | UNKNOWN / reconcile |
| `ConnectionReconciled` | `connections.reconciled.v1` | Caso fechado |
| — (R03) | `connections.ai_account.registered.v1` | Lifecycle conta |
| — (R03) | `connections.ai_account.authorized.v1` | Secret ref + epoch |
| — (R03) | `connections.usage.recorded.v1` | Fonte autoritativa billing |
| — (R03) | `connections.quota.exceeded.v1` | Fairness / admissão |

**Decisão CX-R04-01:** PascalCase ANX-62 é **alias documental** apenas; implementação e outbox usam exclusivamente `connections.*.v1`.

---

## `packages/contracts` — layout proposto

```text
packages/contracts/src/
├── inference/
│   ├── requirements.ts       # InferenceRequirements — shared agents/strategies/connections
│   └── index.ts
├── connections/
│   ├── types.ts              # ConnectionKind, EffectClass, branded IDs
│   ├── commands.ts           # input schemas de comandos
│   ├── queries.ts            # DTOs de leitura
│   ├── events.ts             # payload schemas + CONNECTIONS_EVENT_TYPES
│   ├── errors.ts             # resolveConnectionsErrorStatus
│   └── index.ts
└── index.ts                  # re-export inference + connections
```

### Tipos compartilhados (`connections/types.ts`)

```typescript
import { z } from "zod";

/** CX-R02-INV-01: enum fechado — REAL_EXECUTION ausente por design */
export const connectionKindSchema = z.enum([
  "MARKET_DATA",
  "SIMULATION",
  "PAPER_ACCOUNT",
  "MODEL",
  "KNOWLEDGE",
  "TASKBOARD",
]);

export const connectionEnvironmentSchema = z.enum(["SIMULATED", "PAPER"]);

export const connectionBindingStatusSchema = z.enum([
  "DRAFT",
  "VALIDATING",
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
]);

/** CX-R02-INV-03: LIVE_TRADING ausente */
export const effectClassSchema = z.enum([
  "READ_ONLY",
  "SIMULATED_EFFECT",
  "PAPER_EFFECT",
  "INFERENCE",
  "SYNC_METADATA",
]);

export const consumerKindSchema = z.enum(["OWNER", "AGENCY", "PLATFORM"]);

export const secretRefSchema = z.object({
  secretId: z.string().min(1).max(128),
  generation: z.number().int().nonnegative(),
});

export const grantRefSchema = z.object({
  grantId: z.string().uuid(),
  epoch: z.number().int().nonnegative(),
});

export const aiAccountIdSchema = z.string().min(1).max(64);
export const connectionBindingIdSchema = z.string().min(1).max(64);
export const connectionIdSchema = z.string().min(1).max(64);
export const usageRecordIdSchema = z.string().min(1).max(64);
export const inferenceRequestIdSchema = z.string().uuid();
```

### Guard explícito REAL_EXECUTION (`connections/types.ts`)

```typescript
const FORBIDDEN_CONNECTION_KINDS = ["REAL_EXECUTION"] as const;

export function assertConnectionKindSupported(
  kind: string,
): z.infer<typeof connectionKindSchema> {
  if ((FORBIDDEN_CONNECTION_KINDS as readonly string[]).includes(kind)) {
    throw new ConnectionsContractError(
      "CX_CONNECTION_KIND_NOT_SUPPORTED",
      `Connection kind not supported: ${kind}`,
    );
  }
  return connectionKindSchema.parse(kind);
}
```

### `InferenceRequirements` compartilhado (`inference/requirements.ts`)

Tipo compartilhado entre **strategies** (`StrategyVersion.inferenceRequirements`), **agents** (snapshot por task) e **connections** (`normalizeRequest`).

```typescript
import { z } from "zod";

export const inferencePurposeSchema = z.enum([
  "ROUTINE",
  "PLANNING",
  "SPECIAL",
  "RETRIEVAL",
  "SPEECH_TTS",
  "SPEECH_STT",
  "RERANK",
]);

export const dataClassSchema = z.enum([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
]);

export const latencyClassSchema = z.enum([
  "INTERACTIVE",
  "BATCH",
  "BACKGROUND",
]);

export const complexityClassSchema = z.enum([
  "SMALL",
  "MEDIUM",
  "LARGE",
]);

export const inferenceRequirementsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  taskType: z.string().min(1).max(128),
  operation: z.string().min(1).max(128),
  requiredCapabilities: z.array(z.string().min(1)).max(32),
  requiredPurpose: inferencePurposeSchema,
  dataClass: dataClassSchema,
  latencyClass: latencyClassSchema,
  complexity: complexityClassSchema,
  contextTokenBudget: z.number().int().positive().optional(),
  outputTokenBudget: z.number().int().positive().optional(),
  toolAllowlist: z.array(z.string().min(1)).max(64).optional(),
});

export type InferenceRequirements = z.infer<typeof inferenceRequirementsSchema>;
```

**Decisão CX-R04-02:** `InferenceRequirements` vive em `@anxionos/contracts/inference` — **não** duplicar em `agents` ou `strategies`. Agents referencia via `TaskRequirementsSnapshot`; strategies embute em `StrategyVersion`.

### `AgentModelBindingRef` (consumo cross-module)

Declarado em `@anxionos/contracts/agents` (AGT-R04); connections valida na resolução:

```typescript
// connections/commands.ts — campo em invokeInferenceCommandSchema
export const agentModelBindingRefSchema = z.object({
  agentId: z.string().uuid(),
  agentVersionId: z.string().uuid(),
  slotId: z.string().min(1).max(64),
  modelOfferingId: z.string().min(1).max(64),
  bindingId: connectionBindingIdSchema,
  bindingVersion: z.number().int().positive(),
});
```

### Comandos (`connections/commands.ts`) — outline

| Schema | Campos principais | Idempotência natural |
| --- | --- | --- |
| `registerAIAccountCommandSchema` | `commandId`, `organizationId`, `ownerPrincipalId`, `providerId`, `displayName`, scopes | `(ownerPrincipalId, providerId, displayName)` draft |
| `authorizeAIAccountCommandSchema` | `commandId`, `aiAccountId`, `secretRef`, `expectedRevision` | `(aiAccountId, expectedRevision)` |
| `createConnectionBindingCommandSchema` | `commandId`, `connectionId`, `aiAccountId`, `kind`, `environment`, `adapterId`, `grantRef`, `rateLimits`, `budgetLimits` | `(connectionId, bindingVersion)` |
| `activateConnectionBindingCommandSchema` | `commandId`, `bindingId`, `bindingVersion`, `expectedRevision` | `(bindingId, bindingVersion)` |
| `suspendConnectionBindingCommandSchema` | `commandId`, `bindingId`, `reasonCode`, `expectedRevision` | `(bindingId, targetStatus, expectedRevision)` |
| `revokeConnectionBindingCommandSchema` | `commandId`, `bindingId`, `reasonCode` | `(bindingId, reasonCode)` |
| `invokeInferenceCommandSchema` | `commandId`, `bindingId`, `bindingVersion`, `operation`, `requirements`, `typedInput`, `agentModelBindingRef?`, `taskId?`, `runId?`, `deadline`, `idempotencyKey` | `idempotencyKey` |
| `recordUsageCommandSchema` | interno — via `UsageRecorder` | `idempotencyKey` |

`createConnectionBindingCommandSchema` aplica `.superRefine` para rejeitar `kind` fora do enum **e** literal `REAL_EXECUTION` com código `CX_CONNECTION_KIND_NOT_SUPPORTED`.

### Queries (`connections/queries.ts`) — outline

| Schema | Uso |
| --- | --- |
| `aiAccountDtoSchema` | Leitura conta — sem secret value |
| `connectionBindingDtoSchema` | Binding + status + `contractHash` |
| `usageRecordDtoSchema` | Consumo por período |
| `routingExplanationDtoSchema` | Resposta `routing:explain` |
| `inferenceTraceDtoSchema` | `requests/:id/trace` — redigido por scope |

### Eventos (`connections/events.ts`)

```typescript
export const CONNECTIONS_OWNER_DOMAIN = "connections" as const;

export const CONNECTIONS_EVENT_TYPES = {
  AI_ACCOUNT_REGISTERED: "connections.ai_account.registered.v1",
  AI_ACCOUNT_AUTHORIZED: "connections.ai_account.authorized.v1",
  BINDING_CREATED: "connections.binding.created.v1",
  BINDING_ACTIVATED: "connections.binding.activated.v1",
  BINDING_SUSPENDED: "connections.binding.suspended.v1",
  BINDING_REVOKED: "connections.binding.revoked.v1",
  INFERENCE_STREAM: "connections.inference.stream.v1",
  INFERENCE_COMPLETED: "connections.inference.completed.v1",
  INFERENCE_FAILED: "connections.inference.failed.v1",
  USAGE_RECORDED: "connections.usage.recorded.v1",
  QUOTA_EXCEEDED: "connections.quota.exceeded.v1",
  HEALTH_CHANGED: "connections.health.changed.v1",
  CALL_UNKNOWN: "connections.call.unknown.v1",
  RECONCILED: "connections.reconciled.v1",
  MARKET_DATA_OBSERVED: "connections.market_data.observed.v1",
  PAPER_ACCOUNT_READ: "connections.paper_account.read.v1",
} as const;
```

Payload schemas seguem R03 — exemplos mantidos; `connectionsEventPayloadSchema` como `discriminatedUnion("eventType", [...])` espelhando governance.

---

## Catálogo de eventos v1 (completo)

| eventType | Aggregate | Emissor | Payload principal (sem secrets) | Consumidores |
| --- | --- | --- | --- | --- |
| `connections.ai_account.registered.v1` | AIAccount | RegisterAIAccount | `aiAccountId`, `ownerPrincipalId`, `providerId`, scopes | graph, audit |
| `connections.ai_account.authorized.v1` | AIAccount | AuthorizeAIAccount | `aiAccountId`, `secretRef`, `authorityEpoch` | graph, governance |
| `connections.binding.created.v1` | ConnectionBinding | CreateConnectionBinding | `bindingId`, `bindingVersion`, `kind`, `connectionId`, `aiAccountId`, `contractHash` | graph, governance |
| `connections.binding.activated.v1` | ConnectionBinding | ActivateConnectionBinding | `bindingId`, `bindingVersion`, `grantRef`, `activatedAt` | graph, agents, orchestration |
| `connections.binding.suspended.v1` | ConnectionBinding | SuspendConnectionBinding | `bindingId`, `reasonCode` | graph, cache |
| `connections.binding.revoked.v1` | ConnectionBinding | RevokeConnectionBinding | `bindingId`, `authorityEpoch`, `revokedAt` | graph, governance |
| `connections.inference.stream.v1` | InferenceRequest | InvokeInference (streaming) | `inferenceRequestId`, `sequence`, `chunkKind`, `deltaRef?` | SSE client, audit parcial |
| `connections.inference.completed.v1` | InferenceRequest | InvokeInference | `inferenceRequestId`, `bindingId`, `modelRef`, `latencyMs`, `usageRecordId` | audit, evaluation |
| `connections.inference.failed.v1` | InferenceRequest | InvokeInference | `inferenceRequestId`, `errorCode`, `retryable` | orchestration, audit |
| `connections.usage.recorded.v1` | UsageRecord | UsageRecorder | `usageRecordId`, `quantity`, `unit`, `consumerKind`, `taskId?` | **billing**, graph |
| `connections.quota.exceeded.v1` | QuotaLease | ConnectionResolver | `aiAccountId`, `quotaGroup`, `period` | orchestration, ops |
| `connections.health.changed.v1` | HealthProbe | health worker | `connectionId`, `status`, `probeAt` | ops, graph |
| `connections.call.unknown.v1` | InferenceRequest | timeout/reconcile | `inferenceRequestId`, `reconcileHint` | reconciliation worker |
| `connections.reconciled.v1` | ReconciliationCase | reconcile worker | `caseId`, `resolution`, `bindingId` | audit, governance |
| `connections.market_data.observed.v1` | MarketDataRead | adapter | `observationId`, `datasetVersion`, `quality` | strategies, simulation |
| `connections.paper_account.read.v1` | PaperAccountRead | adapter | `accountId`, `snapshotHash`, `environment` | portfolios (paper) |

---

## Decisão: streaming vs evento `completed`

| Opção | Veredito | Racional |
| --- | --- | --- |
| **A — Stream chunks + terminal único** | ✅ **Adotado** | Spec 005 exige normalização start/delta/tool/usage/end; billing e audit exigem exatamente um terminal por `inferenceRequestId` |
| B — Apenas `connections.inference.completed.v1` | ❌ Rejeitado | UX e tools/streaming inviáveis; viola RuntimeAdapter `invoke/stream` |
| C — Apenas chunks sem terminal | ❌ Rejeitado | billing/graph não fecham usage; UNKNOWN irresolvível |
| D — Terminal por chunk | ❌ Rejeitado | Explosão de eventos outbox; duplicação usage |

**Decisão CX-R04-03 (streaming):**

1. **HTTP/SSE:** `POST /v1/connections/inference:stream` emite frames normalizados (`start`, `delta`, `tool_call`, `usage_partial`, `end`, `error`) com `sequence` monotônico.
2. **Outbox:** `connections.inference.stream.v1` é **opcional** para audit de long-running jobs; payload leva `deltaRef` (ObjectRef) — nunca texto completo do modelo.
3. **Terminal obrigatório:** Ao fechar stream (sucesso ou falha), UoW emite **exatamente um** de `connections.inference.completed.v1` ou `connections.inference.failed.v1` + `connections.usage.recorded.v1` quando houver consumo.
4. **Invoke síncrono:** `POST /v1/connections/inference:invoke` retorna corpo HTTP completo **e** emite os mesmos eventos terminais (paridade orchestration SDK).

---

## HTTP — mapa `/v1/connections/*`

Prefixo conforme spec 005. Auth: sessão Better Auth + grant T01 por operação. `consumerKind` derivado do contexto institucional — header `X-Consumer-Kind` **ignorado** em produção.

| Método | Path | Comando / query | Grant mínimo |
| --- | --- | --- | --- |
| GET | `/v1/connections/providers` | ListProviders | `connections.read` |
| POST | `/v1/connections/providers/:providerId/subscriptions` | RegisterProviderSubscription | `connections.admin` |
| GET | `/v1/connections/accounts` | ListAIAccounts | `connections.read` (scope titular) |
| POST | `/v1/connections/accounts` | RegisterAIAccount | `connections.admin` |
| POST | `/v1/connections/accounts/:id/authorize` | AuthorizeAIAccount | `connections.admin` + OAuth handshake |
| GET | `/v1/connections/accounts/:id/grants` | ListConsumptionGrants | titular ou `connections.admin` |
| POST | `/v1/connections/accounts/:id/grants` | GrantPlatformConsumption | titular Owner |
| GET | `/v1/connections/bindings` | ListConnectionBindings | `connections.read` |
| POST | `/v1/connections/bindings` | CreateConnectionBinding | `connections.admin` + governance |
| POST | `/v1/connections/bindings/:id/activate` | ActivateConnectionBinding | `connections.admin` + T01 |
| POST | `/v1/connections/bindings/:id/suspend` | SuspendConnectionBinding | `connections.admin` |
| POST | `/v1/connections/bindings/:id/revoke` | RevokeConnectionBinding | `connections.admin` |
| GET | `/v1/connections/models` | ListModelOfferings | `connections.read` |
| GET | `/v1/connections/catalog-releases` | ListCatalogReleases | `connections.read` |
| POST | `/v1/connections/routing:explain` | ExplainRouting (dry-run) | `connections.read` |
| POST | `/v1/connections/inference:invoke` | InvokeInference (sync) | grant da capability + binding ACTIVE |
| POST | `/v1/connections/inference:stream` | InvokeInference (SSE) | idem invoke |
| GET | `/v1/connections/inference-jobs/:id` | GetInferenceJob | `connections.read` |
| POST | `/v1/connections/inference-jobs/:id:cancel` | CancelInferenceJob | titular ou task owner |
| GET | `/v1/connections/requests/:id/trace` | GetInferenceTrace | scope-redacted |
| GET | `/v1/connections/usage` | ListUsageRecords | titular / billing reader |
| GET | `/v1/connections/quotas` | ListQuotas | titular / admin |
| GET | `/v1/connections/health` | ListConnectionHealth | `connections.read` |
| POST | `/v1/connections/adapters` | RegisterAdapter (admin) | `connections.platform_admin` |
| POST | `/v1/connections/discovery-runs` | StartDiscoveryRun (admin) | `connections.platform_admin` |

**Decisão CX-R04-04:** Rotas de inferência delegam ao mesmo application handler que `resolveBinding` + `RuntimeAdapter` (CX-R03-02). OpenAPI **não** lista `REAL_EXECUTION` (CX-R02-INV-05).

---

## Exports `modules/connections/index.ts` (propostos)

```typescript
// Application — único entry point cross-module
export { resolveBinding, explainRouting, invokeInference, recordUsage } from "./application";
export type {
  ConnectionResolver,
  ResolvedBinding,
  ResolveBindingInput,
  UsageRecorder,
  RecordUsageInput,
} from "./domain/ports";

// Bootstrap
export { ensureConnectionsSchema } from "./infrastructure/schema";
```

**Proibido exportar:** `infrastructure/adapters/*`, repositórios Drizzle, `SecretPort` concreto, drivers Neo4j.

### `GrantValidationPort` — wiring (decisão R04)

| Opção | Veredito | Racional |
| --- | --- | --- |
| In-process `@anxionos/governance` query port | ✅ **Adotado v1** | Monólito modular ADR0002; latência e epoch consistency |
| HTTP interno `/v1/governance/grants:validate` | ⏳ Deferido | Multi-processo futuro — R06 |

---

## Plano de testes de contrato — `CX-R02-INV-*`

Arquivo proposto: `backend/tests/contracts/connections-contracts.test.ts` (implementação G1).

| Invariante | Teste | Assert |
| --- | --- | --- |
| **CX-R02-INV-01** | `connectionKindSchema` parse | `REAL_EXECUTION` → ZodError |
| **CX-R02-INV-01** | `createConnectionBindingCommandSchema` | body com `kind: "REAL_EXECUTION"` → reject |
| **CX-R02-INV-02** | `assertConnectionKindSupported("REAL_EXECUTION")` | throws `CX_CONNECTION_KIND_NOT_SUPPORTED` |
| **CX-R02-INV-03** | `effectClassSchema` | `LIVE_TRADING` → ZodError |
| **CX-R02-INV-03** | `adapterCapabilityManifestSchema` | `effectClass: "LIVE_TRADING"` → reject |
| **CX-R02-INV-04** | `importMappingSchema` (R09) | entrada live → `deferred` \| `rejected`, nunca `ACTIVE` |
| **CX-R02-INV-05** | OpenAPI snapshot lint | `REAL_EXECUTION` ausente do spec gerado |
| **CX-R02-SEC-01** | `secretRefSchema` | rejeita campos `apiKey`, `token`, `value` |
| **CX-R02-SEC-02** | cada payload em `connectionsEventPayloadSchema` | snapshot sem chaves proibidas |
| **CX-R03-INV-BND-07** | cross-check kinds R03 vs R04 | enums idênticos |

Testes adicionais (comportamento — R09):

- `invokeInference` com binding REVOKED → `CX_BINDING_REVOKED`
- Idempotency replay `invokeInference` → mesmo `inferenceRequestId` + `idempotentReplay: true`
- Stream fecha com `failed` → exatamente um `connections.inference.failed.v1`, zero `completed`

---

## Alternativas consideradas

| ID | Alternativa | Veredito | Racional |
| --- | --- | --- | --- |
| **ALT-CX-R04-01** | Eventos sem sufixo `.v1` (legado identity) | ❌ | Padronizar `connections.*.v1` desde o início |
| **ALT-CX-R04-02** | `InferenceRequirements` só em connections | ❌ | strategies e agents precisam do mesmo contrato (spec 005) |
| **ALT-CX-R04-03** | Usage apenas via evento (sem PG) | ❌ | R02/R03 — fonte autoritativa PG |
| **ALT-CX-R04-04** | OpenAI-compatible como contrato primário | ❌ | Façade opcional; Zod institucional é fonte |
| **ALT-CX-R04-05** | `connections.binding.*` sem `ai_account` | ❌ | Lifecycle conta distinto (CX-R03-01) |

---

## Riscos (preview — detalhe R07)

| ID | Risco | Sev | Mitigação R04 |
| --- | --- | --- | --- |
| **RK-CX-R04-01** | Stream sem terminal bloqueia billing | Alta | CX-R04-03 — teste G1 |
| **RK-CX-R04-02** | Drift enum R03 vs contracts | Média | Teste cross-check CX-R03-INV-BND-07 |
| **RK-CX-R04-03** | Header spoof `consumerKind` | Alta | Derivar da sessão/grant — spec 005 |
| **RK-CX-R04-04** | Payload stream vaza prompt | Crítica | `deltaRef` ObjectRef only |
| **RK-CX-R04-05** | OpenAPI lista kind proibido | Alta | CX-R02-INV-05 lint |

---

## Perguntas abertas → R05 (storage)

1. Tabelas PG exatas `connections_*`, índices idempotency e outbox `ownerDomain=connections`.
2. Colunas `secret_ref` JSON vs `secret_id` + `generation` normalizados.
3. Projeção Neo4j `graph:connections:v1` — quais eventos são síncronos vs async inbox.
4. SQLite cache catálogo — schema e TTL.
5. Retenção `connections.inference.stream.v1` vs apenas terminal em PG journal.
6. `GrantValidationPort` — interface exata no composition root (R06 complementa).

---

## Decisões registradas

| ID | Decisão | Racional |
| --- | --- | --- |
| **CX-R04-01** | PascalCase ANX-62 → `connections.*.v1` | Envelope institucional único |
| **CX-R04-02** | `InferenceRequirements` em `@anxionos/contracts/inference` | Shared agents/strategies/connections |
| **CX-R04-03** | Stream + terminal único `completed`/`failed` | UX + billing + audit |
| **CX-R04-04** | HTTP mapa spec 005 com grants nomeados | Paridade SDK e OpenAPI |
| **CX-R04-05** | `GrantValidationPort` in-process v1 | ADR0002 monólito modular |
| **CX-R04-06** | Testes contrato bloqueiam REAL_EXECUTION no schema | CX-R02-INV-01..03 testáveis |

---

## Critérios de aceite — R04

| # | Critério | Status |
| --- | --- | --- |
| AC-R04-01 | Layout `@anxionos/contracts/connections/*` + `inference/requirements` documentado | ✅ |
| AC-R04-02 | Catálogo `connections.*.v1` com normalização ANX-62 | ✅ |
| AC-R04-03 | Outline Zod commands/queries/events | ✅ |
| AC-R04-04 | HTTP `/v1/connections/*` com métodos, auth e grants | ✅ |
| AC-R04-05 | `InferenceRequirements` compartilhado documentado | ✅ |
| AC-R04-06 | Plano testes `CX-R02-INV-*` | ✅ |
| AC-R04-07 | Decisão streaming vs `completed` (CX-R04-03) | ✅ |
| AC-R04-08 | Sem secrets em payloads; `secretRef` opaco | ✅ |
| AC-R04-09 | Alternativas, riscos, perguntas → R05 | ✅ |
| AC-R04-10 | Alinhamento R02/R03/ANX-62/spec 005 | ✅ |

---

## Saída R4

✅ Contratos v1 aprovados para **R05 — Armazenamento** ([R05-storage-pg.md](./R05-storage-pg.md)).

**Próximo:** tabelas PG, journal/outbox `ownerDomain=connections`, projeção Neo4j `graph:connections:v1`, SQLite cache catálogo.
