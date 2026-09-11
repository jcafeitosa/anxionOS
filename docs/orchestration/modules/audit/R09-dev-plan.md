---
status: draft
type: debate
---
# R09 — Plano: `modules/audit`

**Rodada:** R9 · ANX-107 · pack ANX-389  
**Implementação:** **ANX-108** — **não** neste slice.  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

## In / Out (R9)

**In (quando G1 autorizado):** schema PG audit_*, contratos, tap+dedupe, ReplaySession + grant, HTTP v1, contrato projector `graph:audit:v1` (driver em **graph**).

**Out deste pack P1:** só G0 documental. Sem migration. Sem ST08 live.

## Out of scope

Migration agora; D-GOV-010; RLS P09; segundo ledger; pasta policies/; Cypher no módulo; ANX-342 done.

## Non-goals P1

Só G0. Não scaffoldar 23 módulos. Não fake ST08.

## Árvore ADR0002 (alvo G1)

```text
backend/modules/audit/src/
  domain/  application/commands/  infrastructure/persistence/  api/  index.ts
```

Sem 24º módulo. Sem approvals/.

## Fatias (pós-greenlight)

| Slice | Entrega | Critério |
| --- | --- | --- |
| S1 | schema manifest+replay | journal |
| S2 | domain event tap + dedupe | G3-AUD-S2-01 |
| S3 | replay session + grant | G3-AUD-S3-01; G3-AUD-01 read-only |
| S4 | HTTP v1 + graph contract | G5-AUD-01 |

## Matriz oráculos

| ID | Caso |
| --- | --- |
| G3-AUD-01 | replay read-only |
| G3-AUD-02 | tap dedupe eventId |
| G3-AUD-S2-01 | mesmo evento não duplica manifesto |
| G3-AUD-S3-01 | ReplaySession sem grant → 403 |
| G5-AUD-01 | 403 cross-tenant |
| G5-AUD-02 | UPDATE chunk rejeitado |
| G5-AUD-03 | (R07) redact secrets |

## Defer

D-GOV-010 (`risk` P06); RLS P09; ST08; spec `accepted`.

## Saída R9

Para R10.
