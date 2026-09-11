---
type: debate
---

# R04 — Contratos, API e eventos: `modules/organizations`

**Rodada:** R4 — Superfície pública, contratos e API sketch  
**Data:** 2026-09-07  
**Issue:** ANX-39 (debate) · ANX-29 (implementação, bloqueada até G0)

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R4)

**In:** `/v1/organizations` e Zod. **Out:** `organizations.*.v1`. Sem grants neste módulo.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Contratos organizations | **organizations** |
| adapter-gateway | **KEEP** |

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Crítico | critic-reviewer |

## Objetivo da rodada

Definir a superfície pública do módulo **organizations** antes de armazenamento (R5) e dependências (R6): tipos em `packages/contracts`, comandos/queries application, eventos de domínio versionados, esboço REST em `apps/api` e exports de `modules/organizations/index.ts`.

## Fontes aplicadas

| Fonte | Uso em R4 |
| --- | --- |
| [R03-domain-sketch.md](./R03-domain-sketch.md) | Entidades, invariantes, ports |
| [R02-boundaries.md](./R02-boundaries.md) | O que não entra (governance, billing, graph) |
| `brain/project-docs/specs/001-institutional-contract/spec.md` | Saga idempotente, UI01, mercados stocks/crypto/both |
| `brain/notes/anxionos-storage-ownership.md` | PG autoritativo; Neo4j via projeção |
| `brain/notes/anxionos-graph-schema-v1.md` | Tipos `Agency`, `Membership`, `OnboardingRun` (projeção) |
| `backend/packages/contracts` | Envelope `domainEventEnvelopeSchema`, `schemaVersion` 0.1.0 |

## Debate R4 (diálogo atribuído)

**Executor:** Contratos públicos vivem em `@anxionos/contracts` com prefixo `organizations.*`. O módulo expõe apenas use cases; HTTP fica em `apps/api` com validação Zod na borda.

**Code Review:** Alinhar naming ao envelope existente: `ownerDomain: "organizations"`, `eventType` com sufixo `.v1`. Comandos HTTP usam `Idempotency-Key` header (UUID) mapeado para `commandId` no journal.

**Crítico:** `principalId` nunca vem do body em rotas autenticadas — derivar da sessão via identity. Convite pode aceitar `email` para principal ainda inexistente; activation exige Principal existente.

**Arquiteto:** Organization (agrupamento multi-Agency) **fora** dos contratos v1 — reservar namespace `organizations.organization.*` sem implementar. Deferido explicitamente para R09.

**Security:** Rotas de membership exigem membership ativo na Agency alvo; role `owner`/`admin` para convite/revogação. Autorização sensível (mandato, grant) continua governance — organizations só publica fatos.

**Síntese Orquestrador:** Contratos v1 fechados para Agency + Owner + Membership; sem objeção bloqueante.

---

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `schemaVersion` | `0.1.0` (herda `packages/contracts`) |
| `ownerDomain` | `"organizations"` em todos os eventos |
| `eventType` | `organizations.<aggregate>.<action>.v1` |
| Idempotência | Header `Idempotency-Key` (UUID) → `commandId`; replay retorna mesmo `revision` + `aggregateId` |
| Correlação | `requestId` do contexto HTTP propagado em `details` de erro e metadata de comando |
| Tenancy | `agencyId` no path; validar membership ativo antes de mutação |
| Erros | Reutilizar `ERROR_CODES` de contracts; códigos de domínio em `details.code` quando necessário |

### Códigos de domínio (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| `ORG_PRINCIPAL_NOT_FOUND` | 404 | `PrincipalLookup` falha |
| `ORG_AGENCY_NOT_FOUND` | 404 | Agency inexistente ou fora do scope |
| `ORG_MEMBERSHIP_NOT_INVITED` | 409 | Activate sem status `invited` |
| `ORG_OWNER_REQUIRED` | 409 | Revogar último owner ativo |
| `ORG_INVALID_STATUS_TRANSITION` | 409 | Viola INV-ORG-01 |
| `ORG_CROSS_TENANT` | 403 | agencyId não pertence ao principal da sessão |
| `ORG_IDENTITY_UNAVAILABLE` | 503 | `PrincipalLookup` indisponível (identity fora) |
| `ORG_INVITE_EXPIRED` | 410 | Convite vencido no momento da ativação |
| `ORG_INVITE_EMAIL_MISMATCH` | 403 | E-mail da sessão ≠ e-mail do convite; ou reativação tentando revincular a membership a outro principal |
| `ORG_DUPLICATE_IDEMPOTENCY` | 409 | Reuso da `Idempotency-Key` com comando, recurso ou payload divergente (S2) |
| `ORG_REVISION_CONFLICT` | 409 | Corrida de revisão em `Agency`/`Membership`: outro escritor gravou primeiro (S4a/S4c) |
| `ORG_MEMBERSHIP_EXISTS` | 409 | Convite duplicado ativo; ou o principal já tem vínculo **ativo** na Agency (D-ORG-048) |
| `ORG_INVITEE_CONSENT_REQUIRED` | 403 | Ativação assistida de convite **sem principal vinculado** — a primeira vinculação exige que o próprio convidado aceite (D-ORG-046) |

> **Contrato HTTP do boundary (D-ORG-048):** body inválido (`ZodError`), JSON malformado e **path param não-UUID** são **400**; erro desconhecido é **500 com mensagem genérica** — a mensagem crua do driver (query SQL + parâmetros) nunca vai ao cliente.

---

## `packages/contracts` — novos artefatos (propostos)

Arquivos previstos (implementação em G1, não nesta rodada):

```text
packages/contracts/src/organizations/
├── types.ts          # enums compartilhados
├── commands.ts       # input schemas de comandos
├── queries.ts        # DTOs de leitura
├── events.ts         # payload schemas por eventType
└── index.ts          # re-export
```

### Tipos compartilhados (`types.ts`)

```typescript
export const agencyStatusSchema = z.enum([
  "draft",
  "connections_pending",
  "ready",
  "draining",
  "archived",
]);

export const marketScopeSchema = z.enum(["stocks", "crypto", "both"]);

export const onboardingStepSchema = z.enum([
  "created",
  "markets_set",
  "blueprint_pending",
  "mandate_pending",
  "ready",
]);

export const membershipRoleSchema = z.enum([
  "owner",
  "admin",
  "operator",
  "viewer",
]);

export const membershipStatusSchema = z.enum([
  "invited",
  "active",
  "revoked",
]);
```

### DTOs de leitura (`queries.ts`)

```typescript
export const agencyDtoSchema = z.object({
  id: z.string().uuid(),
  ownerPrincipalId: z.string().uuid(),
  displayName: z.string().min(1).max(200),
  marketScope: marketScopeSchema,
  status: agencyStatusSchema,
  onboardingStep: onboardingStepSchema,
  revision: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const membershipDtoSchema = z.object({
  id: z.string().uuid(),
  agencyId: z.string().uuid(),
  principalId: z.string().uuid(),
  role: membershipRoleSchema,
  status: membershipStatusSchema,
  invitedAt: z.string().datetime().optional(),
  joinedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
  revision: z.number().int().nonnegative(),
});

export const ownerDtoSchema = z.object({
  id: z.string().uuid(),
  principalId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
```

---

## Comandos application

Inputs validados na borda HTTP e revalidados no application layer.

| Comando | Input (resumo) | Efeito | Evento |
| --- | --- | --- | --- |
| `CreateAgency` | `displayName`, `marketScope`, `ownerPrincipalId` (sessão) | Cria Agency + Owner + Membership owner | `agency.created.v1` |
| `UpdateAgencyMarkets` | `agencyId`, `marketScope` | Atualiza mercados; pode acionar drain futuro (governance) | `agency.markets_updated.v1` |
| `AdvanceOnboarding` | `agencyId`, `step` | Avança máquina finita (interno/saga) | `agency.status_changed.v1` |
| `InviteMember` | `agencyId`, `email`, `role` | Cria membership `invited` | `membership.invited.v1` |
| `ActivateMembership` | `agencyId`, `membershipId` | `revoked` → `active` (reativação assistida, **exceto `role=owner`**); `invited` → `active` só se já houver principal vinculado. Nunca cria primeira vinculação | `membership.activated.v1` |
| `RevokeMembership` | `agencyId`, `membershipId` | `active`/`invited` → `revoked` | `membership.revoked.v1` |

### Schemas de comando (`commands.ts`)

```typescript
export const createAgencyCommandSchema = z.object({
  commandId: z.string().uuid(),
  displayName: z.string().min(1).max(200),
  marketScope: marketScopeSchema,
  // ownerPrincipalId injetado pelo handler a partir da sessão
});

export const updateAgencyMarketsCommandSchema = z.object({
  commandId: z.string().uuid(),
  agencyId: z.string().uuid(),
  marketScope: marketScopeSchema,
});

export const inviteMemberCommandSchema = z.object({
  commandId: z.string().uuid(),
  agencyId: z.string().uuid(),
  email: z.string().email(),
  role: membershipRoleSchema.exclude(["owner"]), // owner só via CreateAgency
});

export const activateMembershipCommandSchema = z.object({
  commandId: z.string().uuid(),
  agencyId: z.string().uuid(),
  membershipId: z.string().uuid(),
});

export const revokeMembershipCommandSchema = z.object({
  commandId: z.string().uuid(),
  agencyId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
```

### Resposta de comando (padrão)

```typescript
export const commandResultSchema = z.object({
  aggregateId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  idempotentReplay: z.boolean().optional(),
});
```

---

## Eventos de domínio

Todos encapsulados em `domainEventEnvelopeSchema` com `ownerDomain: "organizations"`.

| eventType | Payload principal | Consumidores previstos |
| --- | --- | --- |
| `organizations.agency.created.v1` | `agencyId`, `ownerPrincipalId`, `displayName`, `marketScope`, `status`, `revision` | graph projector, audit, agents (onboarding) |
| `organizations.agency.markets_updated.v1` | `agencyId`, `marketScope`, `previousMarketScope`, `revision` | graph, market-data (drain), governance |
| `organizations.agency.status_changed.v1` | `agencyId`, `status`, `onboardingStep`, `previousStatus`, `revision` | graph, billing (readiness), frontend realtime |
| `organizations.membership.invited.v1` | `membershipId`, `agencyId`, `email`, `role`, `revision` | graph, identity (lookup), email (apps/api) |
| `organizations.membership.activated.v1` | `membershipId`, `agencyId`, `principalId`, `role`, `revision` | graph, governance (epoch futuro) |
| `organizations.membership.revoked.v1` | `membershipId`, `agencyId`, `principalId` (**`null`** quando o convite pendente é cancelado antes de existir principal), `revision` | graph, governance (revogação derivada) |
| `organizations.agency.ownership_transferred.v1` | `agencyId`, `previousOwnerPrincipalId`, `previousOwnerMembershipId`, `newOwnerPrincipalId`, `newOwnerMembershipId`, `revision` | graph, governance (encerra grants do owner anterior e emite baseline do novo) |

> **D-ORG-045 (ANX-460):** `agency.ownership_transferred.v1` foi acrescentado à lista fechada v1 em 2026-09-11. O comando `TransferOwnership` já existia e o `governance` já o consumia, mas o evento não constava deste contrato e nenhuma rota o alcançava — superfície órfã. Ver [R08](./R08-decision-log.md#resolução-anx-460--superfície-órfã-de-transferownership-d-org-045).

### Exemplo de payload (`agency.created.v1`)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "schemaVersion": "0.1.0",
  "ownerDomain": "organizations",
  "eventType": "organizations.agency.created.v1",
  "occurredAt": "2026-09-08T02:30:00.000Z",
  "payload": {
    "agencyId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "ownerPrincipalId": "p1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "displayName": "Acme Capital",
    "marketScope": "both",
    "status": "draft",
    "onboardingStep": "created",
    "revision": 1
  }
}
```

**Regra:** payload não inclui PII além do necessário; `email` só em `membership.invited.v1` (convite). Tokens de convite **não** trafegam em eventos — apenas hash no PG (R5).

---

## Queries application

| Query | Input | Output |
| --- | --- | --- |
| `GetAgencyById` | `agencyId` | `AgencyDto` |
| `ListAgenciesForPrincipal` | `principalId` (sessão) | `AgencyDto[]` |
| `ListMembershipsByAgency` | `agencyId` | `MembershipDto[]` |
| `GetMembership` | `agencyId`, `membershipId` | `MembershipDto` |

Leituras respeitam scope: principal só lista Agencies onde tem membership ativo (ou é platform admin — fora do módulo, em apps/api policy).

---

## Esboço REST (`apps/api`)

Prefixo: `/v1/organizations`. Autenticação via Better Auth (sessão). OpenAPI via Scalar (padrão Elysia).

| Método | Rota | Comando/Query | AuthZ mínima |
| --- | --- | --- | --- |
| `POST` | `/agencies` | `CreateAgency` | Principal autenticado |
| `GET` | `/agencies` | `ListAgenciesForPrincipal` | Principal autenticado |
| `GET` | `/agencies/:agencyId` | `GetAgencyById` | Membership ativo |
| `PATCH` | `/agencies/:agencyId/markets` | `UpdateAgencyMarkets` | role `owner` ou `admin` |
| `POST` | `/agencies/:agencyId/ownership/transfer` | `TransferOwnership` | role `owner` (owner ativo da agency) |
| `GET` | `/agencies/:agencyId/memberships` | `ListMembershipsByAgency` | membership ativo |
| `GET` | `/agencies/:agencyId/memberships/:membershipId` | `GetMembership` | membership ativo |
| `POST` | `/agencies/:agencyId/memberships/invite` | `InviteMember` | role `owner` ou `admin` |
| `POST` | `/agencies/:agencyId/memberships/:membershipId/activate` | `ActivateMembership` | role `owner`/`admin` **e** membership já vinculada; alvo `role=owner` é recusado (409) |
| `POST` | `/agencies/:agencyId/memberships/:membershipId/revoke` | `RevokeMembership` | role `owner` ou `admin` |
| `POST` | `/invites/accept` | `AcceptInviteByToken` | Principal autenticado com o e-mail do convite |

Headers obrigatórios em mutações: `Idempotency-Key`, `Content-Type: application/json`.

**Fora do escopo v1 (registrar, não implementar):**

- `POST /agencies/:id/onboarding/advance` — saga coordenada com billing/agents (P04). O comando `AdvanceOnboarding` **existe** no módulo (exportado e testado), sem rota: a saga depende de billing/agents. Decisão registrada para que a superfície não seja lida como órfã (contraste com o caso de `TransferOwnership`, resolvido em D-ORG-045).
- Rotas `Organization` multi-company
- Webhooks (billing)

---

## Superfície pública do módulo (`modules/organizations/index.ts`)

Exports previstos (sem infra interna):

```typescript
// Commands
export { createAgency, type CreateAgencyDeps } from "./application/commands/create-agency";
export { updateAgencyMarkets } from "./application/commands/update-agency-markets";
export { inviteMember } from "./application/commands/invite-member";
export { activateMembership } from "./application/commands/activate-membership";
export { revokeMembership } from "./application/commands/revoke-membership";
export { transferOwnership } from "./application/commands/transfer-ownership";
export { advanceOnboarding } from "./application/commands/advance-onboarding";

// Queries
export { getAgencyById, listAgenciesForPrincipal } from "./application/queries/...";
export { listMembershipsByAgency } from "./application/queries/...";

// Types (re-export from contracts or domain)
export type { Agency, Membership, Owner } from "./domain/entities/...";

// Infra bootstrap (composition root only)
export { createOrganizationsDb, ensureOrganizationsSchema } from "./infrastructure/...";
```

`PrincipalLookup` implementado como adapter que chama `identity` — contrato do port em R03, wiring em R06.

---

## Integração com packages existentes

| Package | Uso |
| --- | --- |
| `contracts` | Schemas Zod públicos + event payloads |
| `eventing` | Outbox na mesma transação PG (`OrganizationUnitOfWork`) |
| `database` | Pool PG compartilhado |
| `observability` | Logger com `agencyId`, `principalId` redacted onde aplicável |
| `identity` | `PrincipalLookup` — **não** importar repositório interno |

---

## Realtime (opcional v1)

Canal sugerido em `contracts/realtime`: `organizations:agency:{agencyId}` para `status_changed` e membership updates. Implementação pode ser G1 ou deferida para slice frontend — registrar em R09 se adiado.

---

## Critérios de aceite R4

| # | Critério | Status |
| --- | --- | --- |
| AC-R4-01 | Lista fechada de eventTypes v1 com payloads | ✅ |
| AC-R4-02 | Comandos com schemas e tabela de efeitos | ✅ |
| AC-R4-03 | Esboço REST com authZ por rota | ✅ |
| AC-R4-04 | Organization multi-company explicitamente deferido | ✅ |
| AC-R4-05 | Sem vazamento de auth/grants para governance | ✅ |
| AC-R4-06 | Alinhamento envelope `ownerDomain` + `schemaVersion` | ✅ |

## Pendências para rodadas seguintes

| ID | Assunto | Rodada |
| --- | --- | --- |
| P-R4-01 | Tabelas Drizzle, journal, outbox columns | R5 |
| P-R4-02 | `PrincipalLookup` adapter e falha se identity down | R6 |
| P-R4-03 | Projeção Neo4j E002–E010 subset | R6 |
| P-R4-04 | Saga onboarding com billing/agents | R7 / R09 |
| P-R4-05 | Testes contrato em `backend/tests/contracts/organizations/` | R9 |

## Saída R4

✅ Contratos e API sketch aprovados para R5 (armazenamento).
