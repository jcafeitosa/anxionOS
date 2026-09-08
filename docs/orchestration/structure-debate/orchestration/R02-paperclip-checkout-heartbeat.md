---
type: debate
---

# R02 — Padrões Paperclip: checkout, heartbeat, goal ancestry, Board override

**Componente:** modules/orchestration  
**Rodada:** R2 — Fronteiras e mapeamento Paperclip → anxionOS  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-46 · ANX-42 (debate estrutura) · ANX-44 (roster 8 personas)  
**Sessão Slack:** [Session B — #module-orchestration](./SLACK-TRANSCRIPTS.md#session-b--r02-paperclip-checkout-heartbeat)  
**Pré-requisito:** [R01-hierarchy-modes.md](./R01-hierarchy-modes.md) · `brain/project-docs/decisions/0005-agent-hierarchy-modes-triangular-circular.md` · `brain/project-docs/specs/006-agent-hierarchy-orchestration/spec.md`

## Objetivo da rodada

Mapear quatro capacidades centrais do `brain/external-sources/paperclip-readme.md` para entidades **Goal / Task / Run** do módulo orchestration, fixar fronteiras ADR0002 e registrar decisões `ORCH-R02-*` alinhadas aos invariantes `OH01–OH12` da spec 006.

| Padrão Paperclip | Entidade anxionOS | Decisão |
| --- | --- | --- |
| Atomic checkout / execution lock | `Task` + `Run` + `TaskLease` | [ORCH-R02-01](#orch-r02-01--checkout-atômico) |
| Heartbeats (wakeup queue) | `Run` + scheduler | [ORCH-R02-02](#orch-r02-02--heartbeat-e-run-lifecycle) |
| Goal ancestry | `Goal` → `Task` → issue ANX-* | [ORCH-R02-03](#orch-r02-03--goal-ancestry) |
| Board override / approvals | Owner + governance + `GateBinding` | [ORCH-R02-04](#orch-r02-04--board-override) |

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| `brain/external-sources/paperclip-readme.md` | Atomic execution, heartbeats, goal alignment, governance |
| `brain/project-docs/decisions/0005-agent-hierarchy-modes-triangular-circular.md` | Modos TREE/CIRCULAR, centro Owner+Orchestrator |
| `brain/project-docs/specs/006-agent-hierarchy-orchestration/spec.md` | `GateBinding`, `HierarchyMode`, invariantes OH* |
| [R01-hierarchy-modes.md](./R01-hierarchy-modes.md) | Perguntas abertas R02 |
| [org-chart.md](../../../team/org-chart.md) | Papéis Level C–W, G0–G7 |
| `brain/project-docs/specs/002-agents-knowledge/spec.md` | Heartbeat, Run, CEO Agent |

## Debate R2 (síntese atribuída)

**Arquiteto:** orchestration **possui** lease transacional, fila de wakeup, goal ancestry materializado e handoff de override — **não possui** grants, identidade de agente, projeção Neo4j de organograma nem aceite G7 (Owner em governance/identity).

**Crítico:** checkout atômico deve ser **idempotente por `(agentId, taskId)`** e compatível com claim ANX-* no taskboard — duas fontes de verdade exigem reconciliação explícita, não merge silencioso.

**Security:** lease expirado libera Task sem vazar contexto de Run anterior; heartbeat não injeta secrets — secrets port só na infra autorizada (spec 002, ADR0002).

**Síntese Orquestrador:** quatro decisões ORCH-R02-* fechadas; OH09/OH10 preservados para modo TREE vs CIRCULAR; implementação bloqueada até OH-T06 em fixtures.

---

## O módulo POSSUI (R02 — escopo ampliado)

| Agregado / artefato | Responsabilidade | Storage |
| --- | --- | --- |
| `Goal` | Missão decomponível; ancestry para Tasks e issues | PG `orchestration_goals` |
| `Task` | Unidade de trabalho produto; link `issueIdentifier` (ANX-*) | PG `orchestration_tasks` |
| `Run` | Execução de agente sobre Task; sessão retomável | PG `orchestration_runs` |
| `TaskLease` | Checkout atômico `(taskId, agentId, leaseToken, expiresAt)` | PG transacional |
| `RunHeartbeat` | Wakeup agendado, coalescing, budget pre-check | PG fila + scheduler |
| `GoalAncestry` | Cadeia `goalId[]` denormalizada em Task/Run | PG coluna JSON ou tabela filha |
| `EscalationState` | Próximo handler em TREE/CIRCULAR | PG + consulta graph T13 |

## O módulo NÃO POSSUI

| Item | Dono correto | Notas |
| --- | --- | --- |
| Grants / `authorityEpoch` | governance | T01 antes de efeito externo — OH04 |
| `ReportingEdge` / `ReviewEdge` | graph (projeção) | orchestration emite eventos; não escreve Neo4j |
| Identidade Orchestrator / OrgRole | agents + organizations | orchestration referencia `agentId` |
| Aceite G7 / `done` institucional | Owner via governance + taskboard | orchestration prepara evidência G6 |
| Issue ANX-* autoritativa | Dashi Taskboard (loopback) | orchestration **espelha** `issueIdentifier`, não substitui board |
| Orçamento hard-stop global | billing (futuro) + governance envelope | Run pode pausar; política de cap em P07 |
| Comentários de parecer G2–G5 | audit + `GateBinding` | orchestration registra binding; texto livre no board |

---

## ORCH-R02-01 — Checkout atômico

**Origem Paperclip:** *"Task checkout and budget enforcement are atomic, so no double-work and no runaway spend."*

### Mapeamento Goal → Task → Run

```text
Goal (missão)
  └── Task (unidade orchestration, 1:1 ou 1:N com subtasks)
        └── Run (tentativa de execução por agentId)
              └── TaskLease (lock exclusivo por taskId)
```

| Campo | Semântica |
| --- | --- |
| `task.checkoutStatus` | `UNCLAIMED` \| `LEASED` \| `COMPLETED` \| `BLOCKED` |
| `task.leaseHolderAgentId` | Agente com lock vigente |
| `task.leaseToken` | UUID opaco — Run deve apresentar para continuar |
| `task.issueIdentifier` | `ANX-*` espelhado; claim no board é pré-condição G0 |
| `run.parentRunId` | Delegação ChildTask (Paperclip parent issue) |

### Algoritmo (outline)

1. Pré-condição: issue ANX-* em `in_progress` com thread binding válido (OH06)
2. `BEGIN` transação PG
3. `SELECT task FOR UPDATE` onde `checkoutStatus = UNCLAIMED` ou lease expirado
4. Se ocupado por outro agente com lease válido → `CONFLICT` (409)
5. Upsert `TaskLease`, set `checkoutStatus = LEASED`, cria `Run` com `leaseToken`
6. `COMMIT`; emite `orchestration.task.checked_out.v1`
7. Dedupe: segunda chamada mesmo `(agentId, taskId)` com lease válido → retorna Run existente (idempotente)

### Reconciliação taskboard ↔ orchestration

| Evento | orchestration | Taskboard |
| --- | --- | --- |
| Claim ANX-* | Espelha `issueIdentifier`; opcional auto-checkout se G0 PASS | Fonte de autorização de trabalho |
| Lease expirado | `UNCLAIMED`; Run → `ORPHANED` | Comentário automático sugerido; status inalterado |
| `in_review` no board | Run → `AWAITING_REVIEW`; lease liberado | Fonte de transição de review |
| Owner override | `ForceReleaseLease` + audit | pause/terminate Paperclip-equivalent |

**Invariantes:** OH06 (issue obrigatória), OH07 (`in_review` ≠ PASS), alinhado a **OH09** (TREE: parecer sem ReviewEdge ainda exige GateBinding).

**Decisão:** `ORCH-R02-01` — checkout é **lease transacional em PG**, não lock em Neo4j nem em memória do worker.

---

## ORCH-R02-02 — Heartbeat e Run lifecycle

**Origem Paperclip:** *"DB-backed wakeup queue with coalescing, budget checks, workspace resolution, secret injection, skill loading, and adapter invocation."*

### Estados de Run

```text
SCHEDULED → WAKING → ACTIVE → PAUSED → COMPLETED
                ↘ ORPHANED (lease lost)
                ↘ BUDGET_STOPPED
                ↘ TERMINATED (Board override)
```

| Componente | Dono | Comportamento |
| --- | --- | --- |
| `RunHeartbeat` | orchestration | Fila PG; `nextWakeAt`, `coalesceKey` por `(agentId, taskId)` |
| Budget pre-check | orchestration + governance | Hard-stop antes de wakeup; não inicia Run se envelope excedido |
| Workspace resolution | agents + apps/workers | orchestration passa `taskId`, `goalAncestry`, `issueIdentifier` — não monta git worktree |
| Adapter invocation | apps/workers | Heartbeat dispara worker; Run produz structured logs |
| Recovery | orchestration | Lease órfão → `ORPHANED`; requeue com backoff |

### Coalescing

Múltiplos heartbeats para o mesmo `(agentId, taskId)` dentro da janela `coalesceWindowMs` (default 30s) colapsam em **um** wakeup — espelha Paperclip DB queue.

### Modo hierárquico

| Modo | Escalonamento em falha de heartbeat |
| --- | --- |
| `HIERARCHY_TREE` | Manager direto via `REPORTS_TO` até Orchestrator |
| `HIERARCHY_CIRCULAR` | `ExplainEscalationPath` — C→B→A + `ESCALATES_TO` G4/G5 |

**Decisão:** `ORCH-R02-02` — heartbeat é **fila durável + Run state machine**; liveness do agente (spec 002) alimenta scheduler, mas lease de Task é autoridade de exclusividade.

---

## ORCH-R02-03 — Goal ancestry

**Origem Paperclip:** *"Tasks carry full goal ancestry so agents consistently see the 'why,' not just a title."*

### Modelo

```text
OrganizationRoot
  └── Goal (L0 — missão org)
        └── Goal (L1 — iniciativa / projeto)
              └── Task → issue ANX-*
                    goalAncestry: [goalL0Id, goalL1Id, ...]
```

| Campo | Onde | Uso |
| --- | --- | --- |
| `goalId` | Task, Run, espelho opcional em comentário ANX-* | Traversal de prioridade |
| `goalAncestry` | Task, Run (denormalizado) | Contexto em heartbeat sem N+1 |
| `parentTaskId` | Task | Subtask / delegação (Paperclip parent issue) |
| `parentGoalId` | Goal | Decomposição DAG de missão |

### Regras

1. Toda Task de implementação **deve** ter `goalId` leaf e `goalAncestry` completo (OH01 OrganizationRoot como ancora implícita)
2. Criação de issue ANX-* pelo Orchestrator inclui `goalId` em metadado de desenvolvimento (taskboard `developmentContext` quando disponível)
3. Import template Paperclip (OH-T06): Goals derivados de company/project/goal links → modo `HIERARCHY_TREE` default
4. Mudança de Goal em Task ativa com Run → exige `PlanRevision` + revalidação G0

**Decisão:** `ORCH-R02-03` — ancestry é **denormalizado em Task/Run**; Goal permanece agregado autoritativo em orchestration.

---

## ORCH-R02-04 — Board override

**Origem Paperclip:** *"Approve hires, override strategy, pause or terminate any agent — at any time."*

### Mapeamento Owner (Board) → anxionOS

| Ação Paperclip | anxionOS | Gate / artefato |
| --- | --- | --- |
| Pause agent | `TerminateRun` + `ForceReleaseLease` | Owner grant; audit obrigatório |
| Override strategy | `PlanRevision` rejeitado + novo Goal priority | G7-class Owner |
| Approve mode change | `ApproveHierarchyModeChange` | governance + OH08 freeze |
| Force complete task | **Proibido** silencioso | G7 explícito; `done` só Owner |
| Budget hard-stop | Pausa Runs + cancela heartbeats enfileirados | governance envelope |

### `GateBinding` vs taskboard

| Artefato | Função |
| --- | --- |
| Comentário ANX-* | Texto humano, thread binding, status |
| `GateBinding` | Registro estruturado `(gateId, disposition, reviewerId, artifactDigest)` |
| `ReviewEdge` | Somente `HIERARCHY_CIRCULAR` (OH03, OH10) |

Em **TREE**, Board override e pareceres G2–G5 usam `GateBinding` + audit sem `ReviewEdge` (OH09). Em **CIRCULAR**, override de linha de revisão materializa `ESCALATES_TO` (OH10).

**Decisão:** `ORCH-R02-04` — Board = **Owner** com comandos em governance; orchestration executa efeitos mecânicos (lease, Run, freeze) após autorização, nunca auto-aceita G7.

---

## Tabela de decisões ORCH-R02 ↔ OH (spec 006 / ADR 0005)

| ID | Decisão | Invariantes / gates |
| --- | --- | --- |
| **ORCH-R02-01** | Checkout = `TaskLease` transacional PG; idempotente por `(agentId, taskId)` | OH06, OH07 |
| **ORCH-R02-02** | Heartbeat = fila durável + Run FSM; coalescing; recovery de órfãos | OH11 (Orchestrator não expande grant) |
| **ORCH-R02-03** | `goalAncestry` denormalizado em Task/Run; Goal DAG em orchestration | OH01, OH-T06 |
| **ORCH-R02-04** | Board override via Owner; `GateBinding` estruturado; G7 único `done` | OH07, OH08, OH09, OH10 |
| **ORCH-R02-05** | Taskboard é fonte de claim ANX-*; orchestration espelha, não substitui | OH06 |
| **ORCH-R02-06** | Modo TREE: checkout/ancestry iguais; revisão só audit/GateBinding | OH09, ADR0005 §TREE |
| **ORCH-R02-07** | Modo CIRCULAR: falha G4/G5 dispara `ESCALATES_TO` via evento → graph | OH10, OH-T07 |
| **ORCH-R02-08** | `GateBinding` schema v1 antes de código — ver R03 domain sketch | OH08, G0–G7 table spec 006 |

### Referência cruzada ADR 0005 (GK = decisões de grafo; OH = hierarquia)

| ADR 0005 / spec 006 | Relação R02 |
| --- | --- |
| OH01 `OrganizationRoot` | Goal ancestry ancora em org |
| OH06 issue ANX-* | ORCH-R02-05 reconciliação board |
| OH07 `in_review` ≠ PASS | ORCH-R02-01 libera lease em review |
| OH08 freeze migração modo | ORCH-R02-04 pause delegações |
| OH09 TREE audit-only review | ORCH-R02-06 |
| OH10 CIRCULAR ReviewEdge | ORCH-R02-07 |
| ADR § checkout Paperclip | ORCH-R02-01 |
| ADR § goal ancestry | ORCH-R02-03 |
| ADR § Board = Owner | ORCH-R02-04 |

---

## Respostas às perguntas R01

| # | Pergunta R01 | Resposta R02 |
| --- | --- | --- |
| 1 | Schema `GateBinding` vs comentários taskboard | Comentário = humano; `GateBinding` = estruturado (ORCH-R02-04, ORCH-R02-08 pendente R03) |
| 2 | Derivação `ReviewEdge` ao importar TREE | Somente após switch para CIRCULAR + migração OH08; import TREE não cria ReviewEdge |
| 3 | T04 `relationshipFit` com especialistas transversais | CIRCULAR: ReviewEdge + TEAM; TREE: só REPORTS_TO + grants |
| 4 | UX troca de modo sem downtime | `FREEZE_DELEGATIONS` + leases mantidos até expirar ou Owner force-release |

---

## Perguntas abertas para R03

1. Payload exato `orchestration.task.checked_out.v1` e correlação com outbox
2. TTL default de `TaskLease` vs heartbeat interval por adapter (Cursor, Codex, CLI)
3. `PlanRevision` — entidade separada ou versão de Goal?
4. Integração taskboard HTTP: webhook de status → orchestration ou polling?

## Próxima rodada

→ **R03 — Domain sketch** ([R03-domain-sketch.md](./R03-domain-sketch.md)) — entidades, invariantes de lease/heartbeat, ports públicos. ✅ Concluído (ORCH-R03-01..08).
