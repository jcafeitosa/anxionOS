---
type: debate
---

# R02 — Fronteiras: `modules/billing`

**Pacote SDD:** P07 · **Issue:** **ANX-103**

## Objetivo

Fechar fronteiras possui/não possui; ratificar ownership; invariantes para R03/R04.

## Síntese R2

billing dono Subscription/Invoice/Refund; consome connections.usage.recorded.v1 assíncrono; não persiste ledger

## Invariantes (`BIL-R02-INV-*`)

| ID | Regra |
| --- | --- |
| BIL-R02-INV-01 | Dono único agregados R03 |
| BIL-R02-INV-02 | Cross-module só contrato/evento |
| BIL-R02-INV-03 | SQLite proibido estado autoritativo |
| BIL-R02-INV-04 | ownerDomain=billing em comandos/eventos |
| BIL-R02-INV-05 | REAL/live rejeitado v1 |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
