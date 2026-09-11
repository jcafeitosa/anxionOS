---
type: debate
---

# R03 — Esboço de domínio: `modules/orchestration`

**Componente:** modules/orchestration  
**Rodada:** R3 — Domain model  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-46 · ANX-42 (debate estrutura) · ANX-44 (roster 8 personas)  
**Sessão Slack:** [Session C — R03 domain sketch](./SLACK-TRANSCRIPTS.md#session-c--r03-domain-sketch)  
**Pré-requisito:** [R02-paperclip-checkout-heartbeat.md](./R02-paperclip-checkout-heartbeat.md) · [R01-hierarchy-modes.md](./R01-hierarchy-modes.md) · `brain/project-docs/specs/010-agent-hierarchy-orchestration/spec.md` · `brain/project-docs/decisions/0010-agent-hierarchy-modes-triangular-circular.md`

## Objetivo da rodada

Esboçar o modelo de domínio de **orchestration** após R02: agregados `Goal`, `Task`, `Run`, `TaskLease`, `RunHeartbeat`, `GateBinding`, `PlanRevision`; invariantes de lease/heartbeat; payload `orchestration.task.checked_out.v1`; schema `GateBinding` v1; integração taskboard (webhook + polling fallback). Fechar **ORCH-R02-08** e registrar decisões **ORCH-R03-***.

## Fontes aplicadas

| Fonte | Uso em R3 |
| --- | --- |
| [R02-paperclip-checkout-heartbeat.md](./R02-paperclip-checkout-heartbeat.md) | ORCH-R02-01..08, perguntas abertas R03 |
| `brain/project-docs/specs/010-agent-hierarchy-orchestration/spec.md` | `GateBinding`, OH01–OH12, gates G0–G7 |
| `brain/project-docs/specs/002-agents-knowledge/spec.md` | Run, heartbeat, CEO Agent |
| [DEBATE-ROSTER.md](../../DEBATE-ROSTER.md) | 8 personas Session C |

## Debate R3 (síntese atribuída)

**Arquiteto:** Seis agregados/entidades núcleo v1: `Goal`, `Task`, `Run`, `TaskLease` (value object embarcado ou tabela filha), `GateBinding`, `PlanRevision`. `RunHeartbeat` como entidade de fila, não agregado raiz.

**Executor:** Ports: `TaskRepository`, `RunRepository`, `GoalRepository`, `GateBindingRepository`, `LeaseClock`, `TaskboardMirrorPort`. Checkout + outbox na mesma transação UoW.

**Crítico:** Webhook-only falha em dev loopback; polling-only perde latência G0. Híbrido com idempotência por `eventId` do board.

**Security:** `leaseToken` opaco UUID; nunca logar token completo; payload de evento omite contexto de sessão anterior em `ORPHANED`.

**Síntese Orquestrador:** Domain sketch v1 aprovado; implementação bloqueada até greenlight + issue derivada; R04 normaliza contratos Zod.

---

## Agregados e entidades

### `Goal`

Missão decomponível; ancora `goalAncestry` em Task/Run.

```typescript
interface Goal {
  id: GoalId;
  organizationId: string;
  parentGoalId?: GoalId;
  title: string;
  priority: number;
  status: GoalStatus;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

type GoalStatus = "draft" | "active" | "completed" | "archived";
```

### `Task`

Unidade de trabalho produto; espelha issue ANX-*.

```typescript
interface Task {
  id: TaskId;
  organizationId: string;
  goalId: GoalId;
  goalAncestry: GoalId[];
  parentTaskId?: TaskId;
  issueIdentifier: string;
  title: string;
  checkoutStatus: CheckoutStatus;
  lease?: TaskLease;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

type CheckoutStatus = "UNCLAIMED" | "LEASED" | "COMPLETED" | "BLOCKED";
```

### `TaskLease` (value object / row transacional)

```typescript
interface TaskLease {
  taskId: TaskId;
  agentId: string;
  runId: RunId;
  leaseToken: string;
  leasedAt: Date;
  expiresAt: Date;
  heartbeatDueAt?: Date;
}
```

### `Run`

Execução de agente sobre Task; sessão retomável.

```typescript
interface Run {
  id: RunId;
  taskId: TaskId;
  agentId: string;
  organizationId: string;
  goalAncestry: GoalId[];
  issueIdentifier: string;
  parentRunId?: RunId;
  leaseToken: string;
  status: RunStatus;
  coalesceKey: string;
  revision: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type RunStatus =
  | "SCHEDULED"
  | "WAKING"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ORPHANED"
  | "BUDGET_STOPPED"
  | "TERMINATED";
```

### `RunHeartbeat` (fila durável)

```typescript
interface RunHeartbeat {
  id: string;
  runId: RunId;
  agentId: string;
  taskId: TaskId;
  coalesceKey: string;
  nextWakeAt: Date;
  status: "pending" | "processing" | "done" | "cancelled";
  attempt: number;
  createdAt: Date;
}
```

### `GateBinding`

Registro estruturado de parecer G0–G7 — distinto de comentário humano no board.

```typescript
interface GateBinding {
  id: GateBindingId;
  organizationId: string;
  gateId: GateId;
  issueIdentifier: string;
  runId?: RunId;
  disposition: GateDisposition;
  reviewerId: string;
  artifactDigest: string;
  artifactRevision?: number;
  hierarchyModeAtRecord: HierarchyMode;
  recordedAt: Date;
  invalidatedAt?: Date;
  schemaVersion: "1.0.0";
}

type GateId = "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
type GateDisposition = "PASS" | "CHANGES_REQUIRED" | "BLOCKED" | "NOT_APPLICABLE";
type HierarchyMode = "HIERARCHY_TREE" | "HIERARCHY_CIRCULAR";
```

### `PlanRevision`

Entidade **separada** de `Goal` — captura mudança de estratégia/prioridade com revalidação G0.

```typescript
interface PlanRevision {
  id: string;
  goalId: GoalId;
  organizationId: string;
  previousRevision: number;
  proposedByAgentId: string;
  status: "proposed" | "approved" | "rejected" | "superseded";
  rationale: string;
  requiresG0Rebind: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}
```

---

## Invariantes de domínio

| ID | Regra |
| --- | --- |
| INV-ORC-01 | Toda Task de implementação tem `issueIdentifier` ANX-* e `goalAncestry` não vazio |
| INV-ORC-02 | Checkout atômico: no máximo um `TaskLease` vigente por `taskId` |
| INV-ORC-03 | `CheckoutTask` idempotente por `(agentId, taskId)` com lease não expirado — retorna Run existente |
| INV-ORC-04 | `Run.leaseToken` deve igualar `Task.lease.leaseToken` enquanto Run não terminal |
| INV-ORC-05 | Lease expirado → `checkoutStatus = UNCLAIMED`, Run ativo → `ORPHANED`, `leaseToken` zerado |
| INV-ORC-06 | Checkout exige issue em `in_progress` no taskboard **ou** `GateBinding(G0, PASS)` vigente |
| INV-ORC-07 | `in_review` no board libera lease; não implica gate PASS (OH07) |
| INV-ORC-08 | `GateBinding(G7, PASS)` só com `reviewerId = ownerPrincipalId` |
| INV-ORC-09 | Novo `GateBinding` com `artifactDigest` diferente invalida PASS anteriores do mesmo `(issueIdentifier, gateId)` |
| INV-ORC-10 | Heartbeats coalesce por `coalesceKey` dentro de `coalesceWindowMs` |
| INV-ORC-11 | Mutações confirmam estado + journal + outbox na mesma transação PG |
| INV-ORC-12 | `domain/*` não importa HTTP taskboard, Neo4j nem secrets |

---

## TTL de `TaskLease` e heartbeat por adapter

| Parâmetro | Default v1 | Notas |
| --- | --- | --- |
| `leaseTtlMs` | **4h** (14_400_000) | Renovável via `RenewTaskLease` até cap 8h |
| `leaseRenewWindowMs` | 30 min antes de expirar | Heartbeat ativo renova automaticamente |
| `coalesceWindowMs` | 30s | ORCH-R02-02 |
| `heartbeatIntervalMs` — Cursor | 5 min | Adapter Cursor IDE |
| `heartbeatIntervalMs` — Codex CLI | 3 min | Sessões headless |
| `heartbeatIntervalMs` — generic worker | 2 min | apps/workers default |
| `orphanGraceMs` | 60s | Entre lease expirado e requeue |

**Decisão ORCH-R03-01:** TTL default **4h**; renovação automática no heartbeat `ACTIVE` se T01 permitir; cap absoluto **8h** sem Owner extend.

---

## Evento `orchestration.task.checked_out.v1`

Envelope institucional (`ownerDomain: "orchestration"`, `schemaVersion: "1.0.0"`).

### Payload (normativo v1)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440020",
  "schemaVersion": "1.0.0",
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

| Campo | Semântica |
| --- | --- |
| `correlationId` | Igual a `runId` — correlaciona outbox → audit → graph T06 |
| `leaseExpiresAt` | ISO8601; **não** inclui `leaseToken` |
| `idempotentReplay` | `true` quando checkout retorna Run existente sem novo efeito |
| Omitido | `leaseToken`, secrets, diff de workspace, thread id completo |

### Correlação outbox

1. `CheckoutTask` dentro de UoW: insert/update Task + insert Run + insert outbox row
2. `eventId` UUID v4 único; dedupe consumer por `(eventId)`
3. Audit projector consome para Flight Recorder; graph T06 opcional por subárvore
4. Taskboard mirror **não** é escrito no outbox — side effect via `TaskboardMirrorPort` pós-commit (ORCH-R03-05)

**Decisão ORCH-R03-02:** Payload acima é contrato v1; `leaseToken` **nunca** em evento.

---

## Schema `GateBinding` v1 (fecha ORCH-R02-08)

### JSON Schema (rascunho normativo — R04 `@anxionos/contracts`)

```json
{
  "$id": "https://anxionos.dev/schemas/orchestration/gate-binding/1.0.0",
  "type": "object",
  "required": [
    "gateId",
    "issueIdentifier",
    "disposition",
    "reviewerId",
    "artifactDigest",
    "recordedAt",
    "schemaVersion"
  ],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "gateId": { "enum": ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"] },
    "issueIdentifier": { "pattern": "^ANX-[0-9]+$" },
    "runId": { "type": "string", "format": "uuid" },
    "disposition": {
      "enum": ["PASS", "CHANGES_REQUIRED", "BLOCKED", "NOT_APPLICABLE"]
    },
    "reviewerId": { "type": "string", "minLength": 1 },
    "artifactDigest": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "artifactRevision": { "type": "integer", "minimum": 1 },
    "hierarchyModeAtRecord": {
      "enum": ["HIERARCHY_TREE", "HIERARCHY_CIRCULAR"]
    },
    "recordedAt": { "type": "string", "format": "date-time" },
    "invalidatedAt": { "type": "string", "format": "date-time" },
    "notApplicableReason": { "type": "string", "maxLength": 500 }
  }
}
```

### Comando `RecordGateDisposition`

| Aspecto | Decisão |
| --- | --- |
| Pré-condição | Revisor ≠ autor do artefato; grant T01 para gate quando aplicável |
| Efeito TREE | Insert `GateBinding` + audit; **sem** `ReviewEdge` |
| Efeito CIRCULAR G2–G5 | Insert `GateBinding` + emite `orchestration.gate.disposition.recorded.v1` → graph projeta `ReviewEdge` |
| Idempotência | Mesmo `(issueIdentifier, gateId, artifactDigest, disposition)` → no-op |
| Invalidação | Novo digest → `invalidatedAt` nos bindings anteriores do gate |

**Decisão ORCH-R03-03:** `GateBinding` schema **1.0.0** normativo; implementação Zod em R04.

---

## Integração taskboard: webhook + polling fallback

| Modo | Quando | Comportamento |
| --- | --- | --- |
| **Webhook (primário)** | Taskboard expõe hook configurável | Push `status`, `threadId`, `version` → `TaskboardMirrorPort.ingest()` |
| **Polling (fallback)** | Webhook indisponível ou gap detectado | Worker sync a cada **60s** por issue ativa com lease |
| **Reconciliação** | Divergência detectada | Comentário sugerido; orchestration ajusta lease |

### Eventos espelhados (taskboard → orchestration)

| Transição board | Efeito orchestration |
| --- | --- |
| `todo → in_progress` | Habilita checkout se G0 PASS ou binding espelhado |
| `in_progress → in_review` | `ReleaseTaskLease`; Run → `PAUSED` |
| `in_review → in_progress` | Reabilita checkout; exige novo digest G1+ se artefato mudou |
| `→ blocked` | Run → `PAUSED`; lease mantido até TTL |
| `→ done` | Só se `GateBinding(G7, PASS)` — senão rejeitar espelho (OH07) |

**Decisão ORCH-R03-05:** **Híbrido** webhook primário + polling 60s fallback; taskboard permanece fonte de claim ANX-*.

---

## Ports (domain/)

| Port | Métodos (esboço) | Notas |
| --- | --- | --- |
| `TaskRepository` | `findByIdForUpdate`, `save`, `findByIssue` | Checkout usa `FOR UPDATE` |
| `RunRepository` | `findByAgentAndTask`, `save`, `findActiveByTask` | Idempotência checkout |
| `GoalRepository` | `findById`, `save`, `listAncestry` | Monta `goalAncestry` |
| `GateBindingRepository` | `save`, `listByIssue`, `invalidatePrior` | |
| `LeaseClock` | `now`, `expiresIn` | Testável |
| `TaskboardMirrorPort` | `getIssueStatus`, `ingestWebhook`, `listActiveIssues` | Infra HTTP loopback |
| `OrchestrationUnitOfWork` | transação estado + journal + outbox | Padrão ADR0002 |

---

## Respostas às perguntas abertas de R02

| # | Pergunta R02 | Resposta R03 |
| --- | --- | --- |
| 1 | Payload `orchestration.task.checked_out.v1` | ORCH-R03-02 — JSON normativo |
| 2 | TTL lease vs heartbeat adapter | ORCH-R03-01 — 4h default, tabela por adapter |
| 3 | `PlanRevision` entidade ou versão Goal? | **Entidade separada** ligada a `Goal` |
| 4 | Webhook vs polling taskboard | ORCH-R03-05 — híbrido |

---

## Tabela de decisões ORCH-R03

| ID | Decisão | Relação |
| --- | --- | --- |
| **ORCH-R03-01** | TTL lease 4h default, renew até 8h cap | ORCH-R02-01, ORCH-R02-02 |
| **ORCH-R03-02** | Payload `checked_out.v1` v1; sem `leaseToken` em evento | ORCH-R02-08 parcial → outbox |
| **ORCH-R03-03** | `GateBinding` schema **1.0.0** normativo | **Fecha ORCH-R02-08** |
| **ORCH-R03-04** | `PlanRevision` agregado separado de `Goal` | R02 pergunta #3 |
| **ORCH-R03-05** | Taskboard mirror: webhook primário + polling 60s | ORCH-R02-05 |
| **ORCH-R03-06** | `RecordGateDisposition` invalida PASS por digest | OH07, AGENTS.md pipeline |
| **ORCH-R03-07** | CIRCULAR: evento `gate.disposition.recorded` projeta ReviewEdge | OH10 |
| **ORCH-R03-08** | Comentário board ≠ GateBinding; espelho unidirecional board→orch | OH09 |

---

## Critérios de aceite R3

| # | Critério | Status |
| --- | --- | --- |
| AC-R3-01 | Agregados Goal/Task/Run/Lease/Heartbeat/GateBinding/PlanRevision | ✅ |
| AC-R3-02 | Invariantes INV-ORC-01..12 | ✅ |
| AC-R3-03 | Payload `orchestration.task.checked_out.v1` normativo | ✅ |
| AC-R3-04 | GateBinding schema v1 (fecha ORCH-R02-08) | ✅ |
| AC-R3-05 | TTL lease + heartbeat por adapter | ✅ |
| AC-R3-06 | Taskboard webhook + polling — decisão fechada | ✅ |
| AC-R3-07 | Quatro perguntas R02 respondidas | ✅ |
| AC-R3-08 | Decisões ORCH-R03-01..08 documentadas | ✅ |

## Pendências para rodadas seguintes

| ID | Assunto | Rodada |
| --- | --- | --- |
| P-R3-01 | Schemas Zod `@anxionos/contracts/orchestration/*` | R04 |
| P-R3-02 | `RecordGateDisposition` + evento `gate.disposition.recorded.v1` | R04 |
| P-R3-03 | Drizzle tables + migrações PG | R05 |
| P-R3-04 | Worker taskboard-sync + webhook endpoint em apps/api | R06 / R09 |
| P-R3-05 | Fixtures OH-T01..T08 | R09 |

## Próxima rodada

→ **R04 — Contratos e eventos** ([R04-contracts-events.md](./R04-contracts-events.md)) — ✅ Concluído (ORCH-R04-01..08). Próximo: **R05 — Storage**.
