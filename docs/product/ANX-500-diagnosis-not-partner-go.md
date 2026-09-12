---
title: "ANX-500 — Diagnosis APPROVE; Partner GO BLOQUEADO"
status: published
type: product-decision
issue: ANX-500
publisher: Marina Okonkwo
draft_author: Marina Lopes
date: 2026-09-12
---

# ANX-500 — Diagnosis APPROVE; Partner GO Bloqueado

## Decisão

**APPROVE**: seed + e2e/a11y + honesty/diagnosis.  
**BLOCK**: flip `partnerAccess` e Partner console live/GO.

### Escopo Aprovado

1. **Platform seed PP-J2**: fixtures realistas.
2. **Auth**: `/onboarding` + `/select-organization`.
3. **e2e + a11y**: WCAG 2.2 AA.
4. **Honesty/diagnosis**: HonestState aplicado.
5. **Sem UI nova** neste slice.

### Partner neste Issue

- **Fixtures**: Partner retorna `HonestState` denied/empty.
- **Escopo**: fixtures apenas; **sem** Partner console live.

### Escopo Bloqueado

- **`partnerAccess` flip**: bloqueado até CPO reabrir.
- **Partner console GO**: não liberar neste momento.

## Owner Catalog Honesty

Critérios de honestidade UX para Owner Agents Catalog pertencem **exclusivamente** a [ANX-496-owner-catalog-honesty-ux.md](./ANX-496-owner-catalog-honesty-ux.md). **Não** misturar com ANX-500.

## Critérios UX Supersede

Ver [ANX-500-ux-criteria-supersede.md](./ANX-500-ux-criteria-supersede.md) (decisão Renata).

## Autoria

- **Draft**: Marina Lopes
- **Publicado por**: Marina Okonkwo

---

**Cross-references**: ANX-498 (backend-only), ANX-499 (realtime freeze), ANX-496 (Owner catalog — **não** misturar), ANX-500-ux-criteria-supersede (Renata).
