---
type: product-decision
issue: ANX-500
status: published
publisher: Marina Okonkwo
source: Draft by Renata Alves (OpenKnowledge)
date: 2026-09-12
---

# ANX-500 — UX Criteria SUPERSEDE: No Partner Live

**Status:** Published  
**Issue:** ANX-500  
**Publisher:** Marina Okonkwo  
**Draft:** Renata Alves

## SUPERSEDE

**Decision:** Nenhum Partner live neste slice.

**Aceite:** Apenas shells `/partner` + `/platform` com:
- **E2E/a11y testing** aprovado
- **Honesty criteria** aplicados
- **Diagnóstico de estado** (fixtures + HonestState denied/empty)

**BLOCK:** `partnerAccess` flip bloqueado até CPO reabrir.

## Shells Aceitos

1. **`/partner` route:**  
   Shell de rota Partner existe, mas sem funcionalidade live.

2. **`/platform` route:**  
   Shell de rota Platform com seed/e2e (PP-J2) sem nova UI.

3. **E2E/a11y compliance:**  
   Testes E2E e conformidade a11y (WCAG 2.2 AA) para shells.

4. **HonestState denied/empty:**  
   Partner mostra estado denied/empty via HonestState (fixtures de teste).

## Bloqueios

1. **`partnerAccess` flip:**  
   Flag `partnerAccess` permanece **`false`**. Nenhuma alteração permitida até CPO reabrir.

2. **Partner live features (R-T1–R-T4 / R-A1):**  
   Capacidades Partner live estão **fora do aceite**.

3. **Operator Takeover outside P07:**  
   Operator Takeover está bloqueado fora do escopo P07.

## Cross-link Related

- [ANX-500-diagnosis-not-partner-go.md](ANX-500-diagnosis-not-partner-go.md) — Decisão principal de diagnóstico
- [ANX-496-owner-catalog-honesty-ux.md](ANX-496-owner-catalog-honesty-ux.md) — Owner Agents Catalog honesty

## Contexto de SUPERSEDE

Esta decisão **substitui** qualquer aceite anterior de Partner live. O escopo atual é:

- **Shells apenas:** Rotas Partner/Platform existem como shells
- **Diagnóstico apenas:** HonestState denied/empty para Partner
- **Sem features live:** Nenhuma capacidade Partner live (R-T1–R-T4 / R-A1)
- **Sem flip:** `partnerAccess` permanece `false`

## UX Criteria

Aplicam-se os mesmos critérios de honesty de ANX-496 (H1–H4, HX1–HX6):

- Empty state honesto
- Loading state real
- Error state transparente
- Data fidelity
- No phantom actions
- Consistent state
- Real-time feedback
- Permission honesty
- Capability gates
- Data provenance

## Evidência de Shell

**Aceito:**
- Shells de rota `/partner` e `/platform` existem
- HonestState retorna denied/empty para Partner
- Testes E2E/a11y passam para shells
- WCAG 2.2 AA compliance

**Bloqueado:**
- `partnerAccess` flip
- Partner live features
- Operator Takeover outside P07

## Próximos Passos

- Manter shells Partner/Platform
- HonestState denied/empty para diagnóstico
- Testes E2E/a11y para shells
- **Não** alterar `partnerAccess`
- **Não** construir Partner live
- Aguardar CPO reabrir para Partner live
