---
type: debate
---

# R07 — Riscos: `modules/knowledge`

**Componente:** modules/knowledge  
**Rodada:** R7 — Threat matrix, poisoning, cross-tenant, embedding leak  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-85 · ANX-36

## Objetivo

Matriz L×I, controles G4/G5, top 5 → R08.

## Registro de riscos

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-KN-01 | Cross-tenant vector retrieval | 4 | 5 | **20** | ACL SQL pre-filter + org_id + space_id | G4,G5 |
| R-KN-02 | Embedding leak via event/API | 3 | 5 | **15** | EmbeddingRef only; lint payloads | G4 |
| R-KN-03 | Prompt injection via retrieved doc | 4 | 4 | **16** | Content untrusted; manifest redaction | G4,G5 |
| R-KN-04 | Data poisoning ingest | 3 | 5 | **15** | classification + license + verify gate | G4,G5 |
| R-KN-05 | Stale ACL após revoke | 3 | 4 | **12** | knownAt revalidation; cache TTL | G3,G4 |
| R-KN-06 | Dimension mismatch silent wrong space | 2 | 4 | **8** | KN-R03-INV-CHK-02 typed error | G3 |
| R-KN-07 | Graph traversal expand unauthorized docs | 3 | 5 | **15** | GrantValidation before traverse | G4,G5 |
| R-KN-08 | Memory auto-verify without evidence | 2 | 5 | **10** | KN-R03-INV-MEM-01 rubrica | G4 |
| R-KN-09 | Blob store SSRF/path traversal | 2 | 4 | **8** | bucket policy; ref opaco | G4 |
| R-KN-10 | Partial index publish | 3 | 4 | **12** | atomic IndexGeneration KN-R03-INV-DOC-01 | G3 |

## Matriz ameaças

| Impact → | 3 Médio | 4 Alto | 5 Crítico |
| --- | --- | --- | --- |
| **L4 Provável** | — | R-KN-03 | R-KN-01 |
| **L3 Possível** | R-KN-05 | R-KN-10 | R-KN-02,04,07 |
| **L2 Improvável** | R-KN-06,09 | R-KN-08 | — |

## Top 5 → R08

| Rank | ID | Sev | Tema |
| ---: | --- | ---: | --- |
| 1 | R-KN-01 | 20 | Cross-tenant retrieval |
| 2 | R-KN-03 | 16 | Prompt injection / poisoning |
| 3 | R-KN-02 | 15 | Embedding leak |
| 4 | R-KN-04 | 15 | Ingest poisoning |
| 5 | R-KN-07 | 15 | Unauthorized graph expansion |

## Controles G5 (sandbox)

| ID | Cenário adversarial |
| --- | --- |
| G5-KN-01 | Query org A chunk ids org B → zero results + audit |
| G5-KN-02 | Event payload com float array → schema reject |
| G5-KN-03 | Injected doc "ignore ACL" → retrieval unchanged |
| G5-KN-04 | Revoke memory → query fail-closed within SLA |
| G5-KN-05 | Traversal seed outside grant → KN_PERMISSION_DENIED |

## Decisões R07

| ID | Decisão |
| --- | --- |
| KN-R07-01 | ACL application-only v1 — RLS defer P09 |
| KN-R07-02 | RetrievalPolicy versionada — scores 0.40/0.20/0.15/0.15/0.10 config |
| KN-R07-03 | Ingest quarantine path para RESTRICTED classification |
| KN-R07-04 | G5 checklist obrigatório pré-G1 código |

## Critérios de aceite — R07

| # | Critério | Status |
| --- | --- | --- |
| AC-R07-01 | Threat matrix L×I | ✅ |
| AC-R07-02 | Poisoning + cross-tenant + embedding leak | ✅ |
| AC-R07-03 | Top 5 mapeados | ✅ |
| AC-R07-04 | Controles G4/G5 | ✅ |
| AC-R07-05 | Handoff R08 | ✅ |

## Saída R7

✅ → [R08-decision-log.md](./R08-decision-log.md)
