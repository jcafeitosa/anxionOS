---
type: debate
---

# R02 — Fronteiras: `modules/risk`

**Componente:** modules/risk  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-99** · contrato P06: **ANX-58**

## In / Out (R2)

**In:** LimitPolicy, RiskCheckResult, ExposureSnapshot, RiskPermit.

**Out:** TradeIntent (`decisions`). Grant (`governance`). Reservation (`capital`). Order (`execution`).

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| LimitPolicy / RiskCheck / RiskPermit / kill switch | **risk** |
| adapter-gateway | **KEEP** |

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre risk e vizinhos (**governance**, **decisions**, **capital**, **portfolios**, **market-data**, **strategies**, **execution**, **operations**, **graph**); ratificar **PostgreSQL** como dono de **LimitPolicy**, **RiskCheckResult**, **ExposureSnapshot** e **RiskPermit**; separar intenção de trade, limites de governança, reservas de capital e gates de execução; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido |
| spec 003 § RiskCheck, fluxo PROPOSED→RISK_CHECKED→RESERVED | Preços/FX/positions/reservations autoritativas; riskEpoch |
| spec 001 | Envelope institucional, ownerDomain, epoch bump |
| [governance/R01-context.md](../governance/R01-context.md) | PolicyVersion contrato genérico; grants/mandatos |
| [decisions/R02-boundaries.md](../decisions/R02-boundaries.md) | TradeIntent imutável; decisions consome risk.check.completed |
| [capital/R02-boundaries.md](../capital/R02-boundaries.md) | CapitalReservation autoritativa; risk valida, não reserva |
| [portfolios/R02-boundaries.md](../portfolios/R02-boundaries.md) | Position/valuation read-only para exposure |
| [execution/R01-context.md](../execution/R01-context.md) | Revalida permit/epochs na rota de ordem |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Debate R2 (diálogo atribuído)

**Arquiteto:** risk é dono de **LimitPolicy** (PolicyVersion kind=RISK), **ExposureSnapshot**, **RiskCheckResult** e **RiskPermit** — o que foi avaliado, contra quais limites, com qual exposição e qual epoch de risco vigente.

**Crítico (decisions):** TradeIntent — quem persiste e quem valida?

**Arquiteto:** **decisions** persiste **TradeIntent** imutável e **DecisionRecord** com status `RISK_CHECKED`. **risk** recebe `intentHash` + refs via comando/evento, lê exposição/reservas autoritativas e emite **RiskCheckResult** + **RiskPermit** — não reescreve intent nem avança Decision state diretamente.

**Crítico (governance):** MandateVersion.riskLimits vs LimitPolicy — duplicata?

**Arquiteto:** **governance** persiste **MandateVersion** com envelope declarativo e `authorityEpoch`. **risk** materializa **LimitPolicy** versionada (kind=RISK) com regras executáveis e `riskEpoch`. governance referencia `policyVersionId`; risk não persiste Grant nem emite **ExecutionPermit**.

**Crítico (capital):** Reserva transacional — risk reserva capital?

**Arquiteto:** **capital** dono de **CapitalReservation**. **risk** consulta `ReservationQueryPort` e `BalanceView` — valida compatibilidade; não chama `reserve`.

**Crítico (execution):** Gate de ordem — risk ou execution?

**Arquiteto:** **execution** revalida **RiskPermit** + **ExecutionPermit** + epochs na transação de submit. **risk** emite permit single-use vinculado a `intentHash`.

**Síntese Orquestrador:** Cinco fronteiras fechadas; PG autoritativo; REAL e SQLite proibidos v1.

---

## Decisão: pipeline P06 decisions → risk → capital → execution

| Etapa | Dono | Artefato | Gate |
| --- | --- | --- | --- |
| Intenção | **decisions** | TradeIntent | `decisions.intent.submitted.v1` |
| Avaliação risco | **risk** | RiskCheckResult, RiskPermit | `risk.check.completed.v1` |
| Reserva | **capital** | CapitalReservation | `capital.reservation.created.v1` |
| Permissão efeito | **governance** | ExecutionPermit | `governance.permit.granted.v1` |
| Ordem | **execution** | SimulatedOrder | revalida permits + epochs |

## Decisão: possui / não possui

| Dado / comportamento | Dono |
| --- | --- |
| LimitPolicy, RiskCheckResult, RiskPermit, ExposureSnapshot, KillSwitchState, riskEpoch | **risk** |
| PolicyVersion contrato genérico, Grant, MandateVersion, ExecutionPermit | **governance** |
| TradeIntent, DecisionRecord, Disposition | **decisions** |
| CapitalReservation, BalanceView, Allocation | **capital** |
| Position, ValuationSnapshot, Portfolio | **portfolios** |
| MarketObservation, instrument catalog | **market-data** |
| StrategyVersion, Deployment, riskBudget declarativo | **strategies** |
| Order, fill, venue dispatch | **execution** |
| Incidente operacional, retenção | **operations** |

## Invariantes R02 (`RK-R02-INV-*`)

| ID | Regra |
| --- | --- |
| RK-R02-INV-01 | risk não persiste TradeIntent — só `intentHash` + refs |
| RK-R02-INV-02 | risk não persiste Grant — só LimitPolicy kind=RISK |
| RK-R02-INV-03 | risk não cria CapitalReservation |
| RK-R02-INV-04 | RiskPermit single-use; intentHash + riskCheckId + riskEpoch |
| RK-R02-INV-05 | decisions → RISK_CHECKED via `risk.check.completed.v1` PASS |
| RK-R02-INV-06 | execution exige RiskPermit + ExecutionPermit não stale |
| RK-R02-INV-07 | ExposureSnapshot referencia portfolios |
| RK-R02-INV-08 | Kill switch bump riskEpoch |
| RK-R02-INV-09 | CONFIG_REQUIRED fail-closed |
| RK-R02-INV-10 | SQLite proibido |
| RK-R02-INV-11 | REAL rejeitado v1 |
| RK-R02-INV-12 | Cross-tenant organizationId match |
| RK-R02-INV-13 | LLM explica resultado — não substitui cálculo determinístico |
| RK-R02-INV-14 | Pre-trade check obrigatório antes de capital reserve |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui completa | ✅ |
| AC-R02-02 | TradeIntent ≠ RiskCheck | ✅ |
| AC-R02-03 | governance limits ≠ LimitPolicy executável | ✅ |
| AC-R02-04 | capital reservation separado | ✅ |
| AC-R02-05 | execution gates com permits + epochs | ✅ |
| AC-R02-06 | PG autoritativo; zero SQLite | ✅ |
| AC-R02-07 | REAL proibido v1 | ✅ |
| AC-R02-08 | CONFIG_REQUIRED fail-closed | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
