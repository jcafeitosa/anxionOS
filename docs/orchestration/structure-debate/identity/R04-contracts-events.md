---
type: debate
---

# R04 — Contratos, eventos e superfície pública: `modules/identity`

**Componente:** modules/identity  
**Rodada:** R4 — Contratos, eventos e exports  
**Pacote SDD:** P02  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42 · implementação parcial: ANX-28 (`in_review`)

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Security | security-reviewer |

## Objetivo da rodada

Definir a superfície pública de **identity** após [R03-domain-sketch.md](./R03-domain-sketch.md): schemas em `@anxionos/contracts`, eventos versionados `identity.principal.*.v1`, esboço de comandos deferidos, exports de `modules/identity/index.ts` e contrato **PrincipalLookup** para organizations (ANX-29 G1).

## Fontes aplicadas

| Fonte | Uso em R4 |
| --- | --- |
| [R03-domain-sketch.md](./R03-domain-sketch.md) | Entidades, queries, eventos sketch |
| [R02-boundaries.md](./R02-boundaries.md) | Exports P0, imports proibidos |
| [organizations/R06-dependencies.md](../../modules/organizations/R06-dependencies.md) | Port `PrincipalLookup`, adapter `IdentityPrincipalLookup` |
| `backend/modules/identity/src/` | Código ANX-28 — gap `findById`, `getPrincipalById`, eventType legado |
| `backend/packages/contracts` | `domainEventEnvelopeSchema`, `schemaVersion` 0.1.0 |

## Debate R4 (diálogo atribuído)

**Executor:** Contratos públicos em `@anxionos/contracts/identity/*`. O módulo expõe use cases; HTTP/BA permanece em `apps/api`. Normalizar `principal.registered` → `identity.principal.registered.v1` na próxima migração de eventos.

**Code Review:** Payload de registro **sem** `authUserId` — só `principalId` + `email`. Código atual expõe `authUserId` no outbox; corrigir em ANX-28 follow-up ou migration de consumer.

**Crítico (organizations):** `getPrincipalById` e `findById` são **P0 G1** — não opcionais. `PrincipalLookup.exists` deve tratar `suspended` como inexistente (fail-closed).

**Security:** `reasonCode` em `principal.suspended` sem PII; códigos curtos (`ops.manual`, `governance.revoked`). `authUserId` nunca em eventos downstream.

**Síntese Orquestrador:** Contratos v1 fechados para Principal humano; ServicePrincipal permanece deferido R05.

---

## Convenções transversais

| Aspecto | Decisão |
| --- | --- |
| `schemaVersion` | `0.1.0` (herda `packages/contracts`) |
| `ownerDomain` | `"identity"` em todos os eventos |
| `eventType` | `identity.<aggregate>.<action>.v1` |
| Idempotência comandos | Replay por chave natural (`authUserId` em `RegisterPrincipal`; `principalId` em `SuspendPrincipal`) |
| Correlação | `requestId` do contexto HTTP em metadata de journal quando originado em `apps/api` |
| Erros de domínio | `details.code` na borda HTTP; códigos abaixo |

### Códigos de domínio (`details.code`)

| Código | HTTP (quando exposto) | Quando |
| --- | --- | --- |
| `PRINCIPAL_NOT_FOUND` | 404 | Query/comando referencia principal inexistente |
| `PRINCIPAL_EMAIL_TAKEN` | 409 | Email já usado por outro Principal |
| `PRINCIPAL_ALREADY_SUSPENDED` | 409 | Operação exige `active` |
| `PRINCIPAL_AUTH_USER_TAKEN` | 409 | `authUserId` já vinculado (futuro `LinkAuthUserId`) |
| `IDN_IDENTITY_UNAVAILABLE` | 503 | Falha de infra PG (composition root) |

---

## `packages/contracts` — novos artefatos (propostos)

```text
packages/contracts/src/identity/
├── types.ts          # enums e branded IDs (opcional v1)
├── commands.ts       # input schemas de comandos
├── queries.ts        # DTOs de leitura
├── events.ts         # payload schemas por eventType
└── index.ts          # re-export
```

### Tipos compartilhados (`types.ts`)

```typescript
import { z } from "zod";

export const principalStatusSchema = z.enum(["active", "suspended"]);

export const principalIdSchema = z.string().uuid();
export const authUserIdSchema = z.string().min(1).max(128);
export const emailAddressSchema = z.string().email().max(320).transform((e) => e.toLowerCase());

export const suspensionReasonCodeSchema = z.enum([
  "ops.manual",
  "governance.revoked",
  "security.incident",
  "user.requested",
]);
```

### DTOs de leitura (`queries.ts`)

```typescript
import { z } from "zod";
import { emailAddressSchema, principalIdSchema, principalStatusSchema } from "./types";

/** DTO público — sem authUserId (boundary HTTP only). */
export const principalDtoSchema = z.object({
  id: principalIdSchema,
  email: emailAddressSchema,
  status: principalStatusSchema,
  createdAt: z.string().datetime(),
  suspendedAt: z.string().datetime().optional(),
});

export type PrincipalDto = z.infer<typeof principalDtoSchema>;
```

### Inputs de comandos (`commands.ts`)

```typescript
import { z } from "zod";
import {
  authUserIdSchema,
  emailAddressSchema,
  principalIdSchema,
  suspensionReasonCodeSchema,
} from "./types";

export const registerPrincipalCommandSchema = z.object({
  authUserId: authUserIdSchema,
  email: emailAddressSchema,
});

export const suspendPrincipalCommandSchema = z.object({
  principalId: principalIdSchema,
  reasonCode: suspensionReasonCodeSchema,
  actorPrincipalId: principalIdSchema.optional(),
});

export const syncPrincipalEmailCommandSchema = z.object({
  principalId: principalIdSchema,
  email: emailAddressSchema,
});

export const linkAuthUserIdCommandSchema = z.object({
  principalId: principalIdSchema,
  authUserId: authUserIdSchema,
});
```

---

## Eventos de domínio versionados

Envelope: `domainEventEnvelopeSchema` de `@anxionos/contracts`. **Migrar** código atual `eventType: "principal.registered"` para `identity.principal.registered.v1`.

### Catálogo v1

| eventType | aggregate | Emitido por | Payload público |
| --- | --- | --- | --- |
| `identity.principal.registered.v1` | Principal | `registerPrincipal` (primeira criação) | `principalId`, `email` |
| `identity.principal.suspended.v1` | Principal | `suspendPrincipal` | `principalId`, `reasonCode`, `suspendedAt` |
| `identity.principal.reactivated.v1` | Principal | `reactivatePrincipal` (**deferido**) | `principalId`, `reactivatedAt` |
| `identity.principal.email_updated.v1` | Principal | `syncPrincipalEmail` | `principalId`, `email` |
| `identity.principal.auth_linked.v1` | Principal | `linkAuthUserId` (**deferido**) | `principalId` apenas |

### Schemas de payload (`events.ts`)

```typescript
import { z } from "zod";
import {
  emailAddressSchema,
  principalIdSchema,
  suspensionReasonCodeSchema,
} from "./types";

export const identityPrincipalRegisteredV1PayloadSchema = z.object({
  principalId: principalIdSchema,
  email: emailAddressSchema,
});

export const identityPrincipalSuspendedV1PayloadSchema = z.object({
  principalId: principalIdSchema,
  reasonCode: suspensionReasonCodeSchema,
  suspendedAt: z.string().datetime(),
});

export const identityPrincipalEmailUpdatedV1PayloadSchema = z.object({
  principalId: principalIdSchema,
  email: emailAddressSchema,
});

export const identityPrincipalAuthLinkedV1PayloadSchema = z.object({
  principalId: principalIdSchema,
});

/** Mapa eventType → schema para validação no projector e testes de contrato */
export const identityEventPayloadSchemas = {
  "identity.principal.registered.v1": identityPrincipalRegisteredV1PayloadSchema,
  "identity.principal.suspended.v1": identityPrincipalSuspendedV1PayloadSchema,
  "identity.principal.email_updated.v1": identityPrincipalEmailUpdatedV1PayloadSchema,
  "identity.principal.auth_linked.v1": identityPrincipalAuthLinkedV1PayloadSchema,
} as const;
```

### Exemplo completo — `identity.principal.registered.v1`

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440010",
  "schemaVersion": "0.1.0",
  "ownerDomain": "identity",
  "eventType": "identity.principal.registered.v1",
  "occurredAt": "2026-09-08T02:30:00.000Z",
  "payload": {
    "principalId": "p1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "owner@example.com"
  }
}
```

### Exemplo — `identity.principal.suspended.v1`

```json
{
  "eventId": "660e8400-e29b-41d4-a716-446655440011",
  "schemaVersion": "0.1.0",
  "ownerDomain": "identity",
  "eventType": "identity.principal.suspended.v1",
  "occurredAt": "2026-09-08T03:00:00.000Z",
  "payload": {
    "principalId": "p1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "reasonCode": "ops.manual",
    "suspendedAt": "2026-09-08T03:00:00.000Z"
  }
}
```

### Consumidores previstos

| Consumer | Eventos | Responsabilidade |
| --- | --- | --- |
| `graph:identity:v1` (P03) | `registered`, `suspended`, `email_updated` | Nó `:Principal` em Neo4j |
| `apps/api:identity-sessions:v1` (R09) | `suspended` | Revogar sessões BA |
| `governance` (assíncrono) | `suspended` | Revogar grants derivados (futuro) |
| `audit` | todos | Flight recorder |

---

## Comandos application — esboço de assinaturas

### Implementados / P0 (ANX-28 G1)

| Comando / Query | Status | Notas |
| --- | --- | --- |
| `registerPrincipal` | ✅ implementado | Normalizar eventType em follow-up |
| `getPrincipalByAuthUserId` | ✅ implementado | Fail-closed `suspended` → `null` |
| `getPrincipalById` | **P0 — ausente** | Bloqueia organizations G1 |
| `PrincipalRepository.findById` | **P0 — ausente** | Suporte a `getPrincipalById` |

```typescript
// application/queries/get-principal.ts — exportar ambas

export interface GetPrincipalByIdDeps {
  repository: PrincipalRepository;
}

export async function getPrincipalById(
  deps: GetPrincipalByIdDeps,
  principalId: string,
): Promise<Principal | null>;

export async function getPrincipalByAuthUserId(
  repository: PrincipalRepository,
  authUserId: string,
): Promise<Principal | null>;
```

**Semântica fail-closed (queries de autorização):**

| Condição | `getPrincipalById` | `getPrincipalByAuthUserId` |
| --- | --- | --- |
| Principal inexistente | `null` | `null` |
| `status = suspended` | `null` | `null` |
| `status = active` | `Principal` | `Principal` |

### Deferidos (contrato R4, implementação posterior)

```typescript
// application/commands/suspend-principal.ts — P1
export async function suspendPrincipal(
  deps: SuspendPrincipalDeps,
  input: SuspendPrincipalInput,
): Promise<Principal>;

// application/commands/sync-principal-email.ts — P1
export async function syncPrincipalEmail(
  deps: SyncPrincipalEmailDeps,
  input: SyncPrincipalEmailInput,
): Promise<Principal>;

// application/commands/link-auth-user-id.ts — P2
export async function linkAuthUserId(
  deps: LinkAuthUserIdDeps,
  input: LinkAuthUserIdInput,
): Promise<Principal>;
```

---

## Port `PrincipalRepository` — extensão P0

```typescript
// domain/ports/principal-repository.ts
export interface PrincipalRepository {
  findById(id: string): Promise<Principal | null>;
  findByAuthUserId(authUserId: string): Promise<Principal | null>;
  findByEmail(email: string): Promise<Principal | null>;
  save(principal: Principal): Promise<Principal>; // substitui create-only quando suspend chegar
}
```

| Método | Uso |
| --- | --- |
| `findById` | `getPrincipalById`, testes |
| `findByAuthUserId` | `registerPrincipal` idempotência, `getPrincipalByAuthUserId` |
| `findByEmail` | Unicidade INV-IDN-02 |
| `save` | Updates (`suspend`, `syncPrincipalEmail`) — hoje só `create` existe |

---

## Contrato `PrincipalLookup` para organizations

Port definido em **organizations**; identity fornece a **implementação upstream** via queries públicas — não exporta o port.

### Port (organizations domain)

```typescript
/** organizations/domain/ports/principal-lookup.ts */
export interface PrincipalLookup {
  /** true somente se Principal existe e status = active */
  exists(principalId: string): Promise<boolean>;
}
```

### Adapter (organizations infrastructure)

```typescript
/** organizations/infrastructure/adapters/identity-principal-lookup.ts */
import { getPrincipalById, type GetPrincipalByIdDeps } from "@anxionos/identity";

export interface IdentityPrincipalLookupDeps extends GetPrincipalByIdDeps {}

export function createIdentityPrincipalLookup(
  deps: IdentityPrincipalLookupDeps,
): PrincipalLookup {
  return {
    async exists(principalId: string): Promise<boolean> {
      const principal = await getPrincipalById(deps, principalId);
      // getPrincipalById já é fail-closed para suspended
      return principal !== null;
    },
  };
}
```

### Matriz de comportamento (fail-closed)

| Cenário organizations | `PrincipalLookup.exists` | Comando típico |
| --- | --- | --- |
| Principal ativo | `true` | `CreateAgency`, `ActivateMembership` |
| Principal inexistente | `false` → `ORG_PRINCIPAL_NOT_FOUND` | idem |
| Principal `suspended` | `false` → `ORG_PRINCIPAL_NOT_FOUND` | idem |
| identity PG down | exceção → `503 ORG_IDENTITY_UNAVAILABLE` | fail-closed |
| `InviteMember` (só email) | **não chama** lookup | D-R6-04 |

### Dependência de wiring (composition root)

```typescript
// apps/api — bootstrap (esboço)
import {
  createIdentityDb,
  ensureIdentitySchema,
  getPrincipalById,
  type PrincipalRepository,
} from "@anxionos/identity";
import { createIdentityPrincipalLookup } from "@anxionos/organizations";

const identityPool = createIdentityDb(process.env.DATABASE_URL!);
await ensureIdentitySchema(identityPool);
const principalRepository: PrincipalRepository = /* factory */;

const principalLookup = createIdentityPrincipalLookup({
  repository: principalRepository,
});
```

---

## Superfície pública — `modules/identity/index.ts`

### Exportado hoje (ANX-28)

```typescript
export type { Principal, PrincipalStatus, NewPrincipal };
export type { PrincipalRepository };
export { registerPrincipal, type RegisterPrincipalInput, type RegisterPrincipalDeps };
export { getPrincipalByAuthUserId };
export { createIdentityDb, ensureIdentitySchema };
export { principals }; // schema Drizzle — testes e bootstrap
```

### Export alvo após G1 (P0)

```typescript
// Tipos
export type { Principal, PrincipalStatus, NewPrincipal };
export type { PrincipalRepository };

// Comandos
export {
  registerPrincipal,
  type RegisterPrincipalInput,
  type RegisterPrincipalDeps,
};

// Queries — P0
export {
  getPrincipalByAuthUserId,
  getPrincipalById,
  type GetPrincipalByIdDeps,
};

// Infra bootstrap
export { createIdentityDb, ensureIdentitySchema };
export { principals };
```

### Export P1 (pós-G1, não bloqueia organizations)

| Export | Consumidor |
| --- | --- |
| `suspendPrincipal` | governance, operations |
| `syncPrincipalEmail` | `apps/api` hook BA email |
| `IdentityModuleDeps` | factory composition root |

### Proibido exportar

| Item | Motivo |
| --- | --- |
| `infrastructure/persistence/principal-repository.ts` | Implementação concreta |
| `better-auth`, handlers HTTP | Boundary `apps/api` |
| Port `PrincipalLookup` | Pertence a organizations |

---

## Gap código vs contrato (ANX-28)

| Item | Código atual | Alvo R4 |
| --- | --- | --- |
| `eventType` | `principal.registered` | `identity.principal.registered.v1` |
| Payload registro | inclui `authUserId` | só `principalId`, `email` |
| `findById` | ausente | P0 |
| `getPrincipalById` | ausente em `index.ts` | P0 |
| Fail-closed suspended | verificar implementação | `null` em ambas queries |
| `@anxionos/contracts/identity/*` | ausente | criar em follow-up packages |

---

## Escopo ANX-28 — entregáveis P0 (G1)

> Lista consolidada R03 + R04 para fechar G1 e desbloquear organizations ANX-29.

| # | Entregável | Prioridade | Evidência |
| ---: | --- | --- | --- |
| 1 | `PrincipalRepository.findById` | **P0** | Implementação Drizzle + teste unitário |
| 2 | `getPrincipalById` exportado em `index.ts` | **P0** | Assinatura documentada acima |
| 3 | Fail-closed `suspended` em `getPrincipalById` e `getPrincipalByAuthUserId` | **P0** | Teste queries |
| 4 | Normalizar `eventType` → `identity.principal.registered.v1` | P1 | Diff `register-principal.ts` |
| 5 | Remover `authUserId` do payload de evento | P1 | Contrato + teste outbox |
| 6 | Schemas `@anxionos/contracts/identity/*` | P1 | AR01 contratos |
| 7 | `suspendPrincipal` + evento `suspended.v1` | P2 | R04 sketch; não bloqueia org G1 |

**Bloqueio downstream:** organizations `IdentityPrincipalLookup` e ANX-29 G1 dependem dos itens **1–3**.

---

## Critérios de aceite R4

| # | Critério | Status |
| --- | --- | --- |
| AC-R4-01 | Eventos `identity.principal.*.v1` com payloads documentados | ✅ |
| AC-R4-02 | Schemas propostos em `packages/contracts/identity` | ✅ |
| AC-R4-03 | Comandos sketch + P0 vs deferidos explícitos | ✅ |
| AC-R4-04 | `index.ts` exports alvo documentados | ✅ |
| AC-R4-05 | Contrato `PrincipalLookup` + adapter organizations | ✅ |
| AC-R4-06 | Gap código vs contrato listado para ANX-28 | ✅ |
| AC-R4-07 | Lista P0 G1 consolidada | ✅ |

## Pendências para rodadas seguintes

| ID | Assunto | Rodada |
| --- | --- | --- |
| P-R4-01 | Implementar P0 itens 1–3 (ANX-28 G1) | Imediato |
| P-R4-02 | Criar `packages/contracts/identity/*` | G1 packages |
| P-R4-03 | `suspendPrincipal` + consumer sessão | R09 |
| P-R4-04 | `ServicePrincipal` contratos | R05 |
| P-R4-05 | Consumer `graph:identity:v1` | graph P03 |

## Saída R4

✅ Contratos e eventos aprovados para **R05 — storage** (`R05-storage.md`).

Próximo passo crítico: fechar **ANX-28 G1** (itens P0 1–3) antes de organizations wiring.
