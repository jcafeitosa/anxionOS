# Gap Analysis — Orquestração anxionOS

Inventário formal do sistema de equipe estilo Google eng (personas + dialogue log + pipeline G0–G7).

**Data:** 2026-09-10T14:35Z · **Escopo:** `.cursor/orchestration/`, hooks, rules — framework-only  
**Completude estimada:** **~98% tooling** · **~40% autonomia comportamental real** (ver § Autonomia real vs simulação)  
**Auditoria:** `orchestration:verify` **205/205** + diagram **18/18** + 18 personas + 7 crons on

---

## Inventário de artefatos

| Artefato | Status | Notas |
| --- | --- | --- |
| `TEAM.md` | ✅ | Roster por domínio; cross-links atualizados |
| `PERSONAS.md` | ✅ | 18 personas (núcleo + anéis A/B/C) |
| `INTERACTIONS.md` | ✅ | **24 tipos** de interação (canônico) |
| `EXAMPLE-THREADS.md` | ✅ | 3+ threads PT-BR |
| `COMMUNICATION.md` | ✅ | Protocolo + canais |
| `RUNBOOK.md` | ✅ | Referência CLI completa |
| `TEAM-COLLABORATION.md` | ✅ | Papéis no chat |
| `PIPELINE.md` | ✅ | Gates G0–G7 |
| `DELEGATION.md` | ✅ | Claims e handoffs |
| `WORKFLOWS.md` | ✅ | Fluxos operacionais |
| `workflows/workflow-*.md` | ✅ | 18 workflows individuais por persona (incl. `cto-critic`) |
| `COLLECTIVE-WORKFLOW.md` | ✅ | Pipeline coletivo G0–G7 |
| `HIERARCHY.md` + `HIRE-DELEGATION.md` | ✅ | Níveis A/B/C + hire on-demand |
| `SCOPE.md` | ✅ | Equipe Cursor ≠ agentes do produto |
| `CTO-AUTHORITY.md` + `CTO-ACCEPTANCE.md` | ✅ | G7 delegado + oráculos |
| `AGENT-ROSTER.md` | ✅ | Matriz de competências + `orchestration:who` |
| `VISUAL-DOCUMENTATION.md` | ✅ | Política Mermaid/Archify (70% cobertura) |
| `GUIDELINES-INTEGRATION.md` | ✅ | karpathy + ECC + ui-ux-pro-max |
| `GAP-ANALYSIS.md` | ✅ | Este documento |
| `GOAL-STATUS.md` | ✅ | Auditoria do goal Cursor |
| `COMPLIANCE.md` | ✅ | Gates AGENTS.md + OpenKnowledge |
| `ONBOARDING.md` | ✅ | Primeiro dia + § Quick start (5 min) |
| `orchestration-compliance.mdc` | ✅ | Regra Cursor alwaysApply |
| `agent-dialogue/protocol.mjs` | ✅ | **24 types**, persona, vote, threadId, Zod |
| `agent-dialogue/personas.mjs` | ✅ | PERSONAS map + CLI list/get |
| `agent-dialogue/broadcast.mjs` | ✅ | `--from-persona`, todos `--type` |
| `agent-dialogue/dialogue-log.mjs` | ✅ | JSONL append/read |
| `agent-dialogue/watch.mjs` | ✅ | fs.watch live panel |
| `agent-hire/` | ✅ | hire, dismiss, roster, cto-hire-decide |
| `agent-workflow/` | ✅ | state, decision-tree, monitor, diagram-check |
| `agent-autonomy/` | ✅ | 7 crons `[on]`, daemon ativo |
| `.cursor/orchestration-runtime/dialogue/example-message.json` | ✅ | Schema completo |
| `package.json` scripts | ✅ | 30+ scripts (`standup`, `progress`, `chat`, …) |
| `PROJECT-GREENLIGHT.md` | ✅ | Política produto BLOCKED / framework ALLOWED |

---

## Pilares do sistema

| Pilar | Artefatos | Status |
| --- | --- | --- |
| Personas + dialogue | TEAM, PERSONAS, protocol (24 tipos), broadcast | ✅ |
| Pipeline G0–G7 | PIPELINE, DELEGATION, CTO-ACCEPTANCE | ✅ |
| Workflows individuais | `workflows/`, agent-workflow, COLLECTIVE-WORKFLOW | ✅ |
| Hierarquia + hire | HIERARCHY, HIRE-DELEGATION, agent-hire | ✅ |
| Roster + competências | AGENT-ROSTER, orchestration:who | ✅ |
| Escopo | SCOPE.md | ✅ |
| Documentação visual | VISUAL-DOCUMENTATION, diagram-check (70%) | ✅ |
| Guidelines | GUIDELINES-INTEGRATION, TEAM, DELEGATION | ✅ |
| **Compliance** | COMPLIANCE, ONBOARDING, orchestration-compliance.mdc | ✅ |
| Proatividade | PROACTIVITY, AUTONOMY, agent-proactive | ✅ |

---

## Gaps fechados (reconciliação c33417ce)

| Gap anterior | Status | Evidência |
| --- | --- | --- |
| 17 tipos de interação | ✅ Fechado | `INTERACTIONS.md` + `protocol.mjs` = **24 tipos** |
| Workflows individuais ausentes | ✅ Fechado | 18× `workflows/workflow-*.md` (incl. cto-critic); `diagram-check` 18/18 OK |
| Hire on-demand não documentado | ✅ Fechado | `HIRE-DELEGATION.md`, `agent-hire/`, regra `hierarchy-circular.mdc` |
| CTO G7 sem oráculos | ✅ Fechado | `CTO-AUTHORITY.md`, `cto-decide`, `cto-accept` |
| Roster/competências dispersos | ✅ Fechado | `AGENT-ROSTER.md`, `orchestration:who --can-i` |
| Escopo confundido com produto | ✅ Fechado | `SCOPE.md` + aviso em README/TEAM/PERSONAS |
| Política visual ausente | ✅ Fechado | `VISUAL-DOCUMENTATION.md`, regra `visual-documentation.mdc` |
| ONBOARDING + compliance | ✅ Fechado | GAP-001 abaixo |
| GUIDELINES-INTEGRATION ausente | ✅ Fechado | [GUIDELINES-INTEGRATION.md](./GUIDELINES-INTEGRATION.md) |
| Docs desatualizados (17 tipos, cron off) | ✅ Fechado | Esta revisão + [GOAL-STATUS.md](./GOAL-STATUS.md) |
| E2E G0→G7 em issue real (ANX-222) | ✅ Fechado | ANX-222 `done`; wave G2–G5 3f85d225 |
| Fila P02 G7 bloqueada | ✅ Fechado | ANX-129–133 `done` (G7 ACCEPT 2026-09-09) |
| Testes CLI desatualizados (19/19) | ✅ Fechado | `orchestration:test` **72/72** (standup + progress-bar + compliance) |
| `workflow-cto-critic.md` ausente | ✅ Fechado | Cláudia — G6/G7 audit (ANX-237) |
| Google-style só em 4 workflows | ✅ Fechado | Seção *Colaboração de equipe* em todos os 18 workflows (ANX-237) |
| `orchestration:standup` / `progress` sem RUNBOOK | ✅ Fechado | RUNBOOK + README cheat sheet (ANX-237) |
| Docs README/COLLECTIVE com contagem 17 | ✅ Fechado | Reconciliado para 18 personas / 36 diagram blocks (ANX-237) |
| `orchestration-dialogue.mdc` fora de rules | ✅ Fechado | `.cursor/rules/orchestration-dialogue.mdc` alwaysApply (ANX-231) |
| Sessões órfãs | ✅ Mitigado | 5 encerradas `--force`; regra + `session list` documentados |
| Rename codewhale→cursor | ✅ Fechado | Consolidado em ANX-230; ANX-232 canceled; runtime `.cursor/orchestration-runtime/`; config `.cursor/orchestration.config.json` tracked; verify 72/72 |
| `.gitignore` runtime + legacy | ✅ Fechado | `.cursor/orchestration-runtime/**` ignorado; `.codewhale/` ignorado integralmente; `.cursor/orchestration.config.json` tracked |

### GAP-001 — ONBOARDING + link AGENTS.md ✅

- [ONBOARDING.md](./ONBOARDING.md) — sequência dia 1 (AGENTS.md → brain/ via OKF → RUNBOOK → taskboard → claim)
- [COMPLIANCE.md](./COMPLIANCE.md) — gates G0–G0.8 e mapeamento AGENTS.md → papéis
- `.cursor/rules/orchestration-compliance.mdc` — regra alwaysApply
- Cross-links em TEAM, PERSONAS, DELEGATION, RUNBOOK, PIPELINE, INTERACTIONS
- Aviso suave em `broadcast.mjs` para handoff/verdict sem evidence AGENTS/brain

---

## Autonomia real vs simulação (auditoria 2026-09-10)

O framework mede **cobertura de CLI/docs** (~98%), não **fidelidade de equipe autônoma**. Hoje:

| Promessa documental | Realidade implementada |
| --- | --- |
| Personas independentes | Um LLM coordenador formata blocos `---` |
| Task dispatch automático | Fila `dispatch` + `inject`/`spawn-plan --json`; parent ainda invoca `Task` (sem API Cursor de spawn) |
| Hooks bloqueiam violações | Hooks **avisam** (stderr); block real só em `compliance --pre-commit` manual |
| Chat visível ao @Owner | Exige colar `orchestration:chat` — agora **pré-injetado** no `beforeSubmitPrompt` quando há `PENDING_CHAT_DISPLAY` |
| Crons autônomos | Daemon opt-in; `sessionStart` roda proactive + **lifecycle-cleanup** |
| Escalations consumidas | `pending-escalate.json` agora drenado por proactive triggers + `lifecycle-cleanup drain-escalate` |

**Correções aplicadas 2026-09-10:**

- `orchestration:lifecycle-cleanup` — encerra sessões/hires quando issue `done`/`canceled` ou TTL
- `delegationFromHire` — stale por silêncio (antes hardcoded `false`)
- `delegate-monitor status` — `ok` falha com delegações stale
- `PARENT_DELEGATION_STALE` — warning para orquestrador
- `dialogue-sync` — marca `pending-chat-display` em novas mensagens
- `beforeSubmitPrompt` — injeta feed de chat pendente no stderr do agente
- Proactive — lê `pending-escalate.json` como trigger
- `orchestration:dispatch spawn-plan --json` — payload Task batch (executor + crítico)
- `enqueueDispatch` — auto-enfileira crítico pareado (`code-reviewer`, não `critic-reviewer`)
- `levels.mjs` — `CRITIC_CURSOR_SUBAGENT` = `code-reviewer` (tipo Cursor válido)
- `orchestration:boot` — bootstrap único (taskboard + lifecycle + proactive + dispatch)
- `decision-tree` — árvore dedicada `cto-critic` (não herda notify-g2 de Level C)
- `diagram-check` — deduplica workflows (18, não 36)
- `workflow-roster.test` — 1:1 `PERSONA_SLUGS` ↔ `workflow-{slug}.md`
- `agent-proactive` hook — paridade com boot (`chat --check-pending`, `dispatch status`, hint `spawn-plan`)

**Ainda arquitetural (não fechável só com CLI):** spawn mecânico de `Task` sem parent LLM; bloqueio hard no hook `stop`; espelhamento bidirecional taskboard↔dialogue.

---

## Gaps remanescentes

Fonte: auditoria c33417ce · smoke 2026-09-09 · revalidação 2026-09-10

### Crítico (bloqueia goal COMPLETE)

| Gap | Categoria | Evidência / ação |
| --- | --- | --- |
| ~~Framework não versionado no git~~ | ✅ | ANX-230 `done` (f77529b); delta ANX-237 (~15 arquivos) pendente commit Owner |
| ~~`.gitignore` runtime `.cursor/orchestration-runtime/`~~ | ✅ | ANX-232 — `.cursor/orchestration-runtime/**` + `.codewhale/` ignorados; config tracked |

### Importante (qualidade / confiabilidade)

| Gap | Categoria | Evidência / ação |
| --- | --- | --- |
| ~~Zero testes automatizados do CLI~~ | ✅ | `orchestration:test` **72/72** + `orchestration:verify` agregado |
| ~~Sem CI para smoke de orquestração~~ | ✅ | `.github/workflows/orchestration-verify.yml` (2026-09-09) |
| **Cobertura visual ~67%, não 100%** | A/B | `diagram-check`: 72/107 arquivos com Mermaid; workflows **18/18** OK (18 personas) |
| ~~`agent-proactive.mjs` não wired~~ | ✅ | `sessionStart` em `.cursor/hooks.json` (2026-09-09) |
| ~~`orchestration-dialogue.mdc` fora de `.cursor/rules/`~~ | ✅ | `.cursor/rules/orchestration-dialogue.mdc` alwaysApply (ANX-231) |
| **Compliance dialogue na prática** | E→mitigado | `beforeSubmitPrompt` injeta chat pendente; regras CHAT-PARTICIPATION permanecem |
| **`mirror-taskboard` opcional e frágil** | C | Requer `taskctl`; dialogue e board podem divergir |
| **Auto-hire via `taskboard-sync` não provado E2E** | E | Código existe; fluxo hire→dismiss→gate não auditado |
| ~~Sessões abertas sem `session end`~~ | ✅ | `orchestration:lifecycle-cleanup` no `sessionStart` + TTL/issue done |
| ~~Hires stale no delegate-monitor~~ | ✅ | `delegationFromHire` calcula stale; cleanup auto-dismiss |
| ~~`pending-escalate.json` write-only~~ | ✅ | Proactive trigger + drain CLI |

### Opcional (melhorias)

| Gap | Categoria |
| --- | --- |
| Painel webview (só terminal: `orchestration:terminal`, `watch`) | F |
| Métricas PC10 / dashboard de saúde da equipe | F |
| UI web do dialogue | F |
| Integração nativa Cursor além do hook `stop` | F |
| Espelhamento automático taskboard↔dialogue bidirecional | F |
| 100% cobertura Mermaid em docs de orquestração | F |
| Testes de regressão para os 24 tipos + campos `decision`/`hire`/`plan`/`policy` | F |

---

## Checklist framework (~2%)

1. ~~Commit git inicial (Owner)~~ ✅ ANX-230
2. Auto-hire E2E (`taskboard-sync`) — código existe; fluxo não auditado
3. Robustez `mirror-taskboard` / `taskctl`
4. **Despacho subagent automatizado** — fila executável pós-hire (gap arquitetural #1)
5. Cobertura Mermaid 100% (opcional — atual ~61%)
6. ~~Lifecycle cleanup sessões/hires~~ ✅ `orchestration:lifecycle-cleanup`
7. ~~Pending escalate consumido~~ ✅ proactive + drain
8. Compliance dialogue — mitigado via hook precheck; monitorar adoção


## Roadmap (não automatizável aqui)

| Item | Motivo |
| --- | --- |
| Aceite G7 (Owner) | Decisão humana explícita por issue — CTO pode aceitar rotina via `cto-accept` |
| Integração nativa Cursor hook (shell) | Depende de API de hooks do IDE |
| Espelhamento automático taskboard | Requer `taskctl` + board online |
| UI web do dialogue | Fora do escopo tooling local |
| Subagent dispatch automático | Orquestrador manual + `orchestrate-work` |
| Suite de testes CLI | ✅ `orchestration:verify` |
| E2E runbook | ✅ [E2E-RUNBOOK.md](./E2E-RUNBOOK.md) — ANX-222 executado |
| delegation-queue | ✅ ANX-134/135/136 + [README](./delegation-queue/README.md) |

---

## Verificação

```bash
node .cursor/orchestration/agent-dialogue/personas.mjs list
npm run orchestration:broadcast -- --from-persona backend-executor --type debate --issue ANX-221 --body "teste debate" --gate G1
npm run orchestration:dialogue -- read --issue ANX-221
npm run orchestration:watch -- --issue ANX-221
npm run orchestration:cron -- list          # 7 crons [on]
npm run orchestration:diagram-check         # workflows OK
```

**Relacionados:** [RUNBOOK.md](./RUNBOOK.md) · [GOAL-STATUS.md](./GOAL-STATUS.md) · [GUIDELINES-INTEGRATION.md](./GUIDELINES-INTEGRATION.md) · [PERSONAS.md](./PERSONAS.md) · [INTERACTIONS.md](./INTERACTIONS.md)
