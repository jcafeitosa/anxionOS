---
title: Fixture de concorrência e revogação v1
description: Testes de race para lease, epoch bump, permit reuse, duplicate delivery, kill switch e shutdown (P02-09).
type: specification
status: draft
issue: ANX-51
depends_on:
  - ANX-48
  - ANX-50
  - ANX-27
---
# Concurrency race fixture v1

**Issue:** ANX-51 · **Backlog:** P02-09

## Fixture

`ConcurrencyFixture` em `backend/packages/contracts/src/execution/concurrency-fixture.ts` — referência in-memory, não infra de produção.

## Cenários cobertos

| Cenário | Mecanismo |
| --- | --- |
| Permit reuse | `tryConsumePermit` / `PERMIT_REUSED` |
| Epoch bump | `bumpAuthorityEpoch` + `PERMIT_STALE` |
| Lease race | `assertLeaseValid` + `LEASE_EXPIRED` |
| Duplicate delivery | `assertFirstDelivery` + `DUPLICATE_DELIVERY` |
| Kill switch | `setKillSwitch` + `EFFECT_KILL_SWITCH` |
| Revogação | `revokePermit` + `PERMIT_REVOKED` |
| Shutdown | `setShutdown` + `SHUTDOWN` |

## Evidência

```
bun test tests/contracts/concurrency-race.test.ts
```
