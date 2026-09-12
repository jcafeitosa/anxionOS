---
type: product-decision
issue: ANX-500
status: published
publisher: Marina Okonkwo
source: Draft by Marina Lopes (OpenKnowledge)
date: 2026-09-12
---

# ANX-500 — Decisão CPO: diagnóstico, não GO Partner

**Status:** Published  
**Issue:** ANX-500  
**Decision:** Sofia rewrote accept; Renata/Bia aligned  
**Publisher:** Marina Okonkwo  
**Draft:** Marina Lopes

## APPROVE (Aceito)

1. **Seed + e2e/a11y + honesty/diagnosis:**  
   Seed de fixtures, testes E2E e a11y, e **diagnóstico honesto** de estado são aprovados.

2. **WCAG 2.2 AA:**  
   Conformidade com **WCAG 2.2 Nível AA** é obrigatória.

3. **Auth `/onboarding` + `/select-organization`:**  
   Fluxos de autenticação em `/onboarding` e `/select-organization` são aprovados.

4. **Platform seed/e2e (PP-J2) without new UI:**  
   Platform seed e testes E2E (PP-J2) são aprovados **sem nova UI**.

## BLOCK (Bloqueado)

1. **`partnerAccess` flip:**  
   Alteração do flag `partnerAccess` está **bloqueada**.

2. **Partner live / GO Partner:**  
   Partner console **live** e **GO Partner** (capacidades R-T1–R-T4 / R-A1) estão **fora do aceite** atual.

## Definição de Partner neste Issue

- **Partner = fixtures + HonestState denied/empty:**  
   "Partner" neste issue significa **fixtures de teste** e **HonestState retornando denied/empty**.

- **`partnerAccess:false` = control (Diego/Rafael), no flip:**  
   O flag `partnerAccess` permanece **`false`** como controle (Diego/Rafael). **Não alterar.**

## Cross-link Related

- [ANX-500-ux-criteria-supersede.md](ANX-500-ux-criteria-supersede.md) — Critérios de UX e SUPERSEDE
- [ANX-496-owner-catalog-honesty-ux.md](ANX-496-owner-catalog-honesty-ux.md) — Owner Agents Catalog honesty

## Contexto

Esta decisão **aprova diagnóstico e testes** de Partner, mas **bloqueia Partner live** e o flip de `partnerAccess`. O escopo aceito é limitado a:

- Fixtures de teste
- HonestState mostrando Partner denied/empty
- Testes E2E/a11y
- Seed de Platform (PP-J2)

O console Partner **não irá ao ar** neste slice. O flag `partnerAccess` permanece desligado como controle experimental.

## Próximos Passos

- Implementar fixtures e HonestState denied/empty para Partner
- Testes E2E/a11y para fluxos de diagnóstico
- WCAG 2.2 AA compliance
- **Não** alterar `partnerAccess`
- **Não** construir UI Partner live
