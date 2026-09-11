---
type: debate
---
# R09 — Plano: `modules/orchestration`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue:** ANX-393  
G1 só após greenlight Owner + issue impl distinta. Spec 002/006 **draft**. D-GOV-010 **não** aqui. ANX-342 **não** done. Ownership: Goal/Task/Run/lease; AgentVersion = agents; T01 = graph/governance. Board Dashi = espelho, não ledger.

## Fatias futuras

S1 schema PG · S2 contracts · S3 checkout UoW · S4 heartbeat worker · S5 GateBinding · S6 HTTP · S7 TaskboardMirror. Oráculos G1: G3-ORC-01 checkout atômico · G3-ORC-02 heartbeat recusa lease expirado · G5-ORC-01 lease cross-tenant. Sem pastas projects/tasks/agent-teams.

Pré-req: AgentRegistryPort (agents), T01 (graph/governance), eventing.

Não scaffoldar 23 módulos. P1 só pack documental.

## Saída R9

Não scaffoldar 23 módulos. P1 só pack documental. Para [R10](./R10-g0-handoff.md).
