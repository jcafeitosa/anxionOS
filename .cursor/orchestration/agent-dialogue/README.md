# Agent Dialogue — camada de comunicação visível

Runtime local para diálogo entre agentes (orquestrador, executor, crítico, equipes G2–G5). Mensagens ficam em `.cursor/orchestration-runtime/dialogue/dialogue.jsonl` — visíveis a qualquer agente no workspace.

## Comandos rápidos

```bash
# Publicar com persona (recomendado)
npm run orchestration:broadcast -- \
  --from-persona backend-executor \
  --to-mention @critico --issue ANX-123 --gate G1 \
  --type handoff \
  --body "@critico, candidato r2 pronto para revisão G1." \
  --evidence command:"bun test backend/tests/foo.test.ts"

# Ler thread da issue
npm run orchestration:dialogue -- read --issue ANX-123

# Últimas mensagens
npm run orchestration:dialogue -- tail --lines 10

# Caminho do log
npm run orchestration:dialogue -- path

# Markdown para exibir no chat Cursor
npm run orchestration:show-dialogue
npm run orchestration:show-dialogue -- --issue ANX-221
```

## Ver diálogo no chat do Cursor

**Método primário:** `npm run orchestration:chat` (`chat-feed.mjs`) — saída com marcador para colar verbatim no chat do Cursor.

```bash
npm run orchestration:chat
npm run orchestration:chat -- --issue ANX-221
npm run orchestration:chat -- --since 30m
npm run orchestration:chat -- --new-only
npm run orchestration:chat -- --check-pending
```

Alias: `npm run orchestration:show-dialogue` (`conversation.mjs`, 20 linhas, sem marcador).

Após `broadcast`, `.cursor/orchestration-runtime/dialogue/.pending-chat-display` sinaliza issue para exibir no próximo turno.

Slash command: `/dialogue` · Regra: `.cursor/rules/dialogue-in-cursor-chat.mdc`

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DIALOGUE_FROM_ROLE` | Papel padrão no `post` |
| `DIALOGUE_FROM_NAME` | Nome exibido padrão |
| `DIALOGUE_FROM_ID` | agentId padrão |
| `CURSOR_THREAD_ID` | threadId gravado na mensagem |

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `protocol.mjs` | Esquema, validação, factory |
| `dialogue-log.mjs` | Append/read JSONL |
| `broadcast.mjs` | CLI para agentes |
| `conversation.mjs` | Markdown para chat Cursor |
| `chat-feed.mjs` | Feed compacto com marcador Cursor |

## Espelhar no taskboard

Use `--mirror-taskboard` em handoffs e pareceres formais. Requer `taskctl` e `--issue ANX-N`.

Campo opcional `diagram` (fonte Mermaid) no schema — ver [protocol.mjs](./protocol.mjs) e [VISUAL-DOCUMENTATION.md](../VISUAL-DOCUMENTATION.md).

```bash
npm run orchestration:broadcast -- ... --diagram-file plan.mmd
```

Protocolo completo: [../COMMUNICATION.md](../COMMUNICATION.md) · [../PERSONAS.md](../PERSONAS.md) · [../INTERACTIONS.md](../INTERACTIONS.md)


## Personas e watch

```bash
npm run orchestration:personas
npm run orchestration:watch -- --issue ANX-123
```

| Arquivo | Responsabilidade |
| --- | --- |
| `personas.mjs` | Mapa slug → nome humano |
| `watch.mjs` | Painel live legado (texto) |
| `terminal-format.mjs` | ANSI, cores, wrap, painel |
| `terminal-panel.mjs` | Live viewer (`orchestration:terminal`) |
| `tail-formatted.mjs` | Snapshot formatado (`orchestration:tail`) |

Docs: [../INTERACTIONS.md](../INTERACTIONS.md) · [../EXAMPLE-THREADS.md](../EXAMPLE-THREADS.md)
