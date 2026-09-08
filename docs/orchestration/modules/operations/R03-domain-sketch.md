---
type: debate
---

# R03 — Esboço de domínio: `modules/operations`

**Issue:** ANX-111

## Agregados

Incident, Runbook, RetentionPolicy, ExportJob, ServiceHealthSnapshot

## Nota

ServiceHealthSnapshot de probes; export referencia audit deltaRefId

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | observability alerts + module heartbeats |
| EventEmitterPort | operations.incident.opened.v1, operations.export.completed.v1, operations.health.degraded.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
