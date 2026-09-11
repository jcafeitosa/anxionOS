---
type: debate
---

# R03 — Esboço de domínio: `modules/risk`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-99**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## In / Out (R3)

**In:** esboço LimitPolicy, RiskCheckResult, ExposureSnapshot, RiskPermit.

**Out:** TradeIntent. Grant. Reservation. Order.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Agregados de risco | **risk** |
| adapter-gateway | **KEEP** |

## Agregados

### LimitPolicy

- `id`, `organizationId`, `policyVersion`, `mandateId?`, `portfolioId?`
- `ruleSetHash`, `limits`: maxNotional, maxLeverage, maxConcentrationPct, maxDrawdownPct, minCashBufferPct
- `status`: DRAFT → ACTIVE → SUPERSEDED | REVOKED
- `riskEpoch` monotônico por scope

### ExposureSnapshot

- `id`, `organizationId`, `portfolioId`, `snapshotAt`, `valuationAsOf`
- `positionLines[]`, `grossExposure`, `netExposure`, `cashBufferPct`, `concentrationTopN`
- `reservationSummary`, `status`: BUILDING → CONFIRMED → SUPERSEDED

### RiskCheckResult

- `id`, `intentHash`, `tradeIntentId?`, `policyVersions[]`, `exposureSnapshotId`
- `result`: PASS | DENY | DEFER
- `denyReasons[]`, `metrics`, `riskEpoch`, `checkedAt`, `expiresAt`

### RiskPermit

- `id`, `organizationId`, `riskPermitId`, `riskCheckId`, `intentHash`
- `riskEpoch`, `authorityEpoch` (snapshot leitura)
- `limitEnvelope`: `{ maxQuantity, maxNotional, maxLimitPrice, allowedVenues[] }`
- `singleUse: true`, `status`: ISSUED → CONSUMED | REVOKED | EXPIRED
- `expiresAt`, `issuedAt`, `consumedAt?`

### KillSwitchState

- `scope`: GLOBAL | ORGANIZATION | PORTFOLIO | STRATEGY
- `scopeRef?`, `reason`, `activatedBy`, `riskEpochBump`

## Ports

| Port | Uso |
| --- | --- |
| DecisionsQueryPort | TradeIntent por intentHash |
| PortfoliosQueryPort | positions, valuation asOf |
| CapitalQueryPort | reservations, available |
| MarketDataPort | price/FX freshness |
| GovernanceQueryPort | mandate envelope, authorityEpoch |
| KnowledgeExplainPort | explanation (não altera PASS/DENY) |

## Invariantes RK-R03-INV-*

| ID | Regra |
| --- | --- |
| RK-R03-INV-01 | RiskCheckResult imutável após CONFIRMED |
| RK-R03-INV-02 | RiskPermit só emitido quando result=PASS |
| RK-R03-INV-03 | intentHash mismatch → DENY |
| RK-R03-INV-04 | ExposureSnapshot CONFIRMED antes de métricas |
| RK-R03-INV-05 | expiresAt passado → permit EXPIRED |
| RK-R03-INV-06 | riskEpoch no permit = epoch corrente do scope |
| RK-R03-INV-07 | Kill switch ativo → DENY KILL_SWITCH |
| RK-R03-INV-08 | Idempotência por (org, intentHash, policy tuple) |
| RK-R03-INV-09 | CONFIG_REQUIRED quando input ausente |

## Commands

`activateLimitPolicy` · `buildExposureSnapshot` · `runPreTradeCheck` · `issueRiskPermit` · `revokeRiskPermit` · `activateKillSwitch` · `releaseKillSwitch`

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
