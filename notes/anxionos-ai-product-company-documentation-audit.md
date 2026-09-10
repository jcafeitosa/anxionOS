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
| ADR P3 Product Graph Neo4j projection | ALTA | Criar ADR proposed neste goal |
| Spec Products/Marketplace (gaps) | MÉDIA | Não criar módulo; spec de capacidade composta |
| Runbooks self-healing P1 | BAIXA | ANX-273 |
| CLI `orchestration:product-graph` | BAIXA | ANX-267 |
| Exemplos instanciados Product Graph (3 casos) | MÉDIA | ANX-267 |
| AgentRole coverageStatus 100% personas | MÉDIA | ANX-268 |
| Integração Connections como camada transversal | MÉDIA | Referenciar spec 005; não duplicar |

## Alinhamento 30 módulos → 23 físicos

Ver `brain/notes/anxionos-product-company-module-alignment.md`. Resumo:

- **Cobertos:** identity, governance, decisions, audit, graph, agents, accounting, billing, risk, organizations, etc.
- **Compostos:** Engineering, Testing, Security, Analytics, Operations → distribuídos em módulos + orchestration
- **Gaps:** Products, Marketplace → capacidades conceituais sem módulo físico
- **Transversal:** Connections → spec 005, não módulo separado dos 23

## Evidências de implementação verificada

| Item | Evidência | Status |
| --- | --- | --- |
| Decision Engine contract v1 | ANX-265, 8/8 testes, G1 PASS | in_review G2 |
| Spec Product/Agent Graph | brain/spec 006 | draft |
| Plano execução | brain/plans/ai-product-company-execution-plan | draft |
| Issues ANX-267–273 | taskboard | criadas |
| Archify workflow 12 etapas | .archify/specs/anxionos-product-company.workflow.json | existe |

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
- [ ] ADR P3 criada (pendente)
- [ ] Revisão Owner/CTO (pendente)

## Próximas ações

1. G2 code review ANX-265
2. ADR P3 Product Graph projection (proposed)
3. Claim ANX-267 após G2 PASS
4. Validar archify workflow JSON