---
type: debate
---

# R01 — Contexto: `modules/operations`

**Componente:** modules/operations  
**Rodada:** R1  
**Pacote SDD:** P07  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-42 · **ANX-111**  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [ROUNDS.md](./ROUNDS.md). Fatten in-place.  
**Fontes:** `brain/notes/anxionos-pc17-deployments-debate.md`, `anxionos-pc18-infrastructure-debate.md`, `anxionos-pc20-incidents-debate.md`.

## Propósito

Operação da plataforma: incidentes, runbooks, retenção, export jobs, health de serviços, adapters OP01–OP08 (repo/CI/deploy **como procedimento**, não 24º módulo). **Não** é Flight Recorder (audit) nem kill switch (risk). Specs **draft**. Sem `approvals/`/`policies/`. D-GOV-010 em **risk P06**.

## POSSUI

Incident, Runbook, RetentionPolicy, ExportJob, ServiceHealthSnapshot.

## NÃO POSSUI

| Item | Dono |
| --- | --- |
| Audit replay / manifest autoritativo | audit |
| Kill switch / D-GOV-010 | risk P06 |
| Secrets store | packages/secrets |
| Neo4j driver | graph |
| Deploy como pasta infrastructure/ | PC 18 — **operations** |

## Armazenamento

PG incidents/export/health. Neo4j impact **projeção**. SQLite não autoritativo. ST08 0/23.

## Próxima rodada

→ **R02** ([R02-boundaries.md](./R02-boundaries.md))
