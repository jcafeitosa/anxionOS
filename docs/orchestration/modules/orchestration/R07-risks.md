---
type: debate
---
# R07 — Riscos: `modules/orchestration`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issue:** ANX-393

| ID | Risco | Mitigação | Gate |
| --- | --- | --- | --- |
| R-ORC-01 | Double checkout | lock PG + unique lease vigente | G3 |
| R-ORC-02 | Heartbeat zombie | expiry + fail-closed | G3 |
| R-ORC-03 | Board como ledger | MirrorPort only | G2 |
| R-ORC-04 | StartRun sem T01 | TraversalEvaluator | G5 |
| R-ORC-05 | agentId forjado | Registry + sessão | G5 |
| R-ORC-06 | 24º módulo projects/tasks | PC 11/12 | P1 |
| R-ORC-07 | GateBinding auto-PASS | evidência obrigatória | G2 |
| R-ORC-08 | D-GOV-010 aqui | defer P06 risk | P1 |

## Oráculos G5

G5-ORC-01 agentId body ignorado; G5-ORC-02 T01 DENY bloqueia efeito externo; G5-ORC-03 lease steal cross-tenant 403.

## Saída R7

Riscos para R8.
