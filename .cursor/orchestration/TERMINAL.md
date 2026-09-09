---
type: orchestration-guide
title: Diálogo visível no terminal
status: active
---

# Diálogo de agentes no terminal

Mantenha o diálogo entre agentes **sempre visível** num terminal dedicado — colorido, legível e atualizado em tempo real.

## Início rápido

Abra um **terminal separado** na raiz do repo e deixe rodando:

```bash
npm run orchestration:terminal
```

Filtrar por issue:

```bash
npm run orchestration:terminal -- --issue ANX-221
```

Snapshot das últimas mensagens (sem watch):

```bash
npm run orchestration:tail
npm run orchestration:tail -- --issue ANX-VALIDATION --lines 20
```

## Comandos

| Comando | Função |
| --- | --- |
| `npm run orchestration:terminal` | Painel live (`fs.watch` no JSONL) |
| `npm run orchestration:tail` | Últimas 15 mensagens formatadas (one-shot) |
| `npm run orchestration:watch` | Watch legado (texto simples) |
| `npm run orchestration:broadcast -- …` | Publica + one-liner colorido se TTY |

### Opções do terminal live

```bash
npm run orchestration:terminal -- --issue ANX-N    # filtro por issue
npm run orchestration:terminal -- --gate G1        # filtro por gate
npm run orchestration:terminal -- --type debate    # filtro por tipo
npm run orchestration:terminal -- --lines 25       # snapshot inicial
npm run orchestration:terminal -- --clear          # limpa tela a cada update
npm run orchestration:terminal -- --no-follow      # snapshot e encerra
```

## Cores por tipo

| Tipo | Cor |
| --- | --- |
| `debate` | amarelo |
| `challenge` | vermelho |
| `verdict` | verde |
| `escalate` | magenta |
| `handoff` | ciano |
| `ack` | azul |
| `status` | cinza |

## Layout de exemplo

```
┌─ anxionOS Agent Dialogue (live) — issue: all ─────────┐
│ 08:09 │ Lucas Mendes      │ debate  │ ANX-134 │ G1   │
│       │ @marcus, prefiro outbox no mesmo UoW...        │
│ 08:09 │ Marina Ferreira   │ desafio │ ANX-221 │ G1   │
│       │ @lucas, evidência de boundaries?               │
└────────────────────────────────────────────────────────┘
```

## Tab dedicado (recomendado)

1. Abra um terminal no Cursor ou iTerm/Terminal.app
2. `cd` para a raiz do repo
3. Execute `npm run orchestration:terminal` e **deixe rodando**
4. Trabalhe normalmente nos outros terminais — o painel mostra novos broadcasts automaticamente

## tmux / screen

Divida a sessão para ver código e diálogo lado a lado:

```bash
# tmux
tmux new-session -s anxion
# Ctrl+B, " — split horizontal
# painel inferior:
npm run orchestration:terminal

# screen
screen -S anxion
# Ctrl+A, S — split
# na região inferior:
npm run orchestration:terminal
```

## Auto-print após broadcast

Quando o terminal é interativo (`stdout.isTTY`), cada `orchestration:broadcast` imprime um one-liner colorido:

```
08:09 Lucas Mendes debate ANX-134 G1 — @marcus, prefiro outbox no mesmo UoW...
```

Forçar mesmo sem TTY no stdout:

```bash
export DIALOGUE_TERMINAL=1
npm run orchestration:broadcast -- --from-persona backend-executor --type status --issue ANX-N --body "…"
```

O hook `agent-orchestration.mjs` (stop) define `DIALOGUE_TERMINAL=1` quando `stderr.isTTY`, para pending-broadcasts também aparecerem.

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `terminal-format.mjs` | ANSI, wrap, cores, painel |
| `terminal-panel.mjs` | Live viewer (`orchestration:terminal`) |
| `tail-formatted.mjs` | Snapshot formatado (`orchestration:tail`) |
| `.cursor/orchestration-runtime/dialogue/dialogue.jsonl` | Log append-only |

## Relacionados

- [RUNBOOK.md](./RUNBOOK.md) — publicar e ler mensagens
- [NO-SILENT-WORK.md](./NO-SILENT-WORK.md) — política de visibilidade
- [agent-dialogue/README.md](./agent-dialogue/README.md) — CLI completo
