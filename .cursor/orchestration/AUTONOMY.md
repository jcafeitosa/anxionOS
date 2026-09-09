# Autonomia e Crons Proativos

Registro de jobs autônomos (loops/crons) para personas. **Não** altera política zero-trabalho-fora-do-board nem gates de [COMPLIANCE.md](./COMPLIANCE.md).

**Limites de [AGENTS.md](../../AGENTS.md):** crons podem verificar `taskboard:ensure`, escanear dialogue e sugerir handoffs — nunca codar, commitar ou escrever em `brain/` sem claim `ANX-*` e sem OKF MCP quando aplicável.

---

## Registry

Arquivo: `.cursor/orchestration-runtime/autonomy/registry.json`

| ID | Schedule | Comando |
| --- | --- | --- |
| `proactive-board-scan` | `*/10 * * * *` | `orchestration:proactive check --persona orchestrator` |
| `proactive-mention-watch` | `*/2 * * * *` | `orchestration:proactive suggest --persona ${PERSONA}` |
| `proactive-escalation` | `0 9 * * *` | `orchestration:proactive suggest --persona orchestrator` (G7) |
| `silence-watch` | `5m` | `orchestration:silence-watch` (sessões sem diálogo 10m+) |

---

## Como registrar cron local

1. Skill `/loop` ou monitored shell (ver skill loop)
2. Ou agendar via Codewhale/autonomy consumindo `registry.json`
3. Self-schedule permitido em `act` apenas para registrar loop documentado na issue

Exemplo loop 10 min (local):

```bash
while true; do
  sleep 600
  npm run orchestration:proactive -- check --persona orchestrator
done
```

---

## Proatividade

Ver [PROACTIVITY.md](./PROACTIVITY.md) e CLI em `agent-proactive/`.

```bash
npm run orchestration:proactive -- check
npm run orchestration:monitor -- --once
node .cursor/hooks/agent-proactive.mjs
```

Artefatos:

| Path | Uso |
| --- | --- |
| `.cursor/orchestration-runtime/autonomy/registry.json` | Crons default |
| `.cursor/orchestration-runtime/proactive/proactive.jsonl` | Log de triggers |


## No Silent Work

Sessões: `.cursor/orchestration-runtime/autonomy/active-sessions.json` · [NO-SILENT-WORK.md](./NO-SILENT-WORK.md)
