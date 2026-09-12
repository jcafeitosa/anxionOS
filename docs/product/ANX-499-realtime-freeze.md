---
title: "ANX-499 — Realtime Freeze: Gateway Permanece, UI Cortada"
status: published
type: product-decision
issue: ANX-499
publisher: Marina Okonkwo
draft_author: Marina Lopes
critics:
  - Sofia (APPROVE)
  - Rafael (freeze)
  - Helena (pattern)
date: 2026-09-12
---

# ANX-499 — Realtime Freeze

## Decisão

**Freeze de realtime ≠ teardown.** O gateway permanece; a UI Owner/Operator/Platform de realtime é cortada neste slice.

### Escopo

- **Gateway stays**: infraestrutura mantida.
- **Channels ativos** (backend):
  - `health.deps`
  - `dashboard.metrics`
  - `notifications`
  - `session.revoked` (intocável)
- **Sem novos channels/consumidores FE** neste slice.
- **`dashboard.metrics`**: demo ≠ UI real.
- **`health.deps`**: REST fetch-once Platform = honesto.

## Invariante

- **`session.revoked`** = intocável.

## Evidência

- **FE 0**: zero `EventSource`/WebSocket no frontend atual.
- **Ausência**: `realtime-client.ts` não existe.

## Autoria

- **Draft**: Marina Lopes
- **Revisores**: Sofia (APPROVE), Rafael (freeze), Helena (pattern)
- **Publicado por**: Marina Okonkwo

---

**Cross-references**: ANX-498 (backend-only), ANX-500 (diagnosis), ANX-496 (Owner catalog).
