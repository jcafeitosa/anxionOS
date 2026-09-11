---
type: guide
---

# Precedência documental (ANX-455)

Decisão do Owner (2026-09-11): **`brain/` é canônico**. `project-docs/` e `docs/decisions/` (e demais cópias versionadas com o mesmo número) são **legado**. Não deletar — marcar precedência.

Identificar ADR/spec por **caminho + título**, não só pelo número. Há colisões entre `brain/`, `project-docs/` e `docs/`.

## Como ler um número duplicado

1. Abrir a linha deste registro.
2. Usar a coluna **Canônico (`brain/`)**.
3. Tratar as outras colunas como histórico; não implementar contra o legado em conflito.

## ADRs numerados

| Nº | Canônico (`brain/`) | Legado (não prevalece) |
| --- | --- | --- |
| 0001 | `brain/project-docs/decisions/0001-graph-operational-domain-authority.md` (proposto) | — |
| 0002 | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` (aceito) | — |
| 0003 | `brain/project-docs/decisions/0003-tool-gateway-module-placement.md` (proposto) | — |
| 0004 | `brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md` (aceito) | — |
| 0005 | `brain/project-docs/decisions/0005-agent-hierarchy-modes-triangular-circular.md` (draft — hierarquia TREE/CIRCULAR) | `project-docs/decisions/0005-product-graph-neo4j-projection.md` (outro assunto: Product Graph / Neo4j); `docs/decisions/0005-realtime-gateway-elysia-nats.md` (outro assunto: gateway realtime) |
| 0006 | `brain/project-docs/decisions/0006-distribute-external-gateways-within-baseline.md` (aceito) | — |
| 0007 | `brain/project-docs/decisions/0007-multi-tenancy-strategy.md` (aceito) | — |

## Specs numeradas

| Nº | Canônico (`brain/`) | Legado (não prevalece) |
| --- | --- | --- |
| 001 | `brain/project-docs/specs/001-institutional-contract/` | — |
| 002 | `brain/project-docs/specs/002-agents-knowledge/spec.md` (**accepted**, G7 Owner 2026-09-11) | `project-docs/specs/002-agents-knowledge/spec.md` (cópia curta; **não** declara draft) |
| 003 | `brain/project-docs/specs/003-investment-lifecycle/` | `project-docs/specs/003-investment-lifecycle/` |
| 004 | `brain/project-docs/specs/004-institutional-evolution/` | `project-docs/specs/004-institutional-evolution/` |
| 005 | `brain/project-docs/specs/005-connections-integration/` | `project-docs/specs/005-connections-integration/` |
| 006 | `brain/project-docs/specs/006-agent-hierarchy-orchestration/` (draft — hierarquia) | `project-docs/specs/006-product-agent-graph/` (outro assunto: Product/Agent Graph) |
| 007 | — (não há 007 em `brain/`) | `project-docs/specs/007-products-marketplace-capability/` (legado isolado) |
| 008 | `brain/project-docs/specs/008-multi-tenant-isolation/` | — |
| — | `brain/project-docs/specs/anx-governance-decision-engine/` (quando existir) | `project-docs/specs/anx-governance-decision-engine/design.md` (design legado, sem número 00N) |

## Índice público

Áreas versionadas em `docs/` apontadas em [docs/index.md](index.md): plataforma, orquestração, observabilidade, decisões (legado), pesquisa, equipe.

## Verificação

```bash
rg -n "esqueleto parcial|Esta fase autoriza planejamento" AGENTS.md
rg -n "superseded|ANX-455|legado" docs/decisions/0005-realtime-gateway-elysia-nats.md project-docs/decisions/0005-product-graph-neo4j-projection.md project-docs/specs/002-agents-knowledge/spec.md project-docs/specs/006-product-agent-graph/spec.md
```
