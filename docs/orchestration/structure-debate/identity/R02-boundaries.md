---
type: debate
---

# R02 — Fronteiras: `modules/identity`

**Componente:** modules/identity  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P02  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42 · implementação parcial: ANX-28 (`in_review`)

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre identity, organizations, governance e `apps/api`; decidir colocação do Better Auth; definir ownership Principal vs User/Session; especificar contrato público (`index.ts`) e imports proibidos.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário e perguntas abertas |
| `brain/notes/anxionos-backend-structure.md` | Tabela de fronteiras (linhas 193–210) e regras 1–12 |
| `brain/notes/anxionos-storage-ownership.md` | PG/Neo4j por módulo |
| [organizations/R02-boundaries.md](../../modules/organizations/R02-boundaries.md) | Espelho downstream — `PrincipalLookup` |
| [organizations/R06-dependencies.md](../../modules/organizations/R06-dependencies.md) | D-R6-01..04 — Better Auth e `getPrincipalById` |
| `backend/modules/identity/src/index.ts` | Superfície pública atual |
| `backend/apps/api/src/auth.ts`, `plugins/auth.ts` | Better Auth no composition root |

## Debate R2 (diálogo atribuído)

**Arquiteto:** identity é dono do **Principal institucional** — âncora referenciada por organizations, governance e graph. Autenticação (credencial, sessão, 2FA, verificação de email) é responsabilidade do **composition root** via Better Auth.

**Crítico:** R01 lista “sessões Better Auth” como posse de identity. Isso contradiz organizations R06 (D-R6-02)?

**Arquiteto:** Não há contradição se separarmos **ownership de dados** de **runtime de auth**. As tabelas `user`/`session`/`account` do Better Auth ficam no mesmo PostgreSQL, mas o **módulo identity não importa nem configura** `better-auth`. O composition root (`apps/api`) monta o handler; identity expõe comandos/queries sobre `Principal` e recebe `authUserId` já emitido pelo BA.

**Executor:** Fluxo v1: signup BA → hook no composition root → `registerPrincipal({ authUserId, email })`. Rotas de domínio recebem `principalId` resolvido por `getPrincipalByAuthUserId`, nunca `authUserId` cru em payload de negócio downstream.

**Security:** Revogação institucional (`Principal.status = suspended`) é identity; invalidação de cookie/sessão BA é efeito colateral no composition root ou worker — identity emite evento, não manipula cookie HTTP diretamente.

**Crítico (organizations):** `PrincipalLookup` precisa de `getPrincipalById` público — hoje só existe `getPrincipalByAuthUserId` no `index.ts`.

**Síntese Orquestrador:** Fronteira aceita; Better Auth permanece em `apps/api`; identity amplia export com `getPrincipalById` (gap ANX-28).

---

## Decisão: colocação do Better Auth

| Opção | Veredito | Racional |
| --- | --- | --- |
| **A — `apps/api` (composition root)** | ✅ **Recomendado** | ADR0002 regra 3: apps são composition roots; registram adapters, não concentram regra de negócio. BA precisa de HTTP handler, cookies, `trustedOrigins`, env de email — tudo pertence ao boundary HTTP. organizations R06 D-R6-02 já assume esta decisão. |
| B — `identity/infrastructure/adapters/better-auth` | ❌ Rejeitado para v1 | Forçaria identity a conhecer Elysia/HTTP ou exportar handler acoplado; viola separação domain/application vs transport. Adapter fino futuro só se múltiplos composition roots (workers, CLI) precisarem do mesmo bootstrap. |
| C — `packages/*` compartilhado | ❌ Rejeitado | `packages/contracts` não importa modules; BA não é contrato institucional — é mecanismo de auth no boundary. |

**Consequências:**

1. `backend/apps/api/src/auth.ts` permanece dono da instância `betterAuth({ ... })`, pool dedicado e plugins (2FA, email).
2. `identity` **nunca** importa `better-auth`, `authApi` nem lê cookies.
3. Hooks pós-signup/verificação no composition root chamam API pública de identity (`registerPrincipal`).
4. Tabelas BA (`user`, `session`, `verification`, etc.) coexistem em PG; **migrations BA** são responsabilidade do composition root ou script de bootstrap documentado — não do Drizzle schema `identity_principals`.
5. `Principal.authUserId` é referência lógica 1:1 ao `user.id` do Better Auth — sem FK física cross-schema (mesma regra de organizations → identity).

---

## Principal vs User / Session — ownership

| Conceito | Dono | Armazenamento | Papel institucional |
| --- | --- | --- | --- |
| **User** (credencial BA) | Composition root (`apps/api` + BA) | Tabelas Better Auth em PG | Autenticação — email, hash, verificação, 2FA |
| **Session** (token/cookie BA) | Composition root (`apps/api` + BA) | Tabelas Better Auth em PG | Sessão HTTP; `authPlugin.requireSession` resolve user |
| **Principal** | **identity** | `identity_principals` (PG) | Ator institucional — referenciado por Owner, Membership, grants |
| **Service principal** (futuro) | **identity** | PG (`identity_service_principals` — R03) | Agentes de runtime Go/Python; rotação via identity |
| **Revogação institucional** | **identity** | `Principal.status`, eventos `principal.suspended` | Suspende ator no domínio; downstream ignora membership se principal inativo |
| **Papéis visíveis no grafo** | Projeção **graph** a partir de eventos identity + organizations | Neo4j | identity emite fatos; não escreve Neo4j |

**Regra de ouro:** `principalId` é o identificador institucional em comandos, eventos e grants. `authUserId` e `user.id` existem **apenas** no boundary HTTP e na camada de ligação identity — organizations, governance e demais módulos **não** armazenam nem aceitam `authUserId` em payload autenticado.

---

## O módulo POSSUI (estado autoritativo)

| Agregado / artefato | Responsabilidade | Storage |
| --- | --- | --- |
| `Principal` | Âncora institucional humana; vínculo `authUserId`; email espelhado; status `active`/`suspended` | PG `identity_principals` |
| `ServicePrincipal` (P02+, sketch R03) | Identidade não-humana para workers/runtimes | PG (tabela dedicada) |
| Journal + outbox de identity | `principal.registered`, `principal.suspended`, etc. | PG via `@anxionos/eventing` |
| Bootstrap schema | `ensureIdentitySchema`, migrations Drizzle do módulo | composition root chama no startup |
| Queries de ligação | `getPrincipalByAuthUserId`, `getPrincipalById` | application → repository |

### O módulo NÃO POSSUI

| Item | Dono correto | Notas |
| --- | --- | --- |
| Agency, Owner, Membership, onboarding | **organizations** | Referencia `principalId`; port `PrincipalLookup` |
| Grant, mandato, authorityEpoch, ALLOW/DENY | **governance** | Consome `principalId`; não duplica Principal |
| Handler HTTP `/api/auth/*`, cookies, CORS auth | **apps/api** | Monta `authHandler` do Better Auth |
| User, Session, Account, Verification (BA) | **apps/api** + schema BA | Runtime e tabelas BA; identity só recebe `authUserId` |
| Envio de email (reset, OTP, verificação) | **apps/api** (`email/`) | Acoplado ao lifecycle BA hoje |
| Nós/arestas Neo4j de Principal | **graph** (projeção) | Eventos `principal.*` |
| Tokens/credenciais de provider | **connections** + `packages/secrets` | Fora de identity |
| Autorização efetiva (escopo tenant) | **governance** + graph kernel | identity prova *quem* é o ator, não *o que* pode fazer |

---

## Fronteira explícita: identity × organizations × governance × apps/api

| Fronteira | identity | organizations | governance | apps/api |
| --- | --- | --- | --- | --- |
| Criar Principal após signup | ✅ `registerPrincipal` | ❌ | ❌ | Orquestra hook BA → identity |
| Validar Principal existe | ✅ `getPrincipalById` | ✅ via port `PrincipalLookup` | ❌ (confia em `principalId` nos eventos) | Injeta `principalId` na sessão |
| Convite por email sem Principal | ❌ | ✅ `invite_email` only | ❌ | — |
| Membership / Agency | ❌ | ✅ | ❌ | Monta rotas |
| Suspender Principal | ✅ comando + evento | Reage (membership inativo futuro) | Pode revogar grants derivados | Pode invalidar sessões BA |
| Resolver sessão HTTP | ❌ | ❌ | ❌ | ✅ `authPlugin` + `authApi.getSession` |
| Emitir grant | ❌ | ❌ (só fatos de role) | ✅ | — |
| Duplicar `authUserId` em tabela org | ❌ | ❌ proibido | ❌ | ❌ |

---

## Contrato público — `index.ts`

### Exportado hoje (código ANX-28)

```typescript
// Tipos de domínio
export type { Principal, PrincipalStatus, NewPrincipal };
export type { PrincipalRepository };

// Casos de uso
export { registerPrincipal, type RegisterPrincipalInput, type RegisterPrincipalDeps };
export { getPrincipalByAuthUserId };

// Infra bootstrap (composition root)
export { createIdentityDb, ensureIdentitySchema };
export { principals }; // schema Drizzle — testes e bootstrap
```

### Export recomendado (fechar gap organizations R06 / G1)

| Export | Tipo | Consumidor | Prioridade |
| --- | --- | --- | --- |
| `getPrincipalById(deps, principalId)` | query application | organizations `PrincipalLookup` adapter | **P0** — bloqueia organizations G1 |
| `suspendPrincipal(deps, principalId, reason)` | command | governance, operations (futuro) | P1 — R04 |
| `registerServicePrincipal(...)` | command | apps/workers, execution-go | P2 — R03 sketch |
| `IdentityModuleDeps` | tipo factory | composition root wiring | P1 |

### O que **não** exportar

| Proibido no `index.ts` | Motivo |
| --- | --- |
| `infrastructure/persistence/principal-repository.ts` (classe concreta) | Consumidores usam factory ou injeção no composition root |
| Imports de `better-auth` | Boundary HTTP |
| Handlers Elysia / rotas HTTP | Pertencem a `identity/api/` montadas em `apps/api` |
| Acesso direto ao pool BA | Dois pools: BA (api) e identity (módulo) — podem compartilhar `DATABASE_URL` |

---

## Imports proibidos (cross-module)

| Origem (identity) | Destino | Veredito |
| --- | --- | --- |
| `domain/*` | `better-auth`, Elysia, Drizzle, pg, Neo4j | ❌ regra 1 |
| `application/*` | `organizations/*`, `governance/*` | ❌ regra 4 |
| `infrastructure/*` | repositório privado de outro módulo | ❌ regra 4 |
| `identity` | tabelas `organizations_*` | ❌ regra 4 |
| `identity` | `@anxionos/contracts` eventos de organizations | ❌ identity emite só `ownerDomain: identity` |
| `apps/api` | `identity/infrastructure/persistence/*` direto | ❌ usar `index.ts` |
| `organizations` | `identity/infrastructure/**` | ❌ D-R6-01 — só `index.ts` + port adapter |

**Permitido:**

- `identity` → `@anxionos/contracts`, `@anxionos/eventing`, `@anxionos/database` (helpers), `@anxionos/observability`
- `apps/api` → `@anxionos/identity` (API pública), `./auth` (BA local)
- `organizations` → `@anxionos/identity` (`getPrincipalById` / `getPrincipalByAuthUserId` via adapter)

---

## Invariantes de fronteira (propostas)

1. Todo `Principal` humano ativo tem exatamente um `authUserId` único; criação idempotente por `authUserId`.
2. `email` em `identity_principals` é espelho institucional — atualização de email no BA deve propagar via hook (R04); organizations **não** usa email como chave.
3. Comandos downstream recebem `principalId`; resolução sessão → `principalId` ocorre **uma vez** em `apps/api`.
4. Mutações identity confirmam estado + journal + outbox na mesma transação PG.
5. `Principal.status = suspended` implica fail-closed em lookups que exigem principal ativo (organizations `PrincipalLookup.exists` retorna `false`).

---

## Impacto em organizations R06 — `PrincipalLookup`

| Item organizations R06 | Efeito deste R02 |
| --- | --- |
| **D-R6-02** Better Auth só em `apps/api` | ✅ **Confirmado** — decisão explícita e rationale |
| **D-R6-01** Adapter chama API pública identity | ✅ `getPrincipalById` definido como export P0 |
| **Gap G1** (`getPrincipalById` ausente no `index.ts`) | Documentado; implementação ANX-28 antes de organizations G1 |
| **D-R6-04** Convite sem Principal | ✅ identity não participa até `ActivateMembership` |
| **Fail-closed** em mutação | ✅ `exists()` mapeia para principal ativo via `getPrincipalById` |
| **Sem FK física** `principal_id` | ✅ alinhado — referência lógica apenas |

organizations **não precisa alterar R06** — este R02 ratifica premissas já assumidas e fecha a pergunta aberta do R01 sobre colocação do Better Auth.

---

## Perguntas abertas para R03 (domain sketch)

1. **Service principal:** modelo de credencial (JWT, mTLS, API key rotacionável) e relação com `Principal` humano patrocinador?
2. **Sincronização email:** hook BA → identity em toda mudança de email, ou evento assíncrono com reconciliação?
3. **Revogação em cascata:** quem invalida sessões BA quando `principal.suspended` — worker em `apps/api`, identity worker, ou consumer governance?
4. **Unicidade cross-tenant:** `Principal` é global à plataforma ou scoped? (baseline R03: global — tenant emerge em organizations via Membership.)
5. **Projeção graph:** nó `User` vs `Principal` no Neo4j — um nó ou dois com aresta `AUTHENTICATES_AS`?

---

## Saída R2

✅ Boundary doc aprovado — R03 concluído em [R03-domain-sketch.md](./R03-domain-sketch.md).

Próximas dependências: fechar export `getPrincipalById` em ANX-28 (G1 obrigatório); organizations pode avançar R07→R10 com premissa estável.
