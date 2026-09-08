---
type: debate
---

# R03 — Esboço de domínio: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R3 — Domain model  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-42 (debate estrutura) · ANX-82 (R06–R10) · implementação derivada pós-R10 G0  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md) · `brain/project-docs/specs/002-agents-knowledge/spec.md`

## Objetivo da rodada

Esboçar o modelo de domínio de **agents** após [R02-boundaries.md](./R02-boundaries.md): agregados `Agent`, `AgentVersion`, `Skill`, `AgentBinding`; invariantes de lifecycle e versionamento; ports application; respostas às perguntas abertas de R01/R02. Alinhar paridade AP01–AP08 com `CapabilityManifest` sem duplicar Goal/Task/Run de orchestration.

## Fontes aplicadas

| Fonte | Uso em R3 |
| --- | --- |
| [R02-boundaries.md](./R02-boundaries.md) | Fronteiras, invariantes propostas |
| [R01-context.md](./R01-context.md) | Propósito, armazenamento, perguntas abertas |
| `brain/project-docs/specs/002-agents-knowledge/spec.md` | Lifecycle, Brain areas, paridade operacional |
| [orchestration/R03-domain-sketch.md](../orchestration/R03-domain-sketch.md) | Referência `agentId` em Task/Run — sem ownership |
| [graph/R03-schema-registry.md](../graph/R03-schema-registry.md) | Projeção Agent/Skill no Neo4j |

## Debate R3 (síntese atribuída)

**Arquiteto:** Quatro agregados v1 — `Agent` (identidade estável), `AgentVersion` (snapshot imutável publicado), `Skill` (catálogo declarativo tenant-scoped), `AgentBinding` (vínculo Agent↔Agency/Organization). `BrainFacade` é **porta application**, não agregado.

**Executor:** Ports: `AgentRepository`, `AgentVersionRepository`, `SkillRepository`, `AgentBindingRepository`, `BrainInvocationPort`. Mutações confirmam PG + journal + outbox na mesma transação UoW.

**Crítico:** `AgentVersion` imutável após `published`; promotion para ACTIVE exige grants + evaluation quando aplicável (P08 defer). Brain não persiste estado de Run.

**Security:** Nenhum secret de provider, prompt bruto ou PII em eventos; `CapabilityManifest` filtrado por grant antes de expor tool.

**Síntese Orquestrador:** Domain sketch v1 aprovado; R04 normaliza contratos `@anxionos/contracts/agents/*`.

---

## Agregado: `Agent`

Identidade institucional do agente (CEO, operador, worker) no tenant.

```typescript
interface Agent {
  id: AgentId;
  organizationId: string;
  agencyId?: string;
  kind: AgentKind;
  displayName: string;
  status: AgentLifecycleStatus;
  activeVersionId?: AgentVersionId;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

type AgentKind = "AGENCY" | "PLATFORM";

type AgentLifecycleStatus =
  | "DRAFT"
  | "CONFIGURED"
  | "READY"
  | "ACTIVE"
  | "PAUSED"
  | "DRAINING"
  | "ARCHIVED";
```

### Invariantes (`INV-AGT-01`..`08`)

| ID | Regra |
| --- | --- |
| INV-AGT-01 | `Agent.kind` só nasce pelo domínio autorizado — não mutável por UI/agente |
| INV-AGT-02 | `PLATFORM` agentes não adquirem capital ou trading authority de clientes |
| INV-AGT-03 | Transição para `ACTIVE` exige `activeVersionId` publicado + grants mínimos documentados |
| INV-AGT-04 | `DRAINING` → `ARCHIVED` só sem Runs pendentes (consulta orchestration port, não estado local) |
| INV-AGT-05 | Mutações confirmam estado + journal + outbox na mesma transação PG |
| INV-AGT-06 | `domain/*` não importa LLM SDK, HTTP, Neo4j nem orchestration internals |
| INV-AGT-07 | Descobrir capability ≠ conceder — manifesto filtrado por grant T01 |
| INV-AGT-08 | Revogação de grant impede novo efeito; in-flight segue política orchestration |

---

## Agregado: `AgentVersion`

Snapshot imutável de instruções, skills refs, tool manifests e políticas de contexto.

```typescript
interface AgentVersion {
  id: AgentVersionId;
  agentId: AgentId;
  versionNumber: number;
  status: AgentVersionStatus;
  instructionRef: ObjectRef;
  skillRefs: SkillRef[];
  capabilityManifestHash: string;
  modelSlots: ModelSlotBinding[];
  autonomyLevel: AutonomyLevel;
  publishedAt?: Date;
  createdAt: Date;
}

type AgentVersionStatus = "draft" | "published" | "deprecated";

type AutonomyLevel = "L0" | "L1" | "L2" | "L3" | "L4";
```

**Decisão AGT-R03-01:** `AutonomyLevel` L3/L4 documentados; implementação e gates de segurança permanecem **bloqueados** até ADR + Red Team dedicado (não autorizar neste sketch).

---

## Entidade: `Skill`

Catálogo declarativo; schema extensível por tenant com validação Zod na borda.

```typescript
interface Skill {
  id: SkillId;
  organizationId: string;
  name: string;
  schemaVersion: string;
  definitionRef: ObjectRef;
  status: "active" | "deprecated";
  revision: number;
}
```

**Decisão AGT-R03-02:** Skills fixas v1 em `@anxionos/contracts/agents/skills/`; extensão tenant via `definitionRef` + registro auditável — não strings livres em runtime.

---

## Entidade: `AgentBinding`

Vínculo Agent↔Agency/scope; hierarquia TREE/CIRCULAR delegada a governance.

```typescript
interface AgentBinding {
  id: AgentBindingId;
  agentId: AgentId;
  scopeType: "AGENCY" | "ORGANIZATION" | "PLATFORM";
  scopeId: string;
  reportingAgentId?: AgentId;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}
```

---

## Porta: `BrainFacade` (application)

Invocação governada — síncrona ou via evento — **sem** persistir Run.

| Método (esboço) | Comportamento |
| --- | --- |
| `invokeCapability(input)` | Valida grant + manifest; delega ao módulo dono; retorna resultado ou `operationId` |
| `listCapabilities(scope)` | Manifest filtrado por principal/grant |
| `prepareContext(runContext)` | Monta contexto Brain read-only a partir de AgentVersion + knowledge ports |

**Decisão AGT-R03-03 (R01 Q1):** API síncrona na borda HTTP dev-only (`ENABLE_DEV_ROUTES`); produção preferencialmente evento `agents.brain.invocation.requested.v1` com resposta assíncrona — detalhes em R04.

---

## Ports (domain/)

| Port | Responsabilidade |
| --- | --- |
| `AgentRepository` | CRUD Agent + lifecycle transitions |
| `AgentVersionRepository` | Draft/publish/deprecate version |
| `SkillRepository` | Skill catalog tenant-scoped |
| `AgentBindingRepository` | Bindings + effective window |
| `AgentsUnitOfWork` | Transação estado + journal + outbox |
| `OrchestrationRunQueryPort` | Consulta Runs pendentes (DRAINING) — read-only |

---

## Comandos application (esboço)

| Comando | Idempotência natural | Evento |
| --- | --- | --- |
| `RegisterAgent` | `(organizationId, displayName, kind)` draft | `agents.agent.registered.v1` |
| `PublishAgentVersion` | `(agentId, versionNumber)` | `agents.agent_version.published.v1` |
| `TransitionAgentStatus` | `(agentId, targetStatus, expectedRevision)` | `agents.agent.status_changed.v1` |
| `BindAgentToScope` | `(agentId, scopeType, scopeId)` | `agents.binding.created.v1` |
| `RegisterSkill` | `(organizationId, name, schemaVersion)` | `agents.skill.registered.v1` |

---

## Respostas às perguntas abertas (R01/R02)

| Pergunta | Decisão R3 |
| --- | --- |
| Brain facade síncrona vs eventos? | Híbrido: dev síncrono; prod evento-first (AGT-R03-03) |
| Paridade AP01–AP08 sem duplicar AGENCY/PLATFORM? | `CapabilityManifest` único por AgentVersion; filtros por grant |
| AgentVersion vs promotion evaluation? | Publish ≠ promote; evaluation P08 gate antes ACTIVE em produção |
| Skills schema fixo vs extensível? | Core fixo + extensão tenant via `definitionRef` (AGT-R03-02) |

---

## Projeção Neo4j (referência)

Graph projector consome eventos `ownerDomain: agents` — nós `Agent`, `Skill`, arestas `HAS_SKILL`, `REPORTS_TO`. Sem tokens, prompts ou secrets. Detalhes de schema em R04/R06.

---

## Saída R3

✅ Domain sketch v1 aprovado para R04 (contratos/eventos).

**Próximo:** [R04-contracts-events.md](./R04-contracts-events.md) — `@anxionos/contracts/agents/*`, catálogo eventos, HTTP admin/dev.
