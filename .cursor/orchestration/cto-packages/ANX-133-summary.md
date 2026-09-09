# CTO Package — ANX-133

**Gerado:** 2026-09-09 (read-only prep)  
**Issue:** P02: workers operáveis, leases e shutdown seguro  
**Status board:** `in_review`  
**cto-decide:** `ESCALATE_TO_OWNER` · `BLOCKED`

---

## Resumo

Pacote P02 workers — `backend/apps/workers`, leases, fencing, graceful shutdown, checkpoints. **Melhor posição na fila G7** (G6 integrado PASS). Ainda bloqueado por G4 Security e commit ANX-222.

---

## Últimos comentários relevantes (board)

| Título | Thread |
| --- | --- |
| G7 READY — Owner acceptance package | cursor-anxionos-20d6a526 |
| G2 — PASS_WITH_CONDITIONS | cursor-anxionos-20d6a526 |
| Handoff ANX-220 C9-R1: G1–G6 documentais PASS | cursor-anxionos-20d6a526 |
| Blocker — Owner G1 greenlight pending | cursor-orchestrator-20260908 |

---

## Bloqueadores

| Bloqueador | Severidade |
| --- | --- |
| Security G4 BLOCKED | Crítico |
| Deliverable staged — commit ANX-222 | Dependência |
| Dialogue sem handoff formal | Aviso |

---

## Evidências necessárias para `cto-decide` PASS

1. **G1:** ✅ PASS documentado
2. **G2:** PASS_WITH_CONDITIONS — disposição formal se condições persistirem
3. **G3–G5:** EXECUTED (verificar comentários)
4. **G6:** ✅ integrado PASS documentado
5. **G4:** Resolver BLOCKED Security
6. **Commit ANX-222:** workers + eventing em HEAD limpo
7. **Sandbox:** kill/restart/lease expiry com evidência

---

## Dependência ANX-222

| Aspecto | Detalhe |
| --- | --- |
| **Relação** | `blockedBy: ANX-130`; workers apps compõem donos |
| **Blocks** | ANX-140 (orchestration scheduler) |
| **Owner auth** | Tier 1 + Tier 2 (workers + eventing) |
| **Prioridade fila** | Primeiro candidato a G7 após G4 desbloqueado + commits |

**Comando:** `npm run orchestration:cto-decide -- --issue ANX-133`
