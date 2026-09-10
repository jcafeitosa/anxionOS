# Integração Dashi Taskboard ↔ Cursor

Guia operacional para agentes **Cursor** e orquestração anxionOS. Complementa [AGENT-TASKBOARD-SIGNATURE.md](./AGENT-TASKBOARD-SIGNATURE.md).

## Cursor vs Codex

| Aspecto | Codex (legado) | Cursor (nativo) |
| --- | --- | --- |
| Thread binding | `CODEX_THREAD_ID` | `CURSOR_THREAD_ID` (preferido) |
| Client HTTP | `x-taskboard-client: taskctl` | `x-taskboard-client: cursor` ou `cursor-orchestration` |
| CLI | `taskctl` / Codex Taskboard.app | `node ../dashi-taskboard/cli/taskctl.mjs` ou bin `cursor-taskboard` |
| Autor padrão sem persona | Codex Agent | Cursor Agent |
| Personas orquestração | Via headers após `sync-agents` | Mesmo — Renata, Lucas, etc. |

**Compatibilidade:** `taskctl` e `CODEX_THREAD_ID` continuam válidos. Em ambiente misto, `CURSOR_THREAD_ID` tem prioridade no wrapper `scripts/taskboard.mjs`.

## Status (verificado 2026-09-09)

Sync end-to-end **operacional**: 18 personas na API, comentários/moves assinados, assignee dropdown completo, drift warning ativo, testes identity/sync/drift **9/9**.

## Setup Owner (uma vez)

```bash
# 1. Taskboard via LaunchAgent (canônico)
launchctl kickstart -k gui/$(id -u)/com.dashi.taskboard
# código: ~/Development/dashi-taskboard · dados: ~/dev/dashi-taskboard/.data

# 2. Variáveis no shell / .env do repo anxionOS
export TASKBOARD_URL=http://127.0.0.1:47823
export TASKBOARD_PROJECT_NAME=anxionOS
export CURSOR_THREAD_ID="${CURSOR_THREAD_ID:-cursor-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
export TASKBOARD_CLIENT=cursor   # opcional; inferido de CURSOR_THREAD_ID

# 3. Verificar board + registrar personas
cd /path/to/anxionOS
npm run taskboard:cursor-start

# 4. Claim com persona assinada (exemplo)
npm run orchestration:taskboard -- move --issue ANX-N --status in_progress --persona orchestrator

# 5. Comentário assinado
npm run orchestration:taskboard -- comment --issue ANX-N --persona orchestrator --body "ack — sessão Cursor"
```

## Scripts npm (Cursor)

| Script | Função |
| --- | --- |
| `npm run taskboard:cursor-ensure` | Health check + drift warning |
| `npm run taskboard:cursor-prework` | ensure + política zero-trabalho-fora-do-board |
| `npm run taskboard:cursor-sync-agents` | Registry local + POST `/api/projects/:id/agents` |
| `npm run taskboard:cursor-start` | ensure + sync-agents (início de sessão) |
| `npm run orchestration:taskboard -- …` | Escritas assinadas (comment/move/sync) |

## Headers enviados pela orquestração

Toda escrita via `agent-taskboard-write.mjs` / `buildActorHeaders`:

- `x-taskboard-client: cursor`
- `x-taskboard-agent-id` / `x-taskboard-agent-name` — slug e nome da persona
- `x-taskboard-user-id` / `x-taskboard-user-name` — mesmo par (compat UI)
- `x-cursor-thread-id` — valor de `CURSOR_THREAD_ID` quando definido
- Corpo JSON: `threadId` em moves/comments

## Início de sessão (agente)

1. `npm run taskboard:cursor-prework`
2. Claim `ANX-*` com `--persona` da persona ativa
3. `npm run orchestration:session -- start --persona SLUG --issue ANX-N` (dispara sync-agents)
4. Broadcast `ack` no dialogue antes de codar

## Moves exigem thread binding

`move` via `orchestration:taskboard` requer `CURSOR_THREAD_ID` exportado (comentários funcionam sem). Defina no início da sessão:

```bash
export CURSOR_THREAD_ID="${CURSOR_THREAD_ID:-cursor-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
```

## Rebuild do app Dashi

Após alterações em `~/Development/dashi-taskboard`:

```bash
cd ~/Development/dashi-taskboard && npm run build:web
launchctl kickstart -k gui/$(id -u)/com.dashi.taskboard
cd ~/Development/anxionOS && npm run taskboard:cursor-start
```

## Issue de referência

**ANX-253** — integração nativa Cursor (este documento).

