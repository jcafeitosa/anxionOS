---
type: debate
---

# R02 — Fronteiras: `modules/simulation`

**Pacote SDD:** P08 · **Issue:** **ANX-115**

## Objetivo

Fechar fronteiras possui/não possui; ratificar ownership; invariantes para R03/R04.

## Síntese R2

simulation dono SimulationRun isolado; sem promoção produção

## Invariantes (`SIM-R02-INV-*`)

| ID | Regra |
| --- | --- |
| SIM-R02-INV-01 | Dono único agregados R03 |
| SIM-R02-INV-02 | Cross-module só contrato/evento |
| SIM-R02-INV-03 | SQLite proibido estado autoritativo |
| SIM-R02-INV-04 | ownerDomain=simulation em comandos/eventos |
| SIM-R02-INV-05 | REAL/live rejeitado v1 |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
