---
type: debate
---
# R04 — Contratos e eventos: `modules/risk`

**Issues:** ANX-99 · pack ANX-389 · gate ANX-58 · impl ANX-100 **não** neste pack  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md). Sem schema produção.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| ownerDomain | `risk` |
| executionMode v1 | SIMULATED \| PAPER only |
| eventType | `risk.<aggregate>.<action>.v1` |
| Segredos | **proibido** |

**KEEP adapter-gateway** nos contratos se já exportado.

### Códigos

| Código | HTTP | Quando |
| --- | --- | --- |
| RK_CROSS_TENANT | 403 | Org mismatch |
| RK_CONFIG_REQUIRED | 409 | política ausente — fail-closed |
| RK_PERMIT_STALE | 409 | epoch/kill switch |
| RK_KILL_SWITCH_ACTIVE | 403 | |
| RK_LIMIT_EXCEEDED | 409 | |
| RK_POLICY_STALE | 409 | |

## In / Out (R4)

**In:** consumer `decisions.intent.submitted.v1`; `portfolios.position.updated.v1`; `capital.reservation.created.v1`; comando runPreTradeCheck (T01).

**Out:** eventos abaixo. **Não** `execution.order.*`.

## Non-goals

- REAL v1.
- Post-trade neste contrato v1 (S4 defer).
- OpenAPI público neste pack.

## Eventos emitidos v1

| eventType | Consumidores |
| --- | --- |
| `risk.check.completed.v1` | decisions, capital, execution, audit |
| `risk.permit.issued.v1` | capital, execution, audit |
| `risk.epoch.bumped.v1` | graph, execution, decisions |
| `risk.kill_switch.activated.v1` | operations, execution |

## Eventos consumidos

`decisions.intent.submitted.v1` · `portfolios.position.updated.v1` · `capital.reservation.created.v1`

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-RK-S2-01 | G3 | PASS emite permit |
| G3-RK-S2-02 | G3 | CONFIG_REQUIRED deny |
| G3-RK-S2-03 | G3 | cross-tenant reject |
| G3-RK-S2-04 | G3 | stale epoch reject |
| G3-RK-S2-05 | G3 | limit exceeded deny |
| G5-RK-01 | G5 | RK_CROSS_TENANT |

## Alternativas rejeitadas

Risk no SQLite; REAL v1; LLM override DENY; risk emite ordem.

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
