---
type: audit-note
title: Auditoria documentação — AI Product Company Engine
description: Mapeamento de conflitos, lacunas e decisões aceitas versus propostas para o goal AI Product Company Engine.
status: draft
decision_status: proposed
owner: Orquestração
created: 2026-09-10
version: "0.1"
tags:
  - audit
  - product-company
  - documentation
---
# Auditoria documentação — AI Product Company Engine

## Escopo

Auditoria do estado documental em `brain/`, `.cursor/orchestration/` e `docs/` públicos para o goal de transformar os princípios da AI Product Company Engine no anxionOS/ArcheonOS.

Data: 2026-09-10. Método: leitura OKF + AGENTS.md + estrutura backend aceita + taskboard ANX-*.

## Fontes auditadas

| Fonte | Status | Papel |
| --- | --- | --- |
| AGENTS.md | aceito (repo) | Gates G0–G7, zero-trabalho-fora-do-board |
| brain/notes/anxionos-backend-structure.md | aceito | 23 módulos baseline ADR0002 |
| brain/project-docs/decisions/0002-adopt-modular-backend-layout.md | aceito | Layout modular |
| brain/project-docs/decisions/0001-graph-operational-domain-authority.md | proposto | Grafo operacional |
| brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md | aceito | Armazenamento |
| brain/project-docs/specs/001-institutional-contract/spec.md | aceito | SDD P01–P09 |
| .cursor/orchestration/PRODUCT-COMPANY-MODEL.md | framework aceito | 12 etapas operacionais |
| .cursor/orchestration/PRODUCT-GRAPH-SCHEMA.md | framework P0 | Schema lógico Product Graph |
| brain/project-docs/specs/anx-governance-decision-engine/design.md | draft/proposed | Decision Engine |
| brain/project-docs/specs/006-product-agent-graph/spec.md | draft/proposed | Product+Agent Graph |
| brain/notes/anxionos-product-company-module-alignment.md | draft | 30→23 módulos |
| brain/notes/anxionos-ai-product-company-lifecycle.md | draft | Ciclo 12 etapas |
| brain/project-docs/plans/ai-product-company-execution-plan.md | draft | Slices ANX-* |

## Decisões aceitas vs propostas

### Aceitas (prevalecem sobre propostas em conflito)

- ADR0002: layout modular backend/apps + modules + packages
- ADR0004: PostgreSQL + TimescaleDB + pgvector; Neo4j para grafo institucional
- 23 módulos baseline (sem scaffold vazio)
- Pipeline G0–G7 com crítico independente por executor
- Bun + Elysia + Astro; Zod/Drizzle/Better Auth como preferências documentadas
- `brain/` local-only (não versionado no GitHub)

### Propostas (não implementar sem aceite explícito)

- ADR0001: grafo operacional como domínio de autoridade
- ADR0003: módulo `tools` (não na árvore aceita)
- Product Graph runtime Neo4j P3
- Agent Graph com performance/disponibilidade runtime
- Self-healing e self-development autônomos
- Módulos conceituais Products e Marketplace (gaps sem módulo físico)
- 30 módulos taxonômicos como mapa de capacidades (não como pastas)

## Conflitos identificados

| Conflito | Severidade | Resolução |
| --- | --- | --- |
| Decision Engine status: design usa `proposed/under_review/approved` vs contract usa `PROPOSED/AUTHORITY_CHECKED/SUBMITTED/EXECUTING` | MÉDIO | Delta narrow mantém engine status; mapeamento documentado em design § estados; slice futuro unifica |
| governanceScopeKind (agency\|organization) vs decisionScopeSchema (product\|engineering) | BAIXO | Schemas separados por design; sem colisão |
| PRODUCT-GRAPH-SCHEMA em `.cursor/orchestration/` vs spec 006 em `brain/` | BAIXO | Spec 006 é canônica OKF; orchestration é espelho operacional P0 |
| ANX-266 já ocupada (organizations) vs plano governance bridge | BAIXO | Renumerado para ANX-270 no plano |
| Risk/cost/confidence no design vs ausentes no DecisionRecord v1 | BAIXO | Fora do delta narrow; issue futura |

## Lacunas documentais

| Lacuna | Prioridade | Ação |
| --- | --- | --- |
| ADR P3 Product Graph Neo4j projection | ALTA | **Criada** ADR0005 proposed — aceite Owner ANX-276 |
| Spec Products/Marketplace (gaps) | MÉDIA | **ANX-284 done** — spec 007 capability composite |
| Runbooks self-healing P1 | BAIXA | **ANX-273 done** — automação ANX-279 |
| CLI `orchestration:product-graph` | BAIXA | **ANX-269 done** (`orchestration:phase company`) |
| Exemplos instanciados Product Graph | MÉDIA | **ANX-267 done** (4 exemplos) |
| AgentRole coverageStatus 100% personas | MÉDIA | **ANX-268 done** (18/18) |
| Integração Connections como camada transversal | MÉDIA | Referenciar spec 005; não duplicar |
| Neo4j projection worker runtime | ALTA | ANX-277 (bloqueado ANX-276) |
| Product Intelligence runtime | MÉDIA | ANX-278 (bloqueado ANX-277) |

## Alinhamento 30 módulos → 23 físicos

Ver `brain/notes/anxionos-product-company-module-alignment.md`. Resumo:

- **Cobertos:** identity, governance, decisions, audit, graph, agents, accounting, billing, risk, organizations, etc.
- **Compostos:** Engineering, Testing, Security, Analytics, Operations → distribuídos em módulos + orchestration
- **Gaps:** Products, Marketplace → capacidades conceituais sem módulo físico
- **Transversal:** Connections → spec 005, não módulo separado dos 23

## Evidências de implementação verificada (P0 — 2026-09-10)

| Item | Evidência | Status |
| --- | --- | --- |
| Decision Engine contract v1 | ANX-265 done · `bun test backend/tests/contracts` 55/55 | **done G7** |
| Governance bridge | ANX-270 done · authority-grant-bridge.ts | **done G7** |
| Product Graph P0 index | ANX-267 done · exemplos brain/product-graph-examples/ | **done G7** |
| Agent Graph registry | ANX-268 done · brain/notes/agent-graph-registry.md | **done G7** |
| PC stage hooks CLI | ANX-269 done · product-company-stages.test.mjs 8/8 | **done G7** |
| Schema registry P3 | ANX-271 done · product-graph-schema.ts + agent-graph-schema.ts | **done G7** |
| Product Intelligence loop doc | ANX-272 done · brain/notes/anxionos-product-intelligence-loop.md | **done G7** |
| Self-healing runbooks P1 | ANX-273 done · brain/notes/anxionos-self-healing-runbooks.md | **done G7** |
| Framework master doc | `.cursor/orchestration/AI-PRODUCT-COMPANY-ENGINE.md` (26 seções) | **done** |
| Cognitive OS specs §21–25 | experimentation, incidents, self-dev notes ANX-281 | **done** |
| Owner greenlight package | `brain/notes/anxionos-owner-greenlight-package-adr0005.md` | ANX-276 todo |
| Spec Product/Agent Graph | brain/spec 006 + registry ANX-271 | draft/proposed |
| ADR0005 Neo4j projection | brain/decisions/0005-product-graph-neo4j-projection.md | **proposed** |
| Plano execução P2 | brain/plans/ai-product-company-execution-plan.md | atualizado ANX-275 |
| Archify workflow 12 etapas | `.archify/specs/anxionos-product-company.workflow.json` | validado |

## Não verificado (sem evidência runtime)

- Product Graph Neo4j projection
- Agentes permanentes autônomos
- Self-healing/self-development implementados
- Product Intelligence loop operacional
- Deploy staging/prod da engine

## Critérios de aceite desta auditoria

- [x] Fontes listadas com status aceito/proposto
- [x] Conflitos documentados com severidade e resolução
- [x] Lacunas com prioridade e issue/ação
- [x] Alinhamento 30→23 referenciado
- [x] ADR P3 criada (ADR0005 proposed)
- [x] Slices P0 ANX-265–273 entregues com G7
- [x] Fase P1 documentação completa (ANX-265–282, índice hub)
- [ ] Revisão Owner/CTO aceite ADR0005 + spec 006 (ANX-276)
- [ ] Runtime P2 verificado (ANX-277–279)

## Próximas ações

1. **ANX-276** — @Owner greenlight ADR0005 + spec 006
2. **ANX-277** — Neo4j projection worker sandbox (após greenlight)
3. **ANX-278** — Product Intelligence runtime FEEDS_BACK
4. **ANX-279** — Self-healing executor staging (G4 Isa)
5. G4 Security review runbooks antes de preauthorize