---
type: product-decision
issue: ANX-499
status: published
publisher: Marina Okonkwo
source: Draft by Marina Lopes (OpenKnowledge)
date: 2026-09-12
---

# ANX-499 — Decisão CPO: realtime freeze (não teardown)

**Status:** Published  
**Issue:** ANX-499  
**Decision:** Sofia APPROVE; Rafael freeze  
**Technical Pattern:** Helena  
**Publisher:** Marina Okonkwo  
**Draft:** Marina Lopes

## Decisão

**Cortar Owner/Operator/Platform realtime UI neste slice.**

- **BE freeze ≠ teardown:** O backend realtime **não será removido**, apenas congelado.
- **Gateway stays:** O gateway realtime permanece no backend.
- **4 channels remain:** Apenas 4 canais permanecem ativos:
  - `health.deps`
  - `dashboard.metrics`
  - `notifications`
  - `session.revoked`

## Canais e Acesso

1. **`session.revoked` — untouchable:**  
   Este canal é **crítico** e **não pode ser alterado**.

2. **No new channel:**  
   Nenhum canal novo será adicionado neste slice.

3. **No FE consumer:**  
   Nenhum consumidor de frontend conectará aos canais realtime neste slice.

4. **Do not wire Owner/Operator:**  
   Não conectar Owner ou Operator UI aos canais realtime.

5. **`dashboard.metrics` demo/stale ≠ real UI metric:**  
   O canal `dashboard.metrics` é para **demo/stale data**, não métricas reais de UI.

6. **`health.deps` via REST fetch-once on Platform = honest journey:**  
   O canal `health.deps` será consumido via **REST fetch-once** no Platform, representando uma jornada honesta sem conexão persistente.

## Evidência

**FE = 0 EventSource/WS:**  
Busca no frontend resulta em **zero ocorrências** de `EventSource` ou WebSocket connections.

**`realtime-client.ts` absent:**  
O arquivo `realtime-client.ts` está **ausente** do frontend.

**ACL without channels of ANX-498 four areas:**  
A ACL (Access Control List) realtime **não inclui** canais das quatro áreas de ANX-498 (Strategies, Performance, Simulation, Evaluation).

## Contexto

Esta decisão congela a funcionalidade realtime de UI Owner/Operator/Platform no slice atual, mantendo apenas 4 canais críticos ativos no backend. A infraestrutura realtime **não será removida**, mas nenhuma nova UI será conectada.

O objetivo é manter a infraestrutura backend pronta para uso futuro, mas sem investir em consumidores de UI neste momento.

## Próximos Passos

- Gateway realtime permanece operacional
- 4 canais críticos mantidos
- UI Owner/Operator não conecta a realtime
- Platform `health.deps` via REST fetch-once
