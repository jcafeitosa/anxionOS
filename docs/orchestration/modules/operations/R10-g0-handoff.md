---
type: debate
status: draft
---

# R10 — Pacote G0 (handoff): `modules/operations`

**Rodada:** R10  
**Data:** 2026-09-11  
**Issues:** ANX-389 (pack P1) · ANX-111 (debate) · **ANX-112** (impl — **não** executada)  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md). Sem código de produto.

## G0 — Escopo documental / G1 futuro

### In scope

| Área | Entrega |
| --- | --- |
| Domínio | Incident, ExportJob, ServiceHealthSnapshot, Runbook, RetentionPolicy |
| Contratos | `@anxionos/contracts/operations/*` |
| Persistência | PostgreSQL `operations_incidents`, `operations_runbooks`, `operations_retention_policies`, `operations_export_jobs`, `operations_health_snapshots`, `operations_command_journal` |
| Object store | resultRef de export |
| Grafo | projector IMPACTS (ids) |
| API | HTTP health/incidents esboço |
| Testes | G3-OPS-* / G5-OPS-* |

### Out of scope

| Item | Destino |
| --- | --- |
| Flight Recorder | audit |
| Kill switch / D-GOV-010 | risk P06 |
| Pasta `infrastructure/` | PC 18 composto — não criar |
| Health como grant de trading | ADR0006 — **não** |
| Spec accepted | Owner + checklist |
| ANX-342 G7 | Owner |
| G1 código | ANX-112 |

## Non-goals

- CI/CD real neste pack.
- Retention **não** apaga ledger.
- SQLite diagnóstico **não** é incidente autoritativo.
- Sem pasta `approvals/` / `policies/`.
- Nenhuma migration ST08.

## Ownership

| Superfície | Dono |
| --- | --- |
| Incident / ExportJob / Health / Runbook | **operations** |
| Flight Recorder | **audit** |
| adapter-gateway | **KEEP** |

## Oráculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-OPS-01 | G3 | export idempotente |
| G3-OPS-02 | G3 | retention não DELETE accounting/execution |
| G3-OPS-03 | G3 | health não emite order.* |
| G5-OPS-01 | G5 | 403 cross-tenant |
| G5-OPS-02 | G5 | export sem grant 403 |
| G5-OPS-03 | G5 | ST04 SQLite |

**Veredito P1:** G0 documental. **Não** G1. ANX-342 `todo`. Specs **draft**.

## Saída R10

Handoff G0. ANX-389 evidência — não G7.
