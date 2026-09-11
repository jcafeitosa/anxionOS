---
type: spec
status: superseded
superseded_by: brain/project-docs/specs/002-agents-knowledge/spec.md
taskboard_issue: ANX-455
---

> **Legado / superseded (ANX-455).** A spec 002 canônica está em `brain/project-docs/specs/002-agents-knowledge/spec.md` com **status accepted** (G7 Owner, 2026-09-11). Esta cópia versionada **não** declara draft e **não prevalece**. Aceitar a spec canônica ≠ homologar engines reais (ST08). Registro: [docs/document-precedence.md](../../../docs/document-precedence.md).

## Completude P1 — ownership, eventos, oráculos (ANX-389)

Notas históricas desta cópia (não alteram o status **accepted** em `brain/`): ST08 = 0/23 engines reais homologados. Homologação de storage real permanece backlog; não reler este arquivo como “spec ainda draft”.

### Ownership (módulos desta spec vs 23 ADR0002)

| Módulo físico | Estado que esta spec cobre | Não cobre |
| --- | --- | --- |
| agents | Agent, AgentVersion, Skill, bindings de modelo | Goal/Task/Run |
| orchestration | Goal, Task, Run, lease, heartbeat | AgentVersion verdade |
| knowledge | Document, Memory, Evidence, embeddings (pgvector) | Flight Recorder financeiro |
| graph | Traversals T01–T20, context build (consumo) | Ledger |
| governance | Grants revalidados em retomada | PolicyVersion corpo (risk P06) |
| connections | Binding usado na inferência | Quotas verdade (connections) |
| evaluation | Consumo de certificação para promoção de versão | Rubrica autoritativa |

Os outros 16 módulos físicos **existem** no baseline; não são donos do Brain. Lista completa: [spec 001 ownership](../001-institutional-contract/spec). Sem pasta `approvals/` / `policies/` / `adapter-gateway`.

### Eventos (ownerDomain)

Emitidos: `agents.agent.created.v1`, `agents.version.published.v1`, `orchestration.goal.created.v1`, `orchestration.run.completed.v1`, `orchestration.run.waiting_human.v1`, `knowledge.document.committed.v1`, `knowledge.evidence.available.v1`.

Consumidos: `governance.grant.*`, `connections.binding.*`, `evaluation.certification.*` (promoção, não escrita direta).

Envelope: [SDD 001](../001-institutional-contract/spec.md).

### Non-goals (reafirmação)

Não criar módulos `agent-teams`, `capabilities`, `memory`, `projects`, `tasks`. Não tratar Dashi `in_review` como gate PASS. Não homologar embeddings em produção nesta spec.

### Oráculos de aceite

AG01–AG08 e AP01–AP08 nesta spec. Packs G0: [agents R10](../../../../docs/orchestration/modules/agents/R10-g0-handoff.md) · [orchestration R10](../../../../docs/orchestration/modules/orchestration/R10-g0-handoff.md) · [knowledge R10](../../../../docs/orchestration/modules/knowledge/R10-g0-handoff.md) · [graph R10](../../../../docs/orchestration/modules/graph/R10-g0-handoff.md).
