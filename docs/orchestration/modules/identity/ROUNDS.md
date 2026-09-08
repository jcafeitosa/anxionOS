---
type: debate
---

# Índice de rodadas — `modules/identity`

Debate formal ANX-77 (R06–R10) + structure-debate ANX-42 (R01–R05). Alinhado ao [playbook](../../module-development-playbook.md) e SDD P02.

| Rodada | Título | Artefato | Status |
| --- | --- | --- | --- |
| **R1** | Inventário documental e de código | [structure-debate/identity/R01-context.md](../../structure-debate/identity/R01-context.md) | ✅ ANX-42 |
| **R2** | Fronteiras — possui / não possui | [structure-debate/identity/R02-boundaries.md](../../structure-debate/identity/R02-boundaries.md) | ✅ ANX-42 |
| **R3** | Modelo de domínio | [structure-debate/identity/R03-domain-sketch.md](../../structure-debate/identity/R03-domain-sketch.md) | ✅ ANX-42 |
| **R4** | Contratos e eventos | [structure-debate/identity/R04-contracts-events.md](../../structure-debate/identity/R04-contracts-events.md) | ✅ ANX-42 |
| **R5** | Armazenamento — PG, journal, outbox | [structure-debate/identity/R05-storage.md](../../structure-debate/identity/R05-storage.md) | ✅ ANX-42 |
| **R6** | Dependências — upstream/downstream | [R06-dependencies.md](./R06-dependencies.md) | ✅ draft — ANX-77 |
| **R7** | Riscos e controles | [R07-risks.md](./R07-risks.md) | ✅ draft — ANX-77 |
| **R8** | Decision log | [R08-decision-log.md](./R08-decision-log.md) | ✅ draft — ANX-77 |
| **R9** | Plano P1 (pós-P0) | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ draft — ANX-77 |
| **R10** | Pacote G0 (handoff debate) | [R10-g0-handoff.md](./R10-g0-handoff.md) | ✅ draft — ANX-77 |

## Resumo

- **P0 código:** ANX-28 `done` (G7 2026-09-07) — `getPrincipalById`, PG, outbox.
- **Debate R06–R10:** entregue ANX-77 → módulo **`g0_ready`** para orquestração.
- **P1:** ANX-78 (`in_review`) — normalização eventos, contratos identity, `suspendPrincipal`, consumer sessão (PC-G0-09 ✅).

## Issues relacionadas

| Issue | Papel |
| --- | --- |
| ANX-77 | Debate R06–R10 |
| ANX-42 | Structure-debate R01–R05 |
| ANX-28 | Implementação P0 (`done`) |
| ANX-29 | Downstream organizations (desbloqueado identity G7) |
| ANX-78 | Implementação P1 (R09 slices S1–S4) |
| ANX-54 | Roadmap / snapshot orquestração |
