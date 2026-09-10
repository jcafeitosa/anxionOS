---
type: guide
title: Funcionalidades — modules/knowledge
---
# Funcionalidades — `modules/knowledge` (P04)

**Issue mapa:** ANX-347 · **Serial:** [PC 08](/notes/anxionos-pc08-knowledge-debate) · [PC 27 Memory](/notes/anxionos-pc27-memory-debate)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 002

## Responsabilidade

Document, Memory, Evidence, ingest, busca Graph RAG (refs). **Não** é journal de domínio. **Não** escreve Neo4j diretamente — `graph` projeta.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Upload doc, anexar evidência a decisão | `IngestDocument`, `AttachEvidence` |
| **Operator** | Busca memórias / evidências | `SearchMemory` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Brain AGENCY** | `knowledge.memory.search`, `knowledge.evidence.attach` | Token budget; políticas não truncadas |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `IngestDocument` | Commit conteúdo + hash | `knowledge.document.committed.v1` |
| `AttachEvidence` | Liga evidenceId a alvo | `knowledge.evidence.available.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `SearchMemory` | Hits + refs (sem secrets) |
| `GetEvidence` | Evidence DTO |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `knowledge.document.committed.v1` | graph, decisions |
| `knowledge.evidence.available.v1` | decisions, audit |

## Integração

| Módulo | Borda |
| --- | --- |
| **orchestration** | Contexto de Run |
| **decisions** | Cadeia de evidência |
| **evaluation** | Learning loop (PC 28) |
| **graph** | Projeção Document/Memory |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/knowledge/src/index.ts` presente. **Não** G7.
