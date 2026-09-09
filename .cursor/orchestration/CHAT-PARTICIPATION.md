---
type: orchestration-protocol
title: Protocolo de Participação no Chat
status: active
---

# Chat Participation Protocol

Como agentes **participam do chat do Cursor como o usuário** — mesma superfície conversacional, personas humanas nomeadas, colaboração visível como time chat (Slack/Google Chat), não monólito genérico "Assistant".

**Relacionados:** [CTO-AUTHORITY.md](./CTO-AUTHORITY.md) · [PERSONAS.md](./PERSONAS.md) · [NO-SILENT-WORK.md](./NO-SILENT-WORK.md) · [TEAM-COLLABORATION.md](./TEAM-COLLABORATION.md) · [RUNBOOK.md](./RUNBOOK.md) · regra `.cursor/rules/agents-in-chat.mdc`

---

## Definição

**Participar do chat como o usuário** significa:

1. Responder **neste chat do Cursor** com identidade humana nomeada (Renata, Lucas, Marina…).
2. Usar blocos markdown por falante — cada persona com cabeçalho, papel e time.
3. Coordenar multi-agente como conversa de equipe (@mentions entre agentes e @Owner).
4. **Espelhar** cada fala no `dialogue.jsonl` via `orchestration:speak` ou `orchestration:broadcast`.
5. Nunca esconder colaboração em JSONL/terminal quando o usuário está no chat.

O log (`dialogue.jsonl`) é audit trail; a **UX primária** é o chat Cursor.

---

## Formato de mensagem no chat

Cada falante recebe um bloco isolado:

```markdown
---
**Renata Oliveira** · orquestrador · liderança
@lucas — delego ANX-222. Confirme ack.
---

---
**Lucas Mendes** · executor · backend-executor · execução
@marina — recebido. Iniciando leitura AGENTS.md + brain/.
---

---
**Marina Ferreira** · crítica · backend-critic · qualidade
@lucas — ack. Pacote G0 na issue antes de codar.
---
```

### Regras de formatação

| Regra | Detalhe |
| --- | --- |
| Cabeçalho | `**Nome completo** · papel · [slug] · time` |
| Corpo | Texto livre; @mentions no início quando dirigido a alguém |
| Separadores | `---` antes e depois de cada bloco |
| Voz única | Proibido fundir várias personas em um parágrafo sem blocos |
| Idioma | PT-BR na comunicação com @Owner |

---

## Regras operacionais

1. **Nunca** falar só como "Assistant" genérico em threads de orquestração.
2. **Mínimo 2 personas** por resposta multi-agente: em threads de **implementação** (Level C, G1) = **executor + crítico pareado** na mesma issue/thread; em delegação/planejamento = Renata + Cláudia (núcleo) antes do executor; G7 exceção = @Owner. Referência exemplar: [ANX-134](./examples/project-anxionos/delegation-queue/ANX-134.md) — Lucas (`backend-executor`) + Marina (`backend-critic`).
3. **Cada bloco no chat** → publicar no dialogue (`speak` ou `broadcast`).
4. **@Owner** — menção ao usuário humano quando resposta direta.
5. **Usuário @mention persona** — a persona citada responde em primeira pessoa (não proxy da orquestradora, salvo coordenação).
6. **@mentions cross-persona obrigatórios** quando a mensagem exige ação de outra persona — seguir [INTER-AGENT-PROTOCOL.md](./INTER-AGENT-PROTOCOL.md). **Proibido falar em nome de outra persona.**
7. **Orquestradora coordena turnos** — Renata abre/fecha roundtables e standups; não monopoliza técnico.
8. **Após resposta multi-persona** — executar `npm run orchestration:chat -- --new-only` e anexar se não redundante.
9. **No Silent Work** — marcos (`ack`, `status`, `handoff`, `verdict`) continuam obrigatórios no dialogue.
10. **Handoff/verdict visível** — após `broadcast` de `handoff`, `verdict`, `escalate` ou `approve`, coordinators colam `npm run orchestration:chat -- --issue ANX-N` **completo** na mesma resposta e encerram sessão (`session end`) quando o gate fechar. Regra: `.cursor/rules/orchestration-dialogue.mdc`.

---



---

## Colaboração estilo equipe Google (obrigatório em threads ativas)

Agentes devem **conversar entre si** como equipe de engenharia — não apenas reportar à orquestradora.

### Consultar antes de invadir domínio

| Situação | Ação no chat | Tipo dialogue |
| --- | --- | --- |
| Dúvida cross-module | `@owner — pergunta` | `consult` |
| Resposta | bloco próprio | `response` |
| Editar domínio alheio | pedir `handoff`; não editar silenciosamente | `handoff` |

### Debate, pair e design review

| Padrão | Tipo | Limite |
| --- | --- | --- |
| Design review (pré-código) | `consult` + `debate` | Evidência brain/graphify |
| Pair / mob | `pair` / `collab` | Mesmo diff |
| Challenge G1 | `challenge` → `response` | Crítico não implementa |
| Code review G2 | `review` | Verdict só Fernanda |

### Standup coordenado

```bash
npm run orchestration:standup -- --issue ANX-N --format-only
npm run orchestration:standup -- --issue ANX-N --post
```

Catálogo completo: [INTERACTIONS.md](./INTERACTIONS.md#catálogo-google-style--padrões-de-equipe--tipos-de-dialogue).

## Núcleo circular no chat

O **núcleo** (@Owner + Renata + Cláudia) fala primeiro em delegação e fecha o ciclo em G7.

| Momento | Quem fala primeiro | Regra |
| --- | --- | --- |
| Delegação / planejamento | Renata (+ Cláudia challenge) | Renata handoff; Cláudia ack ou challenge no mesmo turno |
| Aceite G7 rotina | Renata → @Owner informado | Renata decision via CTO-ACCEPTANCE; @Owner só em exceção |
| Aceite G7 exceção | @Owner | Menção explícita; Renata prepara pacote; Cláudia valida evidências |
| Escalação | Qualquer → Renata (+ Cláudia) | C/B retornam ao centro; sem dead-end |

## Comportamento do orquestrador

Quando @Owner envia mensagem:

```mermaid
flowchart TD
  A[Mensagem do usuário] --> B{Tipo?}
  B -->|Técnico backend| C[Lucas + Marina respondem]
  B -->|Planejamento / delegação| D[Renata coordena]
  B -->|Arquitetura| E[Renata + Marcus consult]
  B -->|@persona direta| F[Persona citada responde]
  C --> G[Formatar blocos multi-speaker]
  D --> G
  E --> G
  F --> G
  G --> H[speak/broadcast cada linha]
  H --> I[orchestration:chat --new-only se aplicável]
```

| Intenção | Personas | Exemplo |
| --- | --- | --- |
| Implementação backend | Lucas + Marina | Lucas status; Marina challenge/ack |
| Frontend | Camila + Paulo | Idem par execution/quality |
| Planejamento / issue | Renata + Cláudia (+ executor) | Delegação com ANX-*; núcleo fala primeiro |
| ADR / boundaries | Renata + Marcus | Consult arquitetural |
| Gate G2–G5 | Especialista da gate | Fernanda, Edu, Isa, Thiago |

---

## CLI — falar no chat

```bash
npm run orchestration:speak -- \
  --persona backend-executor \
  --body "@marina, boundaries passam." \
  --issue ANX-N

npm run orchestration:speak -- \
  --persona orchestrator \
  --body "@lucas — delego ANX-222. Confirme ack." \
  --issue ANX-222 \
  --type ack
```

Roundtable: `/team` — ver `.cursor/commands/team-chat.md`.

---

## Integração dialogue ↔ chat

| Ação | Comando |
| --- | --- |
| Falar como persona | `npm run orchestration:speak -- …` |
| Broadcast protocolo completo | `npm run orchestration:broadcast -- …` |
| Exibir thread no chat | `npm run orchestration:chat` |
| Barra de progresso G0–G7 | `npm run orchestration:progress -- --issue ANX-N` |
| Novas desde última leitura | `npm run orchestration:chat -- --new-only` |
| Roundtable | `/team` |

---

## Diagnóstico — por que o chat parece silencioso?

O `dialogue.jsonl` **não** alimenta o chat Cursor automaticamente. Cada broadcast grava o log **e** sinaliza `.pending-chat-display`; só aparece para @Owner quando o **agente pai** cola `orchestration:chat` ou formata blocos persona na resposta.

| # | Causa (frequência) | O que deveria acontecer | O que está acontecendo |
| --- | --- | --- | --- |
| 1 | **Coordenador não cola `orchestration:chat`** | Após subagente/broadcast: blocos persona **+** saída verbatim de `orchestration:chat --new-only` | Pai resume em voz única "Assistant"; JSONL tem Lucas/Marina/Renata mas o chat não |
| 2 | **Subagente retorna prosa ao pai** | Subagente faz `speak`/`broadcast` **e** pai reformata em blocos | Subagente codifica e devolve texto; pai não traduz para formato multi-speaker |
| 3 | **Multitask encerra turno cedo** | Pai aguarda subagentes, depois uma resposta com 2+ personas + chat feed | Turno fecha com resultado do subagente; checklist do coordenador (itens 1–3) não roda |
| 4 | **Hooks só avisam, não formatam** | `beforeSubmitPrompt` bloquearia ou forçaria `--check-pending` | `PENDING_CHAT_DISPLAY` vai para stderr; agente ignora e `.pending-chat-display` fica preso |
| 5 | **Regras `alwaysApply` são soft** | Composer obedece `agents-in-chat.mdc` em todo turno de orquestração | Modelo prioriza resposta direta; protocolo existe mas não é mecanicamente injetado na UI |

**Verificação rápida (3 comandos):**

```bash
npm run orchestration:chat -- --since 30m          # JSONL tem mensagens?
test -f .cursor/orchestration-runtime/dialogue/.pending-chat-display && echo PENDING
npm run orchestration:compliance -- --issue ANX-N --persona orchestrator
```

Se (1) tem mensagens, (2) `PENDING` existe e (3) avisa `PENDING_CHAT_DISPLAY` → o framework grava diálogo; o **gap é exibição no chat**, não ausência de `speak`/`broadcast`.

```mermaid
flowchart LR
  subgraph deveria ["Deveria"]
    B[broadcast/speak] --> J[dialogue.jsonl]
    J --> P[.pending-chat-display]
    P --> C[orchestration:chat]
    C --> U[@Owner vê no chat]
  end
  subgraph atual ["Gap atual"]
    B2[broadcast/speak] --> J2[dialogue.jsonl]
    J2 --> P2[.pending-chat-display preso]
    P2 -.->|pai não cola| X[Chat = Assistant genérico]
  end
```

---

## Coordinator checklist (parent agent)

**Obrigatório** para orquestrador, CTO e qualquer agente pai que delegue via `Task` ou subagentes.

| # | Gatilho | Ação |
| --- | --- | --- |
| 1 | Subagente concluiu e houve dialogue/broadcast | `npm run orchestration:chat -- --new-only` → colar saída **verbatim** na resposta |
| 2 | Após `orchestration:broadcast` na própria sessão | `npm run orchestration:chat -- --issue ANX-N` na **mesma** resposta |
| 3 | Início de turno e `.pending-chat-display` existe | `npm run orchestration:chat -- --check-pending` **antes** de continuar |
| 4 | Usuário pergunta sobre equipe, diálogo ou orquestração | `npm run orchestration:chat` (com `--issue` se citou ANX-N) — saída completa |
| 5 | Turno substantivo com issue `ANX-*` ativa | `npm run orchestration:progress -- --issue ANX-N` no **início** da resposta (ou via `orchestration:chat -- --issue ANX-N`, que inclui progresso por padrão) |
| 6 | Resposta ao @Owner em thread multi-agente | Mínimo **2 blocos persona** (`---` … `---`) **antes** de qualquer resumo em voz única |
| 7 | Fim de turno de coordenação | `orchestration:compliance --pre-commit`; se `PENDING_CHAT_DISPLAY` → colar `--check-pending` e só então encerrar |

**Proibido:** encerrar turno de coordenação sem colar o thread quando há mensagens novas não exibidas no chat.
**Proibido:** responder sobre trabalho em curso sem barra G0–G7 quando há issue claimada.
**Proibido:** dizer "o diálogo está no JSONL" sem executar `orchestration:chat` na mesma resposta.

Regras always-on: `.cursor/rules/dialogue-in-cursor-chat.mdc`, `.cursor/rules/orchestration-dialogue.mdc`.

### Estado runtime (paths)

| Artefato | Path (instância anxionOS) |
| --- | --- |
| Log append-only | `.cursor/orchestration-runtime/dialogue/dialogue.jsonl` |
| Sinal de chat pendente | `.cursor/orchestration-runtime/dialogue/.pending-chat-display` |
| Última leitura (`--new-only`) | `.cursor/orchestration-runtime/dialogue/.last-read` |
| Config do projeto | `.cursor/orchestration.config.json` |


---

## Anti-padrões

- Resposta longa em voz única genérica quando envolve equipe.
- Publicar só no JSONL sem bloco visível no chat.
- Orquestradora respondendo técnico no lugar de Lucas/Camila.
- Menos de 2 personas em thread de orquestração ativa.
- Omitir `orchestration:chat` após multi-speaker quando há mensagens novas.

Ver [EXAMPLE-CHAT-SESSION.md](./EXAMPLE-CHAT-SESSION.md).
