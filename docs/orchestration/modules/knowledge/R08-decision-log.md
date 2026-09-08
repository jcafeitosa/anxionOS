---
type: debate
status: draft
---

# R08 — Decision log: `modules/knowledge`

**Rodada:** R8 — Síntese KN-R* → D-KN-*  
**Data:** 2026-09-08  
**Issue:** ANX-85 · gate: ANX-36 · graph: ANX-32

## Objetivo

Consolidar R01–R07, resolver P-R7, PC-G0 checklist.

## Tabela consolidada D-KN-*

| ID | Decisão | Status |
| --- | --- | --- |
| D-KN-001 | knowledge dono Document/Memory/Evidence/ContextManifest/EmbeddingSpace | ✅ |
| D-KN-002 | pgvector PG owner knowledge (ADR0004) | ✅ |
| D-KN-003 | ACL pré-filtro antes vector search | ✅ |
| D-KN-004 | BrainFacade agents — knowledge persiste corpus | ✅ |
| D-KN-005 | GraphTraversalPort read-only via graph module | ✅ |
| D-KN-006 | Embedding compute via connections MODEL | ✅ |
| D-KN-007 | Eventos sem vetores/texto bruto/secrets | ✅ |
| D-KN-008 | `context.manifest.created.v1` ownerDomain knowledge | ✅ |
| D-KN-009 | BlobStorePort shared contracts | ✅ |
| D-KN-010 | Neo4j async graph:knowledge:v1 | ✅ |
| D-KN-011 | Working memory TTL owner knowledge | ✅ |
| D-KN-012 | PromoteMemory via evaluation gate | ✅ |
| D-KN-013 | SQLite só ACL cache descartável | ✅ |
| D-KN-014 | command_journal HTTP idempotency | ✅ |
| D-KN-015 | RLS PG defer P09 — application guards | ✅ |
| D-KN-016 | `knowledge.document.revoked.v1` ACL document | ✅ |
| D-KN-017 | Timescale fora knowledge | ✅ |
| D-KN-018 | RetrievalSession audit efêmera | ✅ |
| D-KN-019 | `@anxionos/contracts/knowledge/*` G1 pending | ⏳ ANX-86 |
| D-KN-020 | Workers ingestion/index G1 pending | ⏳ ANX-86 |

**Total:** 20 decisões aceitas v1 · 2 G1 pendentes

## Crosswalk KN-R* → D-KN-*

| Rodada | IDs |
| --- | --- |
| R02 | D-KN-001,003,015 |
| R03 | D-KN-002,004,005,006,007,011,012,017,018 |
| R04 | D-KN-008,009,016,019 |
| R05 | D-KN-010,013,014 |
| R06 | D-KN-005,006 wiring |
| R07 | D-KN-003 reforço,015 |

## Resolução P-R7 (abertas R03/R04)

| # | Pergunta | Decisão |
| --- | --- | --- |
| P-R7-01 | context.manifest prefix | `context.manifest.created.v1` + ownerDomain knowledge (D-KN-008) |
| P-R7-02 | GraphTraversal SDK vs HTTP | SDK in-process v1 (D-KN-005) |
| P-R7-03 | BlobStore package | `@anxionos/contracts/storage` (D-KN-009) |
| P-R7-04 | Retrieval scores | RetrievalPolicy versionada env (KN-R07-02) |
| P-R7-05 | document revoke event | `knowledge.document.revoked.v1` (D-KN-016) |
| P-R7-06 | RLS v1 | Application-only — defer P09 (D-KN-015) |
| P-R7-07 | command_journal retention | 90d hot PG + archival R09 |

## PC-G0 checklist (preview R10)

| # | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | Decision log R8 | ✅ |
| PC-G0-02 | Plano R9 | ⏳ R09 |
| PC-G0-03 | Pacote G0 R10 | ⏳ R10 |
| PC-G0-04 | spec 002 alinhada | ✅ |
| PC-G0-05 | R06–R08 sem bloqueios | ✅ |
| PC-G0-06 | Top 5 riscos | ✅ |
| PC-G0-07 | graph:knowledge:v1 spec | ✅ ANX-32 |
| PC-G0-08 | ANX-36 epic gate | ✅ in_review |
| PC-G0-09 | Crítico nominal | ✅ |
| PC-G0-10 | Impl issue relacionada | ⏳ ANX-86 |

## Critérios de aceite — R08

| # | Critério | Status |
| --- | --- | --- |
| AC-R08-01 | D-KN-* consolidado | ✅ |
| AC-R08-02 | P-R7-01..07 resolvidos | ✅ |
| AC-R08-03 | PC-G0 preview | ✅ |
| AC-R08-04 | Crosswalk R01–R07 | ✅ |

## Saída R8

✅ → [R09-dev-plan.md](./R09-dev-plan.md)
