---
type: debate
status: draft
---

# R09 — Plano de implementação (P04/P08): `modules/knowledge`

**Rodada:** R9 — Plano executável pós-debate  
**Data:** 2026-09-08  
**Issue:** ANX-85 · gate: **ANX-36** · impl: **ANX-86** · graph: ANX-32

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R9)

**In:** slices P04-S1–S5. **Out:** plano documental. Zero código até claim ANX-86.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Plano knowledge | **knowledge** |
| adapter-gateway | **KEEP** |

## Objetivo

Traduzir D-KN-* em slices P04-S1–S5 com matriz G3/G4/G5. Zero código até claim ANX-86.

## Pré-requisitos

| Gate | Evidência | Issue |
| --- | --- | --- |
| R10 G0 | R10-g0-handoff.md | ANX-85 |
| Epic gate | E2E institucional | ANX-36 |
| Graph traversal | T05/T10 handlers | ANX-32 |
| Connections MODEL | embed stub | ANX-84+ |
| Impl claim | Taskboard | ANX-86 |

## Slices P04

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P04-S1** | schema core, sources, documents, command_journal, contracts skeleton | G2, G4 |
| **P04-S2** | pgvector, chunks, index_generations, ingest worker, EmbeddingPort | G3, G4, G5 parcial |
| **P04-S3** | memories, evidence, embedding_spaces, verify/revoke | G3, G4 |
| **P04-S4** | RetrievalPort, query, context manifests, GraphTraversalPort | G3, G5 |
| **P04-S5** | HTTP `/v1/knowledge/*`, memory-expiry worker, OpenAPI | G2, G3, G5 completo |

## Matriz G3

| ID | Cenário | Slice |
| --- | --- | --- |
| G3-KN-S1-01 | ingestDocument idempotent | S2 |
| G3-KN-S1-02 | publishIndex atomic — partial fail no activeVersion | S2 |
| G3-KN-S2-01 | queryKnowledge ACL deny → empty + audit | S4 |
| G3-KN-S2-02 | verifyMemory without evidence → KN_INSUFFICIENT_EVIDENCE | S3 |
| G3-KN-S3-01 | buildContextManifest budget truncation | S4 |
| G3-KN-S3-02 | memory revoke → query exclude within TTL | S3,S5 |

## Matriz G4

| ID | Controle | Slice |
| --- | --- | --- |
| G4-KN-01 | Payload lint — no embedding arrays | S1 |
| G4-KN-02 | Cross-org document GET → 403 | S1 |
| G4-KN-03 | GraphTraversal without grant → deny | S4 |
| G4-KN-04 | Manifest sem hiddenReasoning field | S4 |

## Matriz G5

| ID | Adversarial | Slice |
| --- | --- | --- |
| G5-KN-01 | Cross-tenant vector query | S4 |
| G5-KN-02 | Poison doc injection in manifest | S4 |
| G5-KN-03 | Event exfiltration float[] | S1 |
| G5-KN-04 | Stale ACL after revoke | S5 |
| G5-KN-05 | Unauthorized traversal expansion | S4 |

## Dependências externas

| Issue | Impacto |
| --- | --- |
| ANX-36 | Epic autoriza G1 |
| ANX-32 | graph:knowledge:v1 projector |
| ANX-82 | agents BrainFacade consumer |
| ANX-84 | connections MODEL embed |

## Critérios de aceite — R09

| # | Critério | Status |
| --- | --- | --- |
| AC-R09-01 | Slices P04-S1–S5 | ✅ |
| AC-R09-02 | Matriz G3/G4/G5 | ✅ |
| AC-R09-03 | Mapa D-KN → slices | ✅ |
| AC-R09-04 | Dependências issues | ✅ |

## Saída R9

✅ → [R10-g0-handoff.md](./R10-g0-handoff.md)
