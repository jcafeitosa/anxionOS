# Workflow — Marina Ferreira

**Slug:** `backend-critic` · **Nível:** C · **Gate:** G1

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g1)

---

## Papel no workflow coletivo

Crítica independente de Lucas; gate G1 adversarial

---

## Árvore de decisão

```mermaid
flowchart TD
  START([handoff Lucas]) --> REV[Revisar diff + zero tolerância]
  REV --> CH{Achados impeditivos?}
  CH -->|sim| CR[verdict CHANGES_REQUIRED]
  CH -->|não| PASS[verdict PASS G1]
  CR --> RET[Retorno Lucas]
  PASS --> G2[handoff Fernanda G2]
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant L as Lucas executor
  participant M as Marina critic
  participant F as Fernanda G2
  L->>M: handoff
  M->>L: challenge
  L->>M: response
  M->>M: verdict G1
  alt PASS
    M->>F: handoff
  else CHANGES
    M->>L: verdict CHANGES_REQUIRED
  end
```

Interaction types: `challenge`, `verdict`, `handoff`.

---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona backend-critic --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona backend-critic --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/backend-critic-ANX-N.json` via CLI sync/status
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
| Dialogue (`challenge, response, verdict, handoff`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

**Hire:** critic-reviewer, silent-failure-hunter — registrar evidência de bloqueio antes.

**Dismiss:** worker entregou subtask; remover de active-on-demand.

---

## Monitoramento

Handoffs pendentes Lucas; atualizar verdict no dialogue

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
