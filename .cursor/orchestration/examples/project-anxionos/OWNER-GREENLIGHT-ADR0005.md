# Owner Greenlight — ADR0005 + Spec 006 (ANX-276)

> Pacote de aceite para transição **proposed → accepted** da projeção Neo4j Product/Agent Graph.

## Documentos para revisão

| Doc | Caminho OKF | Status atual |
| --- | --- | --- |
| ADR0005 Product Graph Neo4j projection | `brain/project-docs/decisions/0005-product-graph-neo4j-projection.md` | proposed |
| Spec 006 Product/Agent Graph | `brain/project-docs/specs/006-product-agent-graph/spec.md` | draft/proposed |
| Auditoria P0 | `brain/notes/anxionos-ai-product-company-documentation-audit.md` | atualizada 2026-09-10 |
| Schema registry (código) | `backend/packages/contracts/src/graph/schema/product-graph-schema.ts` | implementado ANX-271 |
| Experimentation Engine | `brain/notes/anxionos-experimentation-engine.md` | proposed ANX-281 |
| Incident Management | `brain/notes/anxionos-incident-management-graph.md` | proposed ANX-281 |
| Self-Development loop | `brain/notes/anxionos-self-development-loop.md` | proposed ANX-281 |
| Greenlight checklist | `brain/notes/anxionos-owner-greenlight-package-adr0005.md` | ANX-276 |
| Índice hub P0/P1 | `brain/notes/anxionos-ai-product-company-index.md` | ANX-283 |
| Spec 007 Products/Marketplace | `brain/project-docs/specs/007-products-marketplace-capability/spec.md` | ANX-284 |
| Blueprint ANX-277 | `brain/project-docs/specs/006-product-agent-graph/projection-worker-p2-design.md` | ANX-277 prep |
| Critérios P2 | `brain/notes/anxionos-p2-slices-acceptance-criteria.md` | ANX-285 |
| Status executivo | `brain/notes/anxionos-ai-product-company-status.md` | snapshot Owner |
| Delegation ANX-277/278/279 | `delegation-queue/ANX-277.md` · `ANX-278.md` · `ANX-279.md` | pós-greenlight |
| Spec 007 Products/Marketplace | `brain/project-docs/specs/007-products-marketplace-capability/spec.md` | ANX-284 |

## Pré-requisitos entregues (P0)

- ANX-265–273, 270: **done G7**
- `bun test backend/tests/contracts` — **55/55 pass**
- Framework: `.cursor/orchestration/AI-PRODUCT-COMPANY-ENGINE.md` (26 seções)

## Decisão solicitada

1. Aceitar ADR0005 para implementação **sandbox/staging only** (P2)
2. Aceitar spec 006 como contrato canônico Product/Agent Graph
3. Autorizar claim **ANX-277** (projection worker) após aceite

## Riscos declarados (não bloqueiam sandbox)

- Neo4j não homologado em produção
- Grafo Product separado do institucional (custo operacional extra)
- Sincronização OKF ↔ Neo4j requer pipeline de ingestão

## Aceite

Comentar no board **ANX-276** com:

```text
GREENLIGHT ADR0005 + spec 006 — aceito para P2 sandbox.
```

Issue: **ANX-276**
