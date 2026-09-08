---
type: debate
---

# R02 — Fronteiras: `modules/decisions`

**Componente:** modules/decisions  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P06  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-97** · contrato P06: **ANX-58**

## Objetivo da rodada

Fechar fronteiras **possui / não possui** entre decisions e vizinhos (**governance**, **orchestration**, **agents**, **knowledge**, **strategies**, **portfolios**, **capital**, **market-data**, **risk**, **execution**, **audit**, **graph**); ratificar **PostgreSQL** como dono de **DecisionRecord**, **Proposal**, **TradeIntent** e **Disposition**; separar proposta de agente, grant de governança, task de orquestração e manifesto de auditoria; definir invariantes testáveis para R03/R04.

## Fontes aplicadas

| Fonte | Uso em R2 |
| --- | --- |
| [R01-context.md](./R01-context.md) | Inventário expandido |
| spec 003 § Decision, TradeIntent, segregação funções | Imutabilidade intent, fluxo PROPOSED→SUBMITTED |
| spec 001 | Envelope institucional, ownerDomain, journal/outbox |
| ADR0001 | Grafo fundamenta; efeito exige revalidação epoch PG |
| [governance/R01-context.md](../governance/R01-context.md) | Grants, authorityEpoch, mandatos |
| [orchestration/R02-paperclip-checkout-heartbeat.md](../orchestration/R02-paperclip-checkout-heartbeat.md) | Task/Run ≠ decisão de investimento |
| [agents/R02-boundaries.md](../agents/R02-boundaries.md) | AgentVersion ≠ Proposal |
| [knowledge/R02-boundaries.md](../knowledge/R02-boundaries.md) | Evidence storage vs referência |
| [portfolios/R02-boundaries.md](../portfolios/R02-boundaries.md) | Position/valuation read-only para bounds |
| [strategies/R02-boundaries.md](../strategies/R02-boundaries.md) | Signal ≠ TradeIntent |
| ANX-58 | Ciclo P06 SIMULATED/PAPER sem REAL |

## Debate R2 (diálogo atribuído)

**Arquiteto:** decisions é dono de **DecisionRecord**, **Proposal**, **TradeIntent** imutável por hash, **Disposition** e **AuthorityRef** — o que foi decidido, com que evidência e qual intenção congelada.

**Crítico (governance):** Grant e mandato — quem persiste?

**Arquiteto:** **governance** persiste `Grant`, `Mandate`, `authorityEpoch`. **decisions** persiste **AuthorityRef** snapshot e **revalida** via GovernancePort — não reescreve grant nem incrementa epoch.

**Crítico (orchestration):** Task ANX-* — decisions ou orchestration?

**Arquiteto:** **orchestration** dono de `Goal`, `Task`, `Run`, `TaskLease`. **decisions** referencia `correlationId` / `taskId?` / `runId?` — não faz checkout nem heartbeat.

**Crítico (agents):** Agente propõe TradeIntent?

**Arquiteto:** **agents** dono de `Agent`, `AgentVersion`. **decisions** dono de **Proposal** com `proposedBy: { agentId, agentVersionId }`. agents emite `decisions.propose` — não persiste TradeIntent.

**Crítico (knowledge):** Evidência — onde vive?

**Arquiteto:** **knowledge** dono de `Evidence`. **decisions** persiste **EvidenceManifest** (hashes, evidenceId[]) — não duplica blob.

**Crítico (audit):** Flight Recorder?

**Arquiteto:** **audit** dono de `FlightRecorderManifest`. **decisions** emite `manifestHash` em eventos — não substitui archive audit.

**Security:** cross-tenant = bloqueador G4; proponente ≠ approver quando policy exige (FI03).

**Síntese Orquestrador:** Cinco domínios separados; PG autoritativo; REAL e SQLite proibidos v1.

---

## Decisão: cinco domínios do pipeline P06

| Domínio | Dono | Persiste | **Não** persiste |
| --- | --- | --- | --- |
| Decisão/intenção | **decisions** | DecisionRecord, Proposal, TradeIntent, Disposition, AuthorityRef | Grant, RiskCheck, Order |
| Autoridade | **governance** | Grant, Mandate, authorityEpoch | TradeIntent |
| Orquestração | **orchestration** | Goal, Task, Run, TaskLease | TradeIntent |
| Evidência | **knowledge** | Evidence, ContextManifest | Decision state |
| Risco/permit | **risk** + contracts | RiskCheck, riskEpoch; ExecutionPermit schema | Transições sem evento |

## Invariantes R02 (`DC-R02-INV-*`)

| ID | Regra |
| --- | --- |
| DC-R02-INV-01 | TradeIntent imutável após submit |
| DC-R02-INV-02 | decisions não persiste Grant — só AuthorityRef + revalidate |
| DC-R02-INV-03 | decisions não persiste Task/Run — só correlationId refs |
| DC-R02-INV-04 | agents não persiste TradeIntent |
| DC-R02-INV-05 | knowledge Evidence autoritativo — decisions só manifest |
| DC-R02-INV-06 | risk calcula RiskCheck — decisions consome evento |
| DC-R02-INV-07 | execution consome permit — decisions não envia ordem |
| DC-R02-INV-08 | Proponente ≠ approver quando policy exige independência |
| DC-R02-INV-09 | authorityEpoch stale → rejeita RESERVED/READY |
| DC-R02-INV-10 | SQLite proibido para Decision/Intent autoritativos |
| DC-R02-INV-11 | executionMode=REAL rejeitado v1 |
| DC-R02-INV-12 | Cross-tenant organizationId match em todas refs |
| DC-R02-INV-13 | audit archive em audit — decisions emite manifestHash |
| DC-R02-INV-14 | Signal → Proposal input; decisions materializa TradeIntent |

## Critérios de aceite — R02

| # | Critério | Status |
| --- | --- | --- |
| AC-R02-01 | Tabela possui/não possui completa | ✅ |
| AC-R02-02 | Decision ≠ governance grant | ✅ |
| AC-R02-03 | Decision ≠ orchestration Task/Run | ✅ |
| AC-R02-04 | Proposal agente ≠ AgentVersion | ✅ |
| AC-R02-05 | Evidence manifest ≠ knowledge storage | ✅ |
| AC-R02-06 | PG autoritativo; zero SQLite | ✅ |
| AC-R02-07 | REAL proibido v1 | ✅ |
| AC-R02-08 | Audit trail via manifestHash | ✅ |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
