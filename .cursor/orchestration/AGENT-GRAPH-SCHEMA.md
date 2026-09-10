# Agent Graph — Schema (Cursor / OKF)

> **Escopo:** schema lógico do **Agent Graph** — agentes, departamentos, capabilities, performance e relações organizacionais.
>
> Complementa [PRODUCT-GRAPH-SCHEMA.md](./PRODUCT-GRAPH-SCHEMA.md) (artefatos de produto) e [AI-PRODUCT-COMPANY-ENGINE.md](./AI-PRODUCT-COMPANY-ENGINE.md) §17.
>
> **Registry P0:** `brain/notes/agent-graph-registry.md` (ANX-268 done)

**Relacionados:** [AGENT-ROSTER.md](./AGENT-ROSTER.md) · [PERSONAS.md](./PERSONAS.md) · [HIRE-DELEGATION.md](./HIRE-DELEGATION.md)

---

## Princípios

1. Cada **agente** (persona permanente ou hire on-demand) é um nó `Agent` com `slug` estável.
2. Papéis da taxonomia Owner sem persona = nó `AgentRole` com `coverageStatus`.
3. Equipes de projeto = nós `AgentTeam` efêmeros (dynamic team formation).
4. Capabilities ligam agentes a trabalho via grafo — **não** apenas roster estático.

---

## Node types

```json
{
  "nodeTypes": {
    "Agent": {
      "description": "Persona Cursor permanente ou hire ativo",
      "required": ["slug", "fullName", "authorityLevel"],
      "authorityEnum": ["L0", "L1", "L2", "L3", "L4", "L5", "L6"],
      "optional": ["departmentId", "criticSlug", "cursorSubagentType"]
    },
    "AgentRole": {
      "description": "Papel taxonomia Product Company",
      "required": ["roleName", "coverageStatus"],
      "coverageEnum": ["covered", "partial", "proposed"]
    },
    "Department": {
      "description": "Departamento organizacional virtual",
      "required": ["name", "slug"],
      "examples": ["Leadership", "Engineering", "Quality", "Security", "Platform", "Product", "Research"]
    },
    "AgentTeam": {
      "description": "Equipe dinâmica por projeto/issue",
      "required": ["teamId", "issueId", "status"],
      "statusEnum": ["forming", "active", "dissolved"]
    },
    "Capability": {
      "description": "Habilidade executável",
      "required": ["capabilityId", "name"],
      "examples": ["write_code", "verdict_g2", "run_e2e", "threat_model"]
    },
    "Objective": {
      "description": "Objetivo ou OKR rastreável",
      "required": ["statement", "sourceRef"]
    },
    "KnowledgeRef": {
      "description": "Ponte para OKF brain/",
      "required": ["okfPath"]
    },
    "PerformanceSnapshot": {
      "description": "Métricas de agente (P2+)",
      "required": ["agentSlug", "capturedAt"],
      "optional": ["successRate", "tasksCompleted", "reworkRate"]
    }
  }
}
```

---

## Relationship types

```json
{
  "relationshipTypes": {
    "BELONGS_TO": { "from": ["Agent"], "to": ["Department"], "cardinality": "N:1" },
    "REPORTS_TO": { "from": ["Agent"], "to": ["Agent"], "cardinality": "N:1" },
    "MANAGES": { "from": ["Agent"], "to": ["Agent"], "cardinality": "1:N" },
    "PAIRED_WITH": { "from": ["Agent"], "to": ["Agent"], "cardinality": "1:1", "note": "executor-critic G1" },
    "CAN_EXECUTE": { "from": ["Agent"], "to": ["Capability"], "cardinality": "N:M" },
    "KNOWS": { "from": ["Agent"], "to": ["KnowledgeRef"], "cardinality": "N:M" },
    "MEMBER_OF": { "from": ["Agent"], "to": ["AgentTeam"], "cardinality": "N:M" },
    "LEADS": { "from": ["Agent"], "to": ["AgentTeam"], "cardinality": "1:1" },
    "RESPONSIBLE_FOR": { "from": ["Agent", "AgentTeam"], "to": ["Objective"], "cardinality": "N:M" },
    "CREATED": { "from": ["Agent"], "to": ["CodeArtifact", "ResearchArtifact"], "cardinality": "1:N" },
    "APPROVED": { "from": ["Agent"], "to": ["Decision"], "cardinality": "N:M" },
    "COVERS_ROLE": { "from": ["Agent"], "to": ["AgentRole"], "cardinality": "N:M" },
    "COMMUNICATES_WITH": { "from": ["Agent"], "to": ["Agent"], "cardinality": "N:M" },
    "DEPENDS_ON": { "from": ["Agent"], "to": ["Agent"], "cardinality": "N:M" }
  }
}
```

---

## Modelo conceitual

```text
Agent
├── belongs_to → Department
├── reports_to → Agent
├── manages → Agent
├── paired_with → Agent (crítico)
├── knows → KnowledgeRef
├── can_execute → Capability
├── member_of → AgentTeam
├── created → Artifact
├── approved → Decision
└── responsible_for → Objective
```

---

## Query: "Quem pode resolver isso?"

```text
Problem
  → required Capability
  → Agents CAN_EXECUTE capability
  → filter availability + authorityLevel
  → rank by PerformanceSnapshot (P2+)
  → select best Agent / form AgentTeam
```

**P0 oráculo:** `npm run orchestration:who -- --persona <slug> --can-i "<ação>"` + roster.

---

## Bridge Product Graph ↔ Agent Graph

| Product Graph | Agent Graph |
| --- | --- |
| `WorkItem` ANX-N | `Agent` owner via `OWNED_BY_AGENT` |
| `Feature` | `AgentTeam` + executor |
| `Decision` | `Agent` APPROVED |
| `CodeArtifact` | `Agent` CREATED |

---

## Indexação P0

| Fonte | Conteúdo |
| --- | --- |
| `PERSONAS.md` | Agent nodes permanentes |
| `AGENT-ROSTER.md` | capabilities + AgentRole proposed |
| `brain/notes/agent-graph-registry.md` | registry canônico ANX-268 |
| `hire-log.jsonl` | hires on-demand temporários |

**CLI P1 proposed:** `npm run orchestration:agent-graph -- query --capability <id>`

---

**Issues:** ANX-268 (registry) · ANX-271 (projection P3 schema registry) · **Status:** P3 contracts done; Neo4j runtime proposed

**Registry runtime:** `createAgentGraphSchemaRegistry()` em `@anxionos/graph` — ver `backend/packages/contracts/src/graph/schema/agent-graph-schema.ts`
