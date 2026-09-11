---
type: debate
---

# R02 — Fronteiras: `modules/accounting`

**Componente:** modules/accounting  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-93** · contrato P06: **ANX-58**

## In / Out (R2)

**In:** fronteira ledger institucional vs invoice, alocação e preço.

**Out:** Invoice (`billing`). Hold de capital. Tick persist (`market-data`). Fill (`execution`).

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| JournalEntry / ReconciliationCase financeiro | **accounting** |
| adapter-gateway | **KEEP** |

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre accounting e vizinhos (**capital**, **billing**, **market-data**, **execution**, **portfolios**, **performance**, **connections**, **partners**); ratificar **PostgreSQL** como único dono do **ledger autoritativo**; separar ledger institucional de invoice de plataforma, alocação de capital e preço de mercado; proibir SQLite para ledger; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido |
| spec 003 § Ledger / reconciliação | Partida dobrada, fill→posting, ReconciliationCase |
| spec 001 | Conta/reserva/intenção — owners por domínio |
| [capital/R02-boundaries.md](../capital/R02-boundaries.md) | Ledger vs BalanceView vs Allocation |
| [billing/R01-context.md](../billing/R01-context.md) | Invoice vs ledger trading |
| [market-data/R02-boundaries.md](../market-data/R02-boundaries.md) | Preço observado vs lançamento contábil |
| [execution/R01-context.md](../execution/R01-context.md) | Fill como gatilho de posting |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Debate R2 (diálogo atribuído)

**Arquiteto:** accounting é dono do **ledger institucional** (partida dobrada), **taxas de trading**, **reversões/ajustes** e **ReconciliationCase financeiro**. Confirma fatos monetários após execution/billing/partners — não decide alocação nem emite ordem.

**Crítico (capital):** Saldo settled — quem é fonte?

**Arquiteto:** **accounting** é fonte autoritativa de **ledger confirmado** (`debit = credit` por journal entry). **capital** mantém **BalanceView** derivada de `accounting.ledger.posted.v1` + reservas locais para `available` — capital não inventa lançamento; accounting não mantém reserva transacional.

**Crítico (billing):** Invoice paga da plataforma — ledger onde?

**Arquiteto:** **billing** dono de `Subscription`, `Invoice`, `Refund`, webhooks e idempotência de cobrança. **accounting** recebe `billing.invoice.paid.v1` e materializa **LedgerPosting** em contas de receita/caixa plataforma — billing não persiste partida dobrada de trading nem mistura consumo IA (connections) com capital de investimento.

**Crítico (market-data):** Preço de marcação — accounting ou market-data?

**Arquiteto:** **market-data** dono de **observações temporais** (Timescale) e registry de instrumentos. accounting referencia `priceAsOf` + `observationId` em postings de marcação/ajuste — **não** replica série de preços nem infere corporate action só de tick.

**Crítico (connections):** Custo IA — ledger aqui?

**Arquiteto:** **connections** mede usage e emite eventos de consumo. **billing** agrega período → invoice. **accounting** lança receita/custo reconhecido após evento pago ou policy de reconhecimento — connections não escreve ledger.

**Security:** Journal e postings sempre escopados `organizationId`; cross-tenant leak = bloqueador G4. Segredos de venue/pagamento nunca em payloads de ledger.

**Executor:** v1 alinha ANX-58: postings SIMULATED/PAPER; sem reconciliação venue REAL homologada.

**Síntese Orquestrador:** Fronteira aceita; PG ledger autoritativo; quatro domínios separados (ledger / allocation / invoice / price); proibição REAL/live e SQLite ledger fechadas para R03/R05.

---

## Decisão: quatro domínios monetários (R02 núcleo)

| Domínio | Dono | O que persiste | O que **não** persiste |
| --- | --- | --- | --- |
| **Ledger institucional** | **accounting** | JournalEntry, LedgerPosting, FeeSchedule, Reversal, ReconciliationCase (financeiro) | Reserva, Allocation, saldo disponível operacional |
| **Alocação / reserva** | **capital** | CapitalAccount, Allocation, CapitalReservation, BalanceView | Partida dobrada, invoice plataforma |
| **Cobrança plataforma** | **billing** | Subscription, Invoice, Refund, webhook idempotency | Ledger trading, usage bruto IA |
| **Preço / observação** | **market-data** | Instrument, Observation, MarketEvent | Lançamento contábil, NAV oficial |

## Decisão: possui / não possui (completo)

| Dado / comportamento | Dono |
| --- | --- |
| ChartOfAccounts, JournalEntry, LedgerPosting, FeePosting | **accounting** |
| Reversal, Adjustment, ReconciliationCase (saldo/lançamento) | **accounting** |
| CapitalAccount, Allocation, CapitalReservation | **capital** |
| BalanceView (`available`, encumbrances) | **capital** (derivado) |
| Subscription, Invoice, Refund (plataforma) | **billing** |
| Provider usage, AIAccount, inferência metering | **connections** |
| Instrument, PriceObservation, MarketEvent | **market-data** |
| Order, Fill, venue reconciliation protocol | **execution** |
| Position, valuation read model | **portfolios** |
| P&L, attribution, performance metrics | **performance** (derivado de ledger + positions) |
| Partner commission accrual | **partners** → evento → accounting posting |
| Flight recorder, lineage manifest | **audit** |

## Invariantes R02 (`ACC-R02-INV-*`)

| ID | Regra |
| --- | --- |
| ACC-R02-INV-01 | Cada JournalEntry: soma débitos = soma créditos (mesma moeda por linha; FX via policy explícita) |
| ACC-R02-INV-02 | accounting não persiste Allocation nem CapitalReservation |
| ACC-R02-INV-03 | accounting não persiste Invoice/Subscription — só consome eventos billing |
| ACC-R02-INV-04 | accounting não armazena série de preços — só referencia observationId/asOf |
| ACC-R02-INV-05 | Fill→posting: idempotente por `(fillId, postingKind)` ou `idempotencyKey` |
| ACC-R02-INV-06 | capital não emite `accounting.ledger.posted` — só accounting confirma journal |
| ACC-R02-INV-07 | billing.paid → posting assíncrono projector; billing não escreve tabela ledger |
| ACC-R02-INV-08 | SQLite **proibido** para journal/ledger/postings autoritativos |
| ACC-R02-INV-09 | `executionMode=REAL` posting venue REAL → rejeitado v1 |
| ACC-R02-INV-10 | ReconciliationCase referencia `ownerDomain` único; subtarefas não cruzam sem contrato |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui completa | ✅ |
| AC-R02-02 | Ledger ≠ capital allocation separados | ✅ |
| AC-R02-03 | Ledger ≠ billing invoice separados | ✅ |
| AC-R02-04 | Posting ≠ market-data price separados | ✅ |
| AC-R02-05 | PG ledger autoritativo; zero SQLite | ✅ |
| AC-R02-06 | REAL/live proibido v1 | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
