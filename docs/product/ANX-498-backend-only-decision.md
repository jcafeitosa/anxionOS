---
type: product-decision
issue: ANX-498
status: published
publisher: Marina Okonkwo
source: Draft by Marina Lopes (OpenKnowledge)
date: 2026-09-12
---

# ANX-498 — Decisão CPO: Strategies / Performance / Simulation / Evaluation

**Status:** Published  
**Issue:** ANX-498  
**Critics:** Sofia APPROVE (user), Rafael accepted  
**Publisher:** Marina Okonkwo  
**Draft:** Marina Lopes

## Decisão

Quatro áreas de capacidade serão **backend-only** no slice atual:

| Área | Escopo Aprovado |
| --- | --- |
| **Strategies** | API/automation-only (POST only; **sem UI** Owner/Operator) |
| **Performance** | Backend-only agora (**sem UI** de P&L/exposure) |
| **Simulation** | API-only (create event-driven; **sem inspector UI**) |
| **Evaluation** | Backend-only até P08 (certs/scores **sem UI** Owner) |

## Invariantes

1. **21 rotas = UI cut hypothesis, não build:**  
   As 21 rotas identificadas no capability-map representam a **hipótese de corte de UI**, não uma decisão de construir interfaces.

2. **Zero UI child issues:**  
   Nenhuma issue filha de UI foi criada para estas áreas no board atual.

3. **Zero UI Cloud Agent:**  
   Nenhum Cloud Agent está trabalhando em UI para Strategies, Performance, Simulation ou Evaluation.

4. **No UI ADR → no Renata/Nina screen slice:**  
   Sem ADR aprovado de UI, não há slice de tela liderado por Renata ou Nina.

5. **capability-map/R06–R08 draft/OpenAPI ≠ user sentence:**  
   Capability-map, rodadas R06–R08, drafts e OpenAPI **não são sentenças** do usuário. Uma sentença válida é um **discovery job observado e aceito**.

6. **J1 Performance only as future discovery if sentence exists — not build:**  
   A capacidade J1 Performance só será considerada em discovery futuro **se houver uma sentença explícita**. Não é para construir agora.

## Evidência

**Nina map APPROVE Júlia (21×3):**  
Nina aprovou o mapa de capacidades com Júlia identificando 21 rotas em 3 módulos.

**FE = 0 hits `/v1/{strategies|performance|simulation|evaluation}`:**  
Busca no frontend (`frontend/`) resulta em **zero ocorrências** de endpoints `/v1/strategies`, `/v1/performance`, `/v1/simulation`, `/v1/evaluation`.

**Plugins mounted in `backend/apps/api/src/index.ts`:**  
Os plugins das quatro áreas estão montados na API backend, mas não há consumidores de UI.

**System consumers via events, not HTTP console:**  
Os consumidores destas capacidades são **sistemas via eventos**, não consoles HTTP de Owner/Operator.

## Contexto

Esta decisão corta UI de Owner e Operator para as quatro áreas no slice atual, mantendo apenas a superfície API/automation para sistemas. A construção de UI está **bloqueada até que haja uma sentença explícita do usuário** e um ADR aprovado.

As rotas identificadas em capability-map/R06–R08 são **hipóteses de design**, não builds autorizados.

## Próximos Passos

- Backend API permanece disponível para automação
- UI Owner/Operator para estas áreas será considerada em discovery futuro com sentença explícita
- Evaluation UI planejada para P08 após definição de certs/scores
