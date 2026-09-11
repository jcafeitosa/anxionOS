---
type: decision
---

# ADR0005 — Realtime gateway (Elysia + NATS)

| Campo | Valor |
| --- | --- |
| Status | **proposed** |

> **Colisão de número (ANX-455).** Existem *outros* ADR0005 com assuntos distintos: `brain/project-docs/decisions/0005-agent-hierarchy-modes-triangular-circular.md` (draft, hierarquia de agentes) e `project-docs/decisions/0005-product-graph-neo4j-projection.md` (accepted, Product Graph). Identificar por caminho + título. Registro: [document-precedence.md](../document-precedence.md).
| Data | 2026-09-08 |
| Issue | ANX-21 |

## Contexto

O Owner Console (P07) precisa de atualizações live (deps, métricas, notificações) sem acoplar o frontend a um único transporte.

## Decisão

1. **Gateway realtime** no composition root `apps/api` (Elysia), não como módulo de domínio.
2. **Tier ladder**: WebSocket → SSE → long poll no cliente.
3. **Auth**: sessão Better Auth via cookie; `tenantId` somente do servidor.
4. **Contrato**: `RealtimeEnvelope` versionado em `@anxionos/contracts`.
5. **NATS server-side only**: workers publicam em subjects `anxionos.tenant.*.events`; API faz bridge para conexões HTTP/WS. Cliente nunca conecta ao NATS.
6. **MVP**: fan-out in-process + timers; bridge NATS ativo quando `NATS_URL` disponível.

## Consequências

### Positivas

- Degradação graciosa em redes restritivas
- Contrato único para P03 graph stream
- Isolamento de tenant no fan-out

### Negativas / limitações (MVP)

- Registry in-memory não escala horizontalmente sem NATS
- `dashboard.metrics` demo até módulo de métricas existir
- `tenantId = user.id` temporário

## Alternativas consideradas

| Alternativa | Motivo de rejeição |
| --- | --- |
| Socket.io | Dependência extra; Bun WS nativo suficiente |
| Cliente NATS direto | Viola fronteira de confiança e tenancy |
| Apenas SSE | Sem subscribe bidirecional eficiente |

## Verificação

- `GET /api/realtime/events` — SSE autenticado
- `WS /api/realtime/ws` — subscribe/unsubscribe/ping
- `GET /api/realtime/poll` — long poll 25s
