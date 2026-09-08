---
type: debate
status: draft
---

# R09 — Plano de implementação (P05): `modules/connections`

**Rodada:** R9 — Plano executável pós-debate  
**Data:** 2026-09-08  
**Issue:** ANX-83 (debate) · gate implementação: **ANX-36** (Wave 4 epic) · contrato: **ANX-62** · graph consumer: **ANX-32**

## Participantes

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| QA | QA |
| Code Review | code-reviewer |
| Arquiteto | architect |
| Security | security-reviewer |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Traduzir decisões `D-CX-001`..`064` em plano executável **P05** em slices S1–S5 (migrations R05), com matriz de testes G3/G4/G5 por slice, dependências upstream e escopo explícito. **Zero código** até claim de issue de implementação vinculada a ANX-36.

## Pré-requisitos

| # | Gate | Evidência | Issue |
| --- | --- | --- | --- |
| 1 | R10 G0 debate aprovado | `R10-g0-handoff.md` | ANX-83 |
| 2 | Wave 4 epic desbloqueado | E2E institucional verde | **ANX-36** (`in_review`) |
| 3 | Contrato P05 documental | spec + ANX-62 | **ANX-62** (`in_review`) |
| 4 | P02 upstream estável | identity, organizations, governance G7 | ANX-28, ANX-29, ANX-30 |
| 5 | `graph:connections:v1` especificado | consumer constant + event types | **ANX-32** (G2 slice S9+) |
| 6 | Issue impl P05 claimada | Taskboard — não duplicar ANX-83 | **Criar/claim na G1** (relacionar ANX-36) |

---

## Slices P05 (5 fatias — R05 migrations)

| Slice | Migration | Entrega | Gates |
| --- | --- | --- | --- |
| **P05-S1** | `0000_connections_core.sql` | enums, `connections_ai_accounts`, `connections_connection_bindings`, `connections_command_journal`, `connections_providers`; `ensureConnectionsSchema`; contracts skeleton | G2 contratos, G4 tenancy |
| **P05-S2** | `0001_connections_usage.sql` | `connections_inference_requests`, `connections_usage_records`; `invokeInference` SIMULATED; EndpointPolicy port; UNKNOWN path | G3, G4, G5 parcial |
| **P05-S3** | `0002_connections_fairness.sql` | quota leases, platform dispatch sequence, owner provider pools; DL-CX2 TX | G3 fairness, G5-CX-02 |
| **P05-S4** | `0003_connections_catalog.sql` | model offerings, catalog releases, provider subscriptions; SQLite cache opcional | G3 catalog |
| **P05-S5** | `0004_connections_ops.sql` | adapter registry, health probes, inference profiles, reconciliation cases; workers reconcile/reaper; circuit breaker | G2 ops, G5 completo |

---

## Mapa D-CX → slices

| Decisão | Slice(s) |
| --- | --- |
| D-CX-007..011 REAL_EXECUTION proibido | S1 contracts + G4 tests |
| D-CX-012..016 secrets surface | S1 contracts, S2 adapters |
| D-CX-017..021 agregados + UoW | S1 |
| D-CX-022 fairness DL-CX2 | S3 |
| D-CX-023..028 contratos/eventos | S1 |
| D-CX-029..031 storage core | S1 |
| D-CX-032 stream/terminal | S2 |
| D-CX-033 SQLite catálogo only | S4 |
| D-CX-035..044 dependências/wiring | S1 bootstrap + S5 circuit breaker |
| D-CX-045 EndpointPolicy | S2 |
| D-CX-046..047 UNKNOWN/reconcile | S2 + S5 worker |
| D-CX-048 application-only tenancy | S1 repos + G5-CX-04 |
| D-CX-049..050 WAITING_HUMAN / consumerKind | S2 adapter TASKBOARD |
| D-CX-051..052 fail-closed / stub gate | S1 bootstrap, S5 |
| D-CX-055 circuit breaker | S5 composition |
| D-CX-059 contracts package | S1 |
| D-CX-060 workers ops | S5 |

---

## Dependências externas

| Issue | Tipo | Impacto | Status |
| --- | --- | --- | --- |
| **ANX-36** | Epic gate Wave 4 | Autoriza G1 código P05 | `in_review` |
| **ANX-62** | Contrato P05 | Schemas/eventos fonte | `in_review` |
| **ANX-32** | Graph consumer | `graph:connections:v1` — não bloqueia S1–S4 | `in_review` |
| ANX-28 | identity P0 | `PrincipalLookup` | `done` |
| ANX-29 | organizations | `OrganizationScopePort` | `done` |
| ANX-30 | governance | `GrantValidationPort` | `done` |

---

## Matriz testes G3 (por slice)

### S1 — Core

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-CX-S1-01 | `registerAIAccount` primeira criação | outbox `connections.ai_account.registered.v1` |
| G3-CX-S1-02 | Replay `commandId` HTTP | `CX_IDEMPOTENT_REPLAY` |
| G3-CX-S1-03 | `activateBinding` sem grant | `CX_GRANT_INVALID` |
| G3-CX-S1-04 | Rollback TX se outbox falha | zero linha PG |
| G3-CX-S1-05 | Cross-org binding lookup | 403 `CX_SCOPE_DENIED` |

### S2 — Invoke + usage

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-CX-S2-01 | `invokeInference` SIMULATED terminal | `usage.recorded` + `inference.completed` |
| G3-CX-S2-02 | Invoke duplo mesmo `idempotencyKey` | mesmo `inferenceRequestId` |
| G3-CX-S2-03 | Timeout adapter | `unknown` + `connections.call.unknown.v1` |
| G3-CX-S2-04 | Stream chunks | `inference.stream.v1` + terminal único |
| G3-CX-S2-05 | `waitingHuman` TASKBOARD | retorno sem mover board |

### S3 — Fairness

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-CX-S3-01 | 20 PLATFORM parallel 3 contas | DL-CX2 alternância |
| G3-CX-S3-02 | Idempotent replay invoke | mesma conta, sem segundo lease |
| G3-CX-S3-03 | AGENCY pool cursor race | row lock + revision check |

### S4 — Catalog

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-CX-S4-01 | Catalog release bump | PG authoritative; SQLite cache refresh |
| G3-CX-S4-02 | Offering readiness gate | invoke bloqueado se not ready |

### S5 — Ops

| ID | Cenário | Esperado |
| --- | --- | --- |
| G3-CX-S5-01 | Reconcile case → resolved 24h SLA | `connections.reconciled.v1` |
| G3-CX-S5-02 | Lease reaper stale | só `expires_at < now()` |
| G3-CX-S5-03 | Circuit breaker governance 503 | invoke fail-closed |

---

## Matriz G4 Security

| ID | Slice | Cenário |
| --- | --- | --- |
| G4-CX-01 | S2 | EndpointPolicy — metadata URL denied |
| G4-CX-02 | S1 | Snapshot eventos — sem chaves proibidas |
| G4-CX-03 | S1 | `LIVE_TRADING` reject |
| G4-CX-04 | S1 | Cross-org → 403 |
| G4-CX-05 | S2 | Grant revoke mid-invoke |
| G4-CX-06 | S1 | Prod + stub → startup fail |
| G4-CX-07 | S2 | Header consumerKind spoof ignored |
| G4-CX-08 | S1 | AR01 dependency-cruiser |

---

## Matriz G5 Red Team (pós-S2 sandbox)

| ID | Risco | Slice |
| --- | --- | --- |
| G5-CX-01 | R-CX-01 SSRF | S2 |
| G5-CX-02 | R-CX-02 quota race | S3 |
| G5-CX-03 | R-CX-04 UNKNOWN | S2+S5 |
| G5-CX-04 | R-CX-05 cross-tenant | S1 |
| G5-CX-05 | R-CX-10 privilege | S2 |
| G5-CX-06 | R-CX-17 OAuth redirect | S2 |
| G5-CX-07 | R-CX-11 human callback dup | S2 |
| G5-CX-08 | R-CX-08 upstream cascade | S5 |
| G5-CX-09 | R-CX-03 stub prod | S1 |
| G5-CX-10 | R-CX-02 idempotent replay | S3 |

---

## Fora do escopo P05

| Item | Destino |
| --- | --- |
| REAL_EXECUTION / broker live | P06+ (D-CX-061) |
| RLS PostgreSQL | P09 (D-CX-062) |
| GrantValidation HTTP | Multi-VM (D-CX-063) |
| billing consumer | billing P07 |
| Projector Neo4j código | ANX-32 S9+ |
| Fila SINGLE_ACCOUNT_WAIT explícita | pós-v1 (D-CX-058) |

---

## Saída R9

✅ Plano P05 aprovado para **R10** (pacote G0 debate encerrado).
