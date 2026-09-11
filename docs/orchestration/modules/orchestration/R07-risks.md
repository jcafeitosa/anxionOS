---
type: debate
---
# R07 — Riscos: `modules/orchestration`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issue:** ANX-393 · pack ANX-389  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md).

## In / Out (R7)

**In scope:** ameaças de double checkout, heartbeat zombie, board-as-ledger, StartRun sem T01, agentId forjado, GateBinding auto-PASS, 24º módulo.

**Out of scope:** ameaça de venue (`execution`); PolicyVersion RISK (`risk` P06); AgentVersion immutability (`agents`); D-GOV-010.

## Non-goals

Não mitigar com stub de lease. Não aceitar Dashi como verdade. Não auto-PASS de gate.

## Ownership de controles

| Risco | Controle vive em |
| --- | --- |
| Lease uniqueness | **orchestration** PG |
| T01 DENY | **governance** + TraversalEvaluator |
| agentId canônico | **agents** AgentRegistryPort |
| Claim board | Dashi — **não** orchestration ledger |

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-ORC-01 | Double checkout | 4 | 5 | 20 | lock PG + unique lease vigente | G3 |
| R-ORC-02 | Heartbeat zombie | 3 | 4 | 12 | expiry + fail-closed | G3 |
| R-ORC-03 | Board como ledger | 3 | 5 | 15 | MirrorPort only | G2 |
| R-ORC-04 | StartRun sem T01 | 3 | 5 | 15 | TraversalEvaluator fail-closed | G5 |
| R-ORC-05 | agentId forjado | 3 | 5 | 15 | Registry + sessão; body ignorado | G5 |
| R-ORC-06 | 24º módulo projects/tasks | 2 | 4 | 8 | PC 11/12 | P1 |
| R-ORC-07 | GateBinding auto-PASS | 2 | 5 | 10 | evidência obrigatória | G2 |
| R-ORC-08 | D-GOV-010 aqui | 1 | 3 | 3 | defer P06 risk | P06 |
| R-ORC-09 | leaseToken em evento | 3 | 5 | 15 | só hash (ORC-R04-01) | G4 |
| R-ORC-10 | Cross-tenant lease steal | 3 | 5 | 15 | AgencyScopePort 403 | G5 |

### Top 5

1. R-ORC-01 double checkout · 2. R-ORC-04 T01 · 3. R-ORC-05 agentId · 4. R-ORC-03 board ledger · 5. R-ORC-09 leaseToken

## Oráculos G5

| ID | Esperado |
| --- | --- |
| G5-ORC-01 | agentId no body ignorado |
| G5-ORC-02 | T01 DENY bloqueia efeito externo |
| G5-ORC-03 | lease steal cross-tenant → 403 |

## Saída R7

Riscos v1 fechados para R8.
