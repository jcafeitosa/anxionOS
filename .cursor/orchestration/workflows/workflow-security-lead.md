# Workflow — Isabella Morales

**Slug:** `security-lead` · **Nível:** B · **Gate:** G4

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g4)

---

## Papel no workflow coletivo

Líder G4; tenancy/secrets

---

## Árvore de decisão

```mermaid
flowchart TD
  START([G3 PASS]) --> SEC[security-reviewer]
  SEC --> V{Violação?}
  V -->|sim| CR[CHANGES_REQUIRED]
  V -->|não| PASS[PASS G4 → Thiago]
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant E as Edu G3
  participant I as Isa G4
  participant T as Thiago G5
  E->>I: handoff G3 PASS
  I->>I: security-reviewer
  alt PASS G4
    I->>T: handoff G5
  else CHANGES
    I->>E: verdict CHANGES_REQUIRED
  end
```

Interaction types: `review`, `verdict`, `handoff`.

---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona security-lead --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona security-lead --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/security-lead-ANX-N.json` via CLI sync/status
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
| Dialogue (`review, verdict, handoff, escalate`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

**Hire:** security-reviewer, mantis-threat-model via gate lead quando volume/escopo exige.

**Dismiss:** subtask concluída + evidência no hire-log.

---

## Monitoramento

Achados abertos; escalate Owner se BLOCKED

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
