---
type: debate
---

# R09 — Slice S8 defer checklist (`modules/graph`)

Checklist de encerramento **G1 dev** para ANX-32. Slice S8 é **defer OK pós-G1** ([R09-dev-plan.md](./R09-dev-plan.md) §Fases). Nenhuma implementação adicional neste slice — apenas documentação e pareceres.

**Issue:** ANX-32 · **Thread closeout:** `cf9484ed` · **Data:** 2026-09-07

---

## Itens S8 (defer / parecer)

| # | Item | Decisão | Evidência / destino |
| --- | --- | --- | --- |
| S8-01 | OpenAPI Scalar público (`npm run contracts:openapi`) | **Defer** pós-G1 | D-GR-038 · GK-R08-03 · comando documentado em [R08](./R08-decision-log.md); Scalar integra Elysia quando contracts PG estáveis |
| S8-02 | `graphDlqReplayInputSchema` em `@anxionos/contracts` | **Defer** pós-G1 | D-GR-042 · replay manual PLATFORM via admin HTTP S7; schema Zod entra slice 2 |
| S8-03 | Partial rebuild spike (T07 cross-domain) | **No-go v1** | D-GR-037 full generation swap only · critérios [R09 §Spike partial rebuild](./R09-dev-plan.md#spike-partial-rebuild--gono-go-s8--gk-r08-01) · T07 merge cross-domain **rejeitado** (Session L) |
| S8-04 | Bench T01 p99 ≤ 80ms (Redis L2 warm) | **Defer** pós-G1 | Target dev R09 §Bench; script bench não bloqueia G1 mock T01 |
| S8-05 | Auto-replay DLQ batch | **Não implementado** v1 | D-GR-039 · replay manual idempotente G3-08/G5-05 entregue S7 |
| S8-06 | SLO premium / PagerDuty lag | **Defer** P07 | D-GR-040/041 |

---

## G1 entregue (S1–S7)

| Slice | Evidência mínima | Status |
| --- | --- | --- |
| S1 | contracts + migrations 0000–0003 + `ensureGraphSchema` | ✅ |
| S2 | domain registry fail-fast + ports | ✅ |
| S3 | Neo4j adapter isolado + constraints | ✅ |
| S4 | inbox/DLQ/poison + consumers smoke | ✅ |
| S5 | full generation swap worker | ✅ |
| S6 | L1 LRU + L2 Redis epoch-aware | ✅ |
| S7 | HTTP `/v1/graph/*` (5 rotas) + fixture F0 + mock T01 | ✅ |

**Testes (2026-09-07):** 63 graph + 12 contracts = **75 pass**; 2 falhas AR01 boundary (`application/http/*` importa adapter neo4j — achado G2, fora escopo S8 defer).

**Rotas S7:** `POST /v1/graph/traversal/T01`, `POST /v1/graph/traversal/T03`, `GET /v1/graph/nodes/{nodeKey}`, `POST /v1/graph/nodes/batchGet`, `POST /v1/graph/admin/rebuild`, `POST /v1/graph/admin/dlq/{id}/replay`.

---

## Bloqueadores integrado (pós-G1)

| Bloqueador | Impacto |
| --- | --- |
| **ANX-28 G7** | Wiring identity real; T01 produção; consumers identity smoke integrado |
| **RB-D04** | Grant events F0 mínimo governance → graph projector |

**G1 isolado (mocks/fixtures):** completo · **G1 integrado:** bloqueado até upstream.

---

## Próximo gate

**G2 — Code Review Team:** diff S1–S7 + AR01 boundary violations + matriz G3/G5 S7.
