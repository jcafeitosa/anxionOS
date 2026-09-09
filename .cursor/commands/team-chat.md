# Team Chat (`/team`)

Roundtable: orquestradora reúne input das personas relevantes para a issue/sessão atual e responde no **formato multi-speaker** do chat Cursor.

## O assistente DEVE

1. Identificar issue ativa (`ANX-*` em `in_progress` ou citada pelo usuário).
2. Ler contexto: `node scripts/taskboard.mjs get ANX-N` + `npm run orchestration:chat -- --issue ANX-N`.
3. Selecionar personas (mínimo 2): orquestrador + executor/crítico **ou** especialista da gate.
4. Responder com **blocos separados por persona** (ver [CHAT-PARTICIPATION.md](../orchestration/CHAT-PARTICIPATION.md)).
5. Publicar **cada fala** no dialogue via `npm run orchestration:speak`.
6. Ao final, executar `npm run orchestration:chat -- --new-only` e colar saída se houver mensagens não redundantes.

## Quando usar

- Usuário pede opinião da equipe, roundtable ou `/team`.
- Início de sessão multi-agente após claim de issue.
- Impasse entre executor e crítico — Renata facilita com Marcus se arquitetura.
- Planejamento antes de implementação (G0).

Docs: [CHAT-PARTICIPATION.md](../orchestration/CHAT-PARTICIPATION.md) · [PERSONAS.md](../orchestration/PERSONAS.md)
