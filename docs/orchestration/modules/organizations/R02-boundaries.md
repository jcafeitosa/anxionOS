---
type: debate
---

# R02 — Fronteiras: `modules/organizations`

**Rodada:** R2 — Scope boundary  
**Data:** 2026-09-07

## Debate R2 (diálogo atribuído)

**Arquiteto:** organizations é dono de Agency, Owner (vínculo titular↔Agency), Membership (convite, papéis operacionais), blueprint de mercados (stocks/crypto/both) e estado de onboarding da empresa (DRAFT → READY).

**Crítico:** O que **não** entra aqui?

**Arquiteto:** Grants, mandatos, approvals → **governance**. Sessão/login/Better Auth → **identity** + apps/api. Assinatura/webhook/invoice → **billing**. Agent/CEO blueprint execution → **agents**. Projeção Neo4j → eventos consumidos por **graph** projector.

**Executor (antecipação):** MembershipRole pode ser enum local, mas **autorização efetiva** (ALLOW/DENY) só via governance + graph kernel — organizations publica fatos, não decide permissão sensível.

**Security:** `agencyId` em payload nunca substitui escopo da sessão — validar na api boundary contra membership ativo.

**Síntese Orquestrador:** Fronteira aceita; sem objeção bloqueante.

## O módulo POSSUI (estado autoritativo PostgreSQL)

| Agregado | Responsabilidade |
| --- | --- |
| `Agency` | Empresa operacional; nome; mercados habilitados; status lifecycle |
| `Owner` | Vínculo titular (Principal) à Organization/Agency; um Owner por Agency no baseline |
| `Membership` | Principal ↔ Agency; papel proposto; convite; revogação |
| `Organization` (opcional v1) | Agrupamento de Agencies do mesmo titular (SDD: baseline Organization agrupa empresas do mesmo Owner) |
| `OnboardingState` | Etapas retomáveis (CONNECTIONS_PENDING, etc.) como parte do agregado Agency |

## O módulo NÃO POSSUI

| Item | Dono correto |
| --- | --- |
| Sessão, credencial, authUserId | identity |
| Grant, authorityEpoch, mandato | governance |
| Nós/arestas Neo4j | graph (projeção) |
| Subscription/Invoice | billing |
| Agent, AgentVersion, CEO blueprint runtime | agents |
| Secrets de provider | connections + packages/secrets |

## Invariantes de fronteira (propostas)

1. Um `Agency` pertence a exatamente um `scope` (tenant) derivado do Owner.
2. `Principal` referenciado deve existir em identity (port `PrincipalLookup`).
3. Comandos idempotentes com `idempotencyKey` + envelope institucional (contracts).
4. Nenhuma rota em `api/` contém regra de negócio — apenas validação + application.

## Saída R2

✅ Boundary doc aprovado para R3 (domínio).
