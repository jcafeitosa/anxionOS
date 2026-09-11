---
type: guide
---

# Funcionalidades — `modules/identity` (P02)

**Issue mapa:** ANX-43 · **Implementação:** ANX-28 (P0, G7 2026-09-07) + ANX-457 (completo/avançado/integrado, 2026-09-11)
**Fontes:** [identity R01](../../modules/identity/R01-context.md) · [R03 domain sketch](../../modules/identity/R03-domain-sketch.md) · [R04 contratos](../../modules/identity/R04-contracts.md) · [R11 decisões de implementação](../../modules/identity/R11-lifecycle-decisions.md) · `brain/project-docs/specs/001-institutional-contract/spec.md`
**Decisões vigentes:** `D-IDN-001`..`D-IDN-042` (R08 + R11). Onde R04 divergir de decisão registrada, vale o R11.

## Responsabilidade

Principal institucional (global, sem FK de agência — `D-IDN-023`), sessões humanas via Better Auth, referências lógicas de sessão, service principals com credenciais rotacionáveis e o contrato de projeção `:User` consumido pelo `graph`. **Não** é dono de grants/mandatos (`governance`), nem de memberships/agências (`organizations`), nem do projector de grafo (`graph`).

## Histórias humanas

| Papel | Jornada | Comando/Query |
| --- | --- | --- |
| **Owner** | Registrar/login (Better Auth), MFA, ver sessões ativas, autoatendimento do próprio principal | Auth em `apps/api`; `getPrincipalById` (self, sem grant) |
| **Operator** | Operar o próprio principal; sem escopo de agência aqui | Sessão → `principalId` |
| **Platform** | Registrar/suspender/revogar principals, auditar revogações, provisionar service principals | `registerPrincipal`, `suspendPrincipal`, `revokePrincipal`, `listRevokedSessions`, `issueServiceCredential` |
| **Admin de agência** | Ler/gerir **apenas** principals membros da sua agência (o escopo declarado limita o alvo — `D-IDN-039`) | `x-agency-id` + grant daquela agência |

## Histórias de agente

| Agente | Capacidade | Grant |
| --- | --- | --- |
| **Brain AGENCY** | Consultar próprio Principal, não criar sessão humana | `identity.read` (self não exige grant) |
| **Orchestration worker** | Resolver `actorPrincipalId` em Runs | Port interno — não tool pública |
| **Runtime de serviço** | Autenticar-se com credencial rotacionável | `verifyServiceCredential` (API de módulo, **sem rota HTTP** — `D-IDN-032`) |

## Commands

| Command | Efeito | Idempotência |
| --- | --- | --- |
| `RegisterPrincipal` | Cria Principal + `identity.principal.registered.v1`; kind imutável | `commandId` (journal) + `authUserId` (`D-IDN-006`); corrida resolvida por `ON CONFLICT DO NOTHING` + releitura (`D-IDN-036`); replay de principal não-ativo falha fechado (`D-IDN-041`) |
| `SuspendPrincipal` | ACTIVE→SUSPENDED (reversível), revoga **credenciais** e mantém service identities (`D-IDN-025`) | `commandId` + `expectedRevision` (`IDN_REVISION_CONFLICT`) |
| `RevokePrincipal` | →REVOKED (terminal), revoga identidades de serviço, credenciais e sessões | idem |
| `RecordSessionRevoked` | Grava a referência lógica (nunca o token) + `identity.session.revoked.v1` | `commandId` com validação de intenção; **o no-op também grava journal** (`D-IDN-037`) |
| `IssueServiceCredential` | Gera prefixo+segredo, persiste só o scrypt, devolve a chave **uma vez** | `commandId` (replay devolve `secret: ""`) |
| `RotateServiceCredential` | Rotaciona todas as ativas na mesma TX (sem janela com duas chaves válidas) | `commandId` |
| `RevokeServiceCredential` | Revoga; corrida perdedora devolve a já revogada | `commandId` |

## Queries

| Query | Retorno |
| --- | --- |
| `GetPrincipalById` | Principal DTO sem `authUserId`/segredo; **fail-closed** para `suspended`/`revoked` (404) |
| `ListSessions` | Referências lógicas de sessão (sem `externalRefHash`) |
| `ListRevokedSessions` | Ledger **global** de revogações — exige autoridade de plataforma (`D-IDN-040`) |
| `ListServiceCredentials` | DTOs sem `secretHash` |
| `VerifyServiceCredential` | `{ valid, reason }` discriminado (`malformed\|not_found\|revoked\|rotated\|expired\|mismatch\|identity_inactive\|principal_inactive`) |

## Rotas HTTP (`apps/api/src/identity`, R04 + `D-IDN-030`)

| Método | Rota | Autorização |
| --- | --- | --- |
| GET | `/v1/identity/principals/:principalId` | self **ou** `identity.read`; alvo precisa pertencer à agência declarada |
| GET | `/v1/identity/principals/:principalId/sessions` | idem |
| POST | `/v1/identity/principals` | `identity.admin` + `Idempotency-Key` |
| POST | `/v1/identity/principals/:principalId/suspend` | `identity.admin` + `Idempotency-Key` |
| POST | `/v1/identity/principals/:principalId/revoke` | `identity.admin` + `Idempotency-Key` |
| POST | `/v1/identity/sessions/revoke` | self **ou** `identity.admin` + `Idempotency-Key` |
| GET | `/v1/identity/sessions/revoked` | `identity.admin` no escopo **PLATAFORMA** |

`identity.admin` **não** implica `identity.read` (`D-IDN-034`). Sem agência declarada a requisição é de plataforma e exige grant no escopo `PLATFORM_SCOPE_ID` (`D-IDN-035`/`D-IDN-042`, `governance` ANX-462). Códigos `IDN_*` com status de R04; `ZodError` → 400; falha do revogador de sessão → 503.

## Eventos

| Evento | Consumidores |
| --- | --- |
| `identity.principal.registered.v1` | graph (projeção `:User`), audit |
| `identity.principal.suspended.v1` | graph (patch de status), governance |
| `identity.principal.reactivated.v1` | graph |
| `identity.principal.revoked.v1` | graph, governance |
| `identity.session.revoked.v1` | governance, apps/api |
| `identity.service_credential.{issued,rotated,revoked}.v1` | audit |

Nenhum payload carrega `authUserId`, token, `secretHash` ou `externalRefHash` (`D-IDN-012`).

## Integração

| Módulo | Borda |
| --- | --- |
| **organizations** | `PrincipalLookup` port — `getPrincipalById` (D-ORG-022) + `AgencyScopePort` para membership do ator **e do alvo** |
| **governance** | `hasCapability` (dono dos grants); papéis `identity.read`/`identity.admin`; escopo de plataforma |
| **apps/api** | Better Auth (composition root), plugin `/v1/identity`, post-login |
| **graph** | Contrato de projeção `:User` publicado aqui; **projector é do `graph`** (`D-IDN-020`) |

## Armazenamento

PostgreSQL: `identity_principals`, `identity_sessions`, `identity_service_identities`, `identity_service_credentials`, `identity_command_journal` (migrator Drizzle com journal no schema `identity`). Credenciais só como scrypt; sessões só como sha256. SQLite proibido (`D-IDN-022`).

## Gap código

- ✅ `domain/`, `application/`, `infrastructure/`, `api/` (7 rotas), `graph/` (contrato), journal/outbox atômicos, migrator versionado, idempotência com intenção, escopo de plataforma.
- ✅ Testes: unidade, contratos, HTTP real (Elysia), integração com PostgreSQL real (migrator, atomicidade, corridas de 10 chamadas, reuso de key).
- ❌ Projector Neo4j `:User` — **dono `graph`** (`D-IDN-020`); aqui existe apenas o contrato e os testes de não-vazamento.
- ❌ RLS PostgreSQL — P09 (`D-IDN-018`, fora do slice).
- ❌ Rota HTTP para credenciais de serviço — **deliberadamente** fora, para `verify` não virar oráculo de adivinhação de chave (`D-IDN-032`).
- ⚠️ Autoridade de plataforma exige grant no escopo `PLATFORM_SCOPE_ID`, que só o `governance` emite; sem operador de plataforma provisionado as rotas globais negam (comportamento correto, mas exige seed/administração).
