---
type: debate
---

# R01 — Modos de hierarquia (TREE vs CIRCULAR)

**Componente:** modules/orchestration  
**Rodada:** R1 — Extensão pós-análise Paperclip (`e3a0ce7d`)  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issue:** ANX-46

## Síntese

A análise do Paperclip confirmou organograma **tree-only** (CEO → reports), Board como Owner, checkout atômico e aprovações — sem nomenclatura triangular/circular. O anxionOS documentava modo **circular** em [org-chart](../../../team/org-chart.md) e deixava o modo **triangular** (árvore pura) implícito.

**Decisão proposta:** `brain/project-docs/decisions/0005-agent-hierarchy-modes-triangular-circular.md` + `brain/project-docs/specs/006-agent-hierarchy-orchestration/spec.md`.

| Modo | Identificador | Uso |
| --- | --- | --- |
| Triangular | `HIERARCHY_TREE` | Paridade Paperclip; revisão via taskboard/audit |
| Circular | `HIERARCHY_CIRCULAR` | Mandato ↓ + evidência/parecer ↑ com G0–G7 e arestas `REVIEWS` |

**Centro fixo:** Owner (Board) + Orchestrator/CEO Agent — missão, despacho G0–G1, agregação G6, aceite G7.

## Fronteiras preservadas (ADR0002)

| Dono | Responsabilidade |
| --- | --- |
| orchestration | Modo vigente, `GateBinding`, escalonamento, freeze em migração |
| governance | `ChangeProposal` de troca de modo, grants, epochs |
| graph | Projeção `REPORTS_TO` / `REVIEW_EDGE`; T01 inalterado |
| agents | Identidade Orchestrator, `OrgRole` |

## O que importar do Paperclip

- Checkout atômico / execution lock → lease de Task/Run
- Goal ancestry em issues
- Board override e aprovações versionadas
- **Não** adotar tree-only como única topologia

## Perguntas para R02

1. Schema exato de `GateBinding` vs comentários do taskboard
2. Derivação automática de `ReviewEdge` ao importar template TREE
3. Impacto em T04 `relationshipFit` quando CIRCULAR com especialistas transversais
4. UX de troca de modo sem downtime de runs

## Próxima rodada

→ **R02 — Padrões Paperclip** ([R02-paperclip-checkout-heartbeat.md](./R02-paperclip-checkout-heartbeat.md)) — checkout, heartbeat, goal ancestry, Board override
→ **R03 — Domain sketch** (`R03-domain-sketch.md`) — entidades lease/heartbeat, payloads de evento
