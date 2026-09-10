# Assinatura de agentes no Dashi Taskboard

> Integração Cursor: [CURSOR-TASKBOARD-INTEGRATION.md](./CURSOR-TASKBOARD-INTEGRATION.md)

Cada persona assina comentários, moves e updates com identidade própria — não **Codex Agent**.

## UI (Owner)

| Campo | Exemplo |
| --- | --- |
| Autor do comentário | Lucas Mendes · backend-executor (nome + slug; `authorType` pode ser `user` ou `agent` conforme versão do board) |
| Criador / atividade | Nome da persona contratada |
| Assignee picker | Local user + Codex Agent + personas registradas |
| Ações humanas | Local user (inalterado) |

## Bootstrap

Sincronização **automática** (best-effort, idempotente) nos gatilhos:

| Gatilho | Comando | Comportamento |
| --- | --- | --- |
| Hire bootstrap | `npm run orchestration:hire -- bootstrap` | `sync-agents` após roster permanente |
| Sessão | `npm run orchestration:session -- start --persona SLUG --issue ANX-N` | `sync-agents` no start |
| Hire on-demand | `npm run orchestration:hire -- ...` | `sync-agents` após hire (além do comment/label) |
| Board online | `npm run taskboard:ensure` | **Aviso** `TASKBOARD_AGENT_SYNC_DRIFT` se PERSONAS ≠ registry ≠ board |

Sync manual / cron:

```bash
npm run taskboard:ensure
npm run orchestration:taskboard -- sync-agents
npm run orchestration:taskboard -- sync-agents --check-drift
npm run orchestration:taskboard -- sync-agents --watch --interval-ms 60000
```

Desabilitar auto-sync: `ORCHESTRATION_SKIP_AGENT_SYNC=1`.

### Atualizar o app Dashi (obrigatório uma vez)

**Layout canônico @Owner (2026-09-09):**

| Papel | Path |
| --- | --- |
| **Código** (LaunchAgent `com.dashi.taskboard`) | `~/Development/dashi-taskboard` (v1.1.6+) |
| **Dados** (`CODEX_TASKBOARD_DATA_DIR`) | `~/dev/dashi-taskboard/.data` |
| **Log** | `/tmp/dashi-taskboard.log` |

Não subir `npm start` manual em `~/dev/dashi-taskboard` — código legado; duplicar instâncias causa `EADDRINUSE` e `ENFILE`.

Rebuild + restart via launchd:

```bash
cd ~/Development/dashi-taskboard && npm install && npm run build:web
launchctl kickstart -k gui/$(id -u)/com.dashi.taskboard
cd ~/Development/anxionOS && npm run taskboard:cursor-start
```

## Escritas assinadas

```bash
npm run orchestration:taskboard -- comment --issue ANX-250 --persona backend-executor --body "Prova E2E"
npm run orchestration:taskboard -- move --issue ANX-250 --status in_progress --persona backend-executor
```

## Headers HTTP (Cursor)

- `X-Taskboard-Client`: `cursor` ou `cursor-orchestration`
- `X-Cursor-Thread-Id`: `CURSOR_THREAD_ID` (opcional; corpo também aceita `threadId`)
- `X-Taskboard-Agent-Id`: slug (`backend-executor`)
- `X-Taskboard-Agent-Name`: URL-encoded `Lucas Mendes · backend-executor`

## taskctl direto (opcional)

Após rebuild do `../dashi-taskboard`, `taskctl comment add` aceita persona:

```bash
CODEX_THREAD_ID="$CURSOR_THREAD_ID" node ../dashi-taskboard/cli/taskctl.mjs comment add ANX-N \
  --body "..." \
  --creator-id orchestrator \
  --creator-name "Renata Oliveira · orchestrator"
```

**Nota:** `taskctl` do Homebrew (`codex-taskboard` npm) pode não ter as flags novas — use o repo local ou `orchestration:taskboard`.

## Causa do "Codex Agent" (corrigido)

Servidor resolvia `x-taskboard-client: taskctl` **antes** dos headers de persona. Ordem atual: agent → user → default taskctl. Orchestration envia **user + agent** headers (`buildActorHeaders`).

Hire-sync e `orchestration:taskboard` usam HTTP assinado — autor esperado: `Renata Oliveira · orchestrator`, não `Codex Agent`.


Issue: **ANX-252**


## Troubleshooting assignee (só Local + Codex)

1. `curl http://127.0.0.1:47823/api/projects/<id>/agents` — deve retornar 18 personas após `sync-agents`; `NOT_FOUND` = servidor antigo sem patch.
2. Matar processos duplicados em `:47823` (`lsof -i :47823`) antes de reiniciar.
3. Rebuild web (`npm run build:web`) — UI carrega agents via `listProjectAgents` em `App.tsx`.

## Troubleshooting servidor parado / instável

| Sintoma | Causa comum | Correção |
| --- | --- | --- |
| `taskboard:ensure` falha / UI offline | LaunchAgent parado ou crash | `launchctl kickstart -k gui/$(id -u)/com.dashi.taskboard` |
| `ENFILE` em `/tmp/dashi-taskboard.log` | File descriptors esgotados | `launchctl kickstart -k …`; evitar instâncias duplicadas |
| `EADDRINUSE :47823` | **Duas instâncias** (launchd + manual) | `lsof -i :47823` — matar manual; deixar só launchd |
| Restart com `PORT=47824` não funciona | Servidor usa **`CODEX_TASKBOARD_PORT`**, não `PORT` | `CODEX_TASKBOARD_PORT=47824 npm start` (dev only) |
| Edits não aparecem | Código em path errado | Código: `~/Development/dashi-taskboard` · dados: `~/dev/dashi-taskboard/.data` |
| `projectAgents is not defined` (console) | Web desatualizada | `cd ~/Development/dashi-taskboard && npm run build:web` + kickstart launchd |

```bash
lsof -i :47823
tail -50 /tmp/dashi-taskboard.log
launchctl kickstart -k gui/$(id -u)/com.dashi.taskboard
curl -s http://127.0.0.1:47823/health
cd ~/Development/anxionOS && npm run taskboard:ensure
```
