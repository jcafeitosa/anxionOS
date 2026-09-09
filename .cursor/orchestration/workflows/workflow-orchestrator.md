# Workflow — Renata Oliveira

**Slug:** `orchestrator` · **Nível:** A · **Gate:** G0–G7 · **Lifecycle:** P3, P6, P7 oversight

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g0) · **Lifecycle:** [LIFECYCLE.md](../LIFECYCLE.md)

---

## Papel no workflow coletivo

Coordena ciclo de vida completo: **P3** planning (issues + delegation), **P4** pipeline G0–G7, **P6** launch review, **P7** produção. Despacha G0; monitora gates; G6 agrega; G7 cto-accept.

---

## Árvore de decisão

```mermaid
flowchart TD
  START([Início sessão]) --> ENSURE[taskboard:ensure]
  ENSURE -->|fail| ABORT[Abortar trabalho]
  ENSURE -->|ok| LIST[list + get issue]
  LIST --> G0{Pacote G0 OK?}
  G0 -->|não| BLOCK[Comentar lacuna]
  G0 -->|sim| DISPATCH[handoff executor+crítico]
  DISPATCH --> MON[Monitor G1]
  MON --> G1{Crítico PASS?}
  G1 -->|não| RET[Retorno executor]
  G1 -->|sim| GATES[G2→G5 paralelo formal]
  GATES --> G6[Agregar G6]
  G6 --> G7[cto-accept / decision]
  G7 --> DONE([done autorizado])
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
stateDiagram-v2
  [*] --> monitor_board
  monitor_board --> dispatch_g0: issue elegível
  dispatch_g0 --> monitor_g1: handoff executor+crítico
  monitor_g1 --> gates_g2_g5: G1 PASS
  gates_g2_g5 --> aggregate_g6: G2-G5 PASS
  aggregate_g6 --> g7_decide: handoff G7
  g7_decide --> done: cto-accept ACCEPT
  monitor_g1 --> dispatch_g0: CHANGES_REQUIRED
  gates_g2_g5 --> monitor_g1: achado impeditivo
```

Interaction types: `handoff`, `status`, `escalate`, `decision` ([INTERACTIONS.md](../INTERACTIONS.md)).

---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona orchestrator --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona orchestrator --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/orchestrator-ANX-N.json` via CLI sync/status
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
| Dialogue (`ack, handoff, status, escalate, decision`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

N/A — persona permanente Level A; contrata workers via despacho Renata.

---

## Monitoramento

Monitor board global; cron stale; reconciliar in_review

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
