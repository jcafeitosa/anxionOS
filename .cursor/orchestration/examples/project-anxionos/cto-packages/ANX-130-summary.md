# CTO Package — ANX-130

**Gerado:** 2026-09-09 (read-only prep)  
**Issue:** P02: durabilidade outbox/inbox e evolução de eventos  
**Status board:** `in_review`  
**cto-decide:** `ESCALATE_TO_OWNER` · `BLOCKED`

---

## Resumo

Pacote P02 `packages/eventing` — estado+journal+outbox atômico, inbox, ordering, DLQ, replay. **Bloqueia** ANX-133, ANX-136 e múltiplos downstream. Entrega staged aguarda ANX-222.

---

## Últimos comentários relevantes (board)

| Título | Thread |
| --- | --- |
| G7 READY — Owner acceptance package | cursor-anxionos-20d6a526 |
| G2 independente — PASS_WITH_CONDITIONS | cursor-anxionos-20d6a526 |
| G2 independente — BLOCKED | thread paralela |
| G2 REVALIDATION (post fixes) | cursor-anxionos-20d6a526 |
| Blocker — Owner G1 greenlight pending | cursor-orchestrator-20260908 |
| Handoff ANX-220 C9-R1: G1–G6 documentais PASS | cursor-anxionos-20d6a526 |

---

## Bloqueadores

| Bloqueador | Severidade |
| --- | --- |
| Security G4 BLOCKED | Crítico |
| Gates G2, G4 BLOCKED nos comentários | Crítico |
| Deliverable staged — commit ANX-222 | Dependência |
| Dialogue sem handoff formal | Aviso |

---

## Evidências necessárias para `cto-decide` PASS

1. **G1:** ✅ documentado — confirmar `verdict` dialogue atualizado
2. **G2:** Resolver BLOCKED; manter PASS_WITH_CONDITIONS apenas com disposição explícita
3. **G3:** QA EXECUTED sem BLOCKED pendente
4. **G4:** Security PASS (bloqueio atual)
5. **G5–G6:** Pareceres completos
6. **HEAD limpo:** commits via ANX-222 + oráculos verdes
7. **Testes reais:** PostgreSQL/NATS conforme aceite da issue

---

## Dependência ANX-222

| Aspecto | Detalhe |
| --- | --- |
| **Relação** | Drift `eventing` é escopo **Tier 2** de ANX-222 |
| **Owner auth** | Template em [OWNER-AUTHORIZATION.md](../OWNER-AUTHORIZATION.md) |
| **Downstream** | ANX-133 workers depende de ANX-130; ANX-136 governance bloqueada |

**Comando:** `npm run orchestration:cto-decide -- --issue ANX-130`
