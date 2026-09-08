---
type: debate
---

# R02 — Fronteiras: `modules/operations`

**Pacote SDD:** P07 · **Issue:** **ANX-111**

## Objetivo

Fechar fronteiras possui/não possui; ratificar ownership; invariantes para R03/R04.

## Síntese R2

operations dono incidentes/export/health; não audit replay nem kill switch

## Invariantes (`OPS-R02-INV-*`)

| ID | Regra |
| --- | --- |
| OPS-R02-INV-01 | Dono único agregados R03 |
| OPS-R02-INV-02 | Cross-module só contrato/evento |
| OPS-R02-INV-03 | SQLite proibido estado autoritativo |
| OPS-R02-INV-04 | ownerDomain=operations em comandos/eventos |
| OPS-R02-INV-05 | REAL/live rejeitado v1 |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
