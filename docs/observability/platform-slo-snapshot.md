# Platform SLO snapshot (ANX-170 S4)

Read-only endpoint for the Platform console dashboard. Exports in-process SLI metrics from `MetricsCollector` without tenant secrets or connection strings.

## Endpoint

`GET /v1/operations/platform/slo-snapshot`

## Response (schema `1.0.0`)

| Section | Source metrics | Notes |
| --- | --- | --- |
| `api` | `api.requests`, `api.errors`, `api.latency` | Per route-prefix p50/p95/p99 |
| `eventing` | `operations.eventing.lag`, `operations.eventing.lag.alerts` | Outbox/inbox lag SLI from ANX-170 S2 |
| `capacity` | — | Honest empty until control-plane pool/queue metrics exist |
| `cost` | — | Honest empty until connections billing bridge exists |

Redaction: sensitive tag keys (`token`, `database_url`, etc.) and connection-string patterns are replaced with `[redacted]` before aggregation.

## Related

- S1: `createSloMetricsPlugin` — API request/error/latency counters
- S2/S3: `recordEventingLagSli` + bootstrap ticker
- Contract: `platformSloSnapshotSchema` in `@anxionos/contracts/operations`
