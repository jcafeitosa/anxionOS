# Workflow — Thiago Martins

**Slug:** `red-team-lead` · **Nível:** B · **Gate:** G5

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g5)

---

## Papel no workflow coletivo

Líder G5; sandbox adversarial

---

## Árvore de decisão

```mermaid
flowchart TD
  START([G4 PASS]) --> SB[Sandbox autorizado]
  SB --> ATK[Cenários adversariais]
  ATK --> V{Controle quebrado?}
  V -->|sim| CR[CHANGES_REQUIRED]
  V -->|não| PASS[PASS G5 → G6]
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant I as Isa G4
  participant T as Thiago G5
  participant R as Renata G6
  I->>T: handoff G4 PASS
  T->>T: sandbox adversarial
  alt PASS G5
    T->>R: handoff G6
  else CHANGES
    T->>I: verdict CHANGES_REQUIRED
  end
```

Interaction types: `review`, `verdict`, `handoff`.

---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona red-team-lead --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona red-team-lead --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/red-team-lead-ANX-N.json` via CLI sync/status
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
| Dialogue (`review, verdict, handoff`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

**Hire:** security-reviewer, silent-failure-hunter via gate lead quando volume/escopo exige.

**Dismiss:** subtask concluída + evidência no hire-log.

---

## Monitoramento

Cleanup sandbox; evidência reprodução

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
