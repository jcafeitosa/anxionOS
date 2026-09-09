# Cursor Hooks — anxionOS

Hooks do projeto em `.cursor/hooks.json` + scripts em `.cursor/hooks/`.

## agent-proactive.mjs

**Evento:** `sessionStart` (início de sessão Cursor)

**Comportamento:** executa `npm run orchestration:proactive -- check --persona <slug>` (default `orchestrator`).

Override de persona: `--persona backend-executor` ou env `PROACTIVE_PERSONA`.

## agent-compliance-precheck.mjs

**Evento:** `beforeSubmitPrompt` (antes de cada prompt do agente)

**Comportamento:**

1. Se existir `.cursor/orchestration-runtime/dialogue/.pending-chat-display`, emite aviso `PENDING_CHAT_DISPLAY` (dialogue pendente de colar no chat via `orchestration:chat --check-pending`).
2. Para cada sessão ativa em `.cursor/orchestration-runtime/autonomy/active-sessions.json`, executa `orchestration:compliance --pre-work`. Emite aviso stderr se falhar (não bloqueia o prompt).

## agent-orchestration.mjs

**Evento:** `stop` (fim de turno do agente)

**Comportamento:**
1. Se existir `.cursor/orchestration-runtime/autonomy/pending-broadcast.json`, publica via `orchestration:broadcast` e remove o arquivo.
2. **Compliance stop:** executa `orchestration:compliance --pre-commit` por sessão ativa. Se falhar **e** não existir `pending-broadcast.json`, grava `pending-escalate.json`.
3. **Pending chat display:** se `.pending-chat-display` existe, emite aviso stderr e grava `pending-escalate.json` (dialogue no JSONL mas não colado no chat).
4. **No Silent Work:** se há sessão ativa sem broadcast no turno, emite aviso stderr e grava `pending-escalate.json`.

Ver [NO-SILENT-WORK.md](../orchestration/NO-SILENT-WORK.md).

### Formato pending-broadcast.json

```json
{
  "type": "handoff",
  "fromPersona": "backend-executor",
  "toPersona": "backend-critic",
  "issueId": "ANX-134",
  "gate": "G1",
  "body": "@marina, candidato r2 pronto.",
  "verdict": null
}
```

### Fluxo do agente

1. Completar handoff ou verdict na issue claimada
2. Gravar `pending-broadcast.json` com os campos acima
4. Encerrar turno — hook `stop` dispara o broadcast automaticamente

## Registrar hooks por persona

```bash
npm run orchestration:hooks -- create \
  --persona backend-executor \
  --id lucas-after-edit \
  --event afterFileEdit \
  --script .cursor/hooks/my-hook.mjs \
  --issue ANX-134
```

Ver [AUTONOMY.md](../orchestration/AUTONOMY.md) para limites de autonomia.

## Referências

- [create-hook skill](https://cursor.com) — formato hooks.json
- [AUTONOMY.md](../orchestration/AUTONOMY.md)
