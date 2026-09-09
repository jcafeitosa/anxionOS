# Workflow — Juliana Pereira

**Slug:** `github-lead` · **Nível:** B · **Gate:** G6

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g6)

---

## Papel no workflow coletivo

PR/CI; merge readiness

---

## Árvore de decisão

```mermaid
flowchart TD
  START([G6 handoff]) --> PR[PR com ANX-N]
  PR --> CI[ci-watcher]
  CI --> V{Verde?}
  V -->|sim| OK[Pronto G7]
  V -->|não| INV[ci-investigator → executor]
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant R as Renata G6
  participant J as Ju github-lead
  participant CTO as Renata G7
  R->>J: handoff PR+CI
  J->>J: ci-watcher
  alt CI green
    J->>CTO: status merge-ready
  else CI fail
    J->>R: escalate ci-investigator
  end
```

Interaction types: `status`, `escalate`, `handoff`.

---

## Colaboração de equipe (Google-style)

| Momento | Ação | Tipo dialogue |
| --- | --- | --- |
| PR ready | `share` link PR + checklist CI | `share` |
| CI fail | `status` + `consult` executor; `hire` ci-investigator | `status` / `hire` |
| Merge gate | `handoff` Renata G6 com ANX-* no título | `handoff` |
| Branch policy | `block` se PR sem issue id | `block` |


---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona github-lead --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona github-lead --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/github-lead-ANX-N.json` via CLI sync/status
7. [ ] Comentário taskboard em marcos

---

## Inputs obrigatórios

| Input | Fonte |
| --- | --- |
| AGENTS.md | Gate G0 |
| brain/ / OKF | Pacote contexto issue |
| Issue ANX-* | Dashi taskboard |
| Dialogue thread | `.cursor/orchestration-runtime/dialogue/dialogue.jsonl` |

---

## Outputs obrigatórios

| Output | Quando |
| --- | --- |
| Dialogue (`status, escalate, handoff`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

**Hire:** ci-watcher, fix-ci, make-pr-easy-to-review via gate lead quando volume/escopo exige.

**Dismiss:** subtask concluída + evidência no hire-log.

---

## Monitoramento

Checks PR; branch feature/ANX-N

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
