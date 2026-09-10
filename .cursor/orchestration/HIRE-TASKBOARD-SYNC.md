# Hire → Taskboard Sync

Sincronização automática entre `orchestration:hire` e o **Dashi Taskboard**.

Relacionados: [HIRE-DELEGATION.md](./HIRE-DELEGATION.md) · [agent-hire/README.md](./agent-hire/README.md)

## Comportamento

Após um hire on-demand bem-sucedido (`registerHire`), o framework tenta registrar o agente na issue do board:

1. **Comentário** na issue com metadados (`hire-id`, persona, level, razão, evidência, `cursorSubagentType`)
2. **Label** `hired:<slug>` na issue (ex.: `hired:build-error-resolver`)

Marcador de idempotência no comentário: `` `HIRE_TB_SYNC:<hire-id>` ``.

## Quando dispara

| Origem | Momento |
| --- | --- |
| `npm run orchestration:hire` | Imediatamente após `registerHire` |
| `taskboard-sync.mjs delegate` | Após cada auto-hire em `move in_progress` |
| CLI manual | `node .cursor/orchestration/agent-hire/hire-taskboard-sync.mjs ...` |

## Falha graciosa

Se o board estiver offline ou `taskctl` indisponível:

- Hire **não** é bloqueado
- Warning `HIRE_TASKBOARD_SYNC_FAILED` no stderr
- Estado local (`active-on-demand.json`, `hire-log.jsonl`) permanece válido

## Flags

```bash
# Emergência — pular sync
npm run orchestration:hire -- \
  --persona build-error-resolver \
  --issue ANX-222 \
  --reason "..." \
  --evidence "..." \
  --skip-taskboard-sync

node .cursor/orchestration/agent-hire/taskboard-sync.mjs delegate --issue ANX-N --skip-taskboard-sync
```


## Assinatura de persona

Comentários de hire-sync são assinados pelo **hirer** (`hiredBy`) via `taskboardComment` — ver [AGENT-TASKBOARD-SIGNATURE.md](./AGENT-TASKBOARD-SIGNATURE.md).
## API utilizada

Com **dashi-taskboard** atualizado (`../dashi-taskboard` + rebuild do app):

- `GET/POST /api/projects/:id/agents` — registry de personas (`sync-agents`)
- `POST /api/tasks/:id/comments` — comentário assinado (`X-Taskboard-Agent-*`)
- `PATCH /api/tasks/:id` — labels / status com persona

Requer Codex Taskboard reiniciado após build — ver [AGENT-TASKBOARD-SIGNATURE.md](./AGENT-TASKBOARD-SIGNATURE.md).

## Exemplo

```bash
npm run orchestration:hire -- \
  --by-persona backend-executor \
  --persona build-error-resolver \
  --issue ANX-222 \
  --reason "12 erros TypeScript" \
  --evidence "bun run check-types exit 1"
```

**No board (issue ANX-222):**

- Novo comentário `[hire-sync] **build-error-resolver** contratado por **Lucas** ...`
- Label adicional `hired:build-error-resolver`

## Arquivos

| Arquivo | Função |
| --- | --- |
| `agent-hire/hire-taskboard-sync.mjs` | Sync hire → comentário + label |
| `agent-hire/hire.mjs` | Invoca sync após hire |
| `agent-hire/taskboard-sync.mjs` | Sync também no auto-delegate |
