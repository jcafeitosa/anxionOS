---
type: debate
---

# R02 — Fronteiras: `modules/partners`

**Pacote SDD:** P07 · **Issue:** **ANX-113**

## Objetivo

Fechar fronteiras possui/não possui; ratificar ownership; invariantes para R03/R04.

## Síntese R2

partners dono commission; ledger via partners.commission.accrued.v1

## Invariantes (`PTR-R02-INV-*`)

| ID | Regra |
| --- | --- |
| PTR-R02-INV-01 | Dono único agregados R03 |
| PTR-R02-INV-02 | Cross-module só contrato/evento |
| PTR-R02-INV-03 | SQLite proibido estado autoritativo |
| PTR-R02-INV-04 | ownerDomain=partners em comandos/eventos |
| PTR-R02-INV-05 | REAL/live rejeitado v1 |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
