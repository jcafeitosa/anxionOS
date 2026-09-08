---
type: debate
---

# Índice de rodadas — `modules/organizations`

Debate formal ANX-39, alinhado ao [playbook](../../module-development-playbook.md) e SDD P02.

| Rodada | Título | Artefato | Status |
| --- | --- | --- | --- |
| **R1** | Inventário documental e de código | [R01-context.md](./R01-context.md) | ✅ Concluído |
| **R2** | Fronteiras — possui / não possui | [R02-boundaries.md](./R02-boundaries.md) | ✅ Concluído |
| **R3** | Modelo de domínio — entidades, invariantes, ports | [R03-domain-sketch.md](./R03-domain-sketch.md) | ✅ Concluído |
| **R4** | API e eventos — contratos públicos | [R04-contracts.md](./R04-contracts.md) | ✅ Concluído |
| **R5** | Armazenamento — PG, journal, outbox | [R05-storage.md](./R05-storage.md) | ✅ Concluído — PG `organizations_*`, command journal, HMAC invite hash, Neo4j E003/E008/E016 |
| **R6** | Dependências — upstream/downstream | [R06-dependencies.md](./R06-dependencies.md) | ✅ Concluído — identity port, packages, graph consumer, forbidden imports |
| **R7** | Riscos e perguntas abertas | [R07-risks.md](./R07-risks.md) | ✅ Concluído — registro 15 riscos, RLS application-only v1, TTL 7d, checklist G5 |
| **R8** | Síntese do debate — decision log | [R08-decision-log.md](./R08-decision-log.md) | ✅ Concluído — 44 decisões D-ORG-001+, P-R7-01/02 resolvidos, pré-condições G0 |
| **R9** | Plano de implementação | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ Concluído — 6 slices S1–S6, matriz G3/G5, mapa D-ORG→arquivos |
| **R10** | Pacote G0 (handoff) | [R10-g0-handoff.md](./R10-g0-handoff.md) | ✅ Concluído — PC-G0 **10/10** |

## Resumo

Debate R1–R10 **encerrado**. Módulo `organizations` → **`g0_ready`** na fila. ANX-29 implementação **`done`** (G7 2026-09-07). ANX-39 debate G7 `in_review`.

## Issues relacionadas

| Issue | Papel |
| --- | --- |
| ANX-39 | Debate R1–R10 — G7 `in_review` |
| ANX-29 | Implementação — `done` (G7 2026-09-07) |
| ANX-28 | identity — `done` (PC-G0-04 ✅) |
