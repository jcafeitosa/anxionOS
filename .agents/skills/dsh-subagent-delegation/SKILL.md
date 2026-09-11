---
name: dsh-subagent-delegation
description: "Use when composing the prompt for any technical subagent in the DeepSeek Harness — executors, critics, G2-G5 reviewers, auditors, or fan-out workers. Provides the mandatory delegation package (identity, board gate, scope, DSH tooling block, evidence rules, return format) and the differences from the legacy Cursor Task prompt (no subagent_type, no Cursor MCPs, no persona-only chat blocks). Triggers before calling subagent, subagent_fork or workflow for repository work."
whenToUse: "Before every subagent/subagent_fork/workflow call that touches this repository."
---

# Pacote de delegação DSH (obrigatório em todo subagente técnico)

Subagentes **não veem esta conversa**. O prompt precisa ser autossuficiente: identidade, escopo, gates, ferramentas disponíveis, critérios de aceite e formato de retorno.

## 1. Bloco obrigatório (copiar e adaptar)

```markdown
Read AGENTS.md at the repository root first. It is the canonical instruction file for this repo.

## Papel e unidade de trabalho
- Papel: <backend-executor | backend-critic | code-reviewer | qa | security | red-team | researcher>
- Issue: ANX-N (status atual: <in_progress|in_review>) — leia a issue e os comentários antes de agir
- Repositório: o working dir do subagente já é a raiz do repo; use caminhos relativos
- Owner do módulo: <path do módulo/arquivo sob revisão>

## Escopo exato
Entregar: <critérios verificáveis, um por linha>
Não fazer: <fora de escopo explícito>
Dependências/contratos que você DEVE respeitar: <ADR, spec, decisão, com caminho e seção>

## Gate de board (obrigatório antes de qualquer edição)
npm run taskboard:ensure || exit 1     # falhou = PARAR e reportar bloqueio, não improvisar
export CURSOR_THREAD_ID="dsh-$DSH_SESSION_ID"
# claim apenas se você for o executor da issue; revisores NÃO movem a issue do executor

## Ferramentas que você tem (use; não descreva)
- Shell (bash) — rode lint/tsc/testes de verdade; proibido "execute X" sem executar
- read / grep / glob / edit / write — leitura e edição de arquivos
- web_search / web_fetch — fatos externos, com URL citada
- subagent / workflow — apenas se o seu escopo exigir fan-out
NÃO existem aqui: Cursor Task, MCPs (serena, code-review-graph, playwright, supermemory, context7).
Não invente ferramenta; se precisar de algo que não tem, reporte.

## Verificação obrigatória (produza a evidência)
Para slice de **código de backend**:
```bash
cd backend && bunx tsc --build; bun run lint; bun test --max-concurrency=1
```
Para slice de **scripts/docs/tooling** (não há tsc/test de produto a rodar): execute o que o artefato permite — `node --check` no script, o runner do próprio artefato (ex.: `npm run orchestration:dsh-test`), lint do diretório aplicável — e diga explicitamente o que NÃO foi verificável.
Reporte exit codes e contagens reais. Se algo falhar por ambiente (ex.: PostgreSQL offline), diga isso e não trate como aprovação.

## Proibido (tolerância zero — invalida a entrega)
- Código incompleto, stub, `throw new Error("not implemented")`, ramo morto
- `TODO`/`FIXME`/`HACK` sem `ANX-*` rastreável
- Mock, placeholder ou dado fake em caminho de produção
- Valor hardcoded (URL, host, tenant/agency id, segredo, timeout mágico) sem fonte documentada
- Segredo, token, senha ou hash de credencial em event, DTO, log ou grafo
- `console.log`/`debugger` no diff; erro engolido (`catch {}`); código morto ou import não usado
- Declarar PASS sem oráculo executado; declarar gate que você não rodou

## Formato do retorno (obrigatório, conciso)
1. Disposição: PASS | CHANGES_REQUIRED | BLOCKED | NOT_APPLICABLE
2. Escopo revisado/entregue + arquivos com caminho completo
3. Evidência: comando → resultado (exit code, contagens)
4. Achados: severidade (critical/high/medium/low) + arquivo:linha + por que importa
5. Riscos residuais e o que NÃO foi verificado
6. Próximo gate sugerido
```

## 2. Diferenças em relação ao template Cursor

| Template Cursor | Equivalente DSH |
| --- | --- |
| `subagent_type: code-reviewer` | **não existe** — escolha `provider`/`model`/`reasoning_effort` via `list_subagent_models`, ou omita para herdar |
| `Task` tool para sub-tarefas | `subagent` / `subagent_fork` / `workflow` |
| MCPs (serena, code-review-graph, playwright, supermemory, context7) | inexistentes — bash + read/grep/glob/edit/write + web |
| "Responder só com blocos persona `---`" | convenção de chat do Cursor; aqui o valor está no **parecer com evidência**. Registre no dialogue via `orchestration:broadcast` quando o framework exigir |
| `graphify query` antes de Grep/Glob | opcional: `npm run graphify:index` existe no repo, mas `grep`/`glob` são o caminho primário |
| `orchestration:speak` / chat do Cursor | `orchestration:broadcast` (dialogue.jsonl) |

## 3. Seleção de modelo

- Deixe o default quando o papel é revisão de escopo pequeno.
- Use `list_subagent_models` antes de fixar provider/model para não inventar id.
- Papéis adversariais (Red Team) e revisões de contrato se beneficiam de esforço de raciocínio maior.
- Registre no comentário da issue qual rota foi usada quando isso afetar o resultado.

## 4. Contabilidade da delegação

Após despachar, mantenha a fila do framework verdadeira:

```bash
npm run orchestration:dispatch -- spawn-plan --json            # plano
node scripts/orchestration/dsh-dispatch.mjs --issue ANX-N      # plano adaptado ao DSH
npm run orchestration:dispatch -- mark-dispatched --id <id>
npm run orchestration:dispatch -- mark-done --id <id> --evidence "command:...,file:..."
```

Sem `mark-done`, a fila mente e o monitor acusa silêncio em nome de um agente que já terminou.

## 5. Revisores não tomam a issue

Críticos e gate leads **não** movem a issue do executor nem a marcam `done`. Eles publicam parecer (comentário + `verdict` no dialogue) e devolvem o controle. Movimento de status é do executor/orquestrador com aceite explícito.
