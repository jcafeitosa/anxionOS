---
type: debate
---

# R05 — Armazenamento: `modules/capital`

**Issue:** ANX-91 · pack ANX-389  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md) · [ROUNDS.md](./ROUNDS.md). ST08 **0/23**. **Sem migration.**

## In / Out (R5)

**In:** writes de account/allocation/reservation via UoW; projector **graph**.

**Out:** PG `capital_*` + journal/outbox. Sem SQLite saldo. Sem FK grant/ledger. Sem ST08 live. Sem ANX-342/389 done. Sem REAL executionMode.

## Non-goals

Spec accepted; ST08 live; ANX-342/389 done; REAL executionMode; pasta `approvals/`.

## Ownership de engines

| Dado | Engine | Notas |
| --- | --- | --- |
| `capital_accounts`, `allocations`, `reservations` | **PostgreSQL** | estado autoritativo |
| `command_journal`, `outbox` | **PostgreSQL** | atômico com mutação |
| `balance_snapshots` | **PostgreSQL** | read model |
| Projeção titular→conta→portfolio→alocação | **Neo4j** | via `graph:capital:v1` |
| SQLite | — | **proibido** saldo/reserva |
| adapter-gateway | **KEEP** | não é dono de saldo |

## Debate R5

**Arquiteto:** FI02 exige UNIQUE de reserva ativa por `(account_id, intent_hash, kind)` + tx serializable.

**Crítico:** `grant_id` na allocation é **referência lógica** — sem FK para schema governance.

**Security:** RLS defer P09 (D-CAP-015); application-only neste pack.

## Schema sketch (Drizzle v1)

```
capital_accounts (id, org_id, owner_user_id, external_ref, base_currency, status, ...)
capital_allocations (id, account_id, portfolio_id, grant_id, state, limit_amount, revision, ...)
capital_reservations (id, account_id, intent_hash, asset, amount, status, expires_at, ...)
capital_balance_lines (account_id, asset, settled, encumbered, reserved, as_of, revision)
```

## Invariantes storage (`CAP-R05-*`)

| ID | Regra |
| --- | --- |
| CAP-R05-01 | Nenhum saldo autoritativo fora PG |
| CAP-R05-02 | Reservation única ativa por `(account_id, intent_hash, kind)` |
| CAP-R05-03 | Allocation `revision` monotônica |
| CAP-R05-04 | RLS defer P09 — application-only (D-CAP-015) |

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-CAP-01 | reserve idempotente (mesmo intent_hash) |
| G5-CAP-02 | FI02 double allocation rejeitado |
| G5-CAP-03 | REAL schema-reject v1 |

## Saída R5

Modelo v1. Sem migration. → **R06** ([R06-dependencies.md](./R06-dependencies.md))
