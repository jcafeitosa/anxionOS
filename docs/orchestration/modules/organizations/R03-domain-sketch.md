---
type: debate
---

# R03 — Esboço de domínio: `modules/organizations`

**Rodada:** R3 — Domain model  
**Data:** 2026-09-07

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R3)

**In:** Agency, Owner, Membership, Organization. **Out:** eventos `organizations.*.v1`. Sem plaintext de invite token.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Domain sketch | **organizations** |
| adapter-gateway | **KEEP** |

## Debate R3 (diálogo atribuído)

**Arquiteto:** Proponho quatro entidades núcleo v1: `Agency`, `Owner`, `Membership`, `Organization`. Value objects: `AgencyStatus`, `MarketScope`, `MembershipRole`, `InviteToken` (hash, não plaintext).

**Executor:** Ports mínimos: `AgencyRepository`, `MembershipRepository`, `OrganizationRepository`, `PrincipalLookup` (de identity), `OrganizationEventPublisher` (outbox via eventing).

**Crítico:** Cuidado com `Organization` vs `Agency` — SDD diz Organization agrupa empresas do mesmo titular. Para v1, podemos implementar Agency + Owner e adiar Organization se não houver multi-company no primeiro slice?

**Arquiteto:** Aceito: **v1 scope = Agency + Owner + Membership**; `Organization` como tipo reservado com migration placeholder opcional. Documentar em R09.

**QA:** Cenários mínimos: criar Agency idempotente; convite membership; revogar; cross-tenant negado.

## Entidades

### Agency

```typescript
interface Agency {
  id: string;                    // UUID
  ownerPrincipalId: string;      // FK lógica → identity.Principal
  displayName: string;
  marketScope: "stocks" | "crypto" | "both";
  status: AgencyStatus;
  onboardingStep: OnboardingStep;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

type AgencyStatus = "draft" | "connections_pending" | "ready" | "draining" | "archived";
type OnboardingStep = "created" | "markets_set" | "blueprint_pending" | "mandate_pending" | "ready";
```

### Owner

```typescript
interface Owner {
  id: string;
  principalId: string;           // único por titular no baseline
  defaultOrganizationId?: string; // futuro; nullable v1
  createdAt: Date;
}
```

### Membership

```typescript
interface Membership {
  id: string;
  agencyId: string;
  principalId: string;
  role: MembershipRole;
  status: "invited" | "active" | "revoked";
  invitedAt?: Date;
  joinedAt?: Date;
  revokedAt?: Date;
  revision: number;
}

type MembershipRole = "owner" | "admin" | "operator" | "viewer";
```

## Invariantes de domínio

| ID | Regra |
| --- | --- |
| INV-ORG-01 | Agency.status só avança por comandos explícitos (máquina finita) |
| INV-ORG-02 | Exatamente um Membership role=owner ativo por Agency |
| INV-ORG-03 | principalId em Membership deve resolver via PrincipalLookup |
| INV-ORG-04 | Idempotência: mesmo commandId retorna mesmo aggregate revision |
| INV-ORG-05 | agencyId em comando deve pertencer ao scope da sessão (validado na api) |

## Ports (domain/)

| Port | Método (esboço) |
| --- | --- |
| `AgencyRepository` | `save`, `findById`, `findByOwnerPrincipalId` |
| `MembershipRepository` | `save`, `findByAgencyAndPrincipal`, `listByAgency` |
| `OwnerRepository` | `save`, `findByPrincipalId` |
| `PrincipalLookup` | `exists(principalId): Promise<boolean>` |
| `OrganizationUnitOfWork` | transação estado+journal+outbox |

## Eventos de domínio (rascunho para R4)

| eventType | aggregate |
| --- | --- |
| `organizations.agency.created.v1` | Agency |
| `organizations.agency.markets_updated.v1` | Agency |
| `organizations.agency.status_changed.v1` | Agency |
| `organizations.membership.invited.v1` | Membership |
| `organizations.membership.activated.v1` | Membership |
| `organizations.membership.revoked.v1` | Membership |

## Comandos application (rascunho para R4)

- `CreateAgency`
- `UpdateAgencyMarkets`
- `InviteMember`
- `ActivateMembership` (aceite convite)
- `RevokeMembership`

## Estrutura de pastas prevista (sem criar agora)

```text
modules/organizations/
├── domain/entities/  domain/ports/  domain/events/
├── application/commands/  application/queries/
├── infrastructure/persistence/
└── index.ts
```

## Saída R3

✅ Domain sketch aprovado para R4 (contratos/API).  
⚠️ Pendência: confirmar se Organization entra no v1 ou fica explícito em R09 como deferido.
