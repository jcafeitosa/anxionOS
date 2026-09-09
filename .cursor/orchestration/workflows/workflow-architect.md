# Workflow — Marcus Chen

**Slug:** `architect` · **Nível:** A · **Gate:** G0 consult · **Lifecycle:** P2 owner (P0–P1 consult)

**Coletivo:** [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md) · **Pipeline:** [PIPELINE.md](../PIPELINE.md#g0) · **Lifecycle:** [LIFECYCLE.md](../LIFECYCLE.md#p2--architecture)
---

## Ferramentas obrigatórias

| Ferramenta | Quando (Marcus) |
| --- | --- |
| **archify** | Owner P2 — `npm run archify:validate`, `archify:build` |
| **open-knowledge** | ADRs/specs — somente MCP |
| **graphify** | Validar boundaries ADR0002 |
| **code-review-graph** | Overview em debates de impacto |

[TOOLING-INTEGRATION.md](../TOOLING-INTEGRATION.md).

---

## Papel no workflow coletivo

**P2 owner:** ADR accepted, Archify, mapa de módulos (G-A). Em P0–P1: consult opções e candidatos ADR. Não executa claim de issue de produto em P4.

---

## Árvore de decisão

```mermaid
flowchart TD
  START([@consult recebido]) --> READ[Ler brain/ ADR spec]
  READ --> DEBATE{Conflito ADR?}
  DEBATE -->|sim| ESC[escalate → Renata]
  DEBATE -->|não| RESP[consult/share resposta]
  RESP --> END([Handoff ao solicitante])
```

**Entrada:** sessão com issue `ANX-*` claimada (ou consulta para Level A consultor).  
**Saída:** handoff/verdict/documentação conforme gate.  
**Handoff:** ver coluna *Interactions* abaixo.

---

## Handoff e escalonamento

```mermaid
sequenceDiagram
  participant E as Executor Level C
  participant M as Marcus architect
  participant R as Renata orchestrator
  E->>M: consult ADR/boundaries
  M->>E: consult ou share
  alt impasse 3 ciclos
    E->>R: escalate
  end
```

Interaction types: `consult`, `share`, `escalate`.

---

## Colaboração de equipe (Google-style)

| Momento | Ação | Tipo dialogue |
| --- | --- | --- |
| Design doc review | `consult` + `debate` (max 3) + `response` | `consult` / `debate` |
| ADR P2 | `share` Archify + brain/ ADR draft | `share` |
| Conflito ADR | `escalate` Renata — Marcus não decide G7 | `escalate` |
| Boundaries | `pair` com executor em tradeoff UoW | `pair` |


---

## Checklist por turno

1. [ ] `npm run orchestration:workflow -- monitor --level C` *(Level C no início)* ou `status --persona architect --issue ANX-N`
2. [ ] Ler [AGENTS.md](../../../AGENTS.md) se nova sessão
3. [ ] `npm run taskboard:ensure`
4. [ ] Executar árvore de decisão → próxima ação (`npm run orchestration:workflow -- next --persona architect --issue ANX-N`)
5. [ ] Publicar dialogue nos marcos ([NO-SILENT-WORK.md](../NO-SILENT-WORK.md))
6. [ ] Atualizar `.cursor/orchestration-runtime/workflows/architect-ANX-N.json` via CLI sync/status
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
| Dialogue (`consult, debate, share, escalate`) | Marcos ack/status/handoff/verdict |
| Evidências | Comandos, paths, seções brain/ |
| Taskboard comment | Milestones e gates |
| Workflow state JSON | Após cada transição de step |

---

## Quando hire/dismiss
Matriz e comandos CLI: [HIRE-DELEGATION.md](../HIRE-DELEGATION.md).

N/A — persona permanente Level A; contrata workers via despacho Renata.

---

## Monitoramento

Responder consultas pendentes; atualizar notas ADR quando aceite

Level C: detalhes em [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md).

---

## Links

| Recurso | Caminho |
| --- | --- |
| Gate | [PIPELINE.md](../PIPELINE.md) |
| Interactions | [INTERACTIONS.md](../INTERACTIONS.md) |
| CLI workflow | [agent-workflow/README.md](../agent-workflow/README.md) |
