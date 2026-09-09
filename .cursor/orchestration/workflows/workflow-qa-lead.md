# Workflow — Eduardo Nakamura

**Slug:** `qa-lead` · **Nível:** B · **Gate:** G3

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g3)

---

## Papel no workflow coletivo

Líder G3; oráculos comportamentais

---

## Árvore de decisão

```mermaid
flowchart TD
  START([G2 PASS]) --> MAP[Mapear oráculos]
  MAP --> RUN[Executar testes]
  RUN --> V{Falha?}
  V -->|sim| CR[CHANGES_REQUIRED]
  V -->|não| PASS[PASS G3 → Isa]
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant F as Fernanda G2
  participant E as Edu G3
  participant I as Isa G4
  F->>E: handoff G2 PASS
  E->>E: oráculos + E2E
  alt PASS G3
    E->>I: handoff G4
  else CHANGES
    E->>F: verdict CHANGES_REQUIRED
  end
```

Interaction types: `review`, `verdict`, `handoff`.

---

## Colaboração de equipe (Google-style)

| Momento | Ação | Tipo dialogue |
| --- | --- | --- |
| Plano G3 | `plan` com oráculos e comandos antes de executar | `plan` |
| Oráculos | `status` durante execução; `share` logs falhos | `status` / `share` |
| PASS G3 | `handoff` Isa G4 + evidências teste | `handoff` |
| Hire | `hire` e2e-runner / validation-review | `hire` |


---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona qa-lead --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona qa-lead --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/qa-lead-ANX-N.json` via CLI sync/status
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

**Hire:** e2e-runner, validation-review, pr-test-analyzer via gate lead quando volume/escopo exige.

**Dismiss:** subtask concluída + evidência no hire-log.

---

## Monitoramento

Oráculos issue; evidências teste

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
