---
type: debate
---
# R04 — Contratos, API e eventos: `modules/agents`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue:** ANX-392  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [structure R04](../../structure-debate/agents/R04-contracts-events.md)

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R4)

**In:** superfície pública Agent/AgentVersion/Skill/Binding/BrainFacade. **Out:** `agents.*` eventos. **Não** Task/Run (`orchestration`). Sem secrets em payload.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| Agent / AgentVersion / Skill / Binding / BrainFacade | **agents** |
| Task / Run | **orchestration** |
| adapter-gateway | **KEEP** |

## Participantes

Executor, Code Review, Arquiteto, Crítico, Security, QA, Red Team, Orquestrador.

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| schemaVersion envelope | 0.1.0 |
| ownerDomain | `agents` |
| eventType | `agents.<aggregate>.<action>.v1` |
| Idempotência | Header `Idempotency-Key` → `commandId` |
| Correlação | `correlationId` = `runId` quando invoke vem de orchestration |
| Tenancy | `organizationId` da sessão; `agencyId` via AgencyScopePort |

### Códigos de domínio (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| AGT_AGENT_NOT_FOUND | 404 | Fora do scope |
| AGT_VERSION_NOT_FOUND | 404 | |
| AGT_SKILL_NOT_FOUND | 404 | |
| AGT_REVISION_CONFLICT | 409 | expectedRevision |
| AGT_STATUS_INVALID | 409 | Transição inválida |
| AGT_VERSION_IMMUTABLE | 409 | Mutar published |
| AGT_TRAVERSAL_DENIED | 403 | T01 DENY |
| AGT_PRINCIPAL_NOT_FOUND | 404 | identity |
| AGT_RUNS_PENDING | 409 | DRAINING com Runs |
| AGT_CAPABILITY_UNKNOWN | 400 | Manifest |
| AGT_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout proposto `@anxionos/contracts/agents/`

`types.ts`, `capability-manifest/schema.ts`, `commands.ts`, `queries.ts`, `events.ts`, `index.ts`.

**AGT-R04-01:** Manifesto completo por AgentVersion; runtime filtra por grant — descobrir ≠ conceder (spec 002 AP03).

CapabilityEntry: capabilityId, action, resourceTypes, input/output schema refs, requiredGrants, effectClass (`read|write|external|approval`), idempotencyPolicy.

## Catálogo de eventos v1

| eventType | Emissor | Payload (sem secrets) |
| --- | --- | --- |
| `agents.agent.registered.v1` | RegisterAgent | agentId, organizationId, kind, displayName, revision |
| `agents.agent.status_changed.v1` | TransitionAgentStatus | fromStatus, toStatus, revision |
| `agents.agent_version.published.v1` | PublishAgentVersion | versionNumber, capabilityManifestHash, autonomyLevel, instructionRef |
| `agents.binding.created.v1` | BindAgentToScope | bindingId, scopeType, scopeId |
| `agents.skill.registered.v1` | RegisterSkill | skillId, name, schemaVersion |
| `agents.brain.invocation.requested.v1` | BrainFacade prod | invocationId, capabilityId, correlationId, inputRef |

**AGT-R04-02:** invocação **sem** input completo — só ObjectRef.

## REST sketch `/v1/agents/*`

| Método | Path | Grant |
| --- | --- | --- |
| POST | `/v1/agents` | agents.admin |
| POST | `/v1/agents/:id/versions` | agents.admin |
| POST | `/v1/agents/:id/versions/:vid/publish` | agents.publish + T01 |
| PATCH | `/v1/agents/:id/status` | agents.admin |
| POST | `/v1/agents/:id/bindings` | agents.admin |
| GET | `/v1/agents/:id/capabilities` | agents.read |
| POST | `/v1/agents/:id/invoke` | capability grant; **dev-only** |

**AGT-R04-03:** invoke HTTP só com `ENABLE_DEV_ROUTES`.

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-AGT-01 | Publish não muta versão anterior |
| G3-AGT-02 | Invoke sem grant → 403 fail-closed |
| G3-AGT-03 | Replay commandId retorna mesmo revision |
| G5-AGT-01 | Prompt injection não eleva grant (sandbox) |
| G5-AGT-02 | actorPrincipalId no body ignorado — sessão Better Auth |

## Alternativas rejeitadas

Manifest só no grafo; eventos com prompt inline; Brain 100% síncrono em prod; skills como strings livres.

## Saída R4

Contratos v1 aprovados para R5.
