
## Completude P1 — ownership, eventos, oráculos (ANX-389)

`status:` permanece **draft**. ST08 = 0/23. **Não** `accepted` sem G7 Owner + ST01–ST08.

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
