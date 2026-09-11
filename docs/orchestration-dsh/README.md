---
type: guide
title: Orquestração de agentes no DeepSeek Harness (DSH)
---

# Orquestração no DSH — Tier 1

O framework de orquestração de `.cursor/orchestration/` foi escrito para o Cursor. Este documento descreve o que roda **sem alteração** no DeepSeek Harness, o que foi **adaptado** e o que **não transfere**.

## Fronteira: plano de controle vs plano de execução

| Camada | O que é | Onde vive |
| --- | --- | --- |
| **Controle** | board, issue, claim, lock, sessão, dialogue, hire/dispatch, compliance, monitor, políticas zero | `.cursor/orchestration/` — 127 CLIs Node, chamados por `npm run`/`bash`. **Não reescrever.** |
| **Execução** | implementar, revisar, testar, auditar | ferramentas do DSH: `subagent`, `subagent_fork`, `workflow`, `bash`, `read`, `grep`, `glob`, `edit`, `write`, `web_search` |

## Artefatos do port (Tier 1)

| Artefato | Função |
| --- | --- |
| [`.agents/skills/manage-taskboard/SKILL.md`](../../.agents/skills/manage-taskboard/SKILL.md) | disciplina de board, claim, lock, CAS, dual-board — **auto-descoberto** pelo DSH |
| [`.agents/skills/orchestrate-work/SKILL.md`](../../.agents/skills/orchestrate-work/SKILL.md) | pipeline G0–G7, pareamento de crítico, despacho de gates, aceite |
| [`.agents/skills/dsh-subagent-delegation/SKILL.md`](../../.agents/skills/dsh-subagent-delegation/SKILL.md) | pacote obrigatório de todo prompt de subagente técnico |
| [`scripts/orchestration/dsh-dispatch.mjs`](../../scripts/orchestration/dsh-dispatch.mjs) | adapta `spawn-plan` → despachos DSH (`npm run orchestration:dsh-dispatch`) |
| Seção DSH em [`AGENTS.md`](../../AGENTS.md) | mapeamento e limites, lido no início de toda sessão |

Descobribilidade: o DSH carrega `<projectRoot>/.agents/skills/` (rank 200) e `<projectRoot>/.dsh/skills/` (rank 100) automaticamente. Não é preciso instalar nada nem editar o profile.

## Mapa de adaptação

| Cursor | DSH | Observação |
| --- | --- | --- |
| Tool `Task` com `subagent_type` | `subagent` / `subagent_fork` / `workflow` | o DSH **não tem** `agentType` — foi removido de propósito |
| `subagent_type: code-reviewer` | `persona` (texto) + rota via `list_subagent_models` | papéis são convenção do prompt, não enum do runtime |
| MCPs serena / code-review-graph / playwright / supermemory / context7 | inexistentes | `bash` + `read/grep/glob/edit/write` + `web_search/web_fetch` |
| `graphify query` antes de Grep/Glob | opcional | `grep`/`glob` são o caminho primário |
| Hooks `.cursor/hooks/*` (sessionStart/stop/beforeSubmitPrompt) | **não disparam** | enforcement por CLI: `orchestration:compliance`, `workflow --monitor` |
| Chat multi-persona (`orchestration:speak`, blocos `---`) | `orchestration:broadcast` (dialogue.jsonl) | o durável é o diálogo assinado, não a renderização no chat |
| `Task` filhos | `subagent` continuações | `send_message`/`interrupt_agent`/`list_agents` |

## Sequência operacional

```bash
export CURSOR_THREAD_ID="dsh-$DSH_SESSION_ID"        # obrigatório para escritas

npm run taskboard:ensure || exit 1                   # board offline = PARAR
npm run taskboard:context
node scripts/taskboard.mjs create --title "..." --status todo    # se não existir
node scripts/taskboard.mjs move ANX-N in_progress --persona backend-executor
npm run orchestration:coordination -- claim-check --issue ANX-N --persona backend-executor --acquire
npm run orchestration:session -- start --persona backend-executor --issue ANX-N
npm run orchestration:session -- start --persona backend-critic  --issue ANX-N   # pareamento
npm run orchestration:compliance -- --pre-work --issue ANX-N --persona backend-executor   # exit 0
npm run orchestration:broadcast -- --from-persona backend-executor --type ack --issue ANX-N \
  --body "..." --evidence "command:..."

# despacho de gates (adapta o spawn-plan do framework)
npm run orchestration:dsh-dispatch -- --issue ANX-N --check-lock
npm run orchestration:dsh-dispatch -- --issue ANX-N --format json --model backend-critic=... 

# fim de turno
npm run orchestration:compliance -- --pre-commit --issue ANX-N --persona backend-executor
npm run orchestration:broadcast -- --from-persona backend-executor --type handoff --issue ANX-N \
  --body "..." --evidence "command:...,file:..."
npm run orchestration:session -- end --persona backend-executor
```

`--evidence` aceita `KIND:REF` com `KIND ∈ file|command|issue|pr` e é repetível. Sintaxe inválida faz o post falhar.

## Regras que continuam valendo integralmente

- **Z0** zero trabalho fora do board; **Z10** dual-board sem misturar unidades.
- Tolerância zero a código incompleto, `TODO` sem `ANX-*`, mock em produção, hardcoded, segredo em evento/log/grafo, erro engolido e código morto.
- `in_review` ≠ aprovado; `done` só com G7 explícito, escopo 100% e filhos bloqueadores resolvidos.
- Nunca atribuir à sua entrega mudanças de outra sessão neste workspace.

## Independência de revisão

O slug da persona (`backend-critic`, `security-lead`) é **rótulo de orquestração**, não prova de revisão. Um gate só conta quando:

1. um **subagente com contexto próprio** recebe o pacote de delegação e o diff/escopo exatos;
2. emite parecer com disposição, arquivos, evidência executada, achados por severidade e riscos residuais;
3. o parecer é registrado na issue e no dialogue, com o `dispatchId` reconciliado (`mark-done`).

Sem agente independente disponível, o gate fica **pendente** e o avanço para. Não simular equipes.

## Riscos conhecidos neste workspace

- **Sessões paralelas vivas**: o slot de sessão é por persona — outra conversa usando `backend-executor` pode sobrescrever sua sessão. Confira `orchestration:session -- list` antes de gates e use `--check-lock` ao despachar.
- **Fila do dispatch é global**: `spawn-plan` sem `--issue` emite despachos de outras conversas. Sempre filtrar por issue.
- **`~/.agents/skills/manage-taskboard` é um symlink quebrado** (`/absolute/path/to/...`) neste ambiente; as skills reais estão em `~/.claude/skills`. O port resolve isso no repo (`.agents/skills/`), que tem precedência por ser project-local.

## Tier 2 (não implementado — requer decisão)

O que o Tier 1 **não** dá: enforcement automático. Hoje eu preciso lembrar de rodar compliance/monitor. O Tier 2 resolveria com um pacote bundle instalável (`"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}`, `dsh plugin --profile <name> add <pkg>`):

| Peça | Mecanismo DSH |
| --- | --- |
| Bloquear edição sem issue claimada | plugin Cordis em `tools/pre-execute` |
| Exigir broadcast de status / detectar silêncio | `agent/pre-step` + `agent/turn-stopping` |
| Postar handoff no fim do turno | `agent/turn-stopping` |
| Presets por papel (substituindo `subagent_type`) | `agent-presets` (`agent.cordis.yml` + `preset.yml`) |
| MCPs de volta (se desejado) | `@deepseek-ai/dsh-mcp-client` no patch do profile |
| Hooks no dialeto Claude Code/Codex | `dsh-hooks-claude-code` com `configPath` (leitura única no load; sem auto-descoberta project-local) |

Pré-requisito: Tier 1 provado em uso real (mínimo 1–2 módulos com gates despachados).
