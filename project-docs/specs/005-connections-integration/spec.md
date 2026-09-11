---
type: spec
status: superseded
superseded_by: brain/project-docs/specs/005-connections-integration/spec.md
taskboard_issue: ANX-455
---

> **Legado / superseded (ANX-455).** A spec 005 canônica está em `brain/project-docs/specs/005-connections-integration/spec.md` com **status accepted**. Esta cópia versionada **não prevalece** e **não** declara draft. Homologação de engines reais (ST08) permanece backlog. Registro: [docs/document-precedence.md](../../../docs/document-precedence.md).

## Completude P1 — ownership, eventos, oráculos (ANX-389)

Notas históricas desta cópia (não alteram o status **accepted** em `brain/`): ST08 = 0/23. Não reler este arquivo como “spec ainda draft”.

### Ownership (módulo connections vs 23 ADR0002)

| Módulo | Papel nesta spec |
| --- | --- |
| connections | Contas, bindings, quotas, cooldown, catálogo, usage |
| execution | Venue financeira — **não** é connections |
| market-data | Feeds de mercado — **não** é connections |
| billing | Assinatura da plataforma ≠ ProviderSubscription |
| governance | Grants de consumo |
| agents | Consome binding; não troca modelo |
| knowledge | Embeddings usam offering classificada |
| strategies | Binding incompatível bloqueia deploy |

`adapter-gateway` **não** é módulo (ADR0006). REAL_EXECUTION de inferência live é gate; v1 não finge homologação. PC 07: [debate](../../../../notes/anxionos-pc07-connections-debate.md).

### Eventos

`connections.account.connected.v1`, `connections.usage.recorded.v1`, `connections.quota.exceeded.v1`, `connections.catalog.published.v1`, `connections.cooldown.opened.v1`.

### Non-goals

Não criar pasta `models/` nem `integrations/`. Não usar credencial de outro tenant. Não rebind silencioso de modelo. Não importar 9Router como identidade autoritativa.

### Oráculos

CX01–CX10 + CF/CA/MM nos contratos vinculados. Pack: [connections R10](../../../../docs/orchestration/modules/connections/R10-g0-handoff.md).
