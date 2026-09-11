---
type: debate
status: draft
---

# R08 — Decision log: `modules/connections`

**Rodada:** R8 — Síntese do debate e registro de decisões  
**Data:** 2026-09-08  
**Issue:** ANX-83 · contrato P05: ANX-62 (`in_review`) · gate implementação: ANX-36 (Wave 4 epic) · graph consumer: ANX-32

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R8)

**In:** síntese D-CX-* de R01–R07. **Out:** decision log rastreável. **Não** fechar spec como accepted.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Decisões D-CX-* | **connections** |
| adapter-gateway | **KEEP** |

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Security | security-reviewer |
| Red Team | security-reviewer (G5) |

## Objetivo da rodada

Consolidar posições de R01–R07 num **decision log** rastreável (`D-CX-*`), resolver pendências **P-R7-01..07**, formalizar decisão **RLS v1**, mapear **Top 5 riscos** com status de mitigação e definir **pré-condições G0** para R10.

## Debate R8 (síntese atribuída)

**Orquestrador:** R01–R07 fecharam fronteiras, domínio, contratos, storage, dependências e riscos sem código `modules/connections`. R08 consolida o que está **aceito v1** vs **deferido** — não reabrir CX-R02 SIMULATED/PAPER.

**Crítico:** P-R7-03 (RLS) exige decisão explícita — paridade organizations application-only; G5 cross-tenant obrigatório pré-G1.

**Security:** Aceitar v1 com ressalva G4/G5: EndpointPolicy + SecretPort gate são bloqueantes ANX-36 S1.

**Síntese Orquestrador:** Decision log consolidado; R08 aprovado para R09.

---

## Tabela consolidada de decisões

| ID | Decisão | Rodada / fonte | Status |
| --- | --- | --- | --- |
| **D-CX-001** | connections dono de ProviderSubscription, AIAccount, ConnectionBinding, quotas, usage | R01, R02, R03 | ✅ Aceito |
| **D-CX-002** | Escopo v1 **SIMULATED + PAPER** apenas — sem REAL_EXECUTION/live | R02 | ✅ Aceito |
| **D-CX-003** | Goal/Task/Run, WAITING_HUMAN_INPUT workflow → **orchestration** | R01, R02 | ✅ Aceito |
| **D-CX-004** | Grant/epoch/consent → **governance**; connections valida fail-closed | R02, R06 | ✅ Aceito |
| **D-CX-005** | UsageRecord autoritativo PG; billing consome evento | R02, R03, R05 | ✅ Aceito |
| **D-CX-006** | Projeção Neo4j via `graph:connections:v1` — sem dual-write síncrono | R05, R06 | ✅ Aceito |
| **D-CX-007** | `ConnectionKind` enum **não** inclui `REAL_EXECUTION` persistível | R02 CX-R02-INV-01 | ✅ Aceito |
| **D-CX-008** | Resolver rejeita kind legado `REAL_EXECUTION` → `CX_CONNECTION_KIND_NOT_SUPPORTED` | R02 CX-R02-INV-02 | ✅ Aceito |
| **D-CX-009** | `effectClass=LIVE_TRADING` proibido em adapter registry v1 | R02 CX-R02-INV-03 | ✅ Aceito |
| **D-CX-010** | Import 9Router live → `deferred` \| `rejected`, nunca ACTIVE silencioso | R02 CX-R02-INV-04 | ✅ Aceito |
| **D-CX-011** | OpenAPI/docs **não** listam `REAL_EXECUTION` | R02 CX-R02-INV-05 | ✅ Aceito |
| **D-CX-012** | DTOs públicos: `secretRef`/`secretId` apenas — nunca valor credencial | R02 CX-R02-SEC-01 | ✅ Aceito |
| **D-CX-013** | Eventos `connections.*.v1` sem API key, token, PEM | R02 CX-R02-SEC-02 | ✅ Aceito |
| **D-CX-014** | Neo4j sem secret em propriedade de nó | R02 CX-R02-SEC-03 | ✅ Aceito |
| **D-CX-015** | Secret injetado só no boundary infra após grant+epoch | R02 CX-R02-SEC-04 | ✅ Aceito |
| **D-CX-016** | OAuth redirect sem credential para host não aprovado (EndpointPolicy) | R02 CX-R02-SEC-05, R07 | ✅ Aceito |
| **D-CX-017** | Dois agregados raiz: `AIAccount` + `ConnectionBinding` | R03 CX-R03-01 | ✅ Aceito |
| **D-CX-018** | `ConnectionResolver` único entry point de resolução | R03 CX-R03-02 | ✅ Aceito |
| **D-CX-019** | `RuntimeAdapter` port de infra; domain puro | R03 CX-R03-03 | ✅ Aceito |
| **D-CX-020** | `AgentModelBindingRef` declarado em agents, validado em connections | R03 CX-R03-04 | ✅ Aceito |
| **D-CX-021** | Usage + outbox na mesma UoW PG | R03 CX-R03-05, R05 | ✅ Aceito |
| **D-CX-022** | Fairness PLATFORM: sequence + lease na **mesma transação** (DL-CX2) | R03 CX-R03-06, R05, R07 | ✅ Aceito |
| **D-CX-023** | PascalCase ANX-62 → `connections.*.v1` exclusivo em outbox | R04 CX-R04-01 | ✅ Aceito |
| **D-CX-024** | `InferenceRequirements` em `@anxionos/contracts/inference` | R04 CX-R04-02 | ✅ Aceito |
| **D-CX-025** | Stream + terminal único `completed`/`failed`; billing fecha em terminal+usage | R04 CX-R04-03 | ✅ Aceito |
| **D-CX-026** | HTTP `/v1/connections/*` delega mesmo handler que SDK | R04 CX-R04-04 | ✅ Aceito |
| **D-CX-027** | `GrantValidationPort` in-process v1 (sem HTTP interno) | R04 CX-R04-05, R06 | ✅ Aceito |
| **D-CX-028** | Testes contrato bloqueiam REAL_EXECUTION no schema | R04 CX-R04-06 | ✅ Aceito |
| **D-CX-029** | `secret_id` + `secret_generation` colunas normalizadas PG | R05 CX-R05-01 | ✅ Aceito |
| **D-CX-030** | Binding ACTIVE imutável — nova versão para mudança material | R05 CX-R05-02 | ✅ Aceito |
| **D-CX-031** | `connections_command_journal` obrigatório v1 | R05 CX-R05-04 | ✅ Aceito |
| **D-CX-032** | Stream events journal-only; terminal+usage em PG | R05 CX-R05-05 | ✅ Aceito |
| **D-CX-033** | SQLite **proibido** para quota/fairness — só catálogo descartável | R05 CX-R05-06 | ✅ Aceito |
| **D-CX-034** | Migrations P05 slices S1–S5 incrementais | R05 CX-R05-08 | ✅ Aceito |
| **D-CX-035** | connections **não** importa repos privados agents/orchestration/billing/graph | R06 CX-R06-01 | ✅ Aceito |
| **D-CX-036** | `OrganizationScopePort` tenancy obrigatório em mutação/invoke | R06 CX-R06-03 | ✅ Aceito |
| **D-CX-037** | `PrincipalLookup` via adapter organizations pattern | R06 CX-R06-04 | ✅ Aceito |
| **D-CX-038** | `SecretPort` stub P02 aceitável SIMULATED; gate prod ANX-36 | R06 CX-R06-05, R07 | ✅ Aceito |
| **D-CX-039** | Journal/outbox `@anxionos/eventing` mesma TX | R06 CX-R06-06 | ✅ Aceito |
| **D-CX-040** | Consumer `graph:connections:v1` no módulo **graph** (ANX-32) | R06 CX-R06-07 | ✅ Aceito |
| **D-CX-041** | billing async via `connections.usage.recorded.v1` | R06 CX-R06-08 | ✅ Aceito |
| **D-CX-042** | orchestration/agents via `@anxionos/connections` index público | R06 CX-R06-09 | ✅ Aceito |
| **D-CX-043** | Bootstrap: eventing → identity → org → governance → secrets → connections | R06 CX-R06-10 | ✅ Aceito |
| **D-CX-044** | `deltaRef` stream — dono audit; connections emite referência | R06 CX-R06-11 | ✅ Aceito |
| **D-CX-045** | `EndpointPolicy` obrigatório adapters HTTP/OAuth/MODEL | R07 CX-R07-01 | ✅ Aceito |
| **D-CX-046** | Timeout invoke → `unknown` + `connections.call.unknown.v1` | R07 CX-R07-03 | ✅ Aceito |
| **D-CX-047** | Reconcile worker SLA **24h**; resoluções `succeeded` \| `failed` \| `void_usage` | R07 CX-R07-04 | ✅ Aceito |
| **D-CX-048** | **RLS PostgreSQL v1 não obrigatório** — application guards + G5 cross-tenant (paridade organizations) | R06 CX-R06-12, R07 CX-R07-09 | ✅ Aceito |
| **D-CX-049** | WAITING_HUMAN_INPUT: connections retorna `waitingHuman`; orchestration dono Run; **não** move board | R07 CX-R07-05 | ✅ Aceito |
| **D-CX-050** | `consumerKind` derivado grant/sessão — header cliente ignorado | R07 CX-R07-06 | ✅ Aceito |
| **D-CX-051** | Governance/organizations down → `503` fail-closed — sem cache grant | R07 CX-R07-07 | ✅ Aceito |
| **D-CX-052** | SecretPort stub só `NODE_ENV !== production` + `ALLOW_SECRETS_STUB=true` | R07 CX-R07-08 | ✅ Aceito |
| **D-CX-053** | Checklist G5 R07 gate obrigatório pré-G1 código | R07 CX-R07-10 | ✅ Aceito |
| **D-CX-054** | command_journal retenção 90d hot PG + archival R09 | R06 CX-R06-13 | ✅ Aceito |
| **D-CX-055** | Circuit breaker upstream: 5 falhas/30s, half-open 1 probe (R09 S5) | R07 P-R7-02 | ✅ Aceito |
| **D-CX-056** | EndpointPolicy admin allowlist: `connections.platform_admin` only | R07 P-R7-04 | ✅ Aceito |
| **D-CX-057** | Resume WAITING_HUMAN: `${idempotencyKey}:resume:${operationId}` | R07 P-R7-05 | ✅ Aceito |
| **D-CX-058** | SINGLE_ACCOUNT_WAIT deadline → `CX_QUOTA_EXCEEDED` + `retryAfter` | R07 P-R7-07 | ✅ Aceito |
| **D-CX-059** | `@anxionos/contracts/connections/*` schemas públicos | R04 | ⏳ **G1** — ANX-36 S1 |
| **D-CX-060** | Workers: reconcile, lease reaper, credential refresh | R05 S5, R07 | ⏳ **G1** — ANX-36 S5 |
| **D-CX-061** | REAL_EXECUTION / broker live | — | ⏸ Deferido — ADR + epic separado |
| **D-CX-062** | RLS PostgreSQL defense-in-depth | — | ⏸ Deferido P09 |
| **D-CX-063** | GrantValidation HTTP multi-processo | — | ⏸ Deferido multi-VM |
| **D-CX-064** | Tabela dedicada stream chunks v1 | R05 ALT-CX-R05-06 | ⏸ Deferido volume |

**Total:** 64 decisões · **Aceitas v1:** 58 · **G1 pendentes:** 2 · **Deferidas:** 4

---

## Crosswalk R01–R07 → decision log

| Artefato | Consolidado em |
| --- | --- |
| R01 contexto | D-CX-001..006 |
| R02 fronteiras | D-CX-002, D-CX-007..016 |
| R03 domain sketch | D-CX-017..022 |
| R04 contratos | D-CX-023..028, D-CX-059 |
| R05 storage | D-CX-029..034, D-CX-060 |
| R06 dependências | D-CX-035..044, D-CX-048, D-CX-054 |
| R07 riscos | D-CX-045..053, D-CX-055..058 |

---

## Resolução P-R7-01 — SLA reconcile UNKNOWN

**Posição:** Aceitar **24h** SLA padrão para casos `connections_reconciliation_cases` abertos; alerta operations em 20h; ajuste por `connectionKind` via config documentada em R09 S5.

**Registro:** P-R7-01 **resolvido** → D-CX-047.

---

## Resolução P-R7-02 — Circuit breaker upstream

**Posição:** Implementar em composition root R09 S5: **5 falhas consecutivas em 30s** por upstream (`governance`, `organizations`) → open circuit 60s; half-open com 1 probe; invoke/mutação retorna `503` sem cache grant.

**Registro:** P-R7-02 **resolvido** → D-CX-055.

---

## Resolução P-R7-03 — RLS defense-in-depth

**Posição:** v1 **application-only** — paridade organizations (P-R5-03):

| Camada | Controle v1 |
| --- | --- |
| API | `organizationId` da sessão Better Auth |
| Application | `OrganizationScopePort.assertActiveOrganization` antes de mutação/invoke |
| Repository | `WHERE organization_id = :sessionOrg` obrigatório — proibido `findAll` |
| G5 | G5-CX-04 cross-tenant obrigatório pré-G1 |
| RLS PG | **Deferido P09** — reavaliar após G5 evidence |

**Registro:** P-R7-03 **resolvido** → **D-CX-048** (formaliza CX-R07-09).

---

## Resolução P-R7-04 — EndpointPolicy admin allowlist

**Posição:** Edição de allowlist privada/metadata somente via grant `connections.platform_admin` (governance T01); audit trail em command journal.

**Registro:** P-R7-04 **resolvido** → D-CX-056.

---

## Resolução P-R7-05 — Idempotência resume WAITING_HUMAN_INPUT

**Posição:**

| Fase | Chave |
| --- | --- |
| Start OAuth/TASKBOARD | `(organizationId, issueIdentifier, idempotencyKey)` |
| Resume após humano | `${idempotencyKey}:resume:${operationId}` |
| Callback duplicado | Replay sem side effect — mesmo `operationId` |

**Registro:** P-R7-05 **resolvido** → D-CX-057.

---

## Resolução P-R7-06 — G5 automatizado CI sandbox

**Posição:** Matriz G5-CX-01..10 em R09; job CI `connections-g5-sandbox` após S2 (invoke path) — sandbox local autorizado, sem prod.

**Registro:** P-R7-06 **resolvido** → R09 matriz + CI gate S2+.

---

## Resolução P-R7-07 — SINGLE_ACCOUNT_WAIT sob deadline

**Posição:** Quando única conta elegível e quota ocupada até deadline → `CX_QUOTA_EXCEEDED` com `retryAfter` calculado; **não** fila infinita v1. Fila explícita deferida R09+ se spec 005 exigir.

**Registro:** P-R7-07 **resolvido** → D-CX-058.

---

## Top 5 riscos — status de mitigação (handoff G1)

| Rank | ID | Sev | Mitigação | Status | Slice / gate |
| ---: | --- | ---: | --- | --- | --- |
| 1 | **R-CX-01** | 20 | EndpointPolicy DNS/blocklist/redirect | 📋 Documentado | S2 + G4-CX-01, G5-CX-01 |
| 2 | **R-CX-02** | 16 | DL-CX2 TX única sequence+lease | 📋 Documentado | S3 + G5-CX-02 |
| 3 | **R-CX-03** | 15 | SecretPort stub gate prod | 📋 Documentado | S1 bootstrap + G4-CX-06, G5-CX-09 |
| 4 | **R-CX-04** | 15 | UNKNOWN + reconcile worker | 📋 Documentado | S2+S5 + G5-CX-03 |
| 5 | **R-CX-05** | 15 | OrganizationScopePort + repo filter | 📋 Documentado | S1 + G4-CX-04, G5-CX-04 |

**Legenda:** 📋 Documentado = controles especificados; implementação verificável em ANX-36 G1.

---

## Itens deferidos

| ID | Item | Destino |
| --- | --- | --- |
| DEF-CX-01 | REAL_EXECUTION / broker live | ADR + epic P06+ |
| DEF-CX-02 | RLS PostgreSQL connections | P09 |
| DEF-CX-03 | GrantValidation HTTP interno | Multi-processo deploy |
| DEF-CX-04 | Stream chunks tabela dedicada | Volume R09+ |
| DEF-CX-05 | Fila SINGLE_ACCOUNT_WAIT explícita | Spec 005 edge — pós-v1 |
| DEF-CX-06 | billing consumer implementação | billing P07 |

---

## Pré-condições G0 (entrada R10)

| # | Pré-condição | Evidência | Status |
| --- | --- | --- | --- |
| PC-G0-01 | Decision log R8 (este artefato) | `R08-decision-log.md` | ✅ |
| PC-G0-02 | Plano P05 R9 | `R09-dev-plan.md` | ⏳ R9 |
| PC-G0-03 | Pacote G0 R10 | `R10-g0-handoff.md` | ⏳ R10 |
| PC-G0-04 | Contrato ANX-62 documental | `p05-connections-binding-inference-contract.md` | ✅ (`in_review`) |
| PC-G0-05 | Debate R06–R08 sem pendências bloqueantes | P-R7-01..07 resolvidos | ✅ |
| PC-G0-06 | Wave 4 epic ANX-36 desbloqueado | ANX-36 `in_review` | ✅ |
| PC-G0-07 | Riscos Top 5 R07 mapeados | §Top 5 acima | ✅ |
| PC-G0-08 | Consumer graph especificado | `graph:connections:v1` — ANX-32 | ✅ |
| PC-G0-09 | RLS decisão formal | D-CX-048 application-only v1 | ✅ |
| PC-G0-10 | Crítico nominal implementação | R10 critic-reviewer | ✅ |

---

## Critérios de aceite R8

| # | Critério | Status |
| --- | --- | --- |
| AC-R8-01 | Tabela D-CX-001+ com fonte | ✅ |
| AC-R8-02 | P-R7-01..07 resolvidos | ✅ |
| AC-R8-03 | RLS decisão formal (D-CX-048) | ✅ |
| AC-R8-04 | Top 5 mitigação + PC-G0 | ✅ |
| AC-R8-05 | Lista deferidos | ✅ |

## Saída R8

✅ Decision log consolidado — debate pronto para **R09** (plano implementação P05).
