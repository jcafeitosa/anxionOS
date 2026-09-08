---
type: debate
---

# R02 — Fronteiras: `modules/execution`

**Componente:** modules/execution  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-101** · contrato P06: **ANX-58**

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre execution e vizinhos (**decisions**, **risk**, **governance**, **capital**, **accounting**, **portfolios**, **connections**, **market-data**, **operations**, **audit**, **execution-go**); ratificar **PostgreSQL** como dono de **Order**, **Fill**, **ExecutionSession** e **VenueAdapterRef**; separar intenção de trade, permits, reservas, dispatch venue e lançamento contábil; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido |
| spec 003 § Order, Fill, ciclo SIMULATED | Pipeline decisions→risk→capital→execution→accounting |
| spec 001 | Envelope institucional, ownerDomain, journal/outbox |
| [decisions/R02-boundaries.md](../decisions/R02-boundaries.md) | TradeIntent imutável; decisions não envia ordem |
| [risk/R02-boundaries.md](../risk/R02-boundaries.md) | RiskPermit single-use; execution revalida na submit |
| [capital/R02-boundaries.md](../capital/R02-boundaries.md) | CapitalReservation autoritativa; execution não reserva |
| [accounting/R02-boundaries.md](../accounting/R02-boundaries.md) | Fill→posting assíncrono projector |
| [connections/R02-boundaries.md](../../modules/connections/R02-boundaries.md) | SIMULATED/PAPER only; sem credenciais REAL v1 |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Debate R2 (diálogo atribuído)

**Arquiteto:** execution é dono de **Order**, **Fill**, **ExecutionSession**, **VenueAdapterRef** (binding operacional) e **ReconciliationCase venue** — o que foi enviado ao adapter, o que retornou e como reconcilia com estado interno.

**Crítico (decisions):** TradeIntent — quem materializa ordem?

**Arquiteto:** **decisions** persiste **TradeIntent** imutável e emite `decisions.intent.submitted.v1`. **execution** recebe `intentHash` + refs, valida gates e persiste **Order** — não reescreve intent nem avança Decision state diretamente.

**Crítico (risk):** Ordem sem RiskPermit — bypass?

**Arquiteto:** **execution** revalida **RiskPermit** (single-use, `intentHash`, `riskEpoch`) + **ExecutionPermit** (governance) + **CapitalReservation** ativa na transação de submit. **risk** não envia ordem; execution não emite RiskCheck.

**Crítico (capital):** Reserva consumida no fill ou no submit?

**Arquiteto:** **capital** dono de **CapitalReservation**. **execution** referencia `reservationId` no Order e emite `execution.order.submitted.v1`; consumo parcial/total via `execution.fill.confirmed.v1` consumido por capital projector — execution não muta saldo nem ledger.

**Crítico (accounting):** Posting no hot path?

**Arquiteto:** **accounting** dono de **JournalEntry**. **execution** emite `execution.fill.confirmed.v1` idempotente por `fillId`; accounting projector materializa posting — execution não persiste partida dobrada.

**Crítico (connections):** API keys venue — onde vivem v1?

**Arquiteto:** **connections** dono de bindings e **secretRef** (SIMULATED/PAPER). **execution** persiste **VenueAdapterRef** (`connectionId`, `adapterKind`, `executionMode`) — resolve credencial via ConnectionsPort em runtime; **nenhum** segredo de venue em tabela Order/Fill/evento/outbox v1.

**Crítico (execution-go):** Protocolo venue — TS ou Go?

**Arquiteto:** **execution** (TS) dono de estado autoritativo e gates. **services/execution-go** (futuro) executa protocolo wire/simulator — reporta fills via contrato `DispatchReport`; não persiste Order/Fill autoritativo cross-tenant.

**Security:** cross-tenant `organizationId` match em Order, Session e AdapterRef; REAL/live rejeitado v1.

**Síntese Orquestrador:** Seis fronteiras fechadas; PG autoritativo; permits+reservation+epochs na submit; fill→eventos downstream; zero segredo venue em execution v1.

---

## Decisão: pipeline P06 decisions → risk → capital → execution → accounting

| Etapa | Dono | Artefato | Gate execution |
| --- | --- | --- | --- |
| Intenção | **decisions** | TradeIntent (`intentHash`) | consume `decisions.intent.submitted.v1` |
| Risco | **risk** | RiskPermit | revalida single-use + riskEpoch |
| Governança | **governance** | ExecutionPermit | revalida authorityEpoch |
| Reserva | **capital** | CapitalReservation | reservationId ativa + intentHash match |
| Ordem | **execution** | Order, ExecutionSession | transação atômica submit |
| Fill | **execution** | Fill | idempotente; emite fill.confirmed |
| Ledger | **accounting** | JournalEntry | projector assíncrono |
| Posição | **portfolios** | Position | projector fill.confirmed |

## Decisão: possui / não possui

| Dado / comportamento | Dono |
| --- | --- |
| Order, Fill, ExecutionSession, VenueAdapterRef, OrderAttempt, ReconciliationCase (venue) | **execution** |
| TradeIntent, DecisionRecord, Disposition | **decisions** |
| RiskCheckResult, RiskPermit, riskEpoch | **risk** |
| ExecutionPermit, Grant, authorityEpoch | **governance** |
| CapitalReservation, BalanceView, Allocation | **capital** |
| JournalEntry, LedgerPosting, ReconciliationCase (financeiro) | **accounting** |
| Position, ValuationSnapshot | **portfolios** |
| Connection binding, secretRef, inferência metering | **connections** |
| Instrument, PriceObservation | **market-data** |
| Wire protocol venue, simulator loop | **execution-go** (serviço) |
| Incidente operacional | **operations** |

## Invariantes R02 (`EX-R02-INV-*`)

| ID | Regra |
| --- | --- |
| EX-R02-INV-01 | Order exige `intentHash` + RiskPermit CONSUMED + ExecutionPermit válido |
| EX-R02-INV-02 | execution não persiste TradeIntent — só refs + hash |
| EX-R02-INV-03 | execution não cria CapitalReservation |
| EX-R02-INV-04 | execution não persiste JournalEntry |
| EX-R02-INV-05 | Fill idempotente por `(organizationId, fillId)` ou `venueFillId` unique |
| EX-R02-INV-06 | `clientOrderId` único por `(organizationId, venueAdapterRefId)` |
| EX-R02-INV-07 | RiskPermit/ExecutionPermit stale → submit rejeitado |
| EX-R02-INV-08 | VenueAdapterRef.executionMode ∈ {SIMULATED, PAPER} v1 |
| EX-R02-INV-09 | Segredo venue nunca em Order/Fill/event payload |
| EX-R02-INV-10 | SQLite proibido para order/fill autoritativo |
| EX-R02-INV-11 | REAL / LIVE_TRADING rejeitado v1 |
| EX-R02-INV-12 | Cross-tenant organizationId match em todos os refs |
| EX-R02-INV-13 | accounting posting via evento — não síncrono no submit |
| EX-R02-INV-14 | connections resolve adapter; execution não armazena API key |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui completa | ✅ |
| AC-R02-02 | TradeIntent ≠ Order separados | ✅ |
| AC-R02-03 | Permits + reservation gates na submit | ✅ |
| AC-R02-04 | Fill→accounting assíncrono | ✅ |
| AC-R02-05 | connections secrets fora de execution | ✅ |
| AC-R02-06 | PG autoritativo; zero SQLite | ✅ |
| AC-R02-07 | REAL proibido v1 | ✅ |
| AC-R02-08 | execution-go ≠ estado autoritativo | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
