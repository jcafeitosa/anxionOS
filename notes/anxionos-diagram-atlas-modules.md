---
description: "Mermaid por módulo físico ADR0002: identity até simulation, mais ciclos P02/P04/P06."
status: draft
tags:
  - diagrams
  - mermaid
  - modules
  - adr0002
title: Atlas de diagramas — 23 módulos
type: planning-note
---
# Atlas de diagramas — 23 módulos físicos

Cada bloco: o que o módulo **possui**, o que **não possui**, e o fluxo de comando → evento → projeção. Ownership: [R02 do debate](../docs/orchestration/modules/) e [alinhamento 30→23](./anxionos-product-company-module-alignment.md). Sistema completo: [atlas](./anxionos-diagram-atlas.md).

Agentes e orchestration têm debate em `docs/orchestration/structure-debate/` (pastas não duplicadas em `modules/`).

## identity

```mermaid
flowchart LR
  BA[Better Auth in API] --> ident[identity Principal]
  ident -->|principal registered| org[organizations]
  ident --> api[rotas identity v1]
```

Não possui: Agency, grants, sessão Better Auth no domain (BA fica em apps/api).

Debate serial: [PC 02](./anxionos-pc02-organization-debate.md).

## organizations

Fonte: [R06](../docs/orchestration/modules/organizations/R06-dependencies.md) · [PC 02](./anxionos-pc02-organization-debate.md).

```mermaid
flowchart LR
  BA[Better Auth] --> AP[authPlugin]
  AP --> GPA[identity getPrincipal]
  GPA --> RT[org routes]
  RT --> CMD[commands]
  CMD --> PL[PrincipalLookup]
  CMD -->|membership.activated| gov[governance grant baseline]
  CMD -->|agency created| gproj[graph projector]
```

## governance

Fonte: [R02](../docs/orchestration/modules/governance/R02-boundaries.md).

```mermaid
flowchart TB
  Owner[Owner] --> IG[IssueGrant]
  Owner --> RG[RevokeGrant]
  Owner --> CP[ChangeProposal]
  IG --> EP[authorityEpoch bump]
  RG --> EP
  CP --> APPR[Approval]
  EP --> T01[graph T01 can]
  risk[risk PolicyVersion] -.->|referência| govRef[PolicyReference]
```

Não possui: RiskPolicy, kill switch, ExecutionPermit final, Cypher, pasta `approvals`/`policies`.

**CTO 2026-09-10 (M01):** Approval / ChangeProposal / PolicyReference genérico neste módulo; PolicyVersion kind=RISK em `risk`; DecisionRecord em `decisions`. Debate: [PC 01](./anxionos-pc01-governance-debate.md).

## graph

```mermaid
flowchart LR
  ev[eventos dos donos] --> inbox[projection inbox]
  inbox --> proj[projectors]
  proj --> neo[(Neo4j)]
  q[GraphQuery T01 a T20] --> neo
  q --> proof[proof grantIds epoch]
```

## agents

```mermaid
flowchart LR
  cfg[Agent AgentVersion Skill] --> bind[bindings modelo]
  bind --> conn[connections Binding]
  auto[autonomia L0 a L4] --> gov[governance mandate]
  orch[orchestration Run] --> cfg
```

## orchestration

```mermaid
flowchart TD
  Goal --> Task
  Task --> Run
  Run --> HB[heartbeat budget]
  Run -->|waiting_human| Owner
  Run --> T01[grant check via graph]
```

## knowledge

```mermaid
flowchart LR
  doc[Document Evidence Memory] --> idx[indexação]
  idx --> rag[Graph RAG]
  rag --> agents[agents retrieval]
```

## connections

```mermaid
flowchart LR
  cat[catálogo providers] --> bind[Binding versionado]
  bind --> inf[inference.invoke]
  inf --> quota[quotas cooldown]
  inf --> gov[grant PURPOSE]
```

Transversal: modelos, MCP, APIs, engines. Não concede trading.

## market-data

```mermaid
flowchart LR
  feed[feeds] --> obs[Observation]
  obs --> ts[(Timescale)]
  cal[calendário] --> session[trading session]
  fx[FX corp actions] --> adj[adjusted price]
```

## strategies

```mermaid
flowchart TD
  draft[StrategyVersion] --> backtest[evaluation]
  backtest --> rec[recomendação]
  rec --> gov[ChangeProposal]
  gov --> pub[publish]
```

## capital

```mermaid
flowchart LR
  alloc[Allocation] --> reserve[reserva]
  reserve --> port[portfolios]
  reserve --> exec[execution permit path]
```

## portfolios

```mermaid
flowchart LR
  port[Portfolio] --> pos[posições]
  pos --> acc[accounting]
  port --> risk[limites referenciados]
```

## decisions

```mermaid
flowchart TD
  intent[TradeIntent] --> riskC[RiskCheck]
  riskC --> govE[epoch revalidate]
  govE --> permit[ExecutionPermit]
  permit --> execution
```

Não duplica Approval de ChangeProposal (governance).

## risk

```mermaid
flowchart TB
  pol[RiskPolicy] --> check[RiskCheck]
  check --> ks[kill switch]
  ks --> stop[orchestration stop]
```

## execution

```mermaid
flowchart LR
  permit[ExecutionPermit] --> adapter[venue adapter]
  adapter --> order[Order]
  order --> fill[Fill]
  fill --> acc[accounting]
```

## accounting

```mermaid
flowchart LR
  fill[Fill] --> ledger[lançamentos]
  ledger --> pnl[performance]
  ledger --> bill[billing facts]
```

## performance

```mermaid
flowchart LR
  ledger[accounting] --> metrics[KPIs p95]
  metrics --> eval[evaluation]
  metrics --> obs[operations SLO]
```

## audit

```mermaid
flowchart LR
  cmd[comandos] --> fr[Flight Recorder]
  fr --> replay[replay]
  fr --> integrity[hash chain]
```

## billing

```mermaid
flowchart LR
  usage[usage connections] --> inv[invoice]
  inv --> pay[pagamento]
  pay --> partners[comissão]
```

## partners

```mermaid
flowchart LR
  ref[referral] --> elig[elegibilidade]
  elig --> payout[payout]
  payout --> acc[accounting]
```

## operations

```mermaid
flowchart TD
  probe[probes] --> inc[Incident]
  inc --> runbook[runbook]
  runbook --> deploy[deploy catalog]
  deploy --> rec[recovery]
```

## evaluation

```mermaid
flowchart LR
  run[SimulationRun / backtest] --> score[score]
  score --> cert[certificado]
  cert --> rec[recomendação promoção]
```

Não aprova sozinho — governance ResolveApproval.

## simulation

```mermaid
flowchart LR
  snap[Snapshot] --> twin[SimulationRun]
  twin --> diff[diff]
  diff --> cp[ChangeProposal]
```

## Ciclo financeiro integrado

```mermaid
flowchart LR
  md[market-data] --> st[strategies]
  st --> cap[capital]
  cap --> dec[decisions]
  dec --> rsk[risk]
  rsk --> ex[execution]
  ex --> acc[accounting]
  acc --> perf[performance]
  acc --> aud[audit]
```

## Fundação P02

```mermaid
flowchart LR
  id[identity] --> org[organizations]
  org --> gov[governance]
  gov --> gr[graph T01]
```

## Runtime agentes P04–P05

```mermaid
flowchart LR
  ag[agents] --> orc[orchestration]
  orc --> kn[knowledge]
  ag --> cn[connections]
  orc --> gov[governance]
```
