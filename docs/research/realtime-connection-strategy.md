---
type: research
---

# Estratégia de conexão realtime — anxionOS

> Resumo da análise 43921102 (PT-BR). Status: **implementado (MVP P02/P07)**.

## Objetivo

Entregar atualizações institucionais ao Owner Console com degradação graciosa quando WebSocket não está disponível.

## Escada de transporte (tier ladder)

| Tier | Protocolo | Quando usar |
| --- | --- | --- |
| 1 | WebSocket `WS /api/realtime/ws` | Preferencial — baixa latência, subscribe dinâmico |
| 2 | SSE `GET /api/realtime/events` | Fallback quando WS bloqueado (proxy, rede) |
| 3 | Long poll `GET /api/realtime/poll` | Último recurso — timeout 25s, header `Last-Event-ID` |

O cliente (`RealtimeConnection`) tenta WS → SSE → poll com backoff exponencial (1s–30s, máx. 10 tentativas).

## Autenticação e tenancy

- **Cookies Better Auth** (`credentials: include`) — sem token em query string.
- `tenantId` derivado da sessão no servidor (`user.id` no MVP; P03+ usará tenant institucional).
- Canais validados contra allowlist: `health.deps`, `dashboard.metrics`, `notifications`, `session.revoked`.

## Envelope canônico

`RealtimeEnvelope` em `@anxionos/contracts`:

- `eventId`, `type`, `tenantId`, `checkpoint?`, `projectionGeneration?`, `stale`, `payload`, `timestamp`

## Backend (gateway na API)

Módulo mínimo em `backend/apps/api/src/realtime/` (não nos 23 módulos — ADR0002):

- `SubscriptionManager` in-memory por processo
- Timers locais: `health.deps` a cada 5s, `dashboard.metrics` demo a cada 10s
- **NATS** opcional (`NATS_URL`): bridge `anxionos.tenant.*.events` e `anxionos.broadcast`; degrada silenciosamente se offline

## Frontend

- `createRealtimeConnection(channels)` + hook `useRealtimeConnection`
- `RealtimeDashboardProvider` no `/app` (Owner shell)

## Gaps P03+

- Stream de projeções do Graph Kernel (checkpoint + `projectionGeneration` reais)
- Fan-out multi-instância via NATS JetStream (hoje: registry in-process)
- ACL por papel (Owner vs Operator) e revogação `session.revoked`
- Métricas de negócio reais (substituir demo `stale: true`)

## Referência

ADR público: [docs/decisions/0011-realtime-gateway-elysia-nats.md](../decisions/0011-realtime-gateway-elysia-nats.md)
