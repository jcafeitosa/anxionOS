---
type: debate
---

# R01 — Contexto: `modules/organizations`

**Módulo:** organizations (P02 Foundation)  
**Rodada:** R1 — Inventário documental e de código  
**Data:** 2026-09-07  
**Issue:** ANX-29 (implementação) · ANX-39 (debate)

## Participantes

| Papel | Agente |
| --- | --- |
| Explorador | code-explorer |
| Arquiteto | architect |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Consolidar fontes de verdade, código existente e lacunas antes de definir fronteiras (R2) e domínio (R3).

## Inventário documental

| Fonte | Caminho | Relevância |
| --- | --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` | Dono: Agency, Owner, membership, onboarding, equipes |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` | Onboarding saga, Company Settings, tenant scope |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` | PG: Agency/Owner/membership; Neo4j: organograma |
| ADR0002 | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` | Layout `modules/organizations/` |
| Fronteira identity vs org | `brain/notes/anxionos-backend-structure.md` L197 | identity: sessão; organizations: Agency/Owner/membership |

## Inventário de código

| Artefato | Estado | Notas |
| --- | --- | --- |
| `backend/modules/organizations/` | **Ausente** | Nenhum scaffold — correto para esta fase |
| `backend/modules/identity/` | **Parcial** (`in_review` ANX-28) | `Principal` (authUserId, email, status); sem Agency |
| `backend/packages/contracts` | Parcial | Envelopes de evento/comando; sem DTOs de Organization |
| `backend/packages/eventing` | Parcial | Outbox Postgres (ANX-27) |
| `backend/apps/api` | Parcial | Auth Better Auth; sem rotas `/v1/organizations` |
| Testes | — | `backend/tests/identity/register-principal.test.ts` apenas |

## Debate R1 (síntese atribuída)

**Explorador:** O próximo módulo na sequência P02 é `organizations`, não `graph`. ANX-29 já existe como issue de implementação; falta debate formal antes de G1.

**Arquiteto:** O SDD descreve onboarding como saga idempotente (assinatura → AgencyDraft/Owner → mercados → blueprint). Isso pertence a organizations + billing + agents, mas o **estado confirmado de Agency/Owner/membership** é deste módulo.

**Crítico (observação):** identity entregou `Principal` mínimo. organizations deve referenciar `principalId`, não duplicar authUserId/email como fonte de verdade.

**Orquestrador:** R1 concluído. Próximo: R2 fronteiras explícitas.

## Lacunas identificadas

1. Spec dedicada `organizations` não existe em `brain/project-docs/specs/` — derivar do SDD §UX/onboarding.
2. Contratos públicos (`packages/contracts`) sem tipos Agency/Owner/Membership.
3. Dependência de ANX-28 aceite formal (G7) para iniciar G1 de organizations — debate pode continuar em paralelo.

## Saída R1

✅ Context brief aprovado para avançar a R2.
