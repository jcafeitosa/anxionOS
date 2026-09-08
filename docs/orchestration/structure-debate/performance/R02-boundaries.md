---
type: debate
---

# R02 — Fronteiras: `modules/performance`

**Pacote SDD:** P06 · **Issue:** **ANX-105**

## Objetivo

Fechar fronteiras possui/não possui; ratificar ownership; invariantes para R03/R04.

## Síntese R2

performance dono métricas oficiais; não reescreve ledger nem posição

## Invariantes (`PERF-R02-INV-*`)

| ID | Regra |
| --- | --- |
| PERF-R02-INV-01 | Dono único agregados R03 |
| PERF-R02-INV-02 | Cross-module só contrato/evento |
| PERF-R02-INV-03 | SQLite proibido estado autoritativo |
| PERF-R02-INV-04 | ownerDomain=performance em comandos/eventos |
| PERF-R02-INV-05 | REAL/live rejeitado v1 |

→ **R03** ([R03-domain-sketch.md](./R03-domain-sketch.md))
