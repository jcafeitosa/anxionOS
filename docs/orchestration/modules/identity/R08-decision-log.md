---
type: debate
status: draft
---

# R08 — Decision log: `modules/identity`

**Rodada:** R8 — Síntese do debate e registro de decisões  
**Data:** 2026-09-08  
**Issue:** ANX-77 · implementação P0: ANX-28 (`done`, G7 2026-09-07) · structure-debate R01–R05: ANX-42

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Security | security-reviewer |

## Objetivo da rodada

Consolidar posições de structure-debate R01–R05, R06–R07 e evidência ANX-28 num **decision log** rastreável (`D-IDN-*`), registrar deferências P1/P2 e definir **pré-condições G0** para R10.

## Debate R8 (síntese atribuída)

**Orquestrador:** P0 G1 entregue em ANX-28 (`getPrincipalById`, fail-closed, PG + outbox). R08 consolida o que está **aceito** vs **deferido P1** — não reabrir fronteiras R02.

**Crítico:** P1 gaps (`authUserId` em evento, eventType legado) são **dívida documentada** — exigir issue ANX-* antes de merge P1.

**Security:** Aceitar P0 com ressalva G4: normalização de eventos é gate obrigatório do próximo slice identity.

**Síntese Orquestrador:** Decision log consolidado; R8 aprovado para R9.

---

## Tabela consolidada de decisões

| ID | Decisão | Rodada / fonte | Status |
| --- | --- | --- | --- |
| **D-IDN-001** | identity dono de `Principal` humano em PG `identity_principals` | R02, R05, ANX-28 | ✅ Aceito |
| **D-IDN-002** | Better Auth e sessão HTTP em `apps/api` — identity não importa BA | R02, R06 | ✅ Aceito |
| **D-IDN-003** | `principalId` canônico downstream; `authUserId` só no boundary | R02, R03 | ✅ Aceito |
| **D-IDN-004** | Agency/Membership/grants — **organizations** / **governance** | R02 | ✅ Aceito |
| **D-IDN-005** | Projeção Neo4j `:Principal` — módulo **graph** via eventos | R03, R05, R06 | ✅ Aceito |
| **D-IDN-006** | `RegisterPrincipal` idempotente por `authUserId` | R03, ANX-28 | ✅ Aceito |
| **D-IDN-007** | Journal/outbox via `@anxionos/eventing` mesma transação PG | R05, ANX-28 | ✅ Aceito |
| **D-IDN-008** | `getPrincipalById` + `getPrincipalByAuthUserId` fail-closed para `suspended` | R03, R04, ANX-28 | ✅ Aceito |
| **D-IDN-009** | Adapter `IdentityPrincipalLookup` em **organizations** | R04, R06, ANX-28 | ✅ Aceito |
| **D-IDN-010** | governance usa `PrincipalLookup` via export organizations | R06 | ✅ Aceito |
| **D-IDN-011** | Eventos alvo `ownerDomain: identity`, sufixo `.v1` | R04 | ⏳ **P1** — código legado |
| **D-IDN-012** | Payload evento **sem** `authUserId` | R04, R05 | ⏳ **P1** — gap código |
| **D-IDN-013** | `@anxionos/contracts/identity/*` schemas públicos | R04 | ⏳ **P1** |
| **D-IDN-014** | `suspendPrincipal` + `identity.principal.suspended.v1` | R03, R04 | ⏳ **P1** |
| **D-IDN-015** | Consumer `apps/api:identity-sessions:v1` revoga sessão BA | R03 Q3 | ⏳ **P1** |
| **D-IDN-016** | `syncPrincipalEmail` hook BA → identity | R03 Q2 | ⏳ **P1** |
| **D-IDN-017** | `ServicePrincipal` agregado + storage | R03 | ⏸ Deferido P02+ |
| **D-IDN-018** | RLS PostgreSQL identity | R07 | ⏸ Deferido P09 |
| **D-IDN-019** | Rotas HTTP `/v1/identity/*` | R02 | ⏸ Deferido — sem API pública v1 |
| **D-IDN-020** | Consumer `graph:identity:v1` | R05, R06 | ⏸ Impl graph P03 |
| **D-IDN-021** | Bootstrap ordem: eventing → identity → organizations → governance | R05, R06 | ✅ Aceito |
| **D-IDN-022** | SQLite proibido para estado institucional identity | R05 | ✅ Aceito |
| **D-IDN-023** | Principal global plataforma — tenancy via Membership | R03 Q4 | ✅ Aceito |
| **D-IDN-024** | Testes P0: `register-principal`, `get-principal-by-id` | ANX-28 | ✅ Aceito |

**Total:** 24 decisões · **Aceitas v1/P0:** 14 · **P1 pendentes:** 6 · **Deferidas:** 4

---

## Crosswalk structure-debate → decision log

| Artefato structure-debate | Consolidado em |
| --- | --- |
| R01 contexto | D-IDN-001..005 |
| R02 fronteiras BA | D-IDN-002, D-IDN-003, D-IDN-019 |
| R03 domain sketch | D-IDN-006, D-IDN-008, D-IDN-023 |
| R04 contratos | D-IDN-011..013, D-IDN-009 |
| R05 storage | D-IDN-007, D-IDN-012, D-IDN-022 |
| R06 dependências | D-IDN-009, D-IDN-010, D-IDN-021 |
| R07 riscos | D-IDN-011, D-IDN-012, D-IDN-018 |

---

## Resolução P-R7-01 — Issue P1 eventos

**Posição:** Abrir issue `ANX-*` dedicada (ou sub-task ANX-28 P1) para: normalizar eventType, remover `authUserId` do payload, criar `packages/contracts/identity/*`.

**Registro:** P-R7-01 **resolvido em R8** — implementação aguarda claim explícita; **não** mergear P1 sem issue.

---

## Resolução P-R7-02 — Consumer sessão suspend

**Posição:** Dono = **`apps/api`** worker consumer `apps/api:identity-sessions:v1` subscrevendo `identity.principal.suspended.v1`.

**Registro:** P-R7-02 **resolvido** → D-IDN-015; wiring em R09 slice P1.

---

## Resolução P-R7-03 — Adapter fora organizations

**Posição:** **Deferido** — organizations adapter aceito v1 (D-IDN-009). Reavaliar se governance precisar lookup sem organizations no classpath.

**Registro:** P-R7-03 → DEF-03.

---

## Itens deferidos

| ID | Item | Destino |
| --- | --- | --- |
| DEF-01 | `ServicePrincipal` + API keys | execution-go P02+ |
| DEF-02 | RLS PG identity | P09 |
| DEF-03 | Adapter identity em `packages/` ou identity infra | Pós-v1 |
| DEF-04 | Rotas REST identity admin | operations / P07 |
| DEF-05 | Projector `graph:identity:v1` | graph ANX-32 |
| DEF-06 | `reactivatePrincipal` | Pós-suspend P1 |

---

## Pré-condições G0 (entrada R10)

| # | Pré-condição | Evidência | Status |
| --- | --- | --- | --- |
| PC-G0-01 | Decision log R8 (este artefato) | `R08-decision-log.md` | ✅ |
| PC-G0-02 | Plano P1 R9 | `R09-dev-plan.md` | ⏳ R9 |
| PC-G0-03 | Pacote G0 R10 | `R10-g0-handoff.md` | ⏳ R10 |
| PC-G0-04 | ANX-28 P0 G7 aceite + `getPrincipalById` | ANX-28 `done` | ✅ |
| PC-G0-05 | Debate R06–R08 sem pendências bloqueantes | P-R7-01/02 resolvidos | ✅ |
| PC-G0-06 | Downstream organizations wiring verificado | `createIdentityPrincipalLookup` | ✅ |
| PC-G0-07 | Riscos Top 5 R07 | `R07-risks.md` | ✅ |
| PC-G0-08 | Consumer graph especificado | `R06-dependencies.md` | ✅ |
| PC-G0-09 | Lacunas P1 registradas com issue path | P-R7-01 → **ANX-78** | ✅ |
| PC-G0-10 | Crítico nominal P1 identity | R10 critic-reviewer | ✅ |

---

## Critérios de aceite R8

| # | Critério | Status |
| --- | --- | --- |
| AC-R8-01 | Tabela D-IDN-001+ com fonte | ✅ |
| AC-R8-02 | P-R7-01/02/03 resolvidos ou deferidos | ✅ |
| AC-R8-03 | Lista deferidos P1/P2 | ✅ |
| AC-R8-04 | Pré-condições G0 para R10 | ✅ |

## Saída R8

✅ Decision log consolidado — debate pronto para **R9** (plano P1).
