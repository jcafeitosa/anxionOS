---
type: debate
---
# R04 — Contratos, API e eventos: `modules/strategies`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-89 · ANX-58  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de dados de produção neste artefato.

**KEEP adapter-gateway** se já exportado. Pack ANX-389 — não `done`.

## In / Out (R4)

**In:** superfície pública Strategy/Version/Deployment/Signal. **Out:** `strategies.*.v1`. Signal ≠ TradeIntent.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`.

## Ownership

| Superfície | Dono |
| --- | --- |
| Contratos strategies | **strategies** |
| adapter-gateway | **KEEP** |

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `strategies` |
| eventType | `strategies.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| executionMode | **SIMULATED \| PAPER** — REAL rejeitado |

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| ST_STRATEGY_NOT_FOUND | 404 | Fora do scope |
| ST_VERSION_IMMUTABLE | 409 | Mutar published |
| ST_SIGNAL_EXPIRED | 422 | expiresAt ausente/passado |
| ST_MODE_REAL_FORBIDDEN | 400 | executionMode=REAL |
| ST_BINDING_MISMATCH | 409 | snapshot inválido |
| ST_TRAVERSAL_DENIED | 403 | T01 DENY |
| ST_CERTIFICATION_REQUIRED | 409 | promote sem evaluation |
| ST_REVISION_CONFLICT | 409 | expectedRevision |
| ST_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout `@anxionos/contracts/strategies/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`.

**ST-R04-01:** Signal **sem** série de preços — `instrumentRefs` + `valueRef` + hashes.

## Eventos v1

| eventType | Payload (sem secrets) | Consumidores |
| --- | --- | --- |
| `strategies.strategy.registered.v1` | strategyId, organizationId, revision | graph, audit |
| `strategies.version.published.v1` | versionNumber, sourceHash, parametersHash | graph, evaluation |
| `strategies.backtest.requested.v1` | backtestId, datasetId, revision, seed | simulation |
| `strategies.backtest.completed.v1` | resultRef, metricsHash | evaluation, simulation, audit |
| `strategies.deployment.activated.v1` | deploymentId, executionMode, portfolioId, bindingHash | decisions, portfolios, graph |
| `strategies.signal.emitted.v1` | signalId, expiresAt, instrumentRefs, valueRef | decisions, risk, audit |

**Consumer:** `evaluation.certification.issued.v1` — único caminho CERTIFIED.  
**ST-R04-02:** não emite `execution.order.*` nem `decisions.trade_intent.*`.

## REST `/v1/strategies/*`

| Método | Path | Grant |
| --- | --- | --- |
| POST | `/v1/strategies` | strategies.admin |
| POST | `/v1/strategies/:id/versions/:vid/publish` | strategies.publish + T01 |
| POST | `/v1/strategies/:id/backtests` | strategies.backtest |
| POST | `/v1/strategies/:id/deployments` | strategies.deploy |
| POST | `/v1/strategies/:id/signals` | strategies.signal |
| GET | `/v1/strategies/:id/signals/:sid` | strategies.read |

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-ST-01 | Publish não muta versão anterior |
| G3-ST-02 | Signal sem expiresAt → 422 |
| G3-ST-03 | REAL → 400 ST_MODE_REAL_FORBIDDEN |
| G3-ST-04 | Replay commandId mesmo revision |
| G5-ST-01 | Cross-tenant GET → 403 |
| G5-ST-02 | organizationId no body ignorado |
| G5-ST-03 | Signal expirado rejeitado |

## Alternativas rejeitadas

Auto-promote por backtest; Signal = TradeIntent; ticks em strategies; REAL v1; pasta `products/`.

## Saída R4

Contratos v1 aprovados para R5.
