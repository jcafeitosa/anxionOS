---
type: debate
status: draft
---
# R09 — Plano de implementação: `modules/billing`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue debate:** ANX-389 / ANX-103 · impl futura **ANX-104** (não neste pack)  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Sem migration. Plano **draft**.

## In / Out (R9)

**In:** plano G1 futuro ANX-104 (não neste pack).

**Out:** ordem de pré-requisitos. **Não** ST08. **Não** ANX-389 `done`.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não G7 ANX-104 aqui.

## Ownership (plano)

| Superfície | Dono |
| --- | --- |
| schema billing_* | **billing** (ANX-104 futuro) |
| usage.recorded | **connections** |
| adapter-gateway | **KEEP** |

## Pré-requisitos G1 futuro

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 documental | este pack |
| 2 | eventing + outbox | packages/eventing |
| 3 | graph consumer graph:billing:v1 | graph |
| 4 | connections usage.recorded.v1 | connections pack |
| 5 | organizations AgencyScopePort | organizations |

## Árvore ADR0002 (alvo G1)

```text
backend/modules/billing/src/
  domain/entities/  domain/ports/
  application/commands/  application/consumers/
  infrastructure/persistence/  infrastructure/webhooks/
  api/
  index.ts
```

Não scaffoldar 23 módulos. Não criar `marketplace/` nem `approvals/`.

## Fatias P07 (pós-greenlight Owner)

| Slice | Entrega | Critério |
| --- | --- | --- |
| P07-S1 | schema billing_* + contracts skeleton | G2 G4 |
| P07-S2 | projector usage.recorded.v1 | G3 G4 |
| P07-S3 | IssueInvoice + HTTP | G3 G5 parcial |
| P07-S4 | webhook paid + refund UoW | G3 G5 |

## Matriz testes

| ID | Caso |
| --- | --- |
| G3-BIL-S1-01 | issue idempotente |
| G3-BIL-S2-01 | usage replay uma linha |
| G3-BIL-S3-01 | webhook replay um paid |
| G3-BIL-S4-01 | refund unpaid rejeitado |
| G5-BIL-01..05 | ver R07 |

## Defer

OpenAPI Scalar público; D-GOV-010; RLS P09; PSP live vs sandbox (config infra); ST08 migrations.

P1 **só** fecha o pack G0 documental. **Nenhuma migration ST08.**

## Saída R9

Plano documental aprovado para R10.
