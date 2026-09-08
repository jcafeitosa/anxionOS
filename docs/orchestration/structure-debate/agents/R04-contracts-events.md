---
type: debate
---

# R04 — Contratos, eventos e superfície pública: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R4 — Contratos, eventos e exports  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-42 (debate estrutura) · ANX-82 (R06–R10) · implementação derivada pós-R10 G0  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R02-boundaries.md](./R02-boundaries.md) · `brain/project-docs/specs/002-agents-knowledge/spec.md`

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

Definir a superfície pública de **agents** após [R03-domain-sketch.md](./R03-domain-sketch.md): schemas Zod em `@anxionos/contracts/agents/*`, catálogo de eventos versionados, esboço HTTP `/v1/agents/*`, `CapabilityManifest` por AgentVersion, assinaturas de comandos application e exports de `modules/agents/index.ts`. Fechar AGT-R03-03 (Brain invoke dev síncrono vs prod evento-first).

## Fontes aplicadas

| Fonte | Uso em R4 |
| --- | --- |
| [R03-domain-sketch.md](./R03-domain-sketch.md) | Agregados, invariantes INV-AGT-01..08, comandos sketch |
| [R02-boundaries.md](./R02-boundaries.md) | Fronteiras, BrainFacade sem estado Run |
| `brain/project-docs/specs/002-agents-knowledge/spec.md` | Paridade AP01–AP08, CapabilityManifest, actorPrincipalId |
| [orchestration/R04-contracts-events.md](../orchestration/R04-contracts-events.md) | Padrão eventType, idempotência HTTP |
| [identity/R04-contracts-events.md](../identity/R04-contracts-events.md) | Layout `packages/contracts` |
| [governance/events.ts](../../../../backend/packages/contracts/src/governance/events.ts) | Referência grant events — agents não duplica |

## Debate R4 (síntese atribuída)

**Executor:** Contratos em `@anxionos/contracts/agents/` com subpastas `capability-manifest/`, `events/`, `commands.ts`, `queries.ts`. Módulo expõe use cases; HTTP em `apps/api` com validação Zod na borda.

**Code Review:** `eventType` com prefixo `agents.` e sufixo `.v1`. Comandos HTTP usam `Idempotency-Key` (UUID) → `commandId` no journal. `instructionRef` e `definitionRef` são `ObjectRef` — nunca prompt bruto em evento.

**Crítico:** `PublishAgentVersion` exige `expectedRevision` no Agent e T01 ALLOW documentado na application — contrato HTTP retorna 403 `AGT_TRAVERSAL_DENIED` quando governance nega.

**Security:** Eventos **proibidos** de carregar: API keys, OAuth tokens, prompt completo, PII não redacted, `modelSlots` com secret. `CapabilityManifest` publicado contém apenas capabilityIds e schemas — sem valores de config sensível.

**Red Team:** Vetor: modelo injeta `actorPrincipalId` falso no payload HTTP — mitigação: derivar actor da sessão Better Auth; payload override ignorado/rejeitado.

**Síntese Orquestrador:** Contratos v1 fechados para Agent lifecycle e CapabilityManifest; implementação bloqueada até greenlight + issue derivada; R05 cobre Drizzle/PG.

---

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `schemaVersion` (envelope) | `0.1.0` (herda `packages/contracts`) |
| `ownerDomain` | `"agents"` em todos os eventos |
| `eventType` | `agents.<aggregate>.<action>.v1` |
| Idempotência comandos | Header `Idempotency-Key` (UUID) + chaves naturais por comando |
| Correlação | `correlationId` = `runId` quando Brain invoke originado em orchestration |
| Tenancy | `organizationId` derivado da sessão; `agencyId` validado via `AgencyScopePort` |
| Erros | `details.code` na borda HTTP; códigos abaixo |

### Códigos de domínio (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| `AGT_AGENT_NOT_FOUND` | 404 | Agent inexistente ou fora do scope |
| `AGT_VERSION_NOT_FOUND` | 404 | AgentVersion inexistente |
| `AGT_SKILL_NOT_FOUND` | 404 | Skill inexistente |
| `AGT_REVISION_CONFLICT` | 409 | `expectedRevision` divergente |
| `AGT_STATUS_INVALID` | 409 | Transição de lifecycle inválida |
| `AGT_VERSION_IMMUTABLE` | 409 | Mutar version `published` |
| `AGT_TRAVERSAL_DENIED` | 403 | T01 governance negou publish/invoke |
| `AGT_PRINCIPAL_NOT_FOUND` | 404 | `ownerPrincipalId` inválido (identity) |
| `AGT_RUNS_PENDING` | 409 | `DRAINING` com Runs ativos (orchestration port) |
| `AGT_CAPABILITY_UNKNOWN` | 400 | Manifest referencia capability inexistente |
| `AGT_IDEMPOTENT_REPLAY` | 200 | Replay documentado — `idempotentReplay: true` |

---

## `packages/contracts` — novos artefatos (propostos)

```text
packages/contracts/src/agents/
├── types.ts                    # AgentKind, AutonomyLevel, branded IDs
├── capability-manifest/
│   └── schema.ts               # capabilityManifestSchema (AP01–AP08)
├── commands.ts                 # input schemas de comandos
├── queries.ts                  # DTOs de leitura
├── events.ts                   # payload schemas + AGENTS_EVENT_TYPES
└── index.ts                    # re-export
```

### Tipos compartilhados (`types.ts`)

```typescript
import { z } from "zod";

export const agentKindSchema = z.enum(["AGENCY", "PLATFORM"]);
export const agentLifecycleStatusSchema = z.enum([
  "DRAFT",
  "CONFIGURED",
  "READY",
  "ACTIVE",
  "PAUSED",
  "DRAINING",
  "ARCHIVED",
]);
export const agentVersionStatusSchema = z.enum(["draft", "published", "deprecated"]);
export const autonomyLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4"]);

export const objectRefSchema = z.object({
  bucket: z.string().min(1).max(64),
  key: z.string().min(1).max(512),
  contentHash: z.string().min(1).max(128),
});
```

### CapabilityManifest (`capability-manifest/schema.ts`)

```typescript
export const capabilityEntrySchema = z.object({
  capabilityId: z.string().min(1).max(128),
  action: z.string().min(1).max(64),
  description: z.string().max(512),
  resourceTypes: z.array(z.string().min(1)).max(32),
  inputSchemaRef: z.string().min(1).max(256),
  outputSchemaRef: z.string().min(1).max(256),
  requiredGrants: z.array(z.string().min(1)).max(16),
  effectClass: z.enum(["read", "write", "external", "approval"]),
  idempotencyPolicy: z.enum(["none", "natural_key", "command_id"]),
});

export const capabilityManifestSchema = z.object({
  manifestVersion: z.literal("1.0.0"),
  agentVersionId: z.string().uuid(),
  entries: z.array(capabilityEntrySchema).max(256),
});
```

**Decisão AGT-R04-01:** Manifesto completo por AgentVersion; runtime filtra por grant T01 — descobrir ≠ conceder (spec 002 AP03).

---

## Catálogo de eventos v1

| eventType | Payload | Emissor |
| --- | --- | --- |
| `agents.agent.registered.v1` | `agentId`, `organizationId`, `kind`, `displayName`, `revision` | RegisterAgent |
| `agents.agent.status_changed.v1` | `agentId`, `fromStatus`, `toStatus`, `revision` | TransitionAgentStatus |
| `agents.agent_version.published.v1` | `agentVersionId`, `agentId`, `versionNumber`, `capabilityManifestHash`, `autonomyLevel`, `revision` | PublishAgentVersion |
| `agents.binding.created.v1` | `bindingId`, `agentId`, `scopeType`, `scopeId`, `revision` | BindAgentToScope |
| `agents.skill.registered.v1` | `skillId`, `organizationId`, `name`, `schemaVersion`, `revision` | RegisterSkill |
| `agents.brain.invocation.requested.v1` | `invocationId`, `agentId`, `agentVersionId`, `capabilityId`, `correlationId` | BrainFacade (prod) |

**Decisão AGT-R04-02:** Evento de invocação **sem** input payload completo — referência `inputRef` (ObjectRef) quando async; Red Team evita vazamento em NATS.

### Payload exemplo — `agents.agent_version.published.v1`

```typescript
export const agentVersionPublishedPayloadSchema = z.object({
  agentVersionId: z.string().uuid(),
  agentId: z.string().uuid(),
  organizationId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  capabilityManifestHash: z.string().min(1).max(128),
  autonomyLevel: autonomyLevelSchema,
  instructionRef: objectRefSchema,
  skillRefs: z.array(z.object({ skillId: z.string().uuid(), schemaVersion: z.string() })).max(64),
  revision: z.number().int().nonnegative(),
});
```

---

## Comandos HTTP (esboço `/v1/agents/*`)

| Método | Path | Comando | Grant mínimo |
| --- | --- | --- | --- |
| POST | `/v1/agents` | RegisterAgent | `agents.admin` no org |
| POST | `/v1/agents/:agentId/versions` | CreateAgentVersionDraft | `agents.admin` |
| POST | `/v1/agents/:agentId/versions/:versionId/publish` | PublishAgentVersion | `agents.publish` + T01 |
| PATCH | `/v1/agents/:agentId/status` | TransitionAgentStatus | `agents.admin` |
| POST | `/v1/agents/:agentId/bindings` | BindAgentToScope | `agents.admin` |
| GET | `/v1/agents/:agentId/capabilities` | ListCapabilities (filtrado) | `agents.read` |
| POST | `/v1/agents/:agentId/invoke` | Brain invoke (dev-only sync) | grant da capability |

**Decisão AGT-R04-03 (fecha AGT-R03-03):** `POST .../invoke` registrado somente com `ENABLE_DEV_ROUTES`; produção usa `agents.brain.invocation.requested.v1` + worker dequeue.

---

## Exports `modules/agents/index.ts` (propostos)

```typescript
// Application use cases
export { registerAgent, publishAgentVersion, transitionAgentStatus } from "./application";
export type { AgentRegistryPort, BrainInvocationPort } from "./domain/ports";

// Infrastructure bootstrap
export { ensureAgentsSchema } from "./infrastructure/schema";
```

Imports **proibidos** de consumidores: `infrastructure/repositories/*`, adapters Neo4j, LLM SDKs.

---

## Alternativas consideradas

| Alternativa | Prós | Contras | Decisão |
| --- | --- | --- | --- |
| Manifest em grafo apenas | Descoberta única | Sem versionamento auditável offline | **Rejeitada** — hash no evento + PG |
| Eventos com prompt inline | Debug fácil | Vazamento NATS/logs | **Rejeitada** — ObjectRef only |
| Brain 100% síncrono HTTP | Latência previsível dev | Timeout em runs longos | **Híbrido** AGT-R04-03 |
| Skills como strings livres | Flexível | Injection / drift | **Rejeitada** — AGT-R03-02 schema + ref |

---

## Riscos e disposição

| ID | Risco | Sev | Disposição |
| --- | --- | --- | --- |
| R4-01 | L3/L4 autonomy no schema sem gates P08 | HIGH | Bloqueado em runtime até ADR + Red Team |
| R4-02 | Manifest stale vs grant revogado | MED | T01 em invoke; epoch em governance |
| R4-03 | Cross-tenant agentId em path | HIGH | AgencyScopePort + session org |

---

## AC checklist R4

| ID | Critério | Status |
| --- | --- | --- |
| AC-R4-01 | Layout `@anxionos/contracts/agents/*` documentado | ✅ |
| AC-R4-02 | Catálogo `agents.*.v1` com payloads Zod | ✅ |
| AC-R4-03 | CapabilityManifest alinhado spec 002 AP01–AP08 | ✅ |
| AC-R4-04 | Sem secrets/prompt em eventos | ✅ |
| AC-R4-05 | HTTP esboço + dev-only invoke | ✅ |
| AC-R4-06 | Códigos `details.code` nomeados | ✅ |

## Saída R4

✅ Contratos v1 aprovados para R05 (armazenamento PG).

**Próximo:** [R05-storage-pg.md](./R05-storage-pg.md) — tabelas `agents_*`, journal/outbox, projeção Neo4j via graph consumer.
