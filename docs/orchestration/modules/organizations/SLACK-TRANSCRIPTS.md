---
type: debate
---

# Slack transcripts — `modules/organizations`

Transcrições de debates multi-persona conforme [DEBATE-FORMAT.md](../../DEBATE-FORMAT.md).

---

## Session 1 — R07 prep (P-R5-03, cross-tenant, invite TTL) {#session-1}

**Canal:** `#module-organizations`  
**Issue:** ANX-39 · **Rodada:** R07 prep  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Security (Kai), Arquiteto, Crítico, Executor (Dev), Code Review, QA, Red Team (Ryn)

---

**Orquestrador (CTO)** · 21:02  
@Security @Arquiteto abrimos prep de R07 na `#work-ANX-39`. R06 adiou **P-R5-03** (RLS PostgreSQL) e **P-R5-04** (TTL convite). Hoje precisamos fechar: (1) RLS v1 vs application-only, (2) enforcement cross-tenant `agencyId`, (3) TTL e rota de accept. Contexto upstream: identity R02 confirma Better Auth só em `apps/api`; ANX-28 ainda precisa exportar `getPrincipalById`.

_(reação: 👀 3 — Arquiteto, Security, Crítico receberam)_

---

**Security (Kai)** · 21:03  
@Arquiteto meu viés é defense-in-depth: sem RLS, um `WHERE agency_id` omitido no repositório vaza tenant inteiro. R06 D-R6-12 já registrou adiamento, mas R-ORG-01 (Sev 15) é o top risk em [R07-risks.md](./R07-risks.md). GK08/UI03 exigem negação explícita — não só "confiar no dev".

↳ **thread**

---

**Arquiteto** · 21:05  
@Security concordo no risco, discordo do timing. `identity` v1 também não tem RLS ([identity/R02-boundaries.md](../../structure-debate/identity/R02-boundaries.md)). Pool `pg` compartilhado com Bun: `SET app.agency_id` por request é frágil — worker esquece, pool reutiliza conexão suja. ADR0002: compensação na application + api é padrão P02 até P09 hardening.

_(reação: 🤔 Crítico)_

---

**Crítico** · 21:07  
@Arquiteto @Security a pergunta não é "RLS é bom?" — é "o que prova que v1 não vaza?". Se adiamos RLS, preciso de **guard centralizado** `assertAgencyScope(principalId, agencyId)` + repositórios que **não compilam** sem `agencyId` na assinatura. Revisão manual não conta como controle.

@Executor isso é implementável no slice G1 sem atrasar ANX-29?

---

**Executor (Dev)** · 21:09  
@Crítico sim. Plano:  
1. Middleware `requireAgencyMembership` em `apps/api` antes de `/agencies/:agencyId/*`  
2. Port `AgencyScopeGuard` na application — consulta membership ativo em PG  
3. Repositórios: `findById(agencyId, id)` — sem `findAll` genérico  

Custo ~2 dias vs RLS: policies em 3 tabelas + testes de bypass DB + migração de roles — estimo 1,5 sprint. ANX-29 já bloqueada por ANX-28; não quero terceiro bloqueio.

_(reação: ✅ Executor — alinhado com R06)_

---

**Code Review** · 21:11  
@Executor +1 na assinatura obrigatória. Bloqueante de manutenção: se alguém adicionar `listMemberships()` sem filtro, CI precisa pegar. Proponho teste AR01 em `backend/tests/organizations/` que falha se existir query sem `agency_id`. E `403 ORG_CROSS_TENANT` — não `404` — conforme R04, para não virar oracle de existência.

---

**Security (Kai)** · 21:13  
@Code Review aceito application-only **com condições documentadas**:  
- Reabrir RLS se: (a) achado G5 de cross-tenant, (b) BI com SQL direto, (c) ADR compliance  
- Momento alvo: **P09 Launch**  

@Red Team preciso do script G5: principal A tenta todas as rotas em `agencyId` de B.

---

**Red Team (Ryn)** · 21:15  
@Security recebido. Cenário A já esboçado em R07: enumerar UUIDs em `GET/PATCH/POST /agencies/:id/*`. Adiciono:  
- Body tampering com `agencyId` diferente do path (R-ORG-10)  
- 20× `InviteMember` paralelo mesmo email (corrida)  

@QA preciso fixture com dois principals, duas agencies — consegue G3 antes do merge organizations?

---

**QA** · 21:17  
@Red Team sim. Casos mínimos:  
- C1: A em agency X, mutação em Y → `403 ORG_CROSS_TENANT`  
- C2: `ListAgenciesForPrincipal` só retorna memberships ativos de A  
- C3: identity down em `CreateAgency` → `503`, zero linhas PG; `InviteMember` → sucesso (D-R6-04)  

Isso cobre fail-closed de ANX-28 sem cache autoritativo.

_(reação: 👍 Security)_

---

**Arquiteto** · 21:19  
Consenso emergente em RLS: **application-only v1**, RLS P09. Registro como P-R5-03 resolvido.  

Próximo eixo: **P-R5-04 TTL convite**. R05 propõe HMAC-SHA256 + pepper; R06 D-R6-07 injeta pepper no composition root. @Security qual TTL?

---

**Security (Kai)** · 21:21  
@Arquiteto proponho **7 dias** default (`invite_expires_at = now() + interval '7 days'`). Rationale: SaaS comum, alinha R05; 24h é agressivo para email corporativo lento; 30d aumenta janela de brute-force mesmo com 32 bytes entropia.  

Rota: `POST /v1/organizations/invites/accept` com `{ token }` + **sessão obrigatória** — vincula `principalId` da sessão (INV-ORG-03). Rate limit 10/min/IP no composition root.

---

**Crítico** · 21:23  
@Security discordo parcialmente da rota única. E se convidado clica no link antes de ter conta? Precisamos:  
1. Link email → frontend signup/login → accept com sessão  
2. `POST .../memberships/:id/activate` para admin ativar manualmente  

E política P-R7-01 aberta: email da sessão deve match `invite_email`? Minha posição: **sim em v1** — senão principal logado com email diferente aceita convite de outro.

_(reação: ⚡ thread ativa)_

---

**Executor (Dev)** · 21:25  
@Crítico concordo no match de email. Fluxo accept:  
1. Validar hash+TTL  
2. Comparar `session.email` com `invite_email` (case-insensitive)  
3. `ActivateMembership` com `principalId` da sessão  

Admin bypass só via rota autenticada com role `owner|admin`. Token inválido → `404` genérico; expirado → `410 ORG_INVITE_EXPIRED`.

---

**Red Team (Ryn)** · 21:27  
@Executor testarei: token após revoke, token expirado (>7d), `X@Y.com` vs `x@y.com` (índice `lower(invite_email)`), brute-force amostral com rate limit. Pepper rotation: dual-pepper 24h conforme R07 R-ORG-08 — sem isso rotação derruba convites pendentes sem aviso.

---

**Code Review** · 21:29  
@Executor registrar `ORG_INVITE_EXPIRED` e `ORG_CROSS_TENANT` em `@anxionos/contracts` (P-R7-04, R9). Zod nos handlers: strip `principalId`/`ownerPrincipalId` do body — R-ORG-10. Idempotência: mesmo `Idempotency-Key` em `InviteMember` → replay sem segundo INSERT.

---

**Orquestrador (CTO)** · 21:32  
@todos fechando prep R07. Divergências resolvidas:  
- RLS adiado P09 com compensação obrigatória application+api+G5  
- TTL **7d**, accept com sessão + match email  
- Cross-tenant: guard em 3 camadas, `403 ORG_CROSS_TENANT`  

Artefato formal: [R07-risks.md](./R07-risks.md). Próximo: R08 decision log. ANX-29 continua bloqueada até ANX-28 G7 + R10 G0.

_(reação: ✅ 6 — consenso registrado; não é PASS de gate)_

---

## Consenso da rodada

1. **P-R5-03 (RLS):** PostgreSQL RLS **não** obrigatório em organizations v1; defense-in-depth via guards application+api, assinaturas de repositório com `agencyId` obrigatório, testes G3/G5 e checklist Red Team. RLS reabre em P09 ou por incidente/BI SQL/compliance.
2. **Cross-tenant `agencyId`:** Middleware `requireAgencyMembership` + `assertAgencyScope` + repositórios sem API global; erro `403 ORG_CROSS_TENANT`; `ListAgenciesForPrincipal` derivado só de memberships ativos.
3. **P-R5-04 (convite):** TTL **7 dias**; rota `POST /v1/organizations/invites/accept` com token + sessão; match `session.email` ↔ `invite_email`; rate limit 10/min/IP; erros `410 ORG_INVITE_EXPIRED` / `404` genérico para token inválido.
4. **Upstream:** Premissas identity R02 e R06 mantidas; `getPrincipalById` (ANX-28) permanece pré-requisito G1; fail-closed sem cache em mutações que exigem principal.

## Decisões registradas

| ID | Decisão | Referência |
| --- | --- | --- |
| D-R7-S1-01 | Application-only tenancy v1; RLS → P09 | P-R5-03, R06 D-R6-12 |
| D-R7-S1-02 | Guard 3 camadas + `ORG_CROSS_TENANT` 403 | R-ORG-01, GK08/UI03 |
| D-R7-S1-03 | TTL convite 7d; accept com sessão + email match | P-R5-04, P-R7-01 |
| D-R7-S1-04 | Testes obrigatórios cross-tenant + invite race em G3/G5 | ANX-29 critérios QA |
| D-R7-S1-05 | ANX-29 bloqueada até ANX-28 G7 + R10 G0 | R06 D-R6-13 |

---

## Session 3 — R09 kickoff (plano de implementação) {#session-3}

**Canal:** `#module-organizations`  
**Issue:** ANX-39 · **Rodada:** R09  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Executor (Dev), Arquiteto, Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)

---

**Orquestrador (CTO)** · 21:40  
@todos abrimos **R09** na `#module-organizations`. R08 fechou 44 decisões `D-ORG-001`..`044` e resolveu P-R7-01/02. Hoje: traduzir debate em plano G1 — árvore ADR0002, migrações, contracts, wiring API, 6 slices e matriz G3/G5. ANX-28 continua bloqueando G1, não R09.

_(reação: 👀 4 — Executor, QA, Code Review, Security)_

---

**Arquiteto** · 21:41  
Prioridade zero: **contratos antes de código**. `packages/contracts/src/organizations/{types,errors,commands,events}.ts` desbloqueiam schema Drizzle e handlers. Organization multi-company e `organizations_blueprints` permanecem **fora** — D-ORG-007, D-ORG-042 explícitos no plano.

---

**Executor (Dev)** · 21:43  
Proponho **6 slices** S1→S6:  
1. contracts + PG schema  
2. domain ports  
3. infra UoW + adapters  
4. comandos Agency  
5. comandos Membership + accept token  
6. API + G3/G5  

@Arquiteto `PrincipalLookup` no slice 2 espelha identity R03/R04 — adapter só chama `getPrincipalById` público (ANX-28).

---

**Crítico** · 21:45  
@Executor slice 3 é onde costuma vazar tenancy. Repositórios **sem** `findById(id)` solto — assinatura com `agencyId` obrigatório. `assertAgencyScope` entra no slice 2 como port e no slice 6 como middleware HTTP. Sem isso, RLS adiado (D-ORG-026) não tem compensação.

_(reação: ✅ Security)_

---

**Code Review** · 21:47  
@Crítico +1. Top 5 arquivos primeiro:  
1. `contracts/organizations/types.ts`  
2. `contracts/organizations/errors.ts` — incluir `ORG_INVITE_EXPIRED` e `ORG_INVITE_EMAIL_MISMATCH` (DEF-08, P-R7-04)  
3. `schema.ts`  
4. `0000_organizations_core.sql`  
5. `principal-lookup.ts`  

Idempotência: `organizations_command_journal` na mesma transação que outbox — teste P-R5-06 no slice 3, não depois.

---

**Security (Kai)** · 21:49  
@Code Review ordem de wiring API importa: bootstrap `eventing → identity → organizations` (D-ORG-037) **antes** de montar rotas. Rota `POST /invites/accept` no **final** do plugin com rate limit 10/min/IP (D-ORG-029). Pepper ausente = fail-fast startup — não default fraco.

---

**QA** · 21:51  
Matriz G3 mínima para sign-off slice 6:  
- G3-01 idempotência CreateAgency  
- G3-02 cross-tenant 403  
- G3-07 token expirado 410  
- G3-08 email mismatch 403  
- G3-09 admin bypass activate  

@Red Team G5-02 (20× invite paralelo) e G5-03 (body tampering principalId) entram no mesmo pacote de testes.

---

**Red Team (Ryn)** · 21:53  
@QA aceito. Adiciono G5-01 enumeração `agencyId` em todas rotas scoped — evidência para GK08/UI03. Dupla `Idempotency-Key` distinta mesmo Owner → duas Agencies (G3-10) — risco residual R-ORG-06 documentado, não bug organizations v1 (D-ORG-035 billing P07).

---

**Arquiteto** · 21:55  
Migrações: **0000** enums+tabelas core; **0001** índices parciais únicos (owner ativo, email convite, agency+principal). Sem FK cross-module para identity — referência lógica `principal_id` UUID. Graph projector continua downstream — consumer `graph:organizations:v1` só em comentário/events.ts.

---

**Executor (Dev)** · 21:57  
@Arquiteto apps/api wiring:  
1. `createOrganizationsDb`  
2. adapters identity + hasher  
3. `organizationsPlugin` após `authPlugin`  
4. rotas sem `:agencyId` primeiro  
5. `requireAgencyMembership`  
6. rotas scoped + invites  

Realtime D-ORG-038 **deferido** pós-G1 — não inflar slice 6.

---

**Crítico** · 21:59  
@Executor concordo em deferir realtime. Bloqueante real continua ANX-28: sem `getPrincipalById` exportado, slice 4 não wire em integração. Plano pode fechar R09; claim ANX-29 só após R10 G0 + identity G7.

---

**Orquestrador (CTO)** · 22:02  
@todos consenso R09: **6 slices**, contracts-first, UoW testado cedo, API por último, G3/G5 obrigatórios no slice 6. Artefato: [R09-dev-plan.md](./R09-dev-plan.md). Próximo: **R10** pacote G0 (PC-G0-02 satisfeito). ANX-29 permanece bloqueada.

_(reação: ✅ 7 — consenso registrado; não é PASS de gate G1)_

---

## Consenso da rodada

1. **Ordem de implementação:** contracts → domain ports → infra UoW → comandos Agency → comandos Membership → API + testes G3/G5 (6 slices).
2. **Top 5 arquivos primeiro:** `types.ts`, `errors.ts`, `schema.ts`, `0000_organizations_core.sql`, `principal-lookup.ts`.
3. **Tenancy:** guards em 3 camadas; repositórios com `agencyId` obrigatório; sem RLS v1 (D-ORG-026).
4. **Deferidos explícitos:** Organization entity, blueprints, realtime, saga AdvanceOnboarding — fora G1.
5. **Bloqueio G1:** ANX-28 `getPrincipalById` + R10 G0; debate R09 independente.

## Decisões registradas

| ID | Decisão | Referência |
| --- | --- | --- |
| D-R9-S3-01 | 6 slices S1–S6 com critérios de aceite por slice | R09-dev-plan.md |
| D-R9-S3-02 | Contracts-first; códigos ORG_* incluindo INVITE_EXPIRED/EMAIL_MISMATCH | DEF-08, D-ORG-041, D-ORG-034 |
| D-R9-S3-03 | Teste P-R5-06 UoW no slice 3 | R05, R09 matriz integração |
| D-R9-S3-04 | Wiring API ordem documentada; realtime deferido | D-ORG-037, D-ORG-038 |
| D-R9-S3-05 | G3-01..10 + checklist G5 R07 no slice 6 | R07, ANX-29 critérios QA |

---

## Session 4 — R09 readiness (roster obrigatório G2–G5) {#session-4}

**Canal:** `#module-organizations`  
**Issue:** ANX-39 · **Rodada:** R09 readiness  
**Data:** 2026-09-07  
**Roster obrigatório:** @Orquestrador @Executor @Crítico @CodeReview @QA @Security @RedTeam  
**Recomendado:** @Arquiteto  
**Pareamento:** Executor (Dev) ↔ Crítico  
**Gates antecipados:** G2 · G3 · G4 · G5  
**Governança:** ANX-44 · [DEBATE-ROSTER.md](../../DEBATE-ROSTER.md)

---

**Orquestrador (CTO)** · 22:10  
@Executor @Crítico @CodeReview @QA @Security @RedTeam @Arquiteto abrimos **Session 4** com roster completo (ANX-44). Objetivo: validar se [R09-dev-plan.md](./R09-dev-plan.md) está **readiness-ready** para R10/G0 — não é PASS G1. Session 3 fechou 6 slices; hoje cada equipe G2–G5 antecipa bloqueios antes de consolidar R09.

_(reação: 👀 7 — roster confirmado)_

---

**Executor (Dev)** · 22:11  
Proposta de readiness: R09 cobre árvore ADR0002, migrações 0000/0001, contracts-first, matriz G3-01..G3-10 e checklist G5 do R07. **Critério de saída R09:** plano fechado com slices S1–S6 e bloqueios externos documentados (ANX-28, R10). Posso assinar readiness se ninguém levantar achado impeditivo nas próximas mensagens.

---

**Crítico** · 22:12  
@Executor não aceito “assinar readiness” sem prova de **critérios verificáveis por slice**. Session 3 listou S1–S6, mas faltam **gates de aceite mensuráveis** entre slices — ex.: o que exatamente desbloqueia S4 se ANX-28 ainda está `in_review`? Proponho tabela `Slice | Pré-requisito | Evidência mínima | Bloqueio se ausente` no R09 antes de R10.

↳ **thread** — desafio obrigatório par G1

---

**Executor (Dev)** · 22:14  
@Crítico justo. Adiciono ao R09:  
- **S1–S3:** podem avançar com mocks de `PrincipalLookup` em testes de módulo (port), sem wiring identity  
- **S4+:** exige `getPrincipalById` real (ANX-28 G7)  
- **S6:** exige G3/G5 executados — não apenas listados  

Evidência mínima S3: teste P-R5-06 journal+outbox na mesma transação. Sem isso, slice 3 não fecha.

_(reação: 🤔 Crítico — em análise)_

---

**Code Review** · 22:16  
@Executor achado G2 antecipado: `errors.ts` precisa exportar **todos** os códigos referenciados em R04/R07 antes de S2 — incluir `ORG_INVITE_EMAIL_MISMATCH` e `ORG_CROSS_TENANT` com shape estável `{ code, message, details? }`. Bloqueante se contracts mudarem depois que Drizzle schema fixar enums. Sugestão não bloqueante: gerar union type a partir de Zod para evitar drift handler ↔ contracts.

---

**QA** · 22:18  
@CodeReview +1 nos códigos. Matriz G3 no R09 está correta, mas falta **fixture registry**: `fixtures/orgs-two-agencies.json` com principalA/agencyX e principalB/agencyY — IDs sanitizados, commitados em `backend/tests/fixtures/`. Sem fixture nomeada, G3-02 e G3-09 não são reproduzíveis por outro agente. Pendência documental, não impeditiva para fechar R09, **impeditiva para S6**.

---

**Security (Kai)** · 22:20  
@Executor condição G4 para readiness: R09 deve listar explicitamente **fail-fast** se `ORG_INVITE_TOKEN_PEPPER` ausente (D-ORG-029) e ordem de bootstrap `eventing → identity → organizations`. Application-only tenancy (D-ORG-026) só é aceitável com link para Session 1 guard 3 camadas + testes G5-01..G5-03. Se R09 não cita rate limit 10/min/IP na rota accept, considero readiness **incompleto**.

---

**Red Team (Ryn)** · 22:22  
@Security concordo. Para G5 antecipado: preciso no R09 a seção **“Cenários sandbox R07”** com IDs G5-01..G5-03 mapeados a comandos curl/httpx — não só títulos. Adiciono G5-04: tentativa de accept com sessão de email **diferente** do convite após login válido — valida P-R7-01. Orçamento: sandbox local, sem PG de produção; cleanup truncate `organizations_*` após suite.

---

**Arquiteto** · 22:24  
@Crítico @Executor a tabela slice/pré-requisito resolve a objeção sem atrasar R10. Arquiteturalmente, S1–S3 alinhados a ADR0002: domain sem framework, infra com Drizzle. Deferências explícitas (realtime D-ORG-038, blueprints D-ORG-042) já estão no R09 — manter na checklist R10 G0. Sem FK cross-module para identity: OK.

---

**Crítico** · 22:26  
@Executor com a tabela slice/evidência e as pendências de QA/Security/Red Team documentadas como **pré-S6** (não pré-R09), retiro bloqueio de readiness do plano. Mantenho ressalva: R09 **não** autoriza claim ANX-29 — só R10 G0 + ANX-28 G7. @QA fixture registry pode ser entregável do slice 6, mas precisa estar no R09 como linha explícita.

---

**Executor (Dev)** · 22:28  
@Crítico @QA @Security @RedTeam atualizo R09 com:  
1. Tabela S1–S6 × pré-requisito × evidência  
2. Seção fail-fast env + bootstrap order  
3. Subseção G5 cenários com IDs e cleanup  
4. Linha fixture registry em S6  

Não reabro escopo Organization entity nem realtime.

---

**Code Review** · 22:30  
@Executor com (1) e contracts-first inalterado, readiness G2 **antecipado OK** — ressalvo que union Zod→types fica como melhoria pós-S1, não condição R09. No gate formal G2 exigirei diff de `packages/contracts` antes de merge organizations.

---

**QA** · 22:32  
@Executor com fixture registry nomeada em S6, readiness G3 **antecipado OK** para R09. Registro: G3-01..G3-10 permanecem **não executados** até slice 6 — transcript não confunde plano com evidência de teste.

---

**Security (Kai)** · 22:34  
@Executor com fail-fast pepper + bootstrap order + link Session 1 guards, readiness G4 **antecipado OK** para R09. RLS continua P09 — sem reabertura. Rate limit na rota accept deve aparecer no wiring S6, citado no R09.

---

**Red Team (Ryn)** · 22:36  
@Executor com subseção G5-01..G5-04 e cleanup, readiness G5 **antecipado OK** para o **plano**. Execução real continua sandbox pós-S6. Pepper rotation dual-pepper 24h permanece cenário G5, não slice 1.

---

**Orquestrador (CTO)** · 22:38  
@todos checklist ANX-44 satisfeito: Crítico desafiou Executor; Code Review, QA, Security e Red Team registraram disposição. **Consenso:** R09 readiness **aprovado** para avançar a **R10** com as quatro adições listadas pelo Executor. Próximo: `R10-g0-package.md`. ANX-29 continua bloqueada. Isso **não** é PASS G1–G7.

_(reação: ✅ 8 — consenso registrado; não é PASS de gate)_

---

## Consenso da rodada

1. **R09 readiness:** plano aprovado para R10 após incorporar tabela slice/pré-requisito/evidência, fail-fast env, fixture registry (S6), e subseção G5 com cleanup.
2. **Par G1 no debate:** Crítico exigiu critérios mensuráveis por slice; Executor respondeu com gates S1–S6 e separação mock vs wiring real.
3. **G2–G5 antecipados:** nenhum bloqueio impeditivo ao **documento** R09; execução de testes e sandbox permanece em S6/G3/G5 formais.
4. **Bloqueio G1 inalterado:** ANX-28 G7 + R10 G0 antes de claim ANX-29.
5. **Governança:** Session 4 demonstra roster obrigatório ANX-44 — modelo para debates futuros.

## Decisões registradas

| ID | Decisão | Referência |
| --- | --- | --- |
| D-R9-S4-01 | R09 readiness aprovado; 4 adições obrigatórias antes de R10 | R09-dev-plan.md |
| D-R9-S4-02 | S1–S3 com PrincipalLookup mock; S4+ exige ANX-28 | D-ORG-037, ANX-28 |
| D-R9-S4-03 | Fixture registry `orgs-two-agencies.json` obrigatório em S6 | G3-02, G3-09 |
| D-R9-S4-04 | Subseção G5-01..G5-04 + cleanup no R09 | R07, Session 1 |
| D-R9-S4-05 | Roster ANX-44 validado nesta sessão | DEBATE-ROSTER.md |


## Session 5 — R10 G0 ratificação (handoff ANX-29) {#session-5}

**Canal:** `#module-organizations`  
**Issue:** ANX-39 · **Rodada:** R10  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Executor (Dev), Arquiteto, Crítico, Code Review, QA, Security (Kai), Red Team (Ryn)

---

**Orquestrador (CTO)** · 22:10  
@todos fechamos **R10** — última rodada do debate ANX-39. R01–R09 entregaram contexto, 44 decisões, plano S1–S6. Hoje ratificamos o pacote G0 em [R10-g0-handoff.md](./R10-g0-handoff.md): escopo ANX-29, PC-G0-01..10, executor/crítico nominal e handoff. ANX-28 continua `in_review` — isso bloqueia G1 código, não o encerramento do debate.

_(reação: 👀 5 — Executor, Crítico, Security, QA, Code Review)_

---

**Arquiteto** · 22:11  
Escopo v1 fechado: Agency + Owner + Membership. `Organization` multi-company, blueprints, saga AdvanceOnboarding e realtime ficam **fora** — D-ORG-007, 038, 039, 042, 043 explícitos no handoff. Bootstrap inalterado: eventing → identity → organizations (D-ORG-037).

---

**Executor (Dev)** · 22:13  
Confirmo nominação como executor G1. Plano R09: 6 slices, contracts-first. Posso claimar ANX-29 e iniciar S1–S3 (contratos, ports, UoW) com mock `PrincipalLookup`; slice 4+ com `getPrincipalById` real só após ANX-28 G7. Top 5 arquivos: `types.ts`, `errors.ts`, `schema.ts`, `0000_organizations_core.sql`, `principal-lookup.ts`.

---

**Crítico** · 22:15  
@Executor aceito como executor **somente** com crítico independente — sou eu (critic-reviewer), PC-G0-10 satisfeito. Minha barra G1→G2: repositórios sem `findById(id)` solto; `assertAgencyScope` antes de qualquer mutação scoped; match email accept (D-ORG-034) não negociável. Debate G0 aprovado; implementação ainda **não** — identity pendente.

_(reação: ✅ Orquestrador)_

---

**Code Review** · 22:17  
@Crítico +1. Handoff lista evidências G2: AR01 boundary, contracts round-trip, UoW P-R5-06 no slice 3. Bloqueio merge slice 4+ sem export identity — documentado em B-01/B-02 do R10. `ORG_INVITE_EXPIRED` e `ORG_INVITE_EMAIL_MISMATCH` entram no slice 1 (`errors.ts`), não depois.

---

**Security (Kai)** · 22:19  
PC-G0-07 ✅ — Top 5 riscos mapeados. R-ORG-01 cross-tenant continua Sev 15; compensação application-only v1 (D-ORG-026) exige G5 antes de qualquer PASS G4. Pepper fail-fast startup; token/pepper proibidos em eventos (D-ORG-019). Rate limit accept 10/min/IP no composition root, não no domínio.

---

**QA** · 22:21  
Matriz G3-01..10 do R09 é critério de sign-off slice 6. Destaco G3-02 cross-tenant, G3-07 expirado, G3-08 email mismatch, G3-09 admin bypass — todos obrigatórios antes de `in_review` ANX-29. Posso preparar fixtures com dois principals enquanto identity fecha G7.

---

**Red Team (Ryn)** · 22:23  
@QA fixtures alinhadas. Checklist G5 R07 permanece: enumeração `agencyId`, 20× invite paralelo, body tampering `principalId`, brute-force accept com rate limit, logs sem PII. G3-10 (duas Idempotency-Key → duas Agencies) é comportamento v1 aceito — não tratar como bug (D-ORG-035 billing P07).

---

**Arquiteto** · 22:25  
PC-G0 tabela: 9/10 ✅. Único pendente PC-G0-04 — ANX-28 G7. Isso **não** impede claim ANX-29 nem encerramento ANX-39; impede wiring integrado slices 4–6. Consumer graph `graph:organizations:v1` especificado (PC-G0-08) — implementação graph P03 downstream.

---

**Executor (Dev)** · 22:27  
@Arquiteto entendido. Claim ANX-29 após ANX-39 `in_review`: começo S1 imediatamente. `.env.example` ganha `ORG_INVITE_TOKEN_PEPPER`; sem valor = startup abort. Integração Better Auth permanece em `apps/api` — organizations recebe `principalId` resolvido (D-ORG-002, D-ORG-014).

---

**Crítico** · 22:29  
@Executor uma ressalva: "claim imediato" ≠ "merge G1". Se ANX-28 demorar, PR organizations fica em draft até PC-G0-04. Não mockar identity em testes de integração slice 6 — só unit com port fake.

---

**Code Review** · 22:31  
@Crítico concordo. Idempotência: `organizations_command_journal` mesma transação que outbox — evidência P-R5-06 no slice 3, não adiar. OpenAPI tags `/v1/organizations` no slice 6 para Scalar.

---

**Security (Kai)** · 22:33  
Rota `POST /invites/accept` por último no plugin (D-ORG-028). Admin activate via `membershipId` mantém bypass D-ORG-036 — documentar no OpenAPI como fluxo assistido. Dual-pepper 24h para rotação (D-ORG-032) no adapter G1.

---

**QA** · 22:35  
Registro AC-G0-06: esta sessão cobre 8 papéis. Evidência anexada ao comentário ANX-39. Após G1, relatório G3 com comandos reproduzíveis — sem "passou local" sem log.

---

**Red Team (Ryn)** · 22:37  
@Security aceito dual-pepper. Cenário novo pós-R8: token válido + sessão email errado → 403 `ORG_INVITE_EMAIL_MISMATCH`, token **não** consumido (P-R7-01). Testarei timing-safe compare no hasher — sem early return vazando prefixo.

---

**Orquestrador (CTO)** · 22:39  
@todos síntese PC-G0:

| # | Status |
| --- | --- |
| PC-G0-01..03, 05..10 | ✅ |
| PC-G0-04 identity G7 | ⏳ |

**Veredito:** G0 debate **aprovado**. ANX-39 → `in_review`. ANX-29 **claimável**. G1 código **bloqueado** até ANX-28 `done`.

_(reação: ✅ 7 — consenso registrado; não é PASS de gate G1)_

---

**Crítico** · 22:41  
Ratifico: pacote G0 completo para fins de debate. Meu parecer pré-G1: CHANGES_REQUIRED zero no documental; implementação aguarda PC-G0-04. Handoff [R10-g0-handoff.md](./R10-g0-handoff.md) é fonte de verdade para claim.

---

**Orquestrador (CTO)** · 22:43  
@todos debate organizations **encerrado** R1–R10. Próximo passo humano: aceite ANX-28 G7, depois executor claim ANX-29 slice 1. Fila: `g0_ready`. Obrigado às oito personas — evidência preservada em SLACK-TRANSCRIPTS Session 5.

_(reação: 🎉 6 — fim do debate ANX-39)_

---

## Consenso da rodada

1. **Pacote G0:** [R10-g0-handoff.md](./R10-g0-handoff.md) aprovado — escopo ANX-29 in/out fechado, PC-G0 9/10, checklist evidências G1.
2. **Equipe G1:** executor code-architect; crítico critic-reviewer (PC-G0-10).
3. **Claim ANX-29:** autorizado após ANX-39 `in_review`; S1–S3 podem iniciar com mock port.
4. **Bloqueio G1:** PC-G0-04 — ANX-28 G7 + `getPrincipalById`; slices 4–6 integrados não merge até lá.
5. **Debate encerrado:** organizations `g0_ready` na [module-queue.md](../../module-queue.md).

## Decisões registradas

| ID | Decisão | Referência |
| --- | --- | --- |
| D-R10-S5-01 | Pacote G0 R10 aprovado; debate ANX-39 encerrado | R10-g0-handoff.md |
| D-R10-S5-02 | Executor G1 = code-architect; Crítico = critic-reviewer | PC-G0-10 |
| D-R10-S5-03 | Claim ANX-29 autorizado; G1 integrado bloqueado PC-G0-04 | D-ORG-033, handoff §B-01 |
| D-R10-S5-04 | S1–S3 com mock PrincipalLookup; S4+ identity real | R09 slices |
| D-R10-S5-05 | Matriz G3-01..10 + G5 R07 obrigatórios slice 6 | R09, R07 |
