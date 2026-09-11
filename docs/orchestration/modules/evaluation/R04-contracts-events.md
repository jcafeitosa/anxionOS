---
type: debate
---
# R04 — Contratos, API e eventos: `modules/evaluation`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-109 · impl futura ANX-110 **não** neste pack  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). API esboço `/v1/evaluation`. Sem schema produção.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `evaluation` |
| eventType | `evaluation.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Segredos | **proibido** em DTO/evento |

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| EVL_DUPLICATE_IDEMPOTENCY | 409 | Conflito de comando |
| EVL_CROSS_TENANT | 403 | Agency mismatch |
| EVL_GRANT_INVALID | 403 | T01 DENY |
| EVL_SUBJECT_INVALID | 409 | Subject/run ausente |
| EVL_POLICY_MISSING | 422 | ScoringPolicy não published |
| EVL_REVISION_CONFLICT | 409 | expectedRevision |
| EVL_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout `@anxionos/contracts/evaluation/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`. Manter **adapter-gateway** se já existir no pacote de contratos — não remover neste pack.

**EVL-R04-01:** strategies consome **issued**, não `score.computed`.

## In / Out (R4)

**In:** POST `/v1/evaluation/records`; POST `/v1/evaluation/certifications` (T01); GET reputation; consumers `performance.outcome.recorded.v1`, `simulation.run.completed.v1`, `agents.version.published.v1`.

**Out:** eventos abaixo; envelope SDD; códigos EVL_*. **Nunca** dump de Twin, P&L cru, token, prompt.

## Non-goals

- Não emitir `strategies.deployment.*` nem `execution.order.*`.
- Não OpenAPI Scalar público neste pack.
- Não schema Drizzle executado.

## Eventos v1 emitidos

| eventType | Payload (sem secrets) | Consumidores |
| --- | --- | --- |
| `evaluation.score.computed.v1` | recordId, subjectKind, subjectId, policyHash, scoreHash | audit, graph (opcional) |
| `evaluation.certification.issued.v1` | certificationId, subject ids, policyHash, issuedAt | **strategies**, graph, audit |
| `evaluation.certification.revoked.v1` | certificationId, reasonCode | strategies, graph, audit |
| `evaluation.reputation.updated.v1` | subjectId, scoreVersion | **agents**, graph |
| `evaluation.promotion.recommended.v1` | recommendationId, subjectId | **governance** |

## REST `/v1/evaluation/*`

| Método | Path | Grant |
| --- | --- | --- |
| GET | `/v1/evaluation/records` | evaluation.read |
| POST | `/v1/evaluation/records` | evaluation.score + T01 |
| POST | `/v1/evaluation/certifications` | evaluation.certify + T01 |
| GET | `/v1/evaluation/reputation/:subjectId` | evaluation.read |

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-EVL-01 | G3 | score idempotente |
| G3-EVL-02 | G3 | cert sem run 409 |
| G5-EVL-01 | G5 | cross-tenant 403 |
| G5-EVL-02 | G5 | T01 DENY |

## Alternativas rejeitadas

Certification só no grafo; SQLite write path; FK para `strategies_*`; pasta `testing/`; auto-promote no consumer de score.

## Saída R4

Contratos v1 aprovados para R5.
