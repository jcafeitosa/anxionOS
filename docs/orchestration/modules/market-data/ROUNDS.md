---
type: debate
---

# Rodadas — debate `modules/market-data`

Debate formal P06, alinhado ao [playbook](../../module-development-playbook.md), spec 003 (R12) e ADR0004.

| Rodada | Tema | Artefato | Status |
| --- | --- | --- | --- |
| **R1** | Inventário documental e de código | [R01-context.md](./R01-context.md) | ✅ ANX-42 (expandido ANX-87) |
| **R2** | Fronteiras — possui / não possui | [R02-boundaries.md](./R02-boundaries.md) | ✅ ANX-87 |
| **R3** | Modelo de domínio | [R03-domain-sketch.md](./R03-domain-sketch.md) | ✅ ANX-87 |
| **R4** | Contratos e eventos | [R04-contracts-events.md](./R04-contracts-events.md) | ✅ ANX-87 |
| **R5** | Armazenamento PG/Timescale/Neo4j | [R05-storage-pg.md](./R05-storage-pg.md) | ✅ ANX-87 |
| **R6** | Dependências upstream/downstream | [R06-dependencies.md](./R06-dependencies.md) | ✅ ANX-87 |
| **R7** | Riscos | [R07-risks.md](./R07-risks.md) | ✅ ANX-87 |
| **R8** | Decision log | [R08-decision-log.md](./R08-decision-log.md) | ✅ ANX-87 |
| **R9** | Plano de implementação | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ ANX-87 |
| **R10** | Pacote G0 / handoff | [R10-g0-handoff.md](./R10-g0-handoff.md) | ✅ ANX-87 |

## Issues relacionadas

| Issue | Papel |
| --- | --- |
| ANX-42 | Structure-debate R01 (25 componentes) |
| **ANX-87** | Debate R02–R10 market-data (`in_review`, G7-ready) |
| **ANX-88** | Impl P06 S1–S2 (`todo`, `blocked_by` ANX-87 G7) |
| ANX-58 | Contrato ciclo P06 SIMULATED/PAPER (integrado) |
| ANX-62 | connections `MARKET_DATA` / evento observed |
| ANX-83 | connections debate (`g0_ready`) — upstream feed |
| ANX-36 | Epic gate Wave 4/6 |

## Próximo passo

**G7 aceite ANX-87** → claim **ANX-88** implementação P06-S1/S2 (registry PG + Timescale ingest + observed consumer).
