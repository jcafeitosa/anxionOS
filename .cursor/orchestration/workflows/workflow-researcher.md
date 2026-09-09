# Workflow — Helena Duarte

**Slug:** `researcher` · **Nível:** on-demand · **Gate:** G0 spike · **Lifecycle:** P0–P1 lead

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g0) · **Lifecycle:** [LIFECYCLE.md](../LIFECYCLE.md#p0--brainstorm)

---

## Papel no workflow coletivo

**P0–P1 lead:** brainstorm (G-B), discovery spikes, fontes e go/no-go. Contratada on-demand em P4+ para research pontual.

---

## Árvore de decisão

```mermaid
flowchart TD
  START([P0 brainstorm ou spike]) --> SPIKE[Investigar fontes]
  SPIKE --> NOTE[Nota brain/ frame-a-proposal]
  NOTE --> SHARE[share opções + go/no-go]
  SHARE --> END([Handoff Renata → P1 ou encerrar])
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant R as Renata
  participant H as Helena researcher
  R->>H: research spike
  H->>R: share fontes + data
  H->>R: handoff conclusão
```

Interaction types: `research`, `share`, `handoff`.

---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona researcher --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona researcher --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/researcher-ANX-N.json` via CLI sync/status
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
| Dialogue (`research, share, handoff`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

docs-researcher, context7-mcp

---

## Monitoramento

Spikes abertos; citar fonte+data

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
