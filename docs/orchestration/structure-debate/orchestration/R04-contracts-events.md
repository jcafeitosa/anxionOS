---
type: debate
---

# R04 — Contratos, eventos e superfície pública: `modules/orchestration`

**Componente:** modules/orchestration  
**Rodada:** R4 — Contratos, eventos e exports  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-46 · ANX-42 (debate estrutura) · ANX-44 (roster 8 personas)  
**Sessão Slack:** [Session D — R04 contracts/events](./SLACK-TRANSCRIPTS.md#session-d--r04-contracts-events)  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R02-paperclip-checkout-heartbeat.md](./R02-paperclip-checkout-heartbeat.md) · `brain/project-docs/specs/010-agent-hierarchy-orchestration/spec.md`

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Security | security-reviewer |
| QA | QA |
| Red Team | Red Team (Ryn) |
| Orquestrador | Orquestrador (CTO) |

## Objetivo da rodada

Definir a superfície pública de **orchestration** após [R03-domain-sketch.md](./R03-domain-sketch.md): schemas Zod em `@anxionos/contracts/orchestration/*`, catálogo de eventos versionados, esboço HTTP `/v1/orchestration/*`, assinaturas de comandos application e exports de `modules/orchestration/index.ts`. Normalizar `GateBinding` **1.0.0** (fecha implementação de ORCH-R03-03).

## Fontes aplicadas

| Fonte | Uso em R4 |
| --- | --- |
| [R03-domain-sketch.md](./R03-domain-sketch.md) | Agregados, invariantes INV-ORC-01..12, payloads sketch |
| [R02-paperclip-checkout-heartbeat.md](./R02-paperclip-checkout-heartbeat.md) | ORCH-R02-01..08, checkout/heartbeat |
| `brain/project-docs/specs/010-agent-hierarchy-orchestration/spec.md` | Gates G0–G7, OH01–OH12 |
| `backend/packages/contracts` | `domainEventEnvelopeSchema`, `schemaVersion` 0.1.0 |
| [identity/R04-contracts-events.md](../identity/R04-contracts-events.md) | Padrão de layout contracts |

## Debate R4 (síntese atribuída)

**Executor:** Contratos em `@anxionos/contracts/orchestration/` com subpastas `gate-binding/1.0.0`, `events/`, `commands.ts`, `queries.ts`. Módulo expõe use cases; HTTP em `apps/api` com validação Zod na borda.

**Code Review:** `eventType` com prefixo `orchestration.` e sufixo `.v1`. Comandos HTTP usam `Idempotency-Key` (UUID) → `commandId` no journal. `leaseToken` retornado só em resposta HTTP autenticada — nunca em evento nem log.

**Crítico:** `RecordGateDisposition` exige `artifactDigest` para todo disposition exceto `NOT_APPLICABLE` (que exige `notApplicableReason`). Discordância resolvida: digest opcional só para N/A com reason obrigatório.

**Security:** G7 PASS valida `reviewerId === ownerPrincipalId` na application layer. Webhook taskboard assinado com HMAC quando configurado; polling fallback não eleva privilégio.

**Síntese Orquestrador:** Contratos v1 fechados para checkout, gate binding e mirror taskboard; implementação bloqueada até greenlight + issue derivada; R05 cobre Drizzle/PG.

---

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `schemaVersion` (envelope) | `0.1.0` (herda `packages/contracts`) |
| `schemaVersion` (GateBinding) | `1.0.0` (campo no binding, independente do envelope) |
| `ownerDomain` | `"orchestration"` em todos os eventos |
| `eventType` | `orchestration.<aggregate>.<action>.v1` |
| Idempotência comandos | Header `Idempotency-Key` (UUID) + chaves naturais documentadas por comando |
| Correlação | `correlationId` = `runId` quando aplicável; `requestId` do contexto HTTP em metadata |
| Tenancy | `organizationId` em path ou derivado da sessão; validar grant T01 antes de mutação externa |
| Erros | `details.code` na borda HTTP; códigos abaixo |

### Códigos de domínio (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| `ORC_TASK_NOT_FOUND` | 404 | Task inexistente ou fora do scope |
| `ORC_RUN_NOT_FOUND` | 404 | Run inexistente |
| `ORC_GOAL_NOT_FOUND` | 404 | Goal inexistente |
| `ORC_LEASE_CONFLICT` | 409 | Outro agente detém lease vigente |
| `ORC_LEASE_EXPIRED` | 409 | Operação exige lease válido |
| `ORC_CHECKOUT_DENIED` | 409 | G0 ausente ou issue não `in_progress` |
| `ORC_GATE_REVIEWER_MISMATCH` | 403 | G7 sem Owner; revisor = autor |
| `ORC_GATE_DIGEST_REQUIRED` | 400 | Disposition exige `artifactDigest` |
| `ORC_GATE_NA_REASON_REQUIRED` | 400 | `NOT_APPLICABLE` sem `notApplicableReason` |
| `ORC_MIRROR_REJECTED` | 409 | Board `done` sem G7 PASS (OH07) |
| `ORC_IDEMPOTENT_REPLAY` | 200 | Replay documentado — corpo inclui `idempotentReplay: true` |

---

## `packages/contracts` — novos artefatos (propostos)

```text
packages/contracts/src/orchestration/
├── types.ts                    # enums, branded IDs, HierarchyMode
├── gate-binding/
│   └── 1.0.0/
│       └── schema.ts           # gateBindingV1Schema
├── commands.ts                 # input schemas de comandos
├── queries.ts                  # DTOs de leitura
├── events.ts                   # payload schemas + mapa eventType
└── index.ts                    # re-export
```

### Tipos compartilhados (`types.ts`)

```typescript
import { z } from "zod";

export const gateIdSchema = z.enum(["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]);
export const gateDispositionSchema = z.enum([
  "PASS",
  "CHANGES_REQUIRED",
  "BLOCKED",
  "NOT_APPLICABLE",
]);
export const hierarchyModeSchema = z.enum(["HIERARCHY_TREE", "HIERARCHY_CIRCULAR"]);
export const checkoutStatusSchema = z.enum(["UNCLAIMED", "LEASED", "COMPLETED", "BLOCKED"]);
export const runStatusSchema = z.enum([
  "SCHEDULED",
  "WAKING",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ORPHANED",
  "BUDGET_STOPPED",
  "TERMINATED",
]);

export const taskIdSchema = z.string().uuid();
export const runIdSchema = z.string().uuid();
export const goalIdSchema = z.string().uuid();
export const issueIdentifierSchema = z.string().regex(/^ANX-[0-9]+$/);
export const artifactDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const agentIdSchema = z.string().min(1).max(128);
export const organizationIdSchema = z.string().min(1).max(64);
```

### `GateBinding` 1.0.0 (`gate-binding/1.0.0/schema.ts`)

```typescript
import { z } from "zod";
import {
  agentIdSchema,
  artifactDigestSchema,
  gateDispositionSchema,
  gateIdSchema,
  hierarchyModeSchema,
  issueIdentifierSchema,
  runIdSchema,
} from "../../types";

export const gateBindingSchemaVersion = "1.0.0";

const gateBindingBaseSchema = z.object({
  schemaVersion: z.literal(gateBindingSchemaVersion),
  gateId: gateIdSchema,
  issueIdentifier: issueIdentifierSchema,
  disposition: gateDispositionSchema,
  reviewerId: agentIdSchema,
  recordedAt: z.string().datetime(),
  runId: runIdSchema.optional(),
  artifactRevision: z.number().int().min(1).optional(),
  hierarchyModeAtRecord: hierarchyModeSchema.optional(),
  invalidatedAt: z.string().datetime().optional(),
});

export const gateBindingV1Schema = gateBindingBaseSchema.superRefine((val, ctx) => {
  if (val.disposition === "NOT_APPLICABLE") {
    if (!val.notApplicableReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notApplicableReason required for NOT_APPLICABLE",
        path: ["notApplicableReason"],
      });
    }
    return;
  }
  if (!val.artifactDigest) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "artifactDigest required unless NOT_APPLICABLE",
      path: ["artifactDigest"],
    });
  }
}).and(
  z.object({
    artifactDigest: artifactDigestSchema.optional(),
    notApplicableReason: z.string().max(500).optional(),
  }),
);

export type GateBindingV1 = z.infer<typeof gateBindingV1Schema>;
```

**Decisão ORCH-R04-01:** `gateBindingV1Schema` é fonte única; JSON Schema R03 é derivado, não normativo.

### Inputs de comandos (`commands.ts`)

```typescript
import { z } from "zod";
import {
  agentIdSchema,
  goalIdSchema,
  issueIdentifierSchema,
  organizationIdSchema,
  taskIdSchema,
} from "./types";
import { gateBindingV1Schema } from "./gate-binding/1.0.0/schema";

export const checkoutTaskCommandSchema = z.object({
  taskId: taskIdSchema,
  agentId: agentIdSchema,
  organizationId: organizationIdSchema,
  leaseTtlMs: z.number().int().min(60_000).max(28_800_000).optional(),
});

export const renewTaskLeaseCommandSchema = z.object({
  taskId: taskIdSchema,
  agentId: agentIdSchema,
  leaseToken: z.string().uuid(),
});

export const releaseTaskLeaseCommandSchema = z.object({
  taskId: taskIdSchema,
  agentId: agentIdSchema,
  leaseToken: z.string().uuid(),
  reason: z.enum(["board_in_review", "manual", "gate_blocked"]).optional(),
});

export const recordGateDispositionCommandSchema = gateBindingV1Schema.omit({
  schemaVersion: true,
  recordedAt: true,
  invalidatedAt: true,
}).extend({
  organizationId: organizationIdSchema,
});

export const proposePlanRevisionCommandSchema = z.object({
  goalId: goalIdSchema,
  organizationId: organizationIdSchema,
  proposedByAgentId: agentIdSchema,
  rationale: z.string().min(1).max(4000),
  requiresG0Rebind: z.boolean().default(true),
});

export const ingestTaskboardWebhookCommandSchema = z.object({
  issueIdentifier: issueIdentifierSchema,
  status: z.enum(["todo", "in_progress", "in_review", "blocked", "done"]),
  boardVersion: z.number().int().nonnegative(),
  threadId: z.string().max(128).optional(),
  occurredAt: z.string().datetime(),
  signature: z.string().optional(),
});
```

### DTOs de leitura (`queries.ts`)

```typescript
import { z } from "zod";
import {
  checkoutStatusSchema,
  goalIdSchema,
  issueIdentifierSchema,
  runStatusSchema,
  taskIdSchema,
} from "./types";

export const taskDtoSchema = z.object({
  id: taskIdSchema,
  organizationId: z.string(),
  goalId: goalIdSchema,
  goalAncestry: z.array(goalIdSchema),
  issueIdentifier: issueIdentifierSchema,
  title: z.string(),
  checkoutStatus: checkoutStatusSchema,
  leaseExpiresAt: z.string().datetime().optional(),
  revision: z.number().int().nonnegative(),
});

export const runDtoSchema = z.object({
  id: z.string().uuid(),
  taskId: taskIdSchema,
  agentId: z.string(),
  issueIdentifier: issueIdentifierSchema,
  status: runStatusSchema,
  goalAncestry: z.array(goalIdSchema),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const checkoutTaskResultSchema = z.object({
  task: taskDtoSchema,
  run: runDtoSchema,
  leaseToken: z.string().uuid(),
  idempotentReplay: z.boolean(),
});
```

---

## Eventos de domínio versionados

Envelope: `domainEventEnvelopeSchema` de `@anxionos/contracts`.

### Catálogo v1

| eventType | aggregate | Emitido por | Consumidores previstos |
| --- | --- | --- | --- |
| `orchestration.task.checked_out.v1` | Task | `checkoutTask` | audit, graph T06 (opcional) |
| `orchestration.task.lease_released.v1` | Task | `releaseTaskLease`, mirror `in_review` | audit, scheduler |
| `orchestration.task.lease_renewed.v1` | Task | `renewTaskLease` | audit |
| `orchestration.run.orphaned.v1` | Run | lease TTL expirado | audit, agents wakeup |
| `orchestration.gate.disposition.recorded.v1` | GateBinding | `recordGateDisposition` | audit, graph (CIRCULAR ReviewEdge) |
| `orchestration.plan.revision.proposed.v1` | PlanRevision | `proposePlanRevision` | audit, governance (futuro) |

**Decisão ORCH-R04-02:** Catálogo v1 fecha P-R3-01 e P-R3-02; eventos adicionais exigem `.v2` ou novo sufixo.

### Schemas de payload (`events.ts`)

```typescript
import { z } from "zod";
import {
  agentIdSchema,
  checkoutStatusSchema,
  goalIdSchema,
  issueIdentifierSchema,
  organizationIdSchema,
  runIdSchema,
  taskIdSchema,
} from "./types";
import { gateBindingV1Schema } from "./gate-binding/1.0.0/schema";

export const orchestrationTaskCheckedOutV1PayloadSchema = z.object({
  taskId: taskIdSchema,
  runId: runIdSchema,
  agentId: agentIdSchema,
  organizationId: organizationIdSchema,
  issueIdentifier: issueIdentifierSchema,
  goalId: goalIdSchema,
  goalAncestry: z.array(goalIdSchema).min(1),
  leaseExpiresAt: z.string().datetime(),
  checkoutStatus: checkoutStatusSchema,
  idempotentReplay: z.boolean(),
});

export const orchestrationTaskLeaseReleasedV1PayloadSchema = z.object({
  taskId: taskIdSchema,
  runId: runIdSchema.optional(),
  agentId: agentIdSchema,
  issueIdentifier: issueIdentifierSchema,
  reason: z.enum(["board_in_review", "manual", "gate_blocked", "ttl_expired"]),
});

export const orchestrationGateDispositionRecordedV1PayloadSchema = z.object({
  bindingId: z.string().uuid(),
  organizationId: organizationIdSchema,
  issueIdentifier: issueIdentifierSchema,
  gateBinding: gateBindingV1Schema,
  hierarchyMode: z.enum(["HIERARCHY_TREE", "HIERARCHY_CIRCULAR"]),
  invalidatedPriorCount: z.number().int().nonnegative(),
});

export const orchestrationEventPayloadSchemas = {
  "orchestration.task.checked_out.v1": orchestrationTaskCheckedOutV1PayloadSchema,
  "orchestration.task.lease_released.v1": orchestrationTaskLeaseReleasedV1PayloadSchema,
  "orchestration.task.lease_renewed.v1": z.object({
    taskId: taskIdSchema,
    runId: runIdSchema,
    agentId: agentIdSchema,
    leaseExpiresAt: z.string().datetime(),
  }),
  "orchestration.run.orphaned.v1": z.object({
    runId: runIdSchema,
    taskId: taskIdSchema,
    agentId: agentIdSchema,
    issueIdentifier: issueIdentifierSchema,
    previousStatus: z.string(),
  }),
  "orchestration.gate.disposition.recorded.v1":
    orchestrationGateDispositionRecordedV1PayloadSchema,
  "orchestration.plan.revision.proposed.v1": z.object({
    planRevisionId: z.string().uuid(),
    goalId: goalIdSchema,
    proposedByAgentId: agentIdSchema,
    requiresG0Rebind: z.boolean(),
  }),
} as const;
```

### Exemplo — `orchestration.task.checked_out.v1`

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440020",
  "schemaVersion": "0.1.0",
  "ownerDomain": "orchestration",
  "eventType": "orchestration.task.checked_out.v1",
  "occurredAt": "2026-09-08T22:15:00.000Z",
  "correlationId": "run-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "taskId": "t1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "runId": "run-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "agentId": "agent-ceo-001",
    "organizationId": "org-001",
    "issueIdentifier": "ANX-46",
    "goalId": "goal-leaf-001",
    "goalAncestry": ["goal-l0-001", "goal-l1-001", "goal-leaf-001"],
    "leaseExpiresAt": "2026-09-09T02:15:00.000Z",
    "checkoutStatus": "LEASED",
    "idempotentReplay": false
  }
}
```

### Exemplo — `orchestration.gate.disposition.recorded.v1`

```json
{
  "eventId": "770e8400-e29b-41d4-a716-446655440030",
  "schemaVersion": "0.1.0",
  "ownerDomain": "orchestration",
  "eventType": "orchestration.gate.disposition.recorded.v1",
  "occurredAt": "2026-09-08T23:00:00.000Z",
  "correlationId": "run-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "bindingId": "gb-001",
    "organizationId": "org-001",
    "issueIdentifier": "ANX-46",
    "gateBinding": {
      "schemaVersion": "1.0.0",
      "gateId": "G2",
      "issueIdentifier": "ANX-46",
      "disposition": "PASS",
      "reviewerId": "agent-cr-001",
      "artifactDigest": "a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2",
      "artifactRevision": 2,
      "hierarchyModeAtRecord": "HIERARCHY_CIRCULAR",
      "recordedAt": "2026-09-08T23:00:00.000Z"
    },
    "hierarchyMode": "HIERARCHY_CIRCULAR",
    "invalidatedPriorCount": 1
  }
}
```

---

## HTTP — esboço `/v1/orchestration/*`

Rotas em `apps/api`; validação com schemas de `commands.ts` / `queries.ts`. Autenticação via Better Auth + grant T01 quando mutação tem efeito externo.

| Método | Rota | Comando / query | Notas |
| --- | --- | --- | --- |
| `POST` | `/v1/orchestration/tasks/:taskId/checkout` | `checkoutTask` | `Idempotency-Key`; retorna `checkoutTaskResultSchema` |
| `POST` | `/v1/orchestration/tasks/:taskId/lease/renew` | `renewTaskLease` | Body: `leaseToken` |
| `POST` | `/v1/orchestration/tasks/:taskId/lease/release` | `releaseTaskLease` | Libera lease; Run → `PAUSED` |
| `GET` | `/v1/orchestration/tasks/:taskId` | `getTask` | DTO sem `leaseToken` |
| `GET` | `/v1/orchestration/runs/:runId` | `getRun` | |
| `POST` | `/v1/orchestration/gates/dispositions` | `recordGateDisposition` | Invalida PASS anteriores (ORCH-R03-06) |
| `GET` | `/v1/orchestration/issues/:issueIdentifier/gates` | `listGateBindingsByIssue` | Ordenado por `recordedAt` desc |
| `POST` | `/v1/orchestration/plan-revisions` | `proposePlanRevision` | Defer implementação P1 |
| `POST` | `/v1/orchestration/taskboard/webhook` | `ingestTaskboardWebhook` | HMAC opcional; interno/loopback |
| `POST` | `/v1/orchestration/taskboard/sync` | worker trigger | Admin/internal — polling manual |

**Decisão ORCH-R04-03:** Prefixo `/v1/orchestration` fixo; breaking change → `/v2`. OpenAPI via Scalar no composition root.

### Exemplo request — checkout

```http
POST /v1/orchestration/tasks/t1b2c3d4-e5f6-7890-abcd-ef1234567890/checkout
Idempotency-Key: 8f14e45f-ceea-467a-9e5d-6cb0c96758f7
Content-Type: application/json

{
  "agentId": "agent-ceo-001",
  "organizationId": "org-001"
}
```

### Exemplo response — checkout (201)

```json
{
  "task": { "id": "t1b2c3d4-...", "checkoutStatus": "LEASED", "leaseExpiresAt": "2026-09-09T02:15:00.000Z" },
  "run": { "id": "run-a1b2c3d4-...", "status": "ACTIVE" },
  "leaseToken": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "idempotentReplay": false
}
```

---

## Comandos application — assinaturas

```typescript
// application/commands/checkout-task.ts
export interface CheckoutTaskDeps {
  unitOfWork: OrchestrationUnitOfWork;
  taskboardMirror: TaskboardMirrorPort;
  leaseClock: LeaseClock;
}

export async function checkoutTask(
  deps: CheckoutTaskDeps,
  input: CheckoutTaskInput,
): Promise<CheckoutTaskResult>;

// application/commands/record-gate-disposition.ts
export interface RecordGateDispositionDeps {
  unitOfWork: OrchestrationUnitOfWork;
  gateBindingRepository: GateBindingRepository;
  hierarchyModeResolver: HierarchyModeResolver;
}

export async function recordGateDisposition(
  deps: RecordGateDispositionDeps,
  input: RecordGateDispositionInput,
): Promise<GateBinding>;

// application/commands/renew-task-lease.ts
export async function renewTaskLease(
  deps: RenewTaskLeaseDeps,
  input: RenewTaskLeaseInput,
): Promise<TaskLease>;

// application/commands/release-task-lease.ts
export async function releaseTaskLease(
  deps: ReleaseTaskLeaseDeps,
  input: ReleaseTaskLeaseInput,
): Promise<void>;

// application/queries/get-task.ts
export async function getTask(deps: GetTaskDeps, taskId: string): Promise<TaskDto | null>;

// application/queries/list-gate-bindings-by-issue.ts
export async function listGateBindingsByIssue(
  deps: ListGateBindingsDeps,
  issueIdentifier: string,
): Promise<GateBindingV1[]>;
```

| Comando | Idempotência | UoW |
| --- | --- | --- |
| `checkoutTask` | `(agentId, taskId)` lease vigente | Task + Run + outbox |
| `recordGateDisposition` | `(issue, gateId, digest, disposition)` | GateBinding + outbox + invalidate |
| `renewTaskLease` | `(taskId, leaseToken)` até cap 8h | Task lease row |
| `releaseTaskLease` | `(taskId, leaseToken)` | Task + Run + outbox opcional |
| `ingestTaskboardWebhook` | `(issueIdentifier, boardVersion, status)` | Mirror only — sem outbox |

**Decisão ORCH-R04-04:** `ingestTaskboardWebhook` não emite evento próprio — efeitos derivados (`lease_released`) usam comandos internos com outbox.

---

## Integração taskboard (contrato mirror)

| Aspecto | Contrato R04 |
| --- | --- |
| Webhook | `ingestTaskboardWebhookCommandSchema`; dedupe `(issueIdentifier, boardVersion, status)` |
| Polling | Worker 60s — `listActiveIssues` com lease; mesma dedupe |
| Assinatura | Header `X-Taskboard-Signature` HMAC-SHA256 quando `TASKBOARD_WEBHOOK_SECRET` configurado |
| Rejeição `done` | `ORC_MIRROR_REJECTED` sem `GateBinding(G7, PASS)` |

**Decisão ORCH-R04-05:** Híbrido R03 formalizado em schema webhook + worker contract; implementação worker em R06/R09.

---

## Superfície pública — `modules/orchestration/index.ts`

### Export alvo v1 (documental — sem código até greenlight)

```typescript
// Tipos de domínio (leitura)
export type { Goal, Task, Run, TaskLease, GateBinding, PlanRevision };

// Comandos P0
export {
  checkoutTask,
  recordGateDisposition,
  renewTaskLease,
  releaseTaskLease,
  type CheckoutTaskDeps,
  type CheckoutTaskInput,
  type CheckoutTaskResult,
  type RecordGateDispositionDeps,
  type RecordGateDispositionInput,
};

// Queries P0
export {
  getTask,
  getRun,
  listGateBindingsByIssue,
};

// Ports (tipos apenas — implementação infra)
export type {
  TaskRepository,
  RunRepository,
  GateBindingRepository,
  TaskboardMirrorPort,
  OrchestrationUnitOfWork,
  LeaseClock,
};

// Constants
export { DEFAULT_LEASE_TTL_MS, MAX_LEASE_TTL_MS, TASKBOARD_POLL_INTERVAL_MS };
```

### Proibido exportar

| Item | Motivo |
| --- | --- |
| Implementações Drizzle / HTTP adapters | Infra interna |
| Worker `taskboard-sync` | `apps/workers` composition |
| Schemas Zod | `@anxionos/contracts/orchestration` |
| `leaseToken` em logs/helpers | Security — boundary HTTP only |

---

## Tabela de decisões ORCH-R04

| ID | Decisão | Relação |
| --- | --- | --- |
| **ORCH-R04-01** | `gateBindingV1Schema` Zod é normativo; JSON Schema R03 derivado | ORCH-R03-03 |
| **ORCH-R04-02** | Catálogo 6 eventos v1 documentado com mapa `eventType → schema` | P-R3-01, P-R3-02 |
| **ORCH-R04-03** | HTTP `/v1/orchestration/*` — 10 rotas sketch | ADR0002 apps/api |
| **ORCH-R04-04** | Webhook mirror dedupe; efeitos via comandos internos + outbox | ORCH-R03-05, ORCH-R03-08 |
| **ORCH-R04-05** | HMAC webhook opcional; polling 60s contract alinhado | ORCH-R03-05 |
| **ORCH-R04-06** | `NOT_APPLICABLE` exige `notApplicableReason`; demais exigem digest | ORCH-R03-06, Red Team R03 |
| **ORCH-R04-07** | `leaseToken` só em `checkoutTaskResult` HTTP — nunca evento | ORCH-R03-02 |
| **ORCH-R04-08** | CIRCULAR: `gate.disposition.recorded.v1` inclui binding completo para graph | ORCH-R03-07 |

---

## Critérios de aceite R4

| # | Critério | Status |
| --- | --- | --- |
| AC-R4-01 | `gateBindingV1Schema` Zod documentado | ✅ |
| AC-R4-02 | Catálogo eventos v1 com payloads e exemplos JSON | ✅ |
| AC-R4-03 | HTTP sketch `/v1/orchestration/*` (≥8 rotas) | ✅ |
| AC-R4-04 | Assinaturas comandos P0 + idempotência | ✅ |
| AC-R4-05 | `index.ts` exports alvo + proibições | ✅ |
| AC-R4-06 | Códigos erro `ORC_*` documentados | ✅ |
| AC-R4-07 | Decisões ORCH-R04-01..08 registradas | ✅ |
| AC-R4-08 | Taskboard webhook schema + ORCH-R04-05 | ✅ |

## Pendências para rodadas seguintes

| ID | Assunto | Rodada |
| --- | --- | --- |
| P-R4-01 | Criar `packages/contracts/src/orchestration/*` | Implementação G1 |
| P-R4-02 | Drizzle tables + migrações | R05 |
| P-R4-03 | Rotas Elysia em `apps/api` | R09 |
| P-R4-04 | Worker `taskboard-sync` polling 60s | R06 / R09 |
| P-R4-05 | Fixtures contrato + testes AR01 | R09 |
| P-R4-06 | Consumer graph `orchestration:gate:v1` | graph P03 |

## Próxima rodada

→ **R05 — Storage** (`R05-storage-pg.md`) — tabelas PG, índices lease, outbox orchestration. ✅ Concluído (ORCH-R05-01..08).
