---
type: debate
---

# R02 — Fronteiras: `modules/audit`

**Pacote SDD:** P06 · **Issue:** **ANX-107**

## Objetivo

Fechar fronteiras possui/não possui; ratificar ownership; invariantes para R03/R04.

## Síntese R2

audit dono Flight Recorder e DeltaRef ownerDomain=audit; não segundo ledger

## Invariantes (`AUD-R02-INV-*`)

| ID | Regra |
| --- | --- |
| AUD-R02-INV-01 | Dono único agregados R03 |
| AUD-R02-INV-02 | Cross-module só contrato/evento |
| AUD-R02-INV-03 | SQLite proibido estado autoritativo |
| AUD-R02-INV-04 | ownerDomain=audit em comandos/eventos |
| AUD-R02-INV-05 | REAL/live rejeitado v1 |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
