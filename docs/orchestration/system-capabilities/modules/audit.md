---
type: guide
title: Funcionalidades — modules/audit
---
# Funcionalidades — `modules/audit` (P06)

**Issue mapa:** ANX-347 · **Serial:** [PC 26](/notes/anxionos-pc26-audit-debate)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 003

## Responsabilidade

Flight Recorder, linhagem, replay governado. Consome journal global; **não** é dono de grants nem de DecisionRecord.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Platform** | Manifest, lineage, replay | `GetManifest`, `TraceLineage`, `RequestReplay` |
| **Owner** | Ver cadeia de uma decisão | `TraceLineage` (escopo Agency) |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Audit agent PLATFORM** | `audit.lineage.trace` | Sem credencial Neo4j |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `RecordManifest` | Manifest | `audit.manifest.recorded.v1` |
| `RequestReplay` | Job governado | `audit.replay.completed.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetManifest` | Manifest por janela |
| `TraceLineage` | Cadeia causal |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `audit.manifest.recorded.v1` | operations, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **Todos** | Journal/outbox |
| **graph** | Lineage visual T10/T11 |
| **operations** | Recovery / export |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/audit/src/index.ts` presente. **Não** G7.
