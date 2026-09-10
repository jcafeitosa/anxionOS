# Compliance Obrigatorio — Enforcement Layer

Documento mestre de **enforcement** da orquestracao anxionOS. Regras aqui sao **mandatorias e verificaveis** — nao documentacao opcional.

**Violacao = trabalho invalido** (mesma severidade que zero-trabalho-fora-do-board em AGENTS.md).

Relacionados: [COMPLIANCE.md](./COMPLIANCE.md) · [NO-SILENT-WORK.md](./NO-SILENT-WORK.md) · [MULTI-CHAT-COORDINATION.md](./MULTI-CHAT-COORDINATION.md) · [PIPELINE.md](./PIPELINE.md) · [ZERO-POLICIES.md](./ZERO-POLICIES.md) · regra `mandatory-orchestration.mdc`

**Catálogo Políticas Zero (Z0–Z21):** [ZERO-POLICIES.md](./ZERO-POLICIES.md) — fonte única com enforcement, códigos compliance e fix. CLI: `npm run orchestration:zero-policies`. Capacidades completas: [AGENT-CAPABILITIES.md](./AGENT-CAPABILITIES.md).

---

## Sequencia obrigatoria (sempre, sem atalhos)

| # | Gate | Comando / acao |
| --- | --- | --- |
| 1 | AGENTS.md | Ler integralmente na sessao (G0) |
| 2 | SCOPE.md | Ler fronteira equipe Cursor vs produto (G0.1) |
| 3 | Taskboard | `npm run taskboard:ensure` — falhou = **PARAR** |
| 3b | Boot framework | `npm run orchestration:boot -- --persona SLUG` (meta-tooling: `--skip-taskboard`) |
| 4 | Claim | Issue `ANX-*` em `in_progress` com thread binding |
| 4b | Multi-chat | `npm run orchestration:coordination -- claim-check --issue ANX-N` — ver [MULTI-CHAT-COORDINATION.md](./MULTI-CHAT-COORDINATION.md) |
| 4c | Lock (Z21) | `claim-check --issue ANX-N --persona SLUG --acquire` + comentario `CLAIM + LOCK` na issue |
| 5 | Sessao | `npm run orchestration:session -- start --persona SLUG --issue ANX-N` |
| 6 | Workflow | `npm run orchestration:workflow -- sync --persona SLUG --issue ANX-N` |
| 7 | Compliance G0 | `npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG` |
| 8 | Ack | Broadcast `ack` **antes** de qualquer edicao de codigo |
| 9 | Status | A cada 10 min de sessao ativa — broadcast `status` |
| 10 | Critico | Executor sempre pareado com `criticSlug` na mesma issue |
| 11 | Gates G0-G7 | Pipeline completo conforme [PIPELINE.md](./PIPELINE.md) |
| 12 | Tooling G0.14 | graphify/serena/archify/MCPs — [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) |
| 13 | Fim | `handoff`/`verdict` + `orchestration:session end` |

---

## Verificacao executavel

```bash
# Gate G0 antes de codar
npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG

# Checagem completa durante trabalho
npm run orchestration:compliance -- --persona SLUG --issue ANX-N

# Antes de encerrar turno com alteracoes
npm run orchestration:compliance -- --pre-commit --issue ANX-N --persona SLUG
```

- **Exit 0** = compliant — pode prosseguir
- **Exit 1** = violacoes listadas com comandos `fix:`

---

## Proibido (enforcement)

1. Codar sem issue `in_progress` claimada
2. Codar sem `ack` no dialogue apos delegacao
3. Executor Level C sem crítico pareado — violação `MISSING_CRITIC_PAIR` (`criticSlug` + sessão do crítico + ack no dialogue)
4. Trabalho cross-domain sem `consult`/`handoff` ao owner
5. Silent work — >10 min sem broadcast; turno com codigo sem `pending-broadcast.json`
6. Ignorar warnings `SILENCE` / `MISSING_ACK` / `NO_SESSION` do monitor Level C
7. Pular gates G0-G7 ou declarar `done` sem aceite G7
8. Codar sem lock ativo na thread (`MISSING_ISSUE_LOCK`) — adquirir lock antes de editar
9. Claimar issue ja bloqueada por outro chat — violacao `CROSS_CHAT_CLAIM_CONFLICT` (fix: `orchestration:coordination status` + handoff ou `release`)

---

## Fluxo de compliance gate

```mermaid
flowchart TD
  A[Inicio do turno] --> B{AGENTS.md + SCOPE lidos?}
  B -->|Nao| X[VIOLACAO — abortar]
  B -->|Sim| C[taskboard:ensure]
  C -->|Falhou| X
  C -->|OK| C2[orchestration:boot]
  C2 --> D[Issue in_progress claimada?]
  D -->|Nao| X
  D -->|Sim| E[session start + workflow sync]
  E --> F[compliance --pre-work]
  F -->|Exit 1| X
  F -->|Exit 0| G[ack no dialogue]
  G --> H[Trabalho tecnico]
  H --> I{Sessao > 10min?}
  I -->|Sim| J[status broadcast]
  J --> H
  I -->|Nao| H
  H --> K[Fim turno]
  K --> L{compliance pass OU pending-broadcast?}
  L -->|Nao| X
  L -->|Sim| M[handoff/verdict + session end]
```

---

## Escalacao

| Detector | Acao |
| --- | --- |
| `orchestration:workflow -- monitor --level C` | Warnings SILENCE / MISSING_ACK / NO_SESSION |
| `orchestration:silence-watch` (cron 5m) | >10 min sem broadcast |
| Hook `stop` | Sessao ativa sem broadcast no turno |
| `orchestration:compliance` exit 1 | Lista violacoes + fix commands |
| `MISSING_ISSUE_LOCK` | Issue sem lock desta thread — Z21; `claim-check --acquire` + comentario CLAIM |
| `CROSS_CHAT_CLAIM_CONFLICT` | Outro `CURSOR_THREAD_ID` ativo na mesma issue — ver [MULTI-CHAT-COORDINATION.md](./MULTI-CHAT-COORDINATION.md) |
| `pending-escalate.json` | Renata (CTO) decide — block / dismiss / corrigir |

Path de escalacao: **monitor detecta → silence-watch → decisao Renata** via `orchestration:proactive -- act`.

---

## Integracao hooks Cursor

| Hook | Enforcement |
| --- | --- |
| `beforeSubmitPrompt` | Pre-check leve — aviso se sessao ativa sem issue |
| `stop` | Exige `compliance --pre-commit` pass **OU** `pending-broadcast.json` escrito |

Ver [.cursor/hooks/README.md](../hooks/README.md).

---

## Escopo

Aplica-se **somente** a equipe Cursor de orquestracao ([SCOPE.md](./SCOPE.md)) — nao confundir com agentes institucionais do produto (`backend/modules/agents/`).

Violacoes → `npm run orchestration:compliance`
