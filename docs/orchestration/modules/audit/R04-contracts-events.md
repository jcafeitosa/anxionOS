---
type: debate
---

# R04 — Contratos e eventos: `modules/audit`

**Issues:** ANX-107 · **ANX-108**

## Convenções

`ownerDomain: audit` · `audit.<aggregate>.<action>.v1`

## Envelope tap (domain events)

Todo evento ingerido preserva: `eventId`, `eventType`, `schemaVersion`, `ownerDomain`, `organizationId`, `occurredAt`, `payload` (redacted), `checkpoint` monotônico por `(organizationId, consumerName)`.

**Dedupe:** `(eventId)` unique; replay com mesmo `eventId` → no-op.

## HTTP `/v1/audit/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/manifests` | listManifests (scoped, paginated) |
| GET | `/manifests/:id` | getManifest |
| POST | `/replay-sessions` | requestReplay (grant `audit.replay`) |
| GET | `/replay-sessions/:id` | getReplayStatus |

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `audit.manifest.recorded.v1` | operations, graph |
| `audit.replay.requested.v1` | workers (internal) |
| `audit.replay.completed.v1` | operations, graph |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `*` (eventing domain tap) | ingestDomainEventTap — append-only manifest chunk |

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-AUD-01 | tap dedupe por eventId |
| G3-AUD-02 | replay read-only — zero writes em accounting |
| G5-AUD-01 | export cross-tenant 403 |
| G5-AUD-02 | UPDATE chunk rejeitado |

## Alternativas rejeitadas

SQLite como trail único; replay que reexecuta ordens; pasta policies/.

## Saída R4

Para R5.
