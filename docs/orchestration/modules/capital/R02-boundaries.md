---
type: debate
---

# R02 — Fronteiras: `modules/capital`

**Componente:** modules/capital  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-91** · contrato P06: **ANX-58**

## In / Out (R2)

**In:** titularidade, alocação (mandato) e reserva transacional.

**Out:** Grant entity (`governance`). Partida dobrada (`accounting`). Position (`portfolios`). REAL/live v1.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| CapitalAccount / Allocation / Reservation | **capital** |
| adapter-gateway | **KEEP** |

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre capital e vizinhos (**accounting**, **governance**, **strategies**, **graph**, **organizations**, **portfolios**, **decisions**, **risk**, **execution**); ratificar **PostgreSQL** como único dono de saldo/reserva autoritativa; proibir paths **REAL/live** em v1; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido |
| spec 003 § Capital próprio | CapitalAccount, Allocation, reserva transacional, FI02 |
| spec 001 | Conta/reserva/intenção — owners por domínio |
| [accounting/R01-context.md](../accounting/R01-context.md) | Ledger vs saldo disponível |
| [strategies/R02-boundaries.md](../strategies/R02-boundaries.md) | Deployment budget ≠ conta capital |
| [governance/R01-context.md](../governance/R01-context.md) | Grant entity owner |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Debate R2 (diálogo atribuído)

**Arquiteto:** capital é dono de **titularidade de conta**, **alocação (mandato)** e **reserva transacional** — o que pode ser comprometido antes de ordem/ledger. accounting confirma **partida dobrada** após fills; portfolios confirma **posição**; risk **valida** contra reservations autoritativas, não as reescreve.

**Crítico:** Grant de mandato/orçamento — governance ou capital?

**Arquiteto:** **Grant** (entidade, revogação, `authorityEpoch`) é **governance**. capital armazena `grantId` em Allocation e chama `GovernancePort.validateGrant` no comando; nunca duplica tabela de grants.

**Crítico (accounting):** Saldo settled — quem é fonte?

**Arquiteto:** **accounting** é fonte de **ledger confirmado** (débito=crédito). capital mantém **BalanceView** derivada de eventos accounting + reservas locais para `available` em tempo de decisão — com reconciliação explícita; capital não inventa lançamento.

**Crítico (strategies):** `riskBudget` na StrategyVersion reserva capital?

**Arquiteto:** **strategies** declara orçamento na versão; **capital** materializa **Allocation** vinculada a `deploymentId`/`portfolioId` após governance. strategies não chama `reserve` diretamente.

**Security:** Queries e comandos sempre escopados `organizationId` + `ownerUserId`; cross-tenant leak = bloqueador G4.

**Executor:** v1 alinha ANX-58: contas SIMULATED/PAPER; sem `externalAccountRef` de venue REAL homologada.

**Síntese Orquestrador:** Fronteira aceita; PG autoritativo; Grant refs only; proibição REAL/live fechada para R03/R05.

---

## Decisão: possui / não possui

| Dado / comportamento | Dono |
| --- | --- |
| CapitalAccount, Allocation, CapitalReservation, encumbrances | **capital** |
| Grant, Approval, authorityEpoch | **governance** |
| Ledger entry, fee posting, reconciliation case financeiro | **accounting** |
| Position, valuation, NAV | **portfolios** |
| TradeIntent, Decision | **decisions** |
| RiskCheck, PolicyVersion, kill switch | **risk** |
| Order, fill, ExecutionPermit | **execution** |
| StrategyVersion, Deployment, Signal | **strategies** |
| Owner, Agency membership | **organizations** |
| Nó titular→conta→portfolio | **graph** (projeção) |

## Invariantes R02 (`CAP-R02-INV-*`)

| ID | Regra |
| --- | --- |
| CAP-R02-INV-01 | Allocation não duplica saldo depositado — representa mandato/limite |
| CAP-R02-INV-02 | Uma conta física: `available` global evita dupla reserva entre portfolios (FI02) |
| CAP-R02-INV-03 | capital não persiste entidade Grant — só `grantId` + validação governance |
| CAP-R02-INV-04 | capital não emite `execution.order.*` nem `accounting.ledger.posted` |
| CAP-R02-INV-05 | Reserva sem TradeIntent/`intentHash` referenciado → rejeição (exceto Allocation lifecycle) |
| CAP-R02-INV-06 | `executionMode=REAL` / conta venue REAL → rejeitado v1 |
| CAP-R02-INV-07 | Agency só vincula conta do mesmo `ownerUserId` (organizations) |
| CAP-R02-INV-08 | SQLite nunca armazena saldo/reserva autoritativa |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui completa | ✅ |
| AC-R02-02 | Grant vs Allocation separados | ✅ |
| AC-R02-03 | accounting ledger ≠ capital balance owner | ✅ |
| AC-R02-04 | REAL/live proibido v1 | ✅ |
| AC-R02-05 | FI02 double-reservation endereçado | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
