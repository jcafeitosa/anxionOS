---
type: debate
status: draft
---

# R08 — Decision log: `modules/decisions`

**Issue:** ANX-97 · gate: ANX-58

| ID | Decisão | Status |
| --- | --- | --- |
| D-DC-001 | decisions dono DecisionRecord, Proposal, TradeIntent, Disposition, AuthorityRef | ✅ |
| D-DC-002 | TradeIntent imutável pós-submit; alteração = novo hash | ✅ |
| D-DC-003 | governance Grant separado — AuthorityRef snapshot only | ✅ |
| D-DC-004 | orchestration Task/Run separado — correlationId link | ✅ |
| D-DC-005 | agents Proposal source; decisions materializa intent | ✅ |
| D-DC-006 | knowledge Evidence storage; decisions EvidenceManifest refs | ✅ |
| D-DC-007 | risk RiskCheck separado; state via evento | ✅ |
| D-DC-008 | audit Flight Recorder; decisions manifestHash only | ✅ |
| D-DC-009 | PG autoritativo; zero SQLite | ✅ |
| D-DC-010 | SIMULATED+PAPER only v1 | ✅ |
| D-DC-011 | Independent approver policy (FI03) | ✅ |
| D-DC-012 | Epoch stale recheck antes RESERVED/READY | ✅ |
| D-DC-013 | command_journal ownerDomain=decisions | ✅ |
| D-DC-014 | graph projeção async agent→evidence→decision→intent | ✅ |
| D-DC-015 | RLS defer P09 — application-only tenancy | ✅ |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
