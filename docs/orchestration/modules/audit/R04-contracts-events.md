---
type: debate
---
# R04 — Contratos e eventos: `modules/audit`

**Issues:** ANX-107 · pack ANX-389 · impl **ANX-108** não neste pack  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). Sem schema produção.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `audit` |
| eventType | `audit.<aggregate>.<action>.v1` |
| Segredos | **proibido** — redact no tap |

### Códigos

| Código | HTTP | Quando |
| --- | --- | --- |
| AUD_CROSS_TENANT | 403 | Agency mismatch |
| AUD_GRANT_INVALID | 403 | T01 / audit.replay DENY |
| AUD_CHUNK_IMMUTABLE | 409 | UPDATE chunk |
| AUD_DUPLICATE_EVENT | 200 | tap same eventId |
| AUD_REPLAY_NOT_FOUND | 404 | |

**KEEP adapter-gateway** nos contratos se já existir export — não remover.

## In / Out (R4)

**In:** GET `/v1/audit/manifests`; GET `/manifests/:id`; POST `/replay-sessions`; GET `/replay-sessions/:id`; tap `*` domain events.

**Out:** eventos abaixo; envelope SDD. Payload redacted (`eventId`, `eventType`, `schemaVersion`, `ownerDomain`, `organizationId`, `occurredAt`, `payload` redacted, `checkpoint`).

## Non-goals

- Não SQLite trail.
- Não replay que reexecuta ordens.
- Não pasta policies/.
- Não OpenAPI público neste pack.

## Envelope tap

Dedupe: `(eventId)` unique; replay mesmo `eventId` → no-op.

## HTTP `/v1/audit/*`

| Método | Rota | Grant |
| --- | --- | --- |
| GET | `/v1/audit/manifests` | audit.read |
| GET | `/v1/audit/manifests/:id` | audit.read |
| POST | `/v1/audit/replay-sessions` | audit.replay + T01 |
| GET | `/v1/audit/replay-sessions/:id` | audit.read |

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `audit.manifest.recorded.v1` | operations, graph |
| `audit.replay.requested.v1` | workers internos |
| `audit.replay.completed.v1` | operations, graph |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `*` (eventing domain tap) | ingestDomainEventTap — append-only |

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-AUD-01 | G3 | tap dedupe por eventId |
| G3-AUD-02 | G3 | replay read-only — zero writes accounting |
| G5-AUD-01 | G5 | export/GET cross-tenant 403 |
| G5-AUD-02 | G5 | UPDATE chunk rejeitado |

## Alternativas rejeitadas

SQLite trail único; replay que reexecuta ordens; pasta policies/.

## Saída R4

Para R5.
