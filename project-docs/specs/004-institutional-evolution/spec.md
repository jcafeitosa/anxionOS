---
type: spec
status: superseded
superseded_by: brain/project-docs/specs/004-institutional-evolution/spec.md
taskboard_issue: ANX-455
---

> **Legado / superseded (ANX-455).** A spec 004 canônica está em `brain/project-docs/specs/004-institutional-evolution/spec.md` com **status accepted**. Esta cópia versionada **não prevalece** e **não** declara draft. Homologação de engines reais (ST08) permanece backlog. Registro: [docs/document-precedence.md](../../../docs/document-precedence.md).

## Completude P1 — ownership, eventos, oráculos (ANX-389)

Notas históricas desta cópia (não alteram o status **accepted** em `brain/`): ST08 = 0/23. Não reler este arquivo como “spec ainda draft”.

### Ownership (módulos desta spec vs 23 ADR0002)

| Módulo | Estado autoritativo | Non-goal |
| --- | --- | --- |
| evaluation | DatasetVersion, score, certificação, reputação | Aplicar ChangeProposal |
| simulation | Twin snapshot, SimulationRun isolado | Ordens REAL, grants |
| operations | Incident, ProcedureVersion, export/recovery | Ledger |
| governance | ChangeProposal / aprovação (consumo) | Pasta `approvals/` |
| knowledge | Evidência de dataset | Treinar com secret |
| orchestration | Tasks de promoção / canary | Score autoritativo |

Os 17 módulos restantes não são donos de reputação/twin. Sem pasta `learning/` nem `experiments/`.

### Eventos

`evaluation.completed.v1`, `reputation.updated.v1`, `proposal.stale.v1`, `proposal.approved.v1`, `proposal.applied.v1`, `simulation.completed.v1`, `training.completed.v1`, `promotion.rolled_back.v1`, `operations.incident.opened.v1`, `operations.procedure.completed.v1`.

### Non-goals

Score não escreve grant/binding. Twin não muta capital/execution. Rollback não apaga fill nem custo. Sem 24º módulo.

### Oráculos

OP01–OP08 + EV01–EV08. Packs: [evaluation R10](../../../../docs/orchestration/modules/evaluation/R10-g0-handoff.md) · [simulation R10](../../../../docs/orchestration/modules/simulation/R10-g0-handoff.md) · [operations R10](../../../../docs/orchestration/modules/operations/R10-g0-handoff.md).
