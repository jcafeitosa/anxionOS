# Comunicação entre Agentes

Camada operacional de diálogo visível, personas humanas e protocolo de mensagens para o pipeline G0–G7.

**Documentos canônicos:**
- [PERSONAS.md](./PERSONAS.md) — roster com nomes humanos
- [INTERACTIONS.md](./INTERACTIONS.md) — 24 tipos de interação
- [EXAMPLE-THREADS.md](./EXAMPLE-THREADS.md) — threads fictícias
- [TEAM.md](./TEAM.md) — papéis e gates

**Posturas (brain/ local):** [brain/notes/anxionos-team-personas.md](../../brain/notes/anxionos-team-personas.md)

---

## Princípios

1. **Nome humano no chat** — Lucas, Marina, Renata; nunca `Agent-1`.
2. **PT-BR** — mensagens curtas, contexto + destinatário + próximo passo.
3. **Issue sempre** — `ANX-*` em handoffs, verdicts e escalations.
4. **Silêncio ≠ aceite** — gates exigem `verdict` ou `approve` explícitos.
5. **Log append-only** — `.cursor/orchestration-runtime/dialogue/dialogue.jsonl`.

---

## Runtime

| Componente | Caminho |
| --- | --- |
| Protocolo + Zod | `agent-dialogue/protocol.mjs` |
| Personas | `agent-dialogue/personas.mjs` |
| Log JSONL | `agent-dialogue/dialogue-log.mjs` |
| CLI | `agent-dialogue/broadcast.mjs` |

```bash
npm run orchestration:dialogue -- --help
npm run orchestration:broadcast -- --from-persona backend-executor \
  --to-persona backend-critic --issue ANX-134 --type handoff --body "..."
```

---

## Persona → interações padrão

| Persona | Slug | Inicia | Responde a |
| --- | --- | --- | --- |
| Renata Oliveira | `orchestrator` | handoff, vote, delegate | escalate |
| Lucas Mendes | `backend-executor` | status, response, collab, pair | challenge, handoff |
| Marina Ferreira | `backend-critic` | challenge, verdict | handoff G1, response |
| Marcus Chen | `architect` | debate, share | consult, debate |
| Helena Duarte | `researcher` | share | research |
| Fernanda Aoki | `code-review-lead` | verdict, review | review (G2) |
| Eduardo Nakamura | `qa-lead` | verdict | review (G3) |
| Isabella Morales | `security-lead` | verdict | review (G4) |
| Thiago Martins | `red-team-lead` | verdict | review (G5) |
| Juliana Pereira | `github-lead` | status, review | handoff PR |
| André Kuznetsov | `docs-lead` | share | handoff docs |

Pares críticos: Lucas↔Marina, Camila↔Paulo, Rafael↔Bia, Diego↔Gustavo.

---

## Esquema de mensagem (resumo)

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `id` | UUID | sim |
| `timestamp` | ISO-8601 UTC | sim |
| `from.persona` | `{ name, role, team }` | recomendado |
| `type` | 17 tipos | sim |
| `issueId` | `ANX-N` | handoffs/verdicts |
| `threadId` | string | debate/collab/vote |
| `vote` | `{ options[], votes[], deadline? }` | type=vote |

Validação: Zod em `protocol.mjs`.

---

## Escalonamento

3 ciclos sem convergência → `escalate` para `@renata`. Participante ausente → `escalate`, nunca PASS inferido.
