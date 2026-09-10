# Product Graph — Schema (Cursor / OKF)

> **Escopo:** schema lógico do **Product Graph** referenciado em [PRODUCT-COMPANY-MODEL.md](./PRODUCT-COMPANY-MODEL.md). Persistência autoritativa em **P0** = OKF (`brain/`) + rastros em issues `ANX-*`; projeção Neo4j = **P3** (proposed).
>
> **Não confundir** com o grafo institucional de runtime (`backend/modules/graph/`) — ver § Bridge em PRODUCT-COMPANY-MODEL.
>
> **Registry P3 (ANX-271 done):** `createProductGraphSchemaRegistry()` em `@anxionos/graph` · contratos em `backend/packages/contracts/src/graph/schema/product-graph-schema.ts`

**Relacionados:** [.archify/specs/anxionos-product-company.workflow.json](../../.archify/specs/anxionos-product-company.workflow.json)

---

## Princípios

1. Cada artefato de produto é um **nó** com `id` estável e `ownerDomain` (módulo ou `cursor-orchestration`).
2. Arestas são **tipadas** e versionadas; deleção = evento, não remoção silenciosa.
3. Todo nó ligado a código deve referenciar **símbolo ou path** verificável (`graphify`, git).
4. Issues `ANX-*` são nós `WorkItem` — não substituem Requirement/Feature.

---

## Node types

```json
{
  "nodeTypes": {
    "Company": {
      "description": "Organização virtual (anxionOS platform ou tenant dev)",
      "required": ["name", "slug"],
      "optional": ["visionRef"]
    },
    "Product": {
      "description": "Produto ou linha (ex.: anxionOS consoles)",
      "required": ["name", "companyId"],
      "optional": ["northStarMetric", "prdRef"]
    },
    "Problem": {
      "description": "Dor ou oportunidade validada",
      "required": ["statement", "evidenceRefs"],
      "optional": ["personaIds", "severity"]
    },
    "User": {
      "description": "Persona de usuário (JTBD), não agente Cursor",
      "required": ["name", "role"],
      "optional": ["jtbd"]
    },
    "Requirement": {
      "description": "Requisito rastreável (SHALL)",
      "required": ["text", "sourceRef", "status"],
      "statusEnum": ["draft", "accepted", "deprecated"]
    },
    "Feature": {
      "description": "Unidade entregável de produto",
      "required": ["title", "acceptanceCriteria"],
      "optional": ["kpiIds"]
    },
    "Capability": {
      "description": "Capacidade institucional (alinhada specs 001–005)",
      "required": ["capabilityId", "ownerModule"],
      "optional": ["specRef"]
    },
    "Service": {
      "description": "Serviço deployável ou módulo backend",
      "required": ["name", "ownerModule"],
      "optional": ["apiSurfaceRef"]
    },
    "CodeArtifact": {
      "description": "Arquivo, símbolo ou pacote",
      "required": ["path", "symbolOptional"],
      "optional": ["commitSha", "graphifyNodeId"]
    },
    "TestArtifact": {
      "description": "Teste que verifica comportamento",
      "required": ["path", "oracleCommand"],
      "optional": ["coversRequirementIds"]
    },
    "Deployment": {
      "description": "Release em ambiente",
      "required": ["environment", "version", "deployedAt"],
      "environmentEnum": ["dev", "staging", "production"]
    },
    "Monitor": {
      "description": "Sinal operacional ou KPI observado",
      "required": ["metricName", "source"],
      "optional": ["threshold", "dashboardRef"]
    },
    "WorkItem": {
      "description": "Issue Dashi ANX-*",
      "required": ["identifier", "status"],
      "optional": ["threadId"]
    },
    "AgentRole": {
      "description": "Papel na taxonomia Product Company (permanente ou proposed)",
      "required": ["roleName", "coverageStatus"],
      "coverageEnum": ["covered", "partial", "proposed"]
    },
    "ResearchArtifact": {
      "description": "Nota, spike ou fonte em brain/research",
      "required": ["okfPath", "capturedAt"]
    }
  }
}
```

---

## Relationship types

```json
{
  "relationshipTypes": {
    "OWNS": { "from": ["Company"], "to": ["Product"], "cardinality": "1:N" },
    "TARGETS": { "from": ["Product"], "to": ["User"], "cardinality": "N:M" },
    "ADDRESSES": { "from": ["Feature", "Requirement"], "to": ["Problem"], "cardinality": "N:M" },
    "DERIVES_FROM": { "from": ["Requirement"], "to": ["ResearchArtifact", "Problem"], "cardinality": "N:M" },
    "REFINES": { "from": ["Requirement"], "to": ["Requirement"], "cardinality": "N:1" },
    "IMPLEMENTS": { "from": ["Feature"], "to": ["Requirement"], "cardinality": "N:M" },
    "ENABLES": { "from": ["Capability"], "to": ["Feature"], "cardinality": "1:N" },
    "REALIZED_BY": { "from": ["Feature"], "to": ["Service"], "cardinality": "N:M" },
    "CONTAINS_CODE": { "from": ["Service"], "to": ["CodeArtifact"], "cardinality": "1:N" },
    "VERIFIED_BY": { "from": ["CodeArtifact", "Feature"], "to": ["TestArtifact"], "cardinality": "N:M" },
    "DEPLOYED_TO": { "from": ["Service", "Feature"], "to": ["Deployment"], "cardinality": "N:M" },
    "MONITORED_BY": { "from": ["Deployment", "Service"], "to": ["Monitor"], "cardinality": "1:N" },
    "TRACKED_IN": { "from": ["Feature", "Requirement"], "to": ["WorkItem"], "cardinality": "N:M" },
    "OWNED_BY_AGENT": { "from": ["WorkItem", "Feature"], "to": ["AgentRole"], "cardinality": "N:1" },
    "DEPENDS_ON": { "from": ["Service", "Feature", "CodeArtifact"], "to": ["Service", "Feature", "CodeArtifact"], "cardinality": "N:M" },
    "FEEDS_BACK": { "from": ["Monitor"], "to": ["Problem", "ResearchArtifact"], "cardinality": "N:M" }
  }
}
```

---

## Exemplo de instância (JSON)

```json
{
  "nodes": [
    { "id": "prob:org-invite-friction", "type": "Problem", "statement": "Operadores não conseguem convidar membros sem idempotency", "evidenceRefs": ["brain/notes/..."] },
    { "id": "req:org-invite-idempotent", "type": "Requirement", "text": "POST invite SHALL be idempotent per Idempotency-Key", "sourceRef": "brain/project-docs/specs/...", "status": "accepted" },
    { "id": "feat:organizations-invites", "type": "Feature", "title": "Organizations invite API", "acceptanceCriteria": ["ANX-135 scenarios"] },
    { "id": "svc:organizations", "type": "Service", "name": "organizations", "ownerModule": "backend/modules/organizations" },
    { "id": "code:invite-handler", "type": "CodeArtifact", "path": "backend/apps/api/src/organizations/handlers/invites.ts" },
    { "id": "test:invite-idempotency", "type": "TestArtifact", "path": "backend/modules/organizations/tests/invite-idempotency.test.ts", "oracleCommand": "bun test invite-idempotency" },
    { "id": "wi:ANX-135", "type": "WorkItem", "identifier": "ANX-135", "status": "in_progress" }
  ],
  "edges": [
    { "type": "ADDRESSES", "from": "feat:organizations-invites", "to": "prob:org-invite-friction" },
    { "type": "IMPLEMENTS", "from": "feat:organizations-invites", "to": "req:org-invite-idempotent" },
    { "type": "REALIZED_BY", "from": "feat:organizations-invites", "to": "svc:organizations" },
    { "type": "CONTAINS_CODE", "from": "svc:organizations", "to": "code:invite-handler" },
    { "type": "VERIFIED_BY", "from": "code:invite-handler", "to": "test:invite-idempotency" },
    { "type": "TRACKED_IN", "from": "feat:organizations-invites", "to": "wi:ANX-135" }
  ]
}
```

---

## Queries de exemplo

### "Por que a feature X existe?"

**Entrada:** `featureId` ou `WorkItem` `ANX-N`

**Traversal:**

```text
Feature X
  → ADDRESSES → Problem(s)
  → IMPLEMENTS → Requirement(s)
    → DERIVES_FROM → ResearchArtifact / Problem
  → TRACKED_IN → WorkItem (comentários G0 na issue)
```

**Oráculo Cursor (P0):** OKF `search` + comentário issue com pacote G0 `source: brain/…`.

```cypher
// P3 proposed — Neo4j projection (ilustrativo)
MATCH (f:Feature {id: $featureId})
OPTIONAL MATCH (f)-[:ADDRESSES]->(p:Problem)
OPTIONAL MATCH (f)-[:IMPLEMENTS]->(r:Requirement)
OPTIONAL MATCH (r)-[:DERIVES_FROM]->(src)
RETURN f, collect(DISTINCT p) AS problems, collect(DISTINCT r) AS requirements, collect(DISTINCT src) AS sources
```

---

### "Blast radius do serviço Y"

**Entrada:** `serviceId` ou módulo `backend/modules/Y`

**Traversal:**

```text
Service Y
  → CONTAINS_CODE → CodeArtifact*
  → DEPENDS_ON → Service|Feature* (transitivo, depth limit)
  → VERIFIED_BY → TestArtifact*
  → REALIZED_BY ← Feature*
  → DEPLOYED_TO → Deployment*
  → MONITORED_BY → Monitor*
```

**Oráculo Cursor (P0):** `graphify path "<handler>" "<consumer>"` + `get_impact_radius` (code-review-graph MCP).

```cypher
// P3 proposed
MATCH (s:Service {id: $serviceId})
OPTIONAL MATCH (s)-[:CONTAINS_CODE|DEPENDS_ON*1..3]-(affected)
OPTIONAL MATCH (f:Feature)-[:REALIZED_BY]->(s)
OPTIONAL MATCH (f)-[:VERIFIED_BY]->(t:TestArtifact)
RETURN s, collect(DISTINCT affected) AS blast, collect(DISTINCT f) AS features, collect(DISTINCT t) AS tests
```

---

### "Quem é responsável por esta parte?"

```text
Feature → TRACKED_IN → WorkItem ANX-N
WorkItem → OWNED_BY_AGENT → AgentRole (persona slug)
AgentRole → (se covered) PERSONAS.md slug
```

---

## Indexação P0 (sem Neo4j)

| Fonte | Conteúdo do grafo |
| --- | --- |
| `brain/project-docs/specs/*.md` | Requirement, Capability, Problem |
| Issues Dashi `ANX-*` | WorkItem + links em comentários G0 |
| Git / graphify | CodeArtifact, DEPENDS_ON |
| Test paths | TestArtifact, VERIFIED_BY |
| `.cursor/orchestration/PRODUCT-COMPANY-MODEL.md` | AgentRole proposed registry |

**CLI futuro (P1 proposed):** `npm run orchestration:product-graph -- query --feature <id>`

---

## Validação

- P0: revisão manual + links OKF nas issues.
- P1: lint de frontmatter OKF com campos `productGraph: { nodes, edges }` (proposed).
- P3: schema registry no módulo `graph` alinhado a `ownerDomain: product`.

---

**Issue:** ANX-250 · Ver também [PRODUCT-COMPANY-MODEL.md](./PRODUCT-COMPANY-MODEL.md)
