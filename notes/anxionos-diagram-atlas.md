---
title: Atlas de diagramas — sistema completo
description: Catálogo canônico de Mermaid, fluxogramas e Archify do anxionOS (plataforma + ciclo Product Company + 23 módulos).
type: planning-note
status: draft
tags:
  - diagrams
  - mermaid
  - archify
  - product-company
  - modules
---
# Atlas de diagramas — sistema completo

> [!NOTE]
> Fonte de verdade dos **módulos físicos**: [estrutura aceita](./../brain/notes/anxionos-backend-structure.md) (23 contexts, ADR0002). A taxonomia de 30 nomes do briefing Owner é **mapa de capacidades**, não 30 pastas novas — ver [alinhamento](./anxionos-product-company-module-alignment.md).
>
> Archify (HTML/SVG): `.archify/specs/` → `npm run archify:build` → `.archify/artifacts/`.
>
> Diagramas **por módulo**: [atlas módulos](./anxionos-diagram-atlas-modules.md).

## Índice visual

| Camada | Tipo | Onde ver |
| --- | --- | --- |
| Plataforma | Archify architecture | `.archify/artifacts/anxionos-platform.architecture.html` |
| Entrega P01–P09 | Archify workflow | `.archify/artifacts/anxionos-delivery-p01-p09.workflow.html` |
| Product Company 12 etapas | Archify workflow | `.archify/artifacts/anxionos-product-company.workflow.html` |
| Connections / inferência | Archify workflow | `.archify/artifacts/anxionos-connections-inference.workflow.html` |
| Storage / autoridade | Archify dataflow | `.archify/artifacts/anxionos-storage-authority.dataflow.html` |
| Plataforma visual-check | Archify HTML + PNG | `.archify/artifacts/anxionos-platform.architecture.visual-check.html` |
| Ciclo PC (Mermaid) | [lifecycle](./anxionos-ai-product-company-lifecycle.md) | abaixo |
| 23 módulos | Mermaid + fichas | [atlas módulos](./anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) |
| Briefing Owner | Ingest OK | [briefing 2026-09-10](/external-sources/owner-briefing-product-company-2026-09-10) |

## 1. Visão da plataforma

```mermaid
flowchart LR
  humans[Humanos Owner Operator] --> consoles[Consoles Astro]
  consoles --> api[API Bun Elysia]
  api --> modules[23 módulos ADR0002]
  modules --> pg[(PostgreSQL autoritativo)]
  modules --> events[Eventos versionados]
  events --> graphMod[graph projector]
  graphMod --> neo4j[(Neo4j projeção)]
  modules --> conn[connections]
  conn --> providers[Providers MCP APIs modelos]
  gov[governance] -.->|grants epoch| modules
  brainOK[brain OKF local] -.->|contratos| modules
```

Cita: [estrutura](./../brain/notes/anxionos-backend-structure.md) · spec Archify `anxionos-platform.architecture.json`.

## 2. Grafo como estado cognitivo

```mermaid
flowchart TB
  govAI[GOVERNANCE AI] --> org[ORGANIZATION]
  org --> product[PRODUCT]
  org --> tech[TECHNOLOGY]
  org --> biz[BUSINESS]
  product --> agentG[AGENT GRAPH]
  tech --> agentG
  biz --> agentG
  agentG --> kg[Knowledge Graph]
  agentG --> cg[Capability Graph]
  agentG --> rg[Resource Graph]
  kg --> exec[EXECUTION ENGINE]
  cg --> exec
  rg --> exec
  exec --> agents[Agents]
  exec --> tools[Tools]
  exec --> models[Models]
  agents --> ev[EVENTS]
  tools --> ev
  models --> ev
  ev --> obs[OBSERVABILITY]
  obs --> learn[LEARNING]
  learn --> agentG
```

Cita: [índice PC](./anxionos-ai-product-company-index.md) · spec [006 Product/Agent Graph](./../brain/project-docs/specs/006-product-agent-graph/spec.md).

> [!WARNING]
> `graph` **projeta**; não é ledger de capital, grants ou ordens. [ADR0004](./../brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md).

## 3. Cadeia Product Graph (por que a feature existe)

```mermaid
flowchart TD
  Problem -->|solved_by| Product
  Product -->|contains| Feature
  Feature -->|implemented_by| Service
  Service -->|contains| Code
  Code -->|verified_by| Test
  Test -->|deployed_to| Environment
  Environment -->|monitored_by| SRE
  Feature -->|from| Requirement
  Requirement -->|from| UserProblem
  UserProblem -->|from| Research
  Research -->|from| BusinessObjective
  BusinessObjective -->|measured_by| KPI
```

## 4. Ciclo AI Product Company (12 etapas)

Fonte: [lifecycle](./anxionos-ai-product-company-lifecycle.md).

```mermaid
flowchart TB
  S[Strategy] --> D[Discovery]
  D --> PD[Product Definition]
  PD --> UX[UX Design]
  UX --> A[Architecture]
  A --> P[Planning]
  P --> DEV[Development]
  DEV --> TV[Test Verify]
  TV --> CR[Code Review]
  CR --> R[Release]
  R --> O[Operate SRE]
  O --> I[Product Intelligence]
  I --> D
  GOV[Governance Authority] -.-> S
  GOV -.-> P
  GOV -.-> CR
  GOV -.-> R
  GOV -.-> O
```

## 5. Empresa virtual (organização de agentes)

```mermaid
flowchart TB
  CEO[CEO AGENT] --> PEX[PRODUCT EXECUTIVE]
  PEX --> ST[Strategy]
  PEX --> PR[Product]
  PEX --> TE[Technology]
  ST --> RES[Research]
  PR --> DES[Design]
  TE --> ARC[Architecture]
  RES --> ENG[ENGINEERING]
  DES --> ENG
  ARC --> ENG
  ENG --> BE[Backend]
  ENG --> FE[Frontend]
  ENG --> AI[AI]
  BE --> QA[QUALITY]
  FE --> QA
  AI --> QA
  QA --> DEP[DEPLOYMENT]
  DEP --> SRE[SRE]
  SRE --> PI[PRODUCT INTEL]
  PI --> ND[NEW DISCOVERY]
```

Personas Cursor (Renata, Lucas…) **não** são os agentes institucionais de `modules/agents`. Ver SCOPE do framework.

## 6. Governança e níveis de autoridade

```mermaid
flowchart TB
  GOV[GOVERNANCE] --> SAI[Strategic AI]
  GOV --> RPA[Risk Policy AI]
  SAI --> EX[EXECUTIVE AI]
  RPA --> EX
  EX --> Prod[Product]
  EX --> Tech[Technology]
  EX --> Ops[Operations]
```

```mermaid
flowchart TD
  L0[L0 Worker executa] --> L1[L1 Specialist decide no ofício]
  L1 --> L2[L2 Manager coordena]
  L2 --> L3[L3 Director departamento]
  L3 --> L4[L4 Executive C-level]
  L4 --> L5[L5 CEO org]
  L5 --> L6[L6 Owner humano]
```

Autonomia de **investimento** L0–L4 (spec 004 / ANX-137) é eixo **distinto** destes níveis organizacionais. Não misturar no mesmo enum sem ADR. Mapeamento fechado no [debate M01](./anxionos-pc01-governance-debate.md) (ANX-349).

Fronteira física: [governance R02](./../docs/orchestration/modules/governance/R02-boundaries.md) — grants/epoch vs `risk` vs `decisions`.

**CTO 2026-09-10:** nós Approval / ChangeProposal / PolicyReference → `governance`; PolicyVersion kind=RISK → `risk`; DecisionRecord / TradeIntent / ExecutionPermit → `decisions`. Sem pastas `approvals` ou `policies`.

## 7. Decision Engine

```mermaid
flowchart LR
  Prop[proposer] --> Rec[DecisionRecord]
  Ev[evidence] --> Rec
  Alt[alternatives] --> Rec
  Rec --> Auth{required_authority}
  Auth -->|dentro da política| CTO[CTO Agent]
  Auth -->|ultrapassa| CEO[CEO Agent]
  CEO -->|limite humano| Owner[Owner L6]
  CTO --> Exec[execution]
  Owner --> Exec
```

Cita: ANX-265 · [governance bridge](./../docs/orchestration/modules/governance/R08-decision-log.md).

## 8. Storage e autoridade

```mermaid
flowchart LR
  cmd[Command envelope] --> uow[UoW dono]
  uow --> pg[(PostgreSQL estado journal outbox)]
  uow --> nats[NATS eventos]
  nats --> proj[graph projector]
  proj --> neo[(Neo4j)]
  sqlite[SQLite local] -.->|nunca capital grants ordens| pg
```

Cita: [storage ownership](./../brain/notes/anxionos-storage-ownership.md) · Archify dataflow.

## 9. Pipeline de qualidade G0–G7

```mermaid
flowchart TD
  G0[G0 Preparar] --> G1[G1 Desenvolver]
  G1 --> G2[G2 Code Review]
  G2 --> G3[G3 QA]
  G3 --> G4[G4 Security]
  G4 --> G5[G5 Red Team]
  G5 --> G6[G6 Integrar]
  G6 --> G7[G7 Aceite]
  G2 -->|CHANGES_REQUIRED| G1
  G3 -->|falha| G1
  G4 -->|falha| G1
  G5 -->|falha| G1
```

Cita: [AGENTS.md](./../AGENTS.md) · [PIPELINE](./../.cursor/orchestration/PIPELINE.md).

## 10. Mapa 30 capacidades → 23 módulos

```mermaid
flowchart TB
  T01[01 Governance] --> Mgov[governance]
  T02[02 Organization] --> Morg[organizations]
  T02 --> Mid[identity]
  T03[03 Agents] --> Mag[agents]
  T04[04 Agent Teams] --> Morch[orchestration]
  T07[07 Connections] --> Mconn[connections]
  T09[09 Graph] --> Mgraph[graph]
  T23[23 Decisions] --> Mdec[decisions]
  T24[24 Approvals] --> Mgov
  T25[25 Policies] --> Mgov
  T25 --> Mrisk[risk]
  T26[26 Audit] --> Maud[audit]
  T10[10 Products] --> GAP1[gap composto spec 007]
  T29[29 Marketplace] --> GAP1
```

Tabela completa: [alinhamento](./anxionos-product-company-module-alignment.md).

## 11. Entrega P01–P09

```mermaid
flowchart LR
  P01[P01 tooling] --> P02[P02 identity org gov]
  P02 --> P03[P03 graph]
  P03 --> P04[P04 agents orch knowledge]
  P04 --> P05[P05 connections]
  P05 --> P06[P06 ciclo financeiro]
  P06 --> P07[P07 consoles billing]
  P07 --> P08[P08 eval simulation]
  P08 --> P09[P09 recovery launch]
```

Cita: SDD [001](./../brain/project-docs/specs/001-institutional-contract/spec.md).

## Cobertura visual (ANX-343, 2026-09-10)

**Archify plataforma (5/5 validate PASS):** `anxionos-platform.architecture`, `anxionos-delivery-p01-p09.workflow`, `anxionos-product-company.workflow`, `anxionos-connections-inference.workflow`, `anxionos-storage-authority.dataflow`.

**Visual-check** da architecture: HTML + PNG 1440x900 e 2048x1320 (light/dark) em `.archify/artifacts/`.

| Módulo físico | Mermaid | Archify |
| --- | --- | --- |
| identity, organizations, governance | [atlas módulos](./anxionos-diagram-atlas-modules.md) | platform architecture |
| graph | atlas + T01–T20 na ficha | platform architecture |
| agents, orchestration, knowledge | atlas + ciclo P04 | platform + product-company workflow |
| connections | atlas + PC 06/07/30 | connections-inference workflow |
| market-data … audit (ciclo financeiro) | atlas + ciclo P06 | storage-authority dataflow |
| billing, partners | atlas módulos | platform architecture |
| operations, evaluation, simulation | atlas + PC 15–21 | delivery P01–P09 |

HTML Archify **por módulo** (23 specs) **não** foi criado — seria 23º+ artefato visual, não um 24º módulo. Cobertura do **sistema** fecha ANX-343; specs por módulo ficam como follow-up opcional do coordenador.

## Questões abertas

1. Debate serial 01-30? **Fechada em docs:** [indice](./anxionos-pc-serial-index.md). ANX-342 aberto para auditoria.
2. Não promover a taxonomia 30 a ADR de layout — **reafirmado** CTO: rejeitado 30 pastas. ADR0002 permanece.
3. Archify por módulo: **não bloqueia** ANX-343. Plataforma 5/5 + visual-check + preview OK + Mermaid dos 23.

## Fontes

- [estrutura backend](/brain/notes/anxionos-backend-structure.md) — se o link interno falhar, o doc vive em `brain/notes/` (OKF local).
- [alinhamento 30→23](./anxionos-product-company-module-alignment.md)
- [lifecycle PC](./anxionos-ai-product-company-lifecycle.md)
- [governance R02](./../docs/orchestration/modules/governance/R02-boundaries.md)
- [atlas 23 módulos](./anxionos-diagram-atlas-modules.md)
- `.archify/specs/` (cinco specs no repo; validate 2026-09-10 PASS)
- [briefing Owner](/external-sources/owner-briefing-product-company-2026-09-10) (ANX-344)
- [CAPABILITY-MAP e fichas](/docs/orchestration/system-capabilities/CAPABILITY-MAP) (ANX-346/347)
