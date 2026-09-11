---
type: debate
status: draft
---

# R09 — Plano de implementação (P1): `modules/identity`

**Rodada:** R9 — Plano de follow-up pós-P0  
**Data:** 2026-09-08  
**Issue:** ANX-77 (debate) · P0 entregue: ANX-28 (`done`, G7 2026-09-07) · pack ANX-389

## In / Out (R9)

**In (P1 futuro):** layout `@anxionos/contracts/identity/`; consumers de sessão; projector contract `graph:identity:v1`.

**Out deste pack:** migration ST08; spec `accepted`; ANX-342/389 `done`.

## Non-goals P1

Não importar better-auth no domain. Não tokens no Neo4j. Não G1 não autorizado.

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| QA | QA |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Traduzir decisões `D-IDN-001`..`024` e gaps ANX-28 em plano executável **P1** (normalização eventos, contratos, suspend, consumer sessão). P0 já entregue — este plano **não** repete `getPrincipalById`.

## Pré-requisitos

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 debate aprovado | `R10-g0-handoff.md` |
| 2 | ANX-28 P0 `done` | G7 2026-09-07 |
| 3 | Issue P1 claimada (`ANX-*`) | Taskboard — ver PC-G0-09 |
| 4 | `@anxionos/eventing` schema | `ensureEventingSchema` |

---

## Estado P0 (baseline — não reimplementar)

| Entregável | Status | Evidência |
| --- | --- | --- |
| `identity_principals` + migration 0000 | ✅ | ANX-28 |
| `registerPrincipal` + journal/outbox | ✅ | `register-principal.ts` |
| `getPrincipalById` / `getPrincipalByAuthUserId` fail-closed | ✅ | `get-principal.ts`, testes |
| `ensureIdentitySchema` | ✅ | bootstrap apps/api |
| Adapter organizations | ✅ | `identity-principal-lookup.ts` |

---

## Slices P1 (4 fatias)

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P1-S1** | `@anxionos/contracts/identity/*` + testes round-trip | G2 contratos |
| **P1-S2** | Normalizar `eventType` → `identity.principal.registered.v1`; remover `authUserId` do payload | G3, G4 |
| **P1-S3** | Migration 0001 (`suspended_at`, `suspension_reason`) + `suspendPrincipal` + evento `suspended.v1` | G3 unit |
| **P1-S4** | Consumer `apps/api:identity-sessions:v1` + hook esboço `syncPrincipalEmail` | G3 integração, G4 |

**Fora do escopo P1:** `ServicePrincipal`, rotas `/v1/identity/*`, projector graph (graph P03).

---

## Árvore ADR0002 (delta P1)

```text
backend/modules/identity/src/
  application/commands/
    suspend-principal.ts          # P1-S3
    sync-principal-email.ts       # P1-S4 sketch
  infrastructure/migrations/
    0001_identity_suspend_cols.sql

backend/packages/contracts/src/identity/
  types.ts, commands.ts, queries.ts, events.ts, index.ts

backend/apps/api/src/identity/
  session-revocation-consumer.ts  # P1-S4
```

---

## Matriz testes G3

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-IDN-01 | `registerPrincipal` primeira criação | outbox `identity.principal.registered.v1`; payload sem `authUserId` |
| G3-IDN-02 | Replay `authUserId` existente | mesmo Principal; sem segundo evento |
| G3-IDN-03 | `suspendPrincipal` active → suspended | evento `suspended.v1`; queries retornam `null` |
| G3-IDN-04 | Re-suspend idempotente | sem evento duplicado |
| G3-IDN-05 | Rollback TX se outbox falha | zero linha PG |
| G3-IDN-06 | Consumer sessão após suspend | sessões BA revogadas (sandbox) |

### G4 Security

| ID | Cenário |
| --- | --- |
| G4-IDN-01 | Inspecionar outbox/journal — ausência `authUserId` |
| G4-IDN-02 | Logs sem email em clear (amostragem) |

### G5 Red Team (R07 checklist)

- [ ] Outbox sem `authUserId` após P1-S2
- [ ] Sessão BA inválida após suspend + consumer P1-S4
- [ ] Race duplo register — idempotência

---

## Mapa D-IDN → slices

| Decisão | Slice |
| --- | --- |
| D-IDN-011, D-IDN-012 | P1-S2 |
| D-IDN-013 | P1-S1 |
| D-IDN-014 | P1-S3 |
| D-IDN-015, D-IDN-016 | P1-S4 |

---

## Top 5 arquivos P1-S1 primeiro

1. `backend/packages/contracts/src/identity/types.ts`
2. `backend/packages/contracts/src/identity/events.ts`
3. `backend/packages/contracts/src/identity/index.ts`
4. `backend/tests/contracts/identity/events.test.ts`
5. Diff `register-principal.ts` (P1-S2)

---

## Saída R9

✅ Plano P1 aprovado para **R10** (pacote G0 debate encerrado).
