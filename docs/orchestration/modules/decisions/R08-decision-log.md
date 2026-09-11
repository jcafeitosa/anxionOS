---
type: debate
status: draft
---
# R08 — Decision log: `modules/decisions`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue:** ANX-97 · gate: ANX-58 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-DC-001–015 (ownership, imutabilidade, PG, PAPER/SIMULATED, FI03, epochs, journal).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-97/389. Sem ST08 live.

## Non-goals

Não ADR novo. Não merge de Grant em decisions. Não ST08. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| DecisionRecord / Proposal / TradeIntent / Disposition / AuthorityRef | **decisions** |
| Grant | **governance** |
| Task/Run | **orchestration** |
| Evidence storage | **knowledge** |
| RiskCheck | **risk** |
| Flight Recorder | **audit** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-DC-001 | decisions dono DecisionRecord, Proposal, TradeIntent, Disposition, AuthorityRef | draft |
| D-DC-002 | TradeIntent imutável pós-submit; alteração = novo hash | draft |
| D-DC-003 | governance Grant separado — AuthorityRef snapshot only | draft |
| D-DC-004 | orchestration Task/Run separado — correlationId link | draft |
| D-DC-005 | agents Proposal source; decisions materializa intent | draft |
| D-DC-006 | knowledge Evidence storage; decisions EvidenceManifest refs | draft |
| D-DC-007 | risk RiskCheck separado; state via evento | draft |
| D-DC-008 | audit Flight Recorder; decisions manifestHash only | draft |
| D-DC-009 | PG autoritativo; zero SQLite | draft |
| D-DC-010 | SIMULATED+PAPER only v1 | draft |
| D-DC-011 | Independent approver policy (FI03) | draft |
| D-DC-012 | Epoch stale recheck antes RESERVED/READY | draft |
| D-DC-013 | command_journal ownerDomain=decisions | draft |
| D-DC-014 | graph projeção async agent→evidence→decision→intent | draft |
| D-DC-015 | RLS defer P09 — application-only tenancy | draft |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
