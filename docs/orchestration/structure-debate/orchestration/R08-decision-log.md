---
type: debate
---

# R08 — Decision log: `modules/orchestration`

**Componente:** modules/orchestration  
**Rodada:** R8 — Síntese do debate, deferências v1, crosswalk R01–R07  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-46 · ANX-42 · ANX-44  
**Sessão Slack:** [Session H — R08 decision-log](./SLACK-TRANSCRIPTS.md#session-h--r08-decision-log)

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Arquiteto | architect |
| Executor | executor |
| Crítico | critic-reviewer |
| Code Review | code-reviewer |
| QA | QA |
| Security | security-reviewer (Kai) |
| Red Team | Red Team (Ryn) |

## Objetivo da rodada

Consolidar posições aceitas em **R01–R07** num **decision log** rastreável (`D-ORC-*`), resolver pendências **P-R7-01..05** de [R07-risks.md](./R07-risks.md), registrar deferências v1 e definir **pré-condições G0** para R09/R10.

## Debate R8 (síntese atribuída)

**Orquestrador:** R01–R07 fecharam hierarquia Paperclip, domain sketch, contratos Zod, storage PG, dependências upstream/downstream e registro **R-ORC-01..20** com **ORCH-R07-01..08**. R08 não reabre decisões salvo lacunas explícitas (P-R7-*).

**Crítico:** P-R7-03 (`in_review` vs lease) era ambiguidade residual desde R03 — exijo política escrita: lease permanece renovável; PASS G7 continua obrigatório para mirror `done`.

**Security:** P-R7-02 (HMAC prod) e P-R7-01 (SLO T01) são complementares fail-closed — timeout binário não substitui observabilidade; circuit breaker documentado antes de G1.

**Arquiteto:** `AgentRegistryPort` forte (P-R7-05) permanece dependência **agents P04** — R08 documenta critérios de aceite, não implementação. Código `modules/orchestration` continua **ausente** até greenlight + gates P02/P03.

**Síntese Orquestrador:** Decision log consolidado; P-R7-01..03 e P-R7-05 resolvidos documentalmente; P-R7-04 → R09. R08 aprovado para **R09** dev-plan.

---

## Tabela consolidada de decisões

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| **D-ORC-001** | `modules/orchestration` é dono de Goal, Task, Run, leases, heartbeat e scheduler — não grants, agent identity nem Neo4j | R1 | ✅ Aceito |
| **D-ORC-002** | Modos `HIERARCHY_TREE` e `HIERARCHY_CIRCULAR` (ADR0005 + spec 006) | R1 | ✅ Aceito |
| **D-ORC-003** | Org nova default **CIRCULAR**; import Paperclip força **TREE** (OH-T06) | R1, R2 | ✅ Aceito |
| **D-ORC-004** | Centro fixo Owner + Orchestrator/CEO Agent — G0–G7 pipeline AGENTS.md | R1 | ✅ Aceito |
| **D-ORC-005** | Checkout = `TaskLease` transacional PG; idempotente `(agentId, taskId)` | R2 | ✅ Aceito — ORCH-R02-01 |
| **D-ORC-006** | Heartbeat = fila PG durável + Run FSM; coalescing; recovery órfãos | R2 | ✅ Aceito — ORCH-R02-02 |
| **D-ORC-007** | `goalAncestry[]` denormalizado em Task/Run; Goal DAG em orchestration | R2 | ✅ Aceito — ORCH-R02-03 |
| **D-ORC-008** | Board override Owner; `GateBinding` estruturado; G7 único caminho `done` | R2 | ✅ Aceito — ORCH-R02-04 |
| **D-ORC-009** | Taskboard (Dashi) é fonte de claim ANX-*; orchestration espelha | R2 | ✅ Aceito — ORCH-R02-05 |
| **D-ORC-010** | Modo TREE: checkout/ancestry iguais; revisão audit + GateBinding only | R2 | ✅ Aceito — ORCH-R02-06 |
| **D-ORC-011** | Modo CIRCULAR: falha G4/G5 → `ESCALATES_TO` via graph | R2 | ✅ Aceito — ORCH-R02-07 |
| **D-ORC-012** | `GateBinding` schema v1 normativo antes de código | R2, R3 | ✅ Aceito — ORCH-R02-08 / ORCH-R03-03 |
| **D-ORC-013** | TTL lease default **4h**; renew heartbeat até cap **8h** | R3 | ✅ Aceito — ORCH-R03-01 |
| **D-ORC-014** | Payload `orchestration.task.checked_out.v1` v1 — **sem** `leaseToken` | R3 | ✅ Aceito — ORCH-R03-02 |
| **D-ORC-015** | `PlanRevision` agregado separado de `Goal` | R3 | ✅ Aceito — ORCH-R03-04 |
| **D-ORC-016** | Mirror taskboard: webhook primário + polling 60s fallback | R3, R4 | ✅ Aceito — ORCH-R03-05 |
| **D-ORC-017** | `RecordGateDisposition` invalida PASS anterior por digest | R3 | ✅ Aceito — ORCH-R03-06 |
| **D-ORC-018** | CIRCULAR: `gate.disposition.recorded.v1` projeta ReviewEdge no graph | R3, R4 | ✅ Aceito — ORCH-R03-07 |
| **D-ORC-019** | Comentário board ≠ GateBinding; espelho unidirecional board→orch | R3 | ✅ Aceito — ORCH-R03-08 |
| **D-ORC-020** | `gateBindingV1Schema` Zod normativo; JSON Schema R03 derivado | R4 | ✅ Aceito — ORCH-R04-01 |
| **D-ORC-021** | Catálogo **6 eventos** v1 com mapa `eventType → schema` | R4 | ✅ Aceito — ORCH-R04-02 |
| **D-ORC-022** | HTTP `/v1/orchestration/*` — 10 rotas sketch | R4 | ✅ Aceito — ORCH-R04-03 |
| **D-ORC-023** | Webhook mirror dedupe; efeitos via comandos internos + outbox | R4 | ✅ Aceito — ORCH-R04-04 |
| **D-ORC-024** | HMAC webhook opcional v1; polling 60s contract alinhado | R4 | ✅ Aceito — ORCH-R04-05 |
| **D-ORC-025** | `NOT_APPLICABLE` exige `notApplicableReason`; demais exigem digest | R4 | ✅ Aceito — ORCH-R04-06 |
| **D-ORC-026** | `leaseToken` só em `checkoutTaskResult` HTTP — nunca evento | R4, R5 | ✅ Aceito — ORCH-R04-07 |
| **D-ORC-027** | CIRCULAR: evento gate inclui binding completo para graph | R4 | ✅ Aceito — ORCH-R04-08 |
| **D-ORC-028** | `TaskLease` tabela filha 1:1 — não colunas em `tasks` | R5 | ✅ Aceito — ORCH-R05-01 |
| **D-ORC-029** | Heartbeat fila PG com coalesce index — não Redis lock | R5 | ✅ Aceito — ORCH-R05-02 |
| **D-ORC-030** | `gate_bindings` append-only; invalidação via `invalidated_at` | R5 | ✅ Aceito — ORCH-R05-03 |
| **D-ORC-031** | `orchestration_command_journal` para idempotência HTTP | R5 | ✅ Aceito — ORCH-R05-04 |
| **D-ORC-032** | Migrations `0000` core + `0001` índices parciais | R5 | ✅ Aceito — ORCH-R05-05 |
| **D-ORC-033** | `taskboard_mirror` dedupe `(issue, version, status)` | R5 | ✅ Aceito — ORCH-R05-07 |
| **D-ORC-034** | `PrincipalLookup` valida `reviewerId` em G7 | R6 | ✅ Aceito — ORCH-R06-01 |
| **D-ORC-035** | `OrganizationScopePort` fail-closed `ORC_SCOPE_DENIED` | R6 | ✅ Aceito — ORCH-R06-02 |
| **D-ORC-036** | `TraversalEvaluator` T01 obrigatório antes checkout/renew — timeout 2s → deny | R6, R7 | ✅ Aceito — ORCH-R06-03, ORCH-R07-02 |
| **D-ORC-037** | `GraphQueryPort` somente leitura — `ExplainEscalationPath` CIRCULAR | R6 | ✅ Aceito — ORCH-R06-04 |
| **D-ORC-038** | Journal/outbox via `@anxionos/eventing` mesma transação PG | R6 | ✅ Aceito — ORCH-R06-05 |
| **D-ORC-039** | `TaskboardMirrorPort` + tabela mirror — Dashi não autoridade lease | R6 | ✅ Aceito — ORCH-R06-06 |
| **D-ORC-040** | Projector Neo4j no **graph** — consumer `graph:orchestration:gate:v1` | R6 | ✅ Aceito — ORCH-R06-07 |
| **D-ORC-041** | orchestration **publica** 6 eventos v1; **não** subscreve outros v1 | R6 | ✅ Aceito — ORCH-R06-08 |
| **D-ORC-042** | `AgentRegistryPort` v1 stub permissivo documentado | R6, R7 | ✅ Aceito — ORCH-R06-09, ORCH-R07-07 |
| **D-ORC-043** | Workers lease sweeper + heartbeat dequeue em `apps/workers` | R6 | ✅ Aceito — ORCH-R06-10 |
| **D-ORC-044** | Checkout bloqueado se board ≠ `in_progress` para `issueIdentifier` | R7 | ✅ Aceito — ORCH-R07-01 |
| **D-ORC-045** | Mirror `done`/`canceled` exige G7 PASS vigente — senão `ORC_MIRROR_REJECTED` | R7 | ✅ Aceito — ORCH-R07-03 |
| **D-ORC-046** | G7 PASS: `reviewerId` passa `isOwnerPrincipal` — comentário ignorado | R7 | ✅ Aceito — ORCH-R07-04 |
| **D-ORC-047** | Sweeper orphan batch máx **100** + jitter 0–30s | R7 | ✅ Aceito — ORCH-R07-05 |
| **D-ORC-048** | Heartbeat coalesce 30s + fila máx **10k**/org — backpressure acima | R7 | ✅ Aceito — ORCH-R07-06 |
| **D-ORC-049** | Checklist G5 R07 é gate obrigatório pré-G1 — não substitui Red Team real | R7 | ✅ Aceito — ORCH-R07-08 |
| **D-ORC-050** | SLO T01: métrica `t01_eval_duration_ms`; alerta p99 warning **2s** critical **5s** | R8 | ✅ Aceito — resolve P-R7-01 |
| **D-ORC-051** | Prod: HMAC webhook obrigatório via flag `ORC_WEBHOOK_HMAC_REQUIRED=true` | R8 | ✅ Aceito — resolve P-R7-02 |
| **D-ORC-052** | Board `in_review`: lease **renovável**; mirror `done` ainda exige G7 PASS | R8 | ✅ Aceito — resolve P-R7-03 |
| **D-ORC-053** | `AgentRegistryPort` forte: `agentId` ativo + org scope + T01 antes checkout | R8 | ✅ Aceito — resolve P-R7-05 |
| **D-ORC-054** | OpenAPI Scalar generation — defer **R09** após contracts CI estável | R8 | ⏸ Deferido — ORCH-R08-03 |
| **D-ORC-055** | `orchestration_plan_revisions` migration 0002 — defer **R09** | R5, R8 | ⏸ Deferido — ORCH-R05-08 |
| **D-ORC-056** | Testes G5 automatizados CI sandbox — defer **R09** | R8 | ⏸ Deferido — P-R7-04 |

**Total decisões registradas:** 56 (`D-ORC-001` … `D-ORC-056`)  
**Aceitas v1:** 53 · **Deferidas:** 3

---

## Crosswalk ORCH → decision log

| ORCH (rodada) | Consolidado em |
| --- | --- |
| ORCH-R02-01..08 | D-ORC-005..012 |
| ORCH-R03-01..08 | D-ORC-013..019 |
| ORCH-R04-01..08 | D-ORC-020..027 |
| ORCH-R05-01..08 | D-ORC-028..033, D-ORC-055 |
| ORCH-R06-01..10 | D-ORC-034..043 |
| ORCH-R07-01..08 | D-ORC-036, D-ORC-044..049 |
| ORCH-R08-01..05 | D-ORC-050..056, D-ORC-054 |

---

## Política `in_review` vs lease (P-R7-03 / D-ORC-052)

| Estado board | Lease PG | Mirror `done` | Run ACTIVE |
| --- | --- | --- | --- |
| `in_progress` | Checkout permitido (T01+G0) | ❌ `ORC_MIRROR_REJECTED` sem G7 | ✅ Renew heartbeat |
| `in_review` | Lease **mantido** — renew permitido | ❌ exige G7 PASS | ✅ até cap 8h |
| `done` | Release lease pós-mirror | ✅ só com G7 PASS vigente | → TERMINATED |
| `todo` / `blocked` | Checkout **negado** | N/A | N/A |

**ORCH-R08-01:** `in_review` **não** implica PASS G7 — apenas indica submissão às equipes; lease não é liberado automaticamente.

---

## SLO T01 e circuit breaker (P-R7-01 / D-ORC-050)

| Métrica | Warning | Critical | Ação |
| --- | --- | --- | --- |
| `t01_eval_duration_ms` p99 | **2s** | **5s** | Page operations |
| T01 error rate 5m | **5%** | **20%** | Circuit breaker **open** 30s → checkout deny (ORCH-R07-02) |
| T01 timeout single | — | **2s** | `503 ORC_GOVERNANCE_UNAVAILABLE` |

**ORCH-R08-02:** Métricas obrigatórias G1 — fail-closed binário permanece; SLO é observabilidade, não bypass.

---

## HMAC webhook produção (P-R7-02 / D-ORC-051)

| Ambiente | `X-Taskboard-Signature` | Comportamento |
| --- | --- | --- |
| dev local | Opcional | Log warn se secret ausente |
| staging | Recomendado | Rejeita se secret configurado e assinatura inválida |
| prod | **Obrigatório** | `ORC_WEBHOOK_HMAC_REQUIRED=true` — 401 sem assinatura |

**ORCH-R08-03:** Implementação worker `taskboard-sync` + rota webhook → **R09** (P-R6-03).

---

## AgentRegistryPort — critérios aceite (P-R7-05 / D-ORC-053)

| Critério | v1 stub | v2 agents P04 |
| --- | --- | --- |
| `agentId` existe | ⚠️ Permissivo | ✅ Obrigatório |
| Agente ativo na org | Ignorado | ✅ `OrganizationScopePort` |
| T01 ALLOW checkout | ✅ Obrigatório | ✅ Obrigatório |
| Skill/capability match task | Defer | ✅ Quando agents expõe catálogo |

**ORCH-R08-04:** Stub v1 documentado em R07 ORCH-R07-07; validação forte bloqueia G1 até agents P04 exportar port.

---

## Registro de riscos consolidado (R01–R07)

| ID | Risco | Sev | Status R08 |
| --- | --- | ---: | --- |
| R-ORC-01 | Divergência board/lease | 20 | ✅ Mitigado D-ORC-044, D-ORC-039 |
| R-ORC-02 | T01 indisponível | 16 | ✅ Mitigado D-ORC-036, D-ORC-050 |
| R-ORC-03 | T01 degradação lenta | 12 | ✅ Mitigado D-ORC-050 |
| R-ORC-04 | Mirror spoof `done` | 16 | ✅ Mitigado D-ORC-045 |
| R-ORC-05 | G7 PASS forjado | 15 | ✅ Mitigado D-ORC-046 |
| R-ORC-06 | Cross-tenant checkout | 15 | ✅ Mitigado D-ORC-035 |
| R-ORC-07 | Graph projection lag CIRCULAR | 10 | ⏸ Monitor R09; binding PG autoritativo |
| R-ORC-08 | Idempotency replay body mismatch | 10 | ✅ Mitigado D-ORC-031 |
| R-ORC-09 | Orphan storm sweeper | 12 | ✅ Mitigado D-ORC-047 |
| R-ORC-10 | Heartbeat flood | 12 | ✅ Mitigado D-ORC-048 |
| R-ORC-11 | Renew cross-agent lease | 12 | ✅ Mitigado `timingSafeEqual` R07 |
| R-ORC-12 | Command journal hash mismatch | 10 | ✅ Mitigado D-ORC-031 |
| R-ORC-13 | ReviewEdge async lag | 8 | ⏸ Escalation sync D-ORC-037 |
| R-ORC-14 | Polling loopback comprometido | 10 | ✅ Mitigado D-ORC-051 |
| R-ORC-15 | Webhook replay | 10 | ✅ Mitigado dedupe D-ORC-033 |
| R-ORC-16 | UoW rollback parcial | 10 | ⏸ Teste P-R5-05 R09 |
| R-ORC-17 | NOT_APPLICABLE sem reason | 8 | ✅ Mitigado D-ORC-025 |
| R-ORC-18 | Force-release sem audit | 8 | ✅ Bloqueado Owner-only R07 |
| R-ORC-19 | leaseToken em logs | 8 | ✅ Mitigado D-ORC-026 |
| R-ORC-20 | agentId fantasma | 8 | ⏸ Stub v1 D-ORC-042; forte D-ORC-053 |

---

## Deferências v1 consolidadas

| Pendência | Dono | Rodada alvo |
| --- | --- | --- |
| P-R5-01 Criar `backend/modules/orchestration/` | Implementação G1 | Pós-greenlight |
| P-R5-02 plan_revisions migration 0002 | R09 | D-ORC-055 |
| P-R5-05 Teste UoW checkout rollback | R09 | R-ORC-16 |
| P-R6-03 Worker taskboard-sync + HMAC wiring | R09 | ORCH-R08-03 |
| P-R6-04 Teste AR01 dependency boundary | R09 | — |
| P-R7-04 G5 automatizado CI sandbox | R09 | D-ORC-056 |
| OpenAPI Scalar `/v1/orchestration` | R09 | D-ORC-054 |
| Saga agents wakeup wiring | agents P04 | P-R6-05 parcial |

---

## Pré-condições G0 (R10)

| # | Pré-condição | Evidência |
| ---: | --- | --- |
| 1 | R09 dev-plan com ordem slices implementação | Artefato R09 |
| 2 | identity `getPrincipalById` + G7 (ANX-28) | Gate identity |
| 3 | organizations G1 scope port (ANX-39) | Gate organizations |
| 4 | graph consumer `graph:orchestration:gate:v1` (ANX-32) | Gate graph P03 |
| 5 | Checklist G5 R07 executado em sandbox local | ORCH-R07-08 |
| 6 | Contracts CI diff `@anxionos/contracts/orchestration` | Gate AR01 |

---

## Decisões R08

| ID | Decisão | Status |
| --- | --- | --- |
| **ORCH-R08-01** | Política `in_review`: lease renovável; PASS G7 obrigatório para `done` | ✅ Aceito |
| **ORCH-R08-02** | SLO T01 p99 + circuit breaker documentados — resolve P-R7-01 | ✅ Aceito |
| **ORCH-R08-03** | HMAC prod obrigatório via flag — wiring R09 — resolve P-R7-02 | ✅ Aceito |
| **ORCH-R08-04** | Critérios `AgentRegistryPort` forte — resolve P-R7-05 | ✅ Aceito |
| **ORCH-R08-05** | Decision log D-ORC-001..056 consolida R01–R07 | ✅ Aceito |

---

## Perguntas abertas para R09

1. Ordem slices: schema PG → checkout UoW → mirror worker → heartbeat sweeper → HTTP routes.
2. Fixtures G5 automatizáveis — quais entram CI sandbox vs manual Red Team.
3. OpenAPI Scalar: comando `npm run contracts:openapi` e escopo paths públicos.
4. Integração `ExplainEscalationPath` — latência p99 alvo CIRCULAR G4/G5.
5. Dependência exata ANX-28 G7 para `PrincipalLookup` adapter.

---

## Saída R8

✅ Decision log consolidado — debate pronto para **R09** (plano de implementação).

**P-R7-01..03, P-R7-05:** ✅ Resolvidos documentalmente.  
**P-R7-04:** ⏸ R09.  
**Dependências:** identity ANX-28 G7; graph ANX-32 consumer; zero código orchestration nesta rodada.

**Veredito R08:** síntese ORCH-R01..R07 **aprovada** documentalmente; handoff R09 dev-plan.
