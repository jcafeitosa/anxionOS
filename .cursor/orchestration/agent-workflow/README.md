# Agent Workflow — estado e árvore de decisão

CLI que persiste estado por persona+issue e sugere próxima ação alinhada ao pipeline G0–G7.

**Docs:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md) · [workflows/README.md](../workflows/README.md)

---

## Arquivos

| Arquivo | Função |
| --- | --- |
| `state.mjs` | Load/save `.cursor/orchestration-runtime/workflows/{persona}-{issue}.json` |
| `decision-tree.mjs` | `suggestNextAction()` por role/gate |
| `monitor.mjs` | CLI `status`, `next`, `monitor`, `sync` |

---

## Comandos

```bash
npm run orchestration:workflow -- status --persona backend-executor --issue ANX-N [--json]
npm run orchestration:workflow -- next --persona backend-executor --issue ANX-N [--json]
npm run orchestration:workflow -- monitor [--level C] [--json]
npm run orchestration:workflow -- sync --persona backend-executor --issue ANX-N [--json]
```

---

## Schema JSON (v1)

```json
{
  "version": 1,
  "persona": "backend-executor",
  "issueId": "ANX-222",
  "level": "C",
  "gate": "G1",
  "step": "pre-work-g0",
  "updatedAt": "2026-09-09T13:00:00.000Z",
  "checklist": {
    "agentsMdRead": false,
    "taskboardEnsure": false,
    "sessionStarted": false,
    "ackPosted": false,
    "lastStatusAt": null,
    "lastDialogueAt": null,
    "lastTaskboardCommentAt": null
  },
  "evidence": [],
  "hiredWorkers": [],
  "gateStatus": {},
  "blockers": ["await ANX-221 G7"]
}
```

Exemplo: [.cursor/orchestration-runtime/workflows/backend-executor-ANX-222.example.json](../../../.cursor/orchestration-runtime/workflows/backend-executor-ANX-222.example.json)

---

## Integração

- **Dialogue:** `monitor.mjs` lê `.cursor/orchestration-runtime/dialogue/dialogue.jsonl`.
- **Taskboard:** HTTP `127.0.0.1:47823`.
- **Hire:** `listOnDemandForIssue()` de `agent-hire/registry.mjs`.
- **Sessão:** `getActiveSession()` de `session-tracker.mjs`.

Level C: `monitor --level C` no início de cada sessão.

## Comportamento do `sync`

O subcomando `sync` (e `status`, que compartilha a mesma lógica) reconcilia o JSON persistido com sinais externos: marca `agentsMdRead` quando `AGENTS.md` existe no repositório, `taskboardEnsure` quando o health check do board passa, e `lastTaskboardCommentAt` com o timestamp do comentário mais recente da issue via `taskctl comment list` (ignorado silenciosamente se `taskctl` estiver indisponível). Também sincroniza sessão, ack, dialogue e workers contratados; quando o checklist G0 está completo, avança `step` de `pre-work-g0` para `ack-delegation` ou `implement` conforme sessão/ack já postados.
