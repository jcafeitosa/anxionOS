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

**APPROVE**: seed + e2e/a11y + honesty/diagnosis para **Owner e Platform**.  
**BLOCK**: `partnerAccess` flip e Partner console live/GO.

### Escopo Aprovado

1. **Seed**: fixtures realistas.
2. **e2e + a11y**: WCAG 2.2 AA.
3. **Auth**: `/onboarding` + `/select-organization`.
4. **Platform**: seed/e2e sem UI nova neste slice.

### Escopo Bloqueado

- **Partner console GO**: não liberar neste momento.
- **`partnerAccess` flip**: bloqueado até CPO reabrir.
- **Partner fixtures**: devem retornar `HonestState` denied/empty.

## Critérios UX

Ver [ANX-500-ux-criteria-supersede.md](./ANX-500-ux-criteria-supersede.md) (decisão Renata).

## Autoria

- **Draft**: Marina Lopes
- **Publicado por**: Marina Okonkwo

---

**Cross-references**: ANX-498 (backend-only), ANX-499 (realtime freeze), ANX-496 (Owner catalog), ANX-500-ux-criteria-supersede (Renata).
