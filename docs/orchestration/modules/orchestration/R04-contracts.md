---
type: debate
---
# R04 — Contratos e eventos: `modules/orchestration`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue:** ANX-393 · pack ANX-389  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage.md](./R05-storage.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de produção neste artefato. API esboço `/v1/orchestration` apenas.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `orchestration` |
| eventType | `orchestration.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Correlação | `correlationId` = `runId` |
| Tenancy | `organizationId` da sessão; `agencyId` via AgencyScopePort |
| Segredos | **proibido** em DTO/evento (prompts, leaseToken em claro, PII) |

**KEEP adapter-gateway** no pacote de contratos se já exportado — não remover neste pack.

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| ORC_TASK_NOT_FOUND | 404 | Fora do scope |
| ORC_LEASE_HELD | 409 | Segundo checkout vigente |
| ORC_LEASE_EXPIRED | 409 | Heartbeat após expiry |
| ORC_TRAVERSAL_DENIED | 403 | T01 DENY |
| ORC_AGENT_UNKNOWN | 404 | AgentRegistry miss |
| ORC_GATE_INVALID | 409 | GateBinding sem evidência / transição inválida |
| ORC_REVISION_CONFLICT | 409 | expectedRevision |
| ORC_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout `@anxionos/contracts/orchestration/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`.

**ORC-R04-01:** leaseToken **não** viaja em evento público — só hash.  
**ORC-R04-02:** `agentId` no body HTTP **ignorado** — vem de AgentRegistryPort + sessão.

## In / Out (R4)

**In:** POST `/v1/orchestration/goals`, `/v1/orchestration/tasks`, `/v1/orchestration/tasks/:id/checkout`, `/v1/orchestration/runs/:id/heartbeat`; GET `/v1/orchestration/tasks/:id`; T01 pré-StartRun com efeito externo.

**Out:** envelope SDD; códigos ORC_*; eventos listados. **Nunca** leaseToken, prompt, secret ou grant em payload.

## Non-goals

- Não pasta `projects/` nem `tasks/` nem `agent-teams`.
- Não emitir `agents.*` nem `governance.grant.*`.
- Não aceitar spec 002 neste pack.
- Não ST08 live / migration.
- Não ANX-342 / ANX-389 `done`.
- D-GOV-010 = **risk P06**.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| Goal / Task / Run / TaskLease / GateBinding schemas | **orchestration** |
| Agent / AgentVersion | **agents** |
| Traversal T01 | **governance** + **graph** |
| Taskboard HTTP Dashi | board local — só `TaskboardMirrorPort` |
| adapter-gateway export | **KEEP** se já existir |

## Eventos v1 (catálogo)

| eventType | Emissor | Payload (sem secrets) | Consumidores |
| --- | --- | --- | --- |
| `orchestration.goal.created.v1` | CreateGoal | goalId, organizationId, parentGoalId, revision | graph, audit |
| `orchestration.task.created.v1` | CreateTask | taskId, goalId, issueIdentifier | audit, operations |
| `orchestration.task.checked_out.v1` | CheckoutTask | taskId, agentId, leaseHash, expiresAt | audit, workers |
| `orchestration.task.released.v1` | ReleaseTaskLease | taskId, reason | audit |
| `orchestration.run.started.v1` | StartRun | runId, taskId, agentId, correlationId | knowledge (runId), audit |
| `orchestration.run.heartbeat.v1` | RecordHeartbeat | runId, remainingBudget | workers (não PII) |
| `orchestration.gate.disposition.v1` | RecordGateBinding | gate, disposition, evidenceRef | audit, operations |

## REST sketch `/v1/orchestration/*`

| Método | Path | Grant |
| --- | --- | --- |
| POST | `/v1/orchestration/goals` | orchestration.admin + T01 |
| POST | `/v1/orchestration/tasks` | orchestration.write |
| POST | `/v1/orchestration/tasks/:id/checkout` | orchestration.checkout |
| GET | `/v1/orchestration/tasks/:id` | orchestration.read |
| POST | `/v1/orchestration/runs/:id/heartbeat` | orchestration.run |
| POST | `/v1/orchestration/runs/:id/start` | orchestration.run + T01 se efeito externo |

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-ORC-01 | G3 | segundo checkout mesmo taskId → 409 ORC_LEASE_HELD |
| G3-ORC-02 | G3 | heartbeat após expiry → 409 ORC_LEASE_EXPIRED |
| G3-ORC-03 | G3 | checkout + outbox mesma transação |
| G5-ORC-01 | G5 | agentId forjado no body ignorado |
| G5-ORC-02 | G5 | T01 DENY bloqueia StartRun com efeito externo |

## Alternativas rejeitadas

Board Dashi como ledger; leaseToken em NATS; 24º módulo `projects/`; auto-PASS de GateBinding.

## Saída R4

Contratos v1 aprovados para R5.
