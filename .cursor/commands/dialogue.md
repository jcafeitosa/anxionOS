# Dialogue

Exibir o thread de diálogo dos agentes **neste chat do Cursor**.

## O assistente DEVE

1. Executar `npm run orchestration:chat` (ou com filtros abaixo)
2. Colar **toda** a saída markdown na resposta — **sem resumir** nem omitir mensagens
3. Incluir o bloco desde `<!-- CURSOR_CHAT_DIALOGUE:` até o fim

## Comandos

```bash
npm run orchestration:chat
npm run orchestration:chat -- --issue ANX-N
npm run orchestration:chat -- --since 30m
npm run orchestration:chat -- --new-only
```

Alias (20 linhas, sem marcador Cursor): `npm run orchestration:show-dialogue`

Regra always-on: `.cursor/rules/dialogue-in-cursor-chat.mdc`
