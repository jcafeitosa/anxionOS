---
type: guide
---

# Funcionalidades — `modules/organizations` (P02)

**Issue mapa:** ANX-43 · **Debate:** ANX-39 · **Implementação:** ANX-29 (bloqueada G0)  
**Fontes:** [R04 contracts](../../modules/organizations/R04-contracts.md) · [R08 decision log](../../modules/organizations/R08-decision-log.md) · `brain/project-docs/specs/001-institutional-contract/spec.md`

## Responsabilidade

Agency, Owner, Membership, onboarding estados — **não** grants (governance), **não** billing, **não** graph write direto.

## Histórias humanas

| Papel | Jornada | Endpoint / Command |
| --- | --- | --- |
| **Owner** | Criar Agency pós-assinatura (UI01), escolher mercados stocks/crypto/both | `CreateAgency`, `SetMarketScope` |
| **Owner** | Convidar admin/operator/viewer, revogar membro | `InviteMember`, `RevokeMembership` |
| **Owner** | Aceitar próprio convite (edge) ou ativar via link email | `AcceptInvite` (match email D-ORG-034) |
| **Operator** | Ver equipe, listar memberships da Agency | `ListMemberships` |
| **Platform** | Suporte: ver Agency metadata **sem** bypass tenancy | Grant PLATFORM support — R-debate |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **CEO AGENCY** | `organizations.onboarding.advance` quando grant Owner-equivalent | Sem `principalId` no body |
| **Orchestration worker** | Reagir a `agency.created` para task blueprint | P04 agents |
| **Audit PLATFORM** | Export membership history por Agency autorizada | Sanitizado |

## Commands (sketch)

| Command | Invariante | Evento |
| --- | --- | --- |
| `CreateAgency` | Idempotency-Key; owner único | `organizations.agency.created.v1` |
| `InviteMember` | UNIQUE convite email; role válido | `organizations.membership.invited.v1` |
| `ActivateMembership` | Principal existe; status invited | `organizations.membership.activated.v1` |
| `RevokeMembership` | INV-ORG-02 último owner | `organizations.membership.revoked.v1` |

## Queries (sketch)

| Query | Scope |
| --- | --- |
| `GetAgency` | Membership ativo na Agency |
| `ListMemberships` | `agencyId` + assertAgencyScope |

## Integração

| Upstream | Downstream |
| --- | --- |
| identity (`PrincipalLookup`) | governance (grants on activated) |
| billing (`subscription.confirmed` — deferido) | graph (projeção Agency/Membership) |
| — | agents (CEO blueprint após ready) |

## Decisões R01–R08 aplicáveis

- D-ORG-001..043 — ver [R08](../../modules/organizations/R08-decision-log.md)
- Organization multi-company **deferido** D-ORG-043

## Gap código

**Ausente** — debate R08 completo; zero pastas `backend/modules/organizations/`
