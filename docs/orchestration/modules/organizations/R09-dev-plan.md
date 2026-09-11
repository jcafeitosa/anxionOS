---
type: debate
---

# R09 — Plano de implementação: `modules/organizations`

**Rodada:** R9 — Plano de implementação G1  
**Data:** 2026-09-07  
**Issue:** ANX-39 (debate) · ANX-29 (implementação, bloqueada até R10 G0 + identity G7)

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R9)

**In:** plano G1 futuro. **Out:** slices documentais. Bloqueado até R10 G0 + identity G7.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto neste pack.

## Ownership

| Superfície | Dono |
| --- | --- |
| Plano organizations | **organizations** |
| adapter-gateway | **KEEP** |

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| QA | QA |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Traduzir R01–R08 (44 decisões `D-ORG-001`..`044`) em plano executável G1: árvore ADR0002, migrações Drizzle, contratos, ordem de wiring HTTP, matriz de testes e fatias incrementais com critérios de aceite.

## Pré-requisitos (não implementar antes)

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 aprovado | `R10-g0-package.md` |
| 2 | identity G7 (ANX-28 `done`) | Export `getPrincipalById` em `@anxionos/identity` |
| 3 | `@anxionos/eventing` schema | `ensureEventingSchema` no startup |
| 4 | Env `ORG_INVITE_TOKEN_PEPPER` | `.env.example` documentado; fail-fast se ausente |

**Nota:** ANX-28 bloqueia G1, não este debate. R09 pode concluir enquanto identity permanece `in_review`.

---

## Árvore de diretórios (ADR0002)

```text
backend/modules/organizations/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── src/
    ├── index.ts
    ├── domain/
    │   ├── entities/
    │   │   ├── agency.ts
    │   │   ├── owner.ts
    │   │   └── membership.ts
    │   ├── events/
    │   │   └── organization-events.ts
    │   └── ports/
    │       ├── agency-repository.ts
    │       ├── owner-repository.ts
    │       ├── membership-repository.ts
    │       ├── command-journal.ts
    │       ├── principal-lookup.ts
    │       ├── invite-token-hasher.ts
    │       ├── agency-scope-guard.ts
    │       └── organization-unit-of-work.ts
    ├── application/
    │   ├── commands/
    │   │   ├── create-agency.ts
    │   │   ├── update-agency-markets.ts
    │   │   ├── invite-member.ts
    │   │   ├── activate-membership.ts
    │   │   ├── revoke-membership.ts
    │   │   └── accept-invite-by-token.ts
    │   ├── queries/
    │   │   ├── get-agency-by-id.ts
    │   │   ├── list-agencies-for-principal.ts
    │   │   ├── list-memberships-by-agency.ts
    │   │   └── get-membership.ts
    │   └── services/
    │       └── assert-agency-scope.ts
    └── infrastructure/
        ├── adapters/
        │   ├── identity-principal-lookup.ts
        │   └── hmac-invite-token-hasher.ts
        ├── persistence/
        │   ├── schema.ts
        │   ├── agency-repository.ts
        │   ├── owner-repository.ts
        │   ├── membership-repository.ts
        │   └── command-journal-repository.ts
        ├── organization-unit-of-work.ts
        ├── create-db.ts
        ├── migrate.ts
        └── migrations/
            ├── 0000_organizations_core.sql
            ├── 0001_organizations_membership_indexes.sql
            └── meta/

backend/packages/contracts/src/organizations/
├── types.ts
├── commands.ts
├── queries.ts
├── events.ts
├── errors.ts
└── index.ts

backend/apps/api/src/organizations/
├── plugin.ts
├── middleware/
│   ├── require-agency-membership.ts
│   └── idempotency-key.ts
└── handlers/
    ├── agencies.ts
    ├── memberships.ts
    └── invites.ts

backend/tests/
├── contracts/organizations/
├── organizations/
│   └── integration/
└── boundary/
```

**Fora do escopo G1:** `Organization` entity, `organizations_blueprints`, graph projector, realtime (D-ORG-038).

---

## Migrações Drizzle

| # | Arquivo | Conteúdo |
| --- | --- | --- |
| **0000** | `0000_organizations_core.sql` | Enums + tabelas `organizations_agencies`, `organizations_owners`, `organizations_memberships`, `organizations_command_journal` |
| **0001** | `0001_organizations_membership_indexes.sql` | Índices parciais únicos (owner ativo, email convite, agency+principal ativo) |

**Bootstrap:** `ensureEventingSchema` → `ensureIdentitySchema` → `ensureOrganizationsSchema` (D-ORG-037).

---

## Startup: fail-fast e bootstrap (D-ORG-029, D-ORG-037)

| Regra | Comportamento |
| --- | --- |
| `ORG_INVITE_TOKEN_PEPPER` ausente ou vazio | **Fail-fast** no startup de `apps/api` — sem default fraco, sem geração de token (D-ORG-029) |
| Ordem de schema bootstrap | `ensureEventingSchema` → `ensureIdentitySchema` → `ensureOrganizationsSchema` — **antes** de montar rotas |
| Application-only tenancy v1 (D-ORG-026) | Guard 3 camadas (Session 1 R07): middleware HTTP → `assertAgencyScope` → repositórios com `agencyId` obrigatório; compensação adversarial em G5-01..G5-03 |
| Rate limit `POST /invites/accept` | 10/min/IP no composition root (`apps/api`), citado no wiring S6 — não no domínio |

`.env.example` deve documentar `ORG_INVITE_TOKEN_PEPPER`; ausência aborta startup, não adia para primeiro invite.

---

## `packages/contracts/src/organizations/`

| Arquivo | Responsabilidade |
| --- | --- |
| `types.ts` | Enums Zod compartilhados |
| `commands.ts` | Schemas de comando + `commandResultSchema` |
| `queries.ts` | DTOs de leitura |
| `events.ts` | Payloads por `eventType` v1 |
| `errors.ts` | `ORGANIZATION_ERROR_CODES` |
| `index.ts` | Re-export |

### Códigos de domínio (`errors.ts`)

| Código | HTTP |
| --- | --- |
| `ORG_PRINCIPAL_NOT_FOUND` | 404 |
| `ORG_AGENCY_NOT_FOUND` | 404 |
| `ORG_MEMBERSHIP_EXISTS` | 409 |
| `ORG_MEMBERSHIP_NOT_INVITED` | 409 |
| `ORG_OWNER_REQUIRED` | 409 |
| `ORG_INVALID_STATUS_TRANSITION` | 409 |
| `ORG_CROSS_TENANT` | 403 |
| `ORG_IDENTITY_UNAVAILABLE` | 503 |
| `ORG_INVITE_EXPIRED` | 410 |
| `ORG_INVITE_EMAIL_MISMATCH` | 403 |

---

## Wiring `apps/api` — ordem

| Ordem | Componente |
| --- | --- |
| 1 | Pool + schemas (eventing → identity → organizations) |
| 2 | `createOrganizationsDb(pool)` |
| 3 | `IdentityPrincipalLookup` + pepper/hasher |
| 4 | `authPlugin` (global) |
| 5 | `organizationsPlugin` — prefixo `/v1/organizations` |
| 6 | `POST/GET /agencies` (sem `:agencyId`) |
| 7 | `requireAgencyMembership` middleware |
| 8 | Rotas scoped `/agencies/:agencyId/*` |
| 9 | Membership handlers |
| 10 | `POST /invites/accept` + rate limit 10/min/IP |
| 11 | OpenAPI tags |

---

## Matriz de testes

### Unitários

| Teste | Foco |
| --- | --- |
| `create-agency.test.ts` | INV-ORG-04, idempotência |
| `invite-member.test.ts` | D-ORG-024, índice email |
| `activate-membership.test.ts` | INV-ORG-03, admin bypass |
| `revoke-membership.test.ts` | INV-ORG-02 |
| `accept-invite.test.ts` | D-ORG-034, TTL 7d |
| `idempotency.test.ts` | command journal replay |
| `assert-agency-scope.test.ts` | D-ORG-030 |

### Contratos (`backend/tests/contracts/organizations/`)

Round-trip Zod para types, commands, events, errors.

### Integração PG (P-R5-06)

`integration/uow-journal-outbox.test.ts` — estado + command_journal + domain_journal + outbox na mesma transação.

### G3 (R07)

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-01 | Duplo POST /agencies mesma Idempotency-Key | Uma Agency; idempotentReplay |
| G3-02 | Principal A muta Agency B | 403 ORG_CROSS_TENANT |
| G3-03 | ListAgenciesForPrincipal | Só memberships ativos |
| G3-04 | InviteMember identity down | Sucesso |
| G3-05 | CreateAgency identity down | 503; zero PG |
| G3-06 | Revogar único owner | 409 ORG_OWNER_REQUIRED |
| G3-07 | Token expirado | 410 ORG_INVITE_EXPIRED |
| G3-08 | Email sessão ≠ invite | 403 ORG_INVITE_EMAIL_MISMATCH |
| G3-09 | Admin activate membershipId | Sucesso |
| G3-10 | Duas Idempotency-Key distintas | Duas Agencies (residual) |

### G5 Red Team (R07) — cenários sandbox

**Orçamento:** sandbox local; PG de dev apenas; sem produção.  
**Cleanup pós-suite:** `TRUNCATE organizations_command_journal, organizations_memberships, organizations_owners, organizations_agencies CASCADE;`  
**Fixture:** carregar `backend/tests/fixtures/orgs-two-agencies.json` (`principalA`/`agencyX`, `principalB`/`agencyY`) antes de G5-01 e G3-02.

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-01 | Enumeração `agencyId` em rotas scoped (`principalA` → `agencyY`) | 403 `ORG_CROSS_TENANT` |
| G5-02 | 20× `POST .../memberships/invite` paralelo mesma agency | Sem corrupção; índice email convite respeitado |
| G5-03 | Body tampering `principalId` em `PATCH .../memberships/:id` | 403 ou campo ignorado; sem escalada de privilégio |
| G5-04 | `POST /invites/accept` com sessão de email **diferente** do convite (P-R7-01) | 403 `ORG_INVITE_EMAIL_MISMATCH` |

**Sketches (substituir `$BASE`, `$TOKEN_*`, IDs da fixture):**

```bash
# G5-01 — cross-tenant list memberships
curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN_A" \
  "$BASE/v1/organizations/agencies/$AGENCY_Y/memberships"
# esperado: 403

# G5-02 — invite race (httpx paralelo)
# httpx -n 20 -m POST -H "Authorization: Bearer $TOKEN_A" \
#   -H "Idempotency-Key: $(uuidgen)" \
#   -d '{"email":"race+test@example.com","role":"member"}' \
#   "$BASE/v1/organizations/agencies/$AGENCY_X/memberships/invite"

# G5-03 — tamper principalId no body
curl -sS -X PATCH \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"principalId":"00000000-0000-4000-8000-000000000099"}' \
  "$BASE/v1/organizations/agencies/$AGENCY_X/memberships/$MEMBERSHIP_ID"

# G5-04 — accept com sessão email errado
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN_B_WRONG_EMAIL" \
  -H "Content-Type: application/json" \
  -d '{"token":"$INVITE_TOKEN_FOR_A"}' \
  "$BASE/v1/organizations/invites/accept"
# esperado: 403 ORG_INVITE_EMAIL_MISMATCH
```

Checklist residual (não numerado): token após revoke, brute-force rate limit accept, logs sem PII, startup sem pepper (fail-fast).

### AR01 (`boundary/organizations-imports.test.ts`)

Proíbe imports identity/infrastructure, governance, neo4j, better-auth.

---

## Fases (6 slices)

| Slice | Pré-requisito | Evidência mínima | Bloqueio se ausente |
| --- | --- | --- | --- |
| **S1** | R10 G0 aprovado; debate R09 fechado | enums R04; códigos `ORG_*`; `ensureOrganizationsSchema` idempotente; índices 0001 | S2 — contracts drift |
| **S2** | S1 completo; `errors.ts` com todos os códigos R04/R07 | ports sem framework; `PrincipalLookup` **mock** em testes; event factories `ownerDomain: organizations` | S3 — ports instáveis |
| **S3** | S2 completo | repos com `agencyId`; UoW transacional; adapter identity público; HMAC hasher; teste **P-R5-06** journal+outbox mesma TX | S4 — persistência não confiável |
| **S4** | S3 completo; mock `PrincipalLookup` OK em testes de módulo; wiring identity **real** exige ANX-28 G7 | CreateAgency TX única; idempotência; fail-closed identity; eventos `agency.*` | S5 — sem comandos Agency |
| **S5** | S4 completo | TTL 7d; email match; admin bypass; `ORG_OWNER_REQUIRED`; invite sem lookup | S6 — sem membership |
| **S6** | S5 completo; ANX-28 G7 para wiring integrado; fixture registry | rotas R04; middleware scope; rate limit accept; G3-01..10 + G5-01..04 **executados**; `fixtures/orgs-two-agencies.json` | ANX-29 não fecha G1 |

**Nota:** S1–S3 avançam com mock de `PrincipalLookup`; S4+ wiring HTTP integrado exige export `getPrincipalById` (ANX-28). G3/G5 listados no plano ≠ evidência de teste até S6.

### Slice 1 — Contratos e schema PG

**AC:** enums R04; códigos ORG_*; `ensureOrganizationsSchema` idempotente; índices 0001.

### Slice 2 — Domínio e ports

**AC:** ports sem framework; `PrincipalLookup.exists`; event factories `ownerDomain: organizations`.

### Slice 3 — Infra persistence + UoW

**AC:** repositórios com `agencyId`; UoW transacional; adapter identity público; HMAC hasher.

### Slice 4 — Comandos Agency

**AC:** CreateAgency transação única; idempotência; fail-closed identity; eventos agency.*.

### Slice 5 — Comandos Membership

**AC:** TTL 7d; email match; admin bypass; ORG_OWNER_REQUIRED; invite sem lookup.

### Slice 6 — API + G3/G5

**AC:** rotas R04; middleware scope; rate limit accept 10/min/IP; strip body; checklist G5-01..G5-04; matriz G3-01..G3-10 executada.

**Fixture registry (obrigatório):** `backend/tests/fixtures/orgs-two-agencies.json` — `principalA`/`agencyX` e `principalB`/`agencyY`, IDs sanitizados, commitados; habilita reprodução de G3-02, G3-09 e G5-01 por qualquer agente.

---

## Mapa D-ORG → arquivos (resumo)

| Decisão | Arquivo(s) |
| --- | --- |
| D-ORG-001..007 | schema, repos, index (sem Organization) |
| D-ORG-008,022 | principal-lookup.ts, identity-principal-lookup.ts |
| D-ORG-009,031 | membership.ts, 0001 migration |
| D-ORG-010 | command-journal-repository.ts |
| D-ORG-011,012 | contracts/organizations/* |
| D-ORG-013..015 | plugin.ts, assert-agency-scope.ts |
| D-ORG-016,017 | schema.ts, organization-unit-of-work.ts |
| D-ORG-018,019,032 | hmac-invite-token-hasher.ts |
| D-ORG-023..025 | create-agency.ts, activate-membership.ts |
| D-ORG-027..029,034,036 | accept-invite-by-token.ts, invites.ts |
| D-ORG-037 | app.ts startup |
| D-ORG-041 | errors.ts |
| D-ORG-038..040,042..044 | deferidos |

---

## Top 5 arquivos a criar primeiro

1. `backend/packages/contracts/src/organizations/types.ts`
2. `backend/packages/contracts/src/organizations/errors.ts`
3. `backend/modules/organizations/src/infrastructure/persistence/schema.ts`
4. `backend/modules/organizations/src/infrastructure/migrations/0000_organizations_core.sql`
5. `backend/modules/organizations/src/domain/ports/principal-lookup.ts`

---

## Saída R9

✅ Plano aprovado para **R10** (pacote G0).
