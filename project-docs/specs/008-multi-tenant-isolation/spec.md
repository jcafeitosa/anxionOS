---
type: spec
title: Multi-tenant isolation — Agency boundary, RLS, NATS, Neo4j
description: Contrato de isolamento multi-tenant com Agency como container de tenant; Pattern B TenantContext, testes e oráculos.
status: draft
decision_status: accepted
owner: Backend
created: 2026-09-10
version: "0.1"
tags:
  - multi-tenancy
  - agency
  - rls
  - isolation
  - ANX-261
  - ANX-262
---
# Multi-tenant isolation — spec 008

**Issues:** ANX-256 (RLS), ANX-257 (NATS), ANX-258 (Neo4j), ANX-259 (API), ANX-261 (fixtures), ANX-262 (docs)  
**ADR:** [ADR0006 — Agency como container de tenant](../../decisions/0006-agency-as-tenant-boundary)

## Problema

Agentes e APIs devem operar dados de uma Agency sem vazar para outra. O isolamento precisa ser demonstrável em testes automatizados e alinhado às camadas ADR0002.

## Modelo de tenant

| Campo | Semântica | Fase atual |
| --- | --- | --- |
| `tenantId` | Identificador de isolamento RLS/NATS | **= agencyId** |
| `agencyId` | Agency operacional (organizações) | UUID v4 |
| `principalId` | Identidade autenticada na sessão | UUID v4 |
| `bypassRls` | Bypass administrativo | Somente role `service` |

## Camadas e responsabilidades

### Domain port (`TenantContext`)

- Definido em `backend/modules/{organizations,governance}/src/domain/ports/tenant-context.ts`
- Espelha shape de `@anxionos/database` sem acoplar application à infra

### Application

- Comandos: `buildAgencyTenantContext(agencyId, principalId)` → `unitOfWork.runInTransaction(ctx, ...)`
- Queries: `assertAgencyScope` / membership guards antes de leitura
- **Proibido:** `import` de `@anxionos/database`, `drizzle-orm`, `pg` (AR01)

### Infrastructure

- `applyTenantContext(client, ctx)` em UoW adapters
- Repositórios Drizzle sob TX com RLS já aplicado

### API (composition root)

- `resolveAgencyTenantContext` em `apps/api/src/middleware/resolve-tenant-context.ts`
- Pode importar tipo canônico de `@anxionos/database` ou re-export local

## PostgreSQL RLS

| Oráculo | Comportamento esperado |
| --- | --- |
| RLS-ORG-01 | SELECT cross-tenant em `organizations_agencies` retorna 0 linhas |
| RLS-ORG-02 | Contexto platform sem tenant → 0 linhas |
| RLS-01..04 | Pacote database — deny cross-tenant, deny bypass no pool app |

Session vars: `app.tenant_id`, `app.agency_id`, `app.bypass_rls`.

## NATS

```text
agency.{agencyId}.events.{eventType}
```

Stream `EVENTS` subjects: `events.>`, `agency.>.events.>`.

## Neo4j

- Eventos de domínio incluem `ownerDomain` do módulo (ex.: `organizations`, `governance`)
- Projeções agency-scoped propagam `agencyId` no payload
- Product/Agent graph usam `ownerDomain: product|agents` (ADR0005) — distinto do runtime institucional

## Fixture de teste `orgs-two-agencies`

Path: `backend/tests/fixtures/orgs-two-agencies.json`

| Entidade | ID fixture |
| --- | --- |
| principalA | `a0000000-0000-4000-8000-000000000001` |
| principalB | `b0000000-0000-4000-8000-000000000002` |
| agencyX | `d0000000-0000-4000-8000-000000000010` |
| agencyY | `e0000000-0000-4000-8000-000000000020` |

Consumidores: `g3-g5-oracles.test.ts`, `multi-agency-isolation.test.ts`.

## Oráculos G3/G5 (application)

| ID | Assert |
| --- | --- |
| G3-02 | principalA não acessa agencyY |
| G3-03 | listagem retorna só memberships ativas |
| G5-01 | principalA não lista memberships em agencyY |
| G5-04 | accept invite com email errado → `ORG_INVITE_EMAIL_MISMATCH` |

## `acceptInviteByToken` — agencyId propagation

1. Pré-TX: `findInvitedByTokenHash` resolve membership e `agencyId`
2. TX: `runInTransaction(buildAgencyTenantContext(agencyId, sessionPrincipalId), ...)`
3. Revalidação dentro do TX com mesmo token hash

## Comandos de verificação

```bash
cd backend
bunx tsc --noEmit -p apps/api/tsconfig.json
bun test tests/organizations/
bun test tests/governance/ tests/database/
```

## Critérios de aceite

- [x] ADR0006 aceito
- [x] Spec 008 publicada
- [x] Fixture 2+ agencies + oráculos G3/G5
- [x] AR01 application boundary — organizations + governance
- [x] Integração RLS organizations (ANX-256)
- [ ] Owner G7 aceite formal ANX-262

## Riscos

| Risco | Mitigação |
| --- | --- |
| Platform-tenant futuro | ADR0006 documenta transição; tenantId pode divergir de agencyId |
| Lookup pré-RLS em invite | agencyId do membership guia contexto antes do TX |
