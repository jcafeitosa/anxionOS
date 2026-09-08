---
type: debate
---

# R01 — Contexto: `modules/knowledge`

**Componente:** modules/knowledge  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P04  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Documentos, memórias, evidências e Graph RAG — contexto autorizado para decisões e agentes.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Document
- Memory
- Evidence
- ContextManifest
- embeddings (pgvector)

### Não possui (fronteiras ADR0002 / brain)

- Agent/Brain facade — agents
- Run/outcome registro — orchestration
- Decisão investimento — decisions

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | graph, governance, connections (modelos), organizations (ACL tenant) |
| **Downstream** | decisions, agents, orchestration, evaluation, audit |

## Armazenamento

PG+pgvector: metadados e embeddings. Neo4j: fontes, claims, evidências. SQLite: scratch local sanitizado opcional.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- ACL: tenant + grant vs embedding space isolation (ST06)?
- Graph RAG: kernel traversal + pgvector híbrido — contrato?
- Evidence vs Memory: promoção e retenção?
- Object storage para blobs — package ou infra knowledge?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ Debate R01–R10 ✅ — handoff impl [ANX-86](../../module-queue.md) · G0 [R10-g0-handoff.md](./R10-g0-handoff.md) (ANX-85 `in_review`).
