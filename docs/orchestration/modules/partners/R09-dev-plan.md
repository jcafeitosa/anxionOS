---
type: debate
status: draft
---
# R09 — Plano de implementação: `modules/partners`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue debate:** ANX-389 / ANX-113 · impl **ANX-114** (não neste pack)  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Sem migration.

## In / Out (R9)

**In scope (G1 futuro):** schema `partners_*`, contratos, consumers paid/refund, HTTP `/v1/partners`, projector `graph:partners:v1`.

**Out of scope:** Invoice (`billing`); ledger (`accounting`); pasta `marketplace/`; spec accepted; ST08 migration agora; ANX-342/389 done; rails PSP payout live.

## Non-goals P1

Só G0 documental. Não scaffoldar 23 módulos. Não G7 ANX-114 neste pack.

## Ownership (plano)

| Fatia | Dono |
| --- | --- |
| partners_* + contracts | **partners** |
| invoice.paid verdade | **billing** (contrato já fechado) |
| journal efeito | **accounting** (consumer) |

**KEEP adapter-gateway**.

## Pré-requisitos G1

R10 documental; eventing; graph:partners:v1; billing paid/refund contratos; AgencyScopePort.

## Árvore alvo G1

```text
backend/modules/partners/src/
  domain/  application/commands/  application/consumers/
  infrastructure/persistence/  api/  index.ts
```

Não scaffoldar 23 módulos. Não criar `marketplace/`.

## Fatias P07 (pós-Owner)

| Slice | Entrega |
| --- | --- |
| P07-S1 | schema partners_* + contracts |
| P07-S2 | projector invoice.paid |
| P07-S3 | refund reverse + payout lifecycle |
| P07-S4 | HTTP v1 |

## Matriz

G3-PTR-S2-01 commission on paid · G3-PTR-S3-01 refund reversal · G3-PTR-S3-02 payout FAILED retry · G5-PTR-01..05.

## Defer

D-GOV-010; RLS P09; ST08 migrations; rails PSP payout live.

P1 só G0 documental.

## Saída R9

Plano para R10.
