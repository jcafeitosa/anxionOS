---
type: technical-reference
---

# Platform SLI export (ANX-497)

**Mental model:** Platform **SLI export** (service-level indicators) for operational triage. The HTTP path may historically say `slo-snapshot`, but the **semantic kind is `sli_export`**, not SLO.

Read-only endpoint for the Platform console dashboard. Exports in-process SLI metrics from `MetricsCollector` without tenant secrets or connection strings.

## Semantic classification

| Property | Value |
| --- | --- |
| **Kind** | `sli_export` |
| **Window** | `process_lifetime_since_boot` |
| **Not for** | `error_budget`, `burn_rate`, `slo_compliance` |

**Counters reset on process boot.** This is a process-lifetime aggregation window, not a sliding time window or durable checkpoint.

## Authorization

**Required:** authenticated session + grant `console.platform` (401 without session; 403 without grant).

**Security note (ANX-497):** The current endpoint mount may lack session/grant enforcement. Any mount **without** session + `console.platform` is a **security defect** tracked on ANX-497. This document describes the **required authorization contract**, not necessarily the current implementation state. Do not claim the gate is already fixed unless evidenced.

## Allowed use

- **Operational triage** with `console.platform` grant.
- **Real-time dashboard signals** for the Platform console.

## Prohibited use

- **Burn-rate calculations** (requires durable checkpoint + time window).
- **Error-budget tracking** (requires SLO target + historical burn).
- **SLO scorecard or compliance dashboard** (requires multi-process aggregation + durable state).
- **Release gates** (requires stable SLO verdict, not ephemeral process counters).

## Endpoint

`GET /v1/operations/platform/slo-snapshot`

## Response (schema `1.0.0`)

| Section | Source metrics | Notes |
| --- | --- | --- |
| `api` | `api.requests`, `api.errors`, `api.latency` | Per route-prefix p50/p95/p99 |
| `eventing` | `operations.eventing.lag`, `operations.eventing.lag.alerts` | Outbox/inbox lag SLI from ANX-170 S2 |
| `capacity` | — | Empty or `signalsAvailable: false` until control-plane pool/queue metrics exist |
| `cost` | — | Empty or `signalsAvailable: false` until connections billing bridge exists |

**Important:** `capacity` or `cost` sections returning **empty** (or `signalsAvailable: false`) does **not** mean capacity or cost is healthy. It means **no signals are available yet**. Do not infer "OK" from absence of data.

### Redaction

Sensitive tag keys (`token`, `database_url`, `secret`, `apiKey`, `authorization`, etc.) and connection-string patterns are replaced with `[redacted]` before aggregation.

## Related

- S1: `createSloMetricsPlugin` — API request/error/latency counters (ANX-170 S1)
- S2/S3: `recordEventingLagSli` + bootstrap ticker (ANX-170 S2/S3)
- Contract: `platformSloSnapshotSchema` in `@anxionos/contracts/operations`
- Security enforcement: ANX-497 (session + `console.platform` grant required)
- SLI export semantics: ANX-497 AB-2 (this document)
