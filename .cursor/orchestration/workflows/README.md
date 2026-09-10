# Índice — Workflows individuais

Um arquivo por persona permanente de [PERSONAS.md](../PERSONAS.md). Cada workflow compõe [COLLECTIVE-WORKFLOW.md](../COLLECTIVE-WORKFLOW.md). Roster: [AGENT-ROSTER.md](../AGENT-ROSTER.md).

**CLI:** `npm run orchestration:boot` · `npm run orchestration:workflow -- status|next|monitor|sync`

**Level C:** [LEVEL-C-MONITORING.md](../LEVEL-C-MONITORING.md)

**Tooling:** [TOOLING-INTEGRATION.md](../TOOLING-INTEGRATION.md) · regra [tooling-mandatory.mdc](../../rules/tooling-mandatory.mdc)

---

## Ferramentas obrigatórias (template)

Toda persona segue [TOOLING-INTEGRATION.md](../TOOLING-INTEGRATION.md) (G0.14): graphify antes de explore · serena para símbolos · archify P2 · open-knowledge para brain/ · code-review-graph G2 · Supermemory recall.

Subagentes: [SUBAGENT-PROMPT-TOOLING.md](../templates/SUBAGENT-PROMPT-TOOLING.md). Detalhes nos workflows `backend-executor`, `architect`, `code-review-lead`.

---

| Slug | Nome | Nível | Gate | Arquivo |
| --- | --- | --- | --- | --- |
| `orchestrator` | Renata Oliveira | A | G0–G7 | [workflow-orchestrator.md](./workflow-orchestrator.md) |
| `cto-critic` | Cláudia Nunes | A (núcleo) | G6/G7 audit | [workflow-cto-critic.md](./workflow-cto-critic.md) |
| `architect` | Marcus Chen | A | G0 consult | [workflow-architect.md](./workflow-architect.md) |
| `backend-executor` | Lucas Mendes | C | G1 | [workflow-backend-executor.md](./workflow-backend-executor.md) |
| `backend-critic` | Marina Ferreira | C | G1 | [workflow-backend-critic.md](./workflow-backend-critic.md) |
| `frontend-executor` | Camila Santos | C | G1 | [workflow-frontend-executor.md](./workflow-frontend-executor.md) |
| `frontend-critic` | Paulo Ribeiro | C | G1 | [workflow-frontend-critic.md](./workflow-frontend-critic.md) |
| `infra-executor` | Rafael Costa | C | G1 | [workflow-infra-executor.md](./workflow-infra-executor.md) |
| `infra-critic` | Ana Beatriz Lima | C | G1 | [workflow-infra-critic.md](./workflow-infra-critic.md) |
| `adapters-executor` | Diego Almeida | C | G1 | [workflow-adapters-executor.md](./workflow-adapters-executor.md) |
| `adapters-critic` | Gustavo Henrique | C | G1 | [workflow-adapters-critic.md](./workflow-adapters-critic.md) |
| `code-review-lead` | Fernanda Aoki | B | G2 | [workflow-code-review-lead.md](./workflow-code-review-lead.md) |
| `qa-lead` | Eduardo Nakamura | B | G3 | [workflow-qa-lead.md](./workflow-qa-lead.md) |
| `security-lead` | Isabella Morales | B | G4 | [workflow-security-lead.md](./workflow-security-lead.md) |
| `red-team-lead` | Thiago Martins | B | G5 | [workflow-red-team-lead.md](./workflow-red-team-lead.md) |
| `github-lead` | Juliana Pereira | B | G6 | [workflow-github-lead.md](./workflow-github-lead.md) |
| `docs-lead` | André Kuznetsov | B | G6 | [workflow-docs-lead.md](./workflow-docs-lead.md) |
| `researcher` | Helena Duarte | on-demand | G0 spike | [workflow-researcher.md](./workflow-researcher.md) |

---

## Uso

1. Identifique seu slug (`npm run orchestration:personas`)
2. Abra `workflow-{slug}.md`
3. Início de sessão: `npm run orchestration:workflow -- monitor --level C` (Level C)
4. Antes de codar: `npm run orchestration:workflow -- next --persona SLUG --issue ANX-N`
