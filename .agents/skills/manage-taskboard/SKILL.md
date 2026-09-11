---
name: manage-taskboard
description: "Use when work must be tracked in the Dashi/Codex Taskboard: creating or claiming issues (ANX-*), moving status, posting signed comments with evidence, checking board health, or coordinating claims across parallel chats. Triggers on an issue id like ANX-457, 'claim this issue', 'move to in_review', 'taskboard', 'board offline', or any request to track development work. Covers the repo wrapper (scripts/taskboard.mjs), taskctl, thread binding, locks, and the dual-board routing between Dashi (product) and the Cursor goal registry (framework)."
whenToUse: "Any task that will create, modify, review or commit repository work; also when a question is raised about issue status, ownership or evidence."
---

# Manage Taskboard (Dashi) no DeepSeek Harness

O board é **fonte de verdade do status** e **pré-condição de execução**: sem issue `ANX-*` claimada, não existe trabalho válido. Isto vale para micro-fix, doc pública, código e commit.

## 1. Gate de aborto (sempre, sem atalhos)

```bash
npm run taskboard:ensure || exit 1     # exit != 0 → PARAR
npm run taskboard:context
```

**Board offline = PARAR.** Não improvisar lista mental, issue fantasma, GitHub issue ou "registro depois". Informar o usuário e pedir para subir o serviço (`http://127.0.0.1:47823`).

**Única exceção:** responder pergunta do usuário **sem alterar arquivos** (modo consulta). Ainda assim, se a resposta exigir ler o board, rode `ensure` primeiro.

## 2. Thread binding no DSH

O wrapper exige um thread id. O DSH não define `CODEX_THREAD_ID`; use o id da sessão:

```bash
export CURSOR_THREAD_ID="dsh-$DSH_SESSION_ID"
```

Persistir numa variável estável da sessão (ex.: `/tmp/anx_thread_id`) e reexportar em **todo** comando de escrita — cada chamada bash é um shell novo.

## 3. Rotina de trabalho

| Passo | Comando |
| --- | --- |
| Health | `npm run taskboard:ensure` |
| Contexto | `npm run taskboard:context` |
| Listar | `npm run taskboard:list --compact` ou `taskctl issue list --project <PID> --json` |
| Ler issue | `taskctl issue get ANX-N --json` (traz `version` para CAS) |
| Criar | `node scripts/taskboard.mjs create --title "..." --status todo --priority high --labels backend,for-claude --description "..."` |
| Claim | `node scripts/taskboard.mjs move ANX-N in_progress --persona <slug>` |
| Comentar | `taskctl comment add ANX-N --body-file /tmp/body.md --thread-id "$CURSOR_THREAD_ID"` |
| Revisão | `node scripts/taskboard.mjs move ANX-N in_review --persona <slug>` |
| Done | somente com aceite explícito do usuário/revisor |

**Corpos longos:** escrever em arquivo e usar `--body-file` — evita quebrar markdown com escapes de shell.

**Claims concorrentes:** `taskctl issue move` aceita `--if-version N` (CAS). Leia a versão antes de mover. Para lock explícito entre chats:

```bash
npm run orchestration:coordination -- status --issue ANX-N
npm run orchestration:coordination -- claim-check --issue ANX-N --persona <slug> --acquire
```

Se `status` mostrar `CONFLICT` ou o lock pertencer a outra thread: **não trabalhar** — coordenar handoff/release antes. Um `session start` com thread errada gera lock `unknown:<persona>`; encerre (`orchestration:session -- end --persona <slug> --force`) e reabra com o thread id correto.

## 4. Status permitidos

`backlog` (não executar sem autorização) → `todo` (claimável) → `in_progress` (dono ativo) → `in_review` (entregue, gates pendentes) → `done` (só com aceite). Também `blocked` e `canceled`.

- `in_review` **nunca** significa aprovado.
- Proibido `done` com ressalvas, follow-up MEDIUM pendente ou filho bloqueador aberto.
- Fechar sessão com issue desatualizada é violação (status que não reflete o trabalho real).
- Ao corrigir a própria entrega já submetida: voltar para `in_progress`.

## 5. Evidência nos comentários

Todo comentário relevante registra **como** foi verificado, não só o que mudou:

```markdown
Comando: cd backend && bunx tsc --build && bun run lint && bun test --max-concurrency=1
Resultado: exit 0 / exit 0 / 1575 pass, 3 skip, 1 fail (PostgreSQL offline)
Commit: <sha> — <título>
Arquivos: <paths>
```

Regras de escopo e atribuição:

- Trabalho técnico exige pacote de contexto na issue **antes** de alterar código: documento + seção, status decisório, requisito, módulo proprietário, camada, arquivos previstos, armazenamento, eventos e testes de aceitação.
- Nunca atribuir à sua entrega mudanças de outra sessão. Registre revisão e arquivos não commitados relevantes; se o working tree tem trabalho alheio, commit isolado/rótulo explícito (ex.: `chore: formatter (sessão paralela)`).
- Ao commitar, referencie `ANX-*` no título ou corpo.

## 6. Dual-board (não misturar na mesma unidade)

| Tipo de trabalho | Board | Como registrar |
| --- | --- | --- |
| Produto: `backend/`, `frontend/`, `docs/` públicas, slices `ANX-*` | **Dashi** | issue `ANX-*` claimada |
| Framework/meta: `.cursor/orchestration/`, `.agents/skills/`, harness DSH, personas, tooling de agente | **Cursor goal registry** | `npm run orchestration:goals -- register --persona <slug> --id fw-<topic> --issue ANX-N --objective "..."` |

O registry do framework **exige** um `ANX-N` de referência — crie uma issue de tooling/framework no Dashi e referencie-a, mas mantenha o rastro de execução do framework no registry (`scope: framework`, `board: cursor`). Não mova uma unidade de produto para o registry nem vice-versa.

Docs: `.cursor/orchestration/TASKBOARD-ROUTING.md` · `.cursor/orchestration/mandatory-compliance.mdc`.

## 7. Sinais de que algo está errado

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| `Write operations need CODEX_THREAD_ID, CLAUDE_CODE_SESSION_ID, or CURSOR_THREAD_ID` | thread id não exportado | `export CURSOR_THREAD_ID="dsh-$DSH_SESSION_ID"` |
| `Binding identity requires project id, kind, host id, and workspace path` (observado nesta sessão em `taskctl issue move --binding-thread-id` sem os demais campos) | binding incompleto | mover via wrapper com `--persona`, ou passar todos os campos de binding |
| `CROSS_CHAT_CLAIM_CONFLICT` | outra conversa na mesma issue | `orchestration:coordination status` → handoff/release |
| `MISSING_ISSUE_LOCK` | lock de outra thread | adquirir lock (`claim-check --acquire`) antes de editar |
| Comentário aceito mas não aparece na issue | postou em outro projeto | conferir `taskboard:context` (project resolvido por `workspacePath`) |
