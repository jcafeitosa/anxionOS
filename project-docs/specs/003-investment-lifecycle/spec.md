
## Completude P1 — ownership, eventos, oráculos (ANX-389)

`status:` permanece **draft**. ST08 = 0/23. **Não** `accepted` sem G7 Owner + ST01–ST08.

### Ownership (módulos desta spec vs 23 ADR0002)

| Módulo | Estado autoritativo | Non-goal nesta spec |
| --- | --- | --- |
| market-data | Instrumentos; séries Timescale | Ledger |
| strategies | StrategyVersion, Deployment, backtest | Ordens reais |
| capital | Conta, alocação, reserva | Posição canônica |
| portfolios | Posição, valuation | Kill switch |
| decisions | Decision, TradeIntent | Envio venue |
| risk | Check, permit, kill switch | PolicyVersion D-GOV-010 (P06) |
| execution | Order, fill, reconciliação | Capital verdade |
| accounting | Ledger | Comissão de partner |
| performance | Outcome / atribuição | Rubrica de evaluation |
| audit | Manifest Flight Recorder | Journal de outro dono |
| billing | Fora do ciclo de trading | Não deduzir do capital |
| partners | Fora do ciclo de trading | Não é payout de fill |

Debates thin (sem PC serial): [strategies](../../../../notes/anxionos-thin-strategies-debate.md) · [capital](../../../../notes/anxionos-thin-capital-debate.md) · [portfolios](../../../../notes/anxionos-thin-portfolios-debate.md) · [execution](../../../../notes/anxionos-thin-execution-debate.md) · [accounting](../../../../notes/anxionos-thin-accounting-debate.md) · [billing](../../../../notes/anxionos-thin-billing-debate.md) · [partners](../../../../notes/anxionos-thin-partners-debate.md).

Os 11 módulos restantes (identity…simulation) não são donos do ciclo financeiro; ver [spec 001](../001-institutional-contract/spec.md). Sem 24º módulo.

### Eventos

`investment.intent.submitted.v1`, `investment.intent.approved.v1`, `risk.check.passed.v1`, `risk.check.rejected.v1`, `execution.order.submitted.v1`, `execution.order.filled.v1`, `accounting.transaction.posted.v1`, `audit.manifest.sealed.v1`, `strategies.version.created.v1`, `strategies.deployment.activated.v1`, `capital.allocation.reserved.v1`, `market-data.observation.ingested.v1`.

### Non-goals

Não liquidar posição ao cancelar assinatura. Não enviar ordem sem permit. Não tratar grafo como ledger. REAL_EXECUTION live é gate de lançamento, não default v1.

### Oráculos

FI01–FI12 + fixture F0 (NAV 1012 / PnL 12). Packs G0 em `docs/orchestration/modules/{market-data,strategies,capital,portfolios,decisions,risk,execution,accounting,performance,audit}/R10-g0-handoff.md`.
