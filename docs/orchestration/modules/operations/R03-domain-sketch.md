---
type: debate
---
# R03 — Esboço de domínio: `modules/operations`

**Rodada:** R3 · 2026-09-11 · ANX-389 · ANX-111  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [R04-contracts-events.md](./R04-contracts-events.md).

## Agregados

| Agregado | Notas |
| --- | --- |
| Incident | correlationId; status open/mitigated/closed |
| Runbook | versão imutável; passos sem secret |
| RetentionPolicy | org-scoped; export deve honrar |
| ExportJob | PENDING→RUNNING→COMPLETED\|FAILED\|CANCELLED; Idempotency-Key |
| ServiceHealthSnapshot | probes; não é série Timescale |

**OPS-R03-01:** ExportJob carrega `deltaRefId` de audit — não copia journal.  
**OPS-R03-02:** Alert → OpenIncident correlacionado (não storm 1:1 obrigatório).

## Ports

IncidentRepository, ExportJobRepository, HealthSnapshotRepository, OperationsUnitOfWork, AgencyScopePort, TraversalEvaluator, EventConsumer (alerts, heartbeats, audit.manifest), ObjectStorePort (export blob).

## In / Out (R3)

**In:** EventConsumer (alerts, heartbeats, audit.manifest); ObjectStorePort para export.
**Out:** Incident estados open/mitigated/closed; ExportJob PENDING→COMPLETED|FAILED|CANCELLED; ServiceHealthSnapshot (PG, não Timescale). OPS-R03-01/02.

## Saída R3

Modelo v1 para R4.
