---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/partners`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue debate:** ANX-389 / ANX-113 · impl **ANX-114** (não neste pack)  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Migrations versionadas pertencem ao módulo e são validadas no oracle de banco novo.

## In / Out (R9)

**In scope (G1 futuro):** schema `partners_*`, contratos, consumers paid/refund, HTTP `/v1/partners`, projector `graph:partners:v1`.

**Out of scope:** Invoice (`billing`); ledger (`accounting`); pasta `marketplace/`; spec accepted; ST08 migration agora; ANX-342/389 done; rails PSP payout live.

## Non-goals P1

Só G0 documental. Não scaffoldar 23 módulos. Não G7 ANX-114 neste pack. Não fake ST08.

## Ownership (plano)

| Fatia | Dono |
| --- | --- |
| partners_* + contracts | **partners** |
| invoice.paid verdade | **billing** |
| journal efeito | **accounting** (consumer) |
| adapter-gateway | **KEEP** |

## Pré-requisitos G1

R10 documental; eventing; graph:partners:v1; billing paid/refund contratos; AgencyScopePort.

## Árvore alvo G1

```text
backend/modules/partners/src/
  domain/  application/commands/  application/consumers/
  infrastructure/persistence/  api/  index.ts
```

Não criar `marketplace/`.

## Fatias P07 (pós-Owner)

| Slice | Entrega | Gates |
| --- | --- | --- |
| P07-S1 | schema partners_* + contracts | G2, G4 |
| P07-S2 | consumer invoice.paid → accrual | G3-PTR-01/02 |
| P07-S3 | refund reverse + payout lifecycle | G3-PTR-03/04 |
| P07-S4 | HTTP `/v1/partners`: register, organization detail, partner detail, lists | G5-PTR-01 |

S4 evidence: ANX-523 implements `POST /v1/partners/organizations/:organizationId` with Zod body validation, mandatory `Idempotency-Key`, active agency mutation-role authorization and the canonical `registerPartner` command; `GET /:partnerId` delegates to an organization-scoped query. OpenAPI catalog coverage pins both operationIds, path/header parameters and error statuses. Verification: partners API boundary 6/6, OpenAPI catalog/plugin 9/9, focused partners integration 10/10, fresh PostgreSQL oracle 1,928 pass / 0 fail / 0 skip, lint/typecheck/boundaries/Graphify pass. Graph projection remains outside S4 and is not inferred from HTTP completion.

ANX-520 evidence: partner command and event contracts now reject credential markers, connection strings, JWT-shaped values, opaque high-entropy token sequences, PEM private-key markers and control characters in approval/provider/reversal references and reasons. All partner event factories parse their payload schemas before publication, preserving structural and no-secrets event invariants. Idempotent replay snapshots preserve public `payoutStatus`, and the partners API boundary maps safe-text `ZodError` failures to `VALIDATION_ERROR`/400 with structured issue paths. Verification: partners module 29/29, partners integration 5/5, API boundary 7/7, contracts 227/227, targeted Biome 15 files clean, typecheck clean; global lint remains blocked by an unrelated pre-existing formatting finding in `tests/governance/integration/grant-revocation-policy.integration.test.ts`.

## Matriz oráculos

| ID | Caso |
| --- | --- |
| G3-PTR-01 | invoice.paid.v1 → um único accrual |
| G3-PTR-02 | paid replay → mesmo accrual_id |
| G3-PTR-03 | refund → reverse idempotente |
| G3-PTR-04 | payout FAILED retry não duplica SETTLED |
| G3-PTR-05 | accrue unpaid → 409 PTR_ACCRUAL_UNPAID |
| G5-PTR-01 | GET referral outra org → 403 |
| G5-PTR-04 | T01 DENY → 403 PTR_GRANT_INVALID |

## Defer

D-GOV-010; RLS P09; ST08 migrations; rails PSP payout live; spec `accepted`.

## Saída R9

Plano para R10. P1 **não** executa S1–S4.
