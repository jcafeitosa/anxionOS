---
type: debate
status: draft
---
# R09 — Plano de implementação: `modules/evaluation`

**Rodada:** R9 · 2026-09-11 · ANX-389 / ANX-109  
**Implementação:** **ANX-110** — **não** neste pack; exige greenlight Owner.  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

## In / Out (R9)

**In:** plano G1 futuro (schema, contratos, HTTP, consumers, projector contract).

**Out:** migration agora. Auto-promote. D-GOV-010. Pasta `testing/`. G1 nesta issue.

## Ownership

| Superfície | Dono |
| --- | --- |
| Plano G0 documental | **evaluation** |
| adapter-gateway | **KEEP** |

## In scope (quando G1 for autorizado)

Schema PG `evaluation_*`, contratos `@anxionos/contracts` evaluation, commands score/certify/recommend com UoW+outbox, HTTP `/v1/evaluation/*`, consumer de eventos simulation/performance, projector contract `graph:evaluation:v1` (implementação do driver em `graph`).

## Out of scope

Migration **agora**; RLS “completo” P09; auto-promote; D-GOV-010; Timescale P&L; pasta `testing/`; Scalar OpenAPI público; G1 nesta issue.

## Non-goals P1

Este plano **só** fecha G0 documental. Não scaffoldar os 23 módulos. Não executar Drizzle migrate.

## Pré-requisitos G1 futuro

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 | este pack |
| 2 | eventing + outbox relay | `packages/eventing` |
| 3 | graph consumer `graph:evaluation:v1` | módulo `graph` |
| 4 | T01 TraversalEvaluator | graph + identity |
| 5 | AgencyScope | organizations |
| 6 | Eventos simulation/performance estáveis | packs desses módulos |

## Árvore ADR0002 (alvo G1)

```text
backend/modules/evaluation/src/
  domain/entities/  domain/ports/
  application/commands/
  infrastructure/persistence/
  api/
  index.ts
```

## Fatias P08 (pós-greenlight)

| Slice | Entrega | Critério |
| --- | --- | --- |
| P08-S1 | Schema + contratos Zod | testes repo PG; zero Timescale neste módulo |
| P08-S2 | Consumer score (sim/perf events) | G3-EVL-01 idempotente |
| P08-S3 | `certification.issued` + T01 | G3-EVL-02; G5-EVL-02 |
| P08-S4 | HTTP `/v1/evaluation` | envelope institucional; G5-EVL-01 |
| P08-S5 | Recommendation evento | G5-EVL-03 não aplica grant |

## Matriz oráculos

| ID | Caso |
| --- | --- |
| G3-EVL-01 | score idempotente (command journal) |
| G3-EVL-02 | cert sem run 409 |
| G3-EVL-03 | outbox na mesma transação |
| G3-EVL-04 | strategies não promove em score.computed |
| G3-EVL-05 | boundaries: sem import infra alheia |
| G5-EVL-01 | cross-tenant 403 |
| G5-EVL-02 | T01 DENY |
| G5-EVL-03 | cert subject inválido 409 |
| G5-EVL-04 | ST04 SQLite irrelevante |
| G5-EVL-05 | recommendation ≠ apply |

## Defer

D-GOV-010 (`risk` P06); RLS P09; ST08 homologação engines; auto-promote; spec `accepted`.

## Saída R9

Plano documental para R10. P1 **não** executa S1–S5.
