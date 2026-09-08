---
type: debate
---

# R05 — Armazenamento: `modules/portfolios`

**Issue:** ANX-95

## Decisão R05 (núcleo)

**PostgreSQL é o único journal autoritativo de posição, holding e ValuationSnapshot.** Nenhum SQLite, arquivo local ou cache substitui confirmação de Position. Neo4j projeta portfolio→posição→instrumento; Timescale armazena **séries derivadas** de NAV/exposure (opcional) — não substitui snapshot PG.

## Matriz de ownership

| Dado | Engine | Notas |
| --- | --- | --- |
| `portfolios`, `positions`, `holdings` | **PostgreSQL** | estado autoritativo — posição canônica |
| `valuation_snapshots`, `rebalance_plans`, `position_reconciliation_cases` | **PostgreSQL** | valuation e planos |
| `command_journal`, `outbox` | **PostgreSQL** | atômico com mutação; **`ownerDomain=portfolios`** |
| `exposure_read_models`, `nav_history` | **PostgreSQL** ou **TimescaleDB** | derivado rebuildável; Timescale opcional S4+ |
| Projeção portfolio→posição→instrumento→deployment | **Neo4j** | via `graph:portfolios:v1` async |
| Séries de preço | **TimescaleDB** | **market-data** — portfolios só FK/ref |
| SQLite cache asOf | — | **proibido** para decisão de risco; read cache TTL-only defer S5 |

## Schema sketch (Drizzle v1)

```
portfolios_portfolios (id, org_id, owner_user_id, capital_account_id, name, base_currency, status, mandate_ref_json, ...)
portfolios_positions (id, org_id, portfolio_id, capital_account_id, instrument_id, position_side, book, quantity, cost_basis, revision, ...)
portfolios_holdings (id, position_id, portfolio_id, quantity, open_fill_id, attribution_json, status, ...)
portfolios_valuation_snapshots (id, org_id, portfolio_id, as_of, valuation_version, status, price_refs_json, nav_base, ...)
portfolios_rebalance_plans (id, org_id, portfolio_id, plan_version, status, target_weights_json, ...)
portfolios_position_reconciliation_cases (id, org_id, portfolio_id, position_id, case_kind, status, owner_domain, ...)
portfolios_exposure_lines (org_id, portfolio_id, instrument_id, gross, net, as_of, revision)
```

## Invariantes storage (`PF-R05-*`)

| ID | Regra |
| --- | --- |
| PF-R05-01 | **Nenhum** Position/Holding/ValuationSnapshot autoritativo fora PostgreSQL |
| PF-R05-02 | Position update + outbox `portfolios.position.updated.v1` na mesma transação |
| PF-R05-03 | `idempotency_key` único por `(org_id, idempotency_key)` em command_journal |
| PF-R05-04 | Position quantity append-only por revision — sem UPDATE silencioso de qty histórica |
| PF-R05-05 | SQLite, WAL local, JSON file position → **rejeitado** em CI boundary test |
| PF-R05-06 | `command_journal.owner_domain` e `outbox.owner_domain` = **`portfolios`** |
| PF-R05-07 | RLS defer P09 — application-only tenancy (D-PF-015) |

## Anti-padrões rejeitados

| Opção | Veredito | Racional |
| --- | --- | --- |
| SQLite position local para dev | ❌ Rejeitado | Viola PF-R05-01; usar PG testcontainer/fixture |
| Posição canônica em Neo4j | ❌ Rejeitado | Grafo é projeção; ADR0001/0004 |
| NAV só em Timescale sem PG snapshot | ❌ Rejeitado | ValuationSnapshot CONFIRMED exige PG |
| Duplicar Allocation em portfolios | ❌ Rejeitado | PF-R02-INV-02 |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
