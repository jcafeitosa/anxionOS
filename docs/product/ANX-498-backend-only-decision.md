---
title: "ANX-498 — Decisão CPO: Backend-Only para Strategies/Performance/Simulation/Evaluation"
status: published
type: product-decision
issue: ANX-498
publisher: Marina Okonkwo
draft_author: Marina Lopes
critics:
  - Sofia (APPROVE)
  - Rafael (accepted)
date: 2026-09-12
---

# ANX-498 — Backend-Only para Strategies/Performance/Simulation/Evaluation

## Decisão CPO

**Strategies, Performance, Simulation e Evaluation permanecem backend-only no slice atual (P07).**

### Escopo Aprovado

1. **Strategies**: API/automation-only (`POST` apenas; sem UI Owner/Operator).
2. **Performance**: Backend-only neste momento.
3. **Simulation**: API-only.
4. **Evaluation**: Backend-only até P08.

### Invariantes

- **21 rotas = hipótese de UI cortada, não build pendente.**
- Zero issues filhas de UI.
- Zero Cloud Agent de UI.
- Sem ADR de UI → sem slice de tela Renata/Nina.
- `capability-map` e OpenAPI **≠ frase do usuário**. Frase válida = discovery job observado.
- **J1 Performance** = apenas discovery futuro.

## Evidência

- **Aprovação Nina**: mapa da Nina recebeu APPROVE de Júlia.
- **Frontend 0 hits**: nenhum consumo dessas rotas no frontend atual.
- **Plugins**: registrados em `backend/apps/api/src/index.ts`.

## Autoria

- **Draft**: Marina Lopes
- **Revisores**: Sofia (APPROVE), Rafael (accepted)
- **Publicado por**: Marina Okonkwo

---

**Cross-references**: ANX-499 (realtime freeze), ANX-500 (diagnosis ≠ Partner GO), ANX-496 (Owner catalog honesty UX).
