# CTO Package — ANX-132

**Gerado:** 2026-09-09 (read-only prep)  
**Issue:** P02: catálogo CapabilityManifest e SDK humano/agente  
**Status board:** `in_review`  
**cto-decide:** `ESCALATE_TO_OWNER` · `BLOCKED`

---

## Resumo

Pacote P02 `packages/contracts` — schemas, CapabilityManifest, SDK tipado, matriz UI→API→tool. Entrega staged aguarda commit gate **ANX-222** (Tier 2).

---

## Últimos comentários relevantes (board)

| Título | Thread |
| --- | --- |
| G7 READY — Owner acceptance package | cursor-anxionos-20d6a526 |
| G2 independente — PASS_WITH_CONDITIONS | cursor-anxionos-20d6a526 |
| G2 independente — BLOCKED | thread paralela |
| G2 REVALIDATION (post fixes) | cursor-anxionos-20d6a526 |
| Blocker — Owner G1 greenlight pending | múltiplas threads |

---

## Bloqueadores

| Bloqueador | Severidade |
| --- | --- |
| Security G4 BLOCKED | Crítico |
| Gates G2, G4 BLOCKED | Crítico |
| Deliverable staged — commit ANX-222 | Dependência |
| Dialogue sem handoff formal | Aviso |

---

## Evidências necessárias para `cto-decide` PASS

1. **G1:** PASS documentado
2. **G2:** Resolver BLOCKED; contract tests em CI
3. **G3:** QA com schemas Zod nos boundaries
4. **G4:** Security PASS
5. **G5–G6:** Completos
6. **Tier 2 commit:** drift `contracts` via ANX-222
7. **Compatibilidade:** evidência versionamento/upcast nos comentários

---

## Dependência ANX-222

| Aspecto | Detalhe |
| --- | --- |
| **Relação** | Drift `contracts` = **Tier 2** em ANX-222 |
| **Blocks** | ANX-139, ANX-161, consoles P07 |
| **Owner auth** | Template Tier 2 em OWNER-AUTHORIZATION.md |

**Comando:** `npm run orchestration:cto-decide -- --issue ANX-132`
