---
type: orchestration-guide
title: Colaboração visível da equipe de agentes
status: active
---

# Colaboração visível da equipe

Como cada papel participa do diálogo on-screen, integrado ao pipeline G0–G7 e ao taskboard Dashi.

**Política No Silent Work:** [NO-SILENT-WORK.md](./NO-SILENT-WORK.md) — nunca sozinho, nunca em silêncio. Cada papel publica nos marcos obrigatórios (`ack`, `status`, `handoff`, `verdict`, …).

## Chat Cursor — participação visível

Além do dialogue JSONL, a equipe fala **no chat do Cursor** com blocos por persona. Ver [CHAT-PARTICIPATION.md](./CHAT-PARTICIPATION.md).

- Orquestradora coordena; executores e críticos respondem em voz própria.
- Cada fala no chat → `npm run orchestration:speak` (espelha em `dialogue.jsonl`).
- Roundtable: `/team` · regra `agents-in-chat.mdc`.

## Papéis e responsabilidade no chat

| Papel | Publica | Lê | Não faz |
| --- | --- | --- | --- |
| **Orquestrador** | Atribuição, escalonamento, resumo G6 | Toda thread da issue | Parecer técnico substituindo especialista |
| **Executor** | status, handoff G1, response | Challenges do crítico | Auto-declarar PASS |
| **Crítico** | challenge, verdict G1 | Handoffs e responses | Aprovar G2–G5 |
| **Code Review** | verdict G2, achados | Diff + contexto issue | Corrigir código silenciosamente |
| **QA** | verdict G3, repro steps | Pacote candidato | Alterar critério para passar teste |
| **Security** | verdict G4 | Fluxos de confiança | Certificar “100% seguro” |
| **Red Team** | verdict G5 | Escopo sandbox | Atacar fora do autorizado |

**Roster operacional:** [AGENT-ROSTER.md](./AGENT-ROSTER.md) · **Limites:** [COMPETENCE-BOUNDARIES.md](./COMPETENCE-BOUNDARIES.md) · **Protocolo:** [INTER-AGENT-PROTOCOL.md](./INTER-AGENT-PROTOCOL.md)

Personas detalhadas: [brain/notes/anxionos-team-personas.md](../../brain/notes/anxionos-team-personas.md)

## Thread exemplo (ANX-456 — idempotência de ordem)

> **Coordenação · IA** · `status` · ANX-456  
> @executor escopo fechado: preservar chave de idempotência em retry pós-timeout. Critérios C1–C3 na issue. Crítico: sessão `critic-2`.

> **Executor · IA** · `status` · ANX-456  
> Entendi C1–C3. Próximo marco: teste de replay + timeout. @critico, aviso quando r1 estiver no pacote.

> **Executor · IA** · `handoff` · ANX-456 · G1  
> @critico, r1 pronto. Replay mantém chave original.  
> _evidence: `bun test backend/tests/execution/idempotency.test.ts`_

> **Crítico · IA** · `challenge` · ANX-456 · G1  
> Cobre replay após sucesso. Falta timeout **antes** da confirmação — decide se G1 passa.  
> _replyTo: `<id-handoff-r1>`_

> **Executor · IA** · `response` · ANX-456 · G1  
> Reproduzi timeout-before-ack; r2 inclui teste novo e fix no adapter.

> **Crítico · IA** · `verdict` · ANX-456 · G1 · **PASS**  
> C1–C3 demonstrados em r2. @coordenacao, encaminhar Code Review.

> **Code Review · IA** · `verdict` · ANX-456 · G2 · **CHANGES_REQUIRED**  
> Bloqueante: chave recriada após restart do adapter (`execution-unit-of-work.ts`). Sugestão de rename de helper: não bloqueante.

> **Executor · IA** · `handoff` · ANX-456 · G1  
> r3 corrige persistência da chave. @critico, r2 deixou de ser candidato — revalidação G1 necessária.

> **Coordenação · IA** · `status` · ANX-456  
> G1+G2 revalidados em r3. @qa pacote em anexo lógico na issue; G3 pendente.

> **QA · IA** · `verdict` · ANX-456 · G3 · **PASS**  
> Integração + restart reproduzidos. @security evidências sanitizadas na issue.

> **Security · IA** · `verdict` · ANX-456 · G4 · **PASS**  
> Escopo avaliado OK. @red-team atenção à janela de revogação no relatório.

> **Red Team · IA** · `verdict` · ANX-456 · G5 · **PASS**  
> Cenários sandbox executados; cleanup registrado.

> **Coordenação · IA** · `verdict` · ANX-456 · G6 · **PASS**  
> Conjunto r3 integrado. Issue → `in_review` para aceite humano. Sem deploy.

## Integração com taskboard

| Evento dialogue | Ação taskboard |
| --- | --- |
| Início trabalho | `move ANX-N in_progress` |
| Handoff / verdict formal | `--mirror-taskboard` no CLI |
| Bloqueio | `move ANX-N blocked` + comentário |
| G6 completo | `move ANX-N in_review` |
| Aceite humano | `done` (somente explícito) |

Status e ownership **sempre** no Dashi — o dialogue não substitui o board.

## Ler contexto antes de falar

1. `npm run orchestration:dialogue -- read --issue ANX-N`
2. `node scripts/taskboard.mjs get ANX-N`
3. Documentos OpenKnowledge referenciados na issue

## Interação livre + sem invasão

- Qualquer persona pode `@mention` qualquer outra ([INTER-AGENT-PROTOCOL.md](./INTER-AGENT-PROTOCOL.md)).
- Consultar ≠ invadir: perguntar é OK; editar domínio alheio exige handoff ao owner.
- `npm run orchestration:who -- --can-i "<ação>"` antes de agir em domínio desconhecido.

## Independência

- Crítico ≠ executor (agentId distintos)
- Revisor que corrige código vira executor da correção
- Novo digest invalida PASS anterior — registrar `correlationId` ou candidato rN no body
