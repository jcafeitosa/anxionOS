---
type: debate
---

# R05 — Armazenamento: `modules/capital`

**Issue:** ANX-91 · pack ANX-389  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md) · [ROUNDS.md](./ROUNDS.md). ST08 **0/23**. **Sem migration.**

## In / Out (R5)

**In:** writes de account/allocation/reservation via UoW; projector **graph**.

**Out:** PG `capital_*` + journal/outbox. Sem SQLite saldo. Sem FK grant/ledger.

## Non-goals

Spec accepted; ST08 live; ANX-342/389 done; REAL executionMode.

## Ownership de engines

| Dado | Engine | Notas |
| --- | --- | --- |
| `capital_accounts`, `allocations`, `reservations` | **PostgreSQL** | estado autoritativo |
| `command_journal`, `outbox` | **PostgreSQL** | atômico com mutação |
| `balance_snapshots` | **PostgreSQL** | read model |
| Projeção titular→conta→portfolio→alocação | **Neo4j** | via `graph:capital:v1` |
| SQLite | — | **proibido** saldo/reserva |

## Schema sketch (Drizzle v1)

```
capital_accounts (id, org_id, owner_user_id, external_ref, base_currency, status, ...)
capital_allocations (id, account_id, portfolio_id, grant_id, state, limit_amount, ...)
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

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
