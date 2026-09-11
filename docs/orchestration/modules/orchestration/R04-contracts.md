---
type: debate
---
# R04 — Contratos e eventos: `modules/orchestration`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue:** ANX-393  
**ownerDomain:** `orchestration`

## Eventos v1 (catálogo)

| eventType | Emissor |
| --- | --- |
| `orchestration.goal.created.v1` | CreateGoal |
| `orchestration.task.created.v1` | CreateTask |
| `orchestration.task.checked_out.v1` | CheckoutTask |
| `orchestration.task.released.v1` | ReleaseTaskLease |
| `orchestration.run.started.v1` | StartRun |
| `orchestration.run.heartbeat.v1` | RecordHeartbeat |
| `orchestration.gate.disposition.v1` | RecordGateBinding |

Sem secrets, prompts ou PII no payload. leaseToken **não** viaja em evento público (só hash).

## Códigos

ORC_TASK_NOT_FOUND, ORC_LEASE_HELD, ORC_LEASE_EXPIRED, ORC_TRAVERSAL_DENIED, ORC_AGENT_UNKNOWN, ORC_IDEMPOTENT_REPLAY, ORC_GATE_INVALID.

## REST sketch

POST `/v1/goals`, `/v1/tasks`, `/v1/tasks/:id/checkout`, `/v1/runs/:id/heartbeat`, GET `/v1/tasks/:id`.

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-ORC-01 | segundo checkout mesmo taskId → 409 ORC_LEASE_HELD |
| G3-ORC-02 | heartbeat após expiry → 409 ORC_LEASE_EXPIRED |
| G3-ORC-03 | checkout + outbox mesma transação |
| G5-ORC-01 | agentId forjado no body ignorado — vem do AgentRegistry + sessão |
| G5-ORC-02 | T01 DENY bloqueia StartRun com efeito externo |

## Saída R4

Contratos v1 para R5.
