---
type: debate
---

# Índice de rodadas — `modules/governance`

Debate formal ANX-40, alinhado ao [playbook](../../module-development-playbook.md) e SDD P02.

| Rodada | Título | Artefato | Status |
| --- | --- | --- | --- |
| **R1** | Inventário documental e de código | [R01-context.md](./R01-context.md) | ✅ Concluído |
| **R2** | Fronteiras — possui / não possui | [R02-boundaries.md](./R02-boundaries.md) | ✅ Concluído |
| **R3** | Modelo de domínio — entidades, invariantes, ports | [R03-domain-sketch.md](./R03-domain-sketch.md) | ✅ Concluído |
| **R4** | API e eventos — contratos públicos | [R04-contracts.md](./R04-contracts.md) | ✅ Concluído |
| **R5** | Armazenamento — PG, journal, outbox, Neo4j | [R05-storage.md](./R05-storage.md) | ✅ Concluído |
| **R6** | Dependências — upstream/downstream | [R06-dependencies.md](./R06-dependencies.md) | ✅ Concluído |
| **R7** | Riscos e perguntas abertas | [R07-risks.md](./R07-risks.md) | ✅ Concluído |
| **R8** | Síntese do debate — decision log | [R08-decision-log.md](./R08-decision-log.md) | ✅ Concluído |
| **R9** | Plano de implementação | [R09-dev-plan.md](./R09-dev-plan.md) | ✅ Concluído |
| **R10** | Pacote G0 (handoff) | [R10-g0-handoff.md](./R10-g0-handoff.md) | ✅ Concluído |

## Resumo

Debate R1–R10 **concluído** — G0 aprovado (`cursor-governance-debate-1788836799`). Próximo: claim ANX-30 (impl) após PC-G0-04/05. Implementação futura em **ANX-30** (GK03 revogação).

## Issues relacionadas

| Issue | Papel |
| --- | --- |
| ANX-40 | Debate R1–R10 (esta trilha) |
| ANX-30 | Implementação G1+ — bloqueada até debate G0 |
| ANX-28 | identity — `in_review`; pré-requisito grant events F0 |
| ANX-29 | organizations — membership events consumidos por governance |

## Referências cruzadas

| Artefato | Relação |
| --- | --- |
| [structure-debate/governance/R01](../../structure-debate/governance/R01-context.md) | Inventário estrutural ANX-42 — absorvido e expandido aqui |
| [system-capabilities/modules/governance.md](../../system-capabilities/modules/governance.md) | Mapa funcional humano+agente (ANX-43) |
| [organizations R04](../organizations/R04-contracts.md) | Fronteira: grants não pertencem a organizations |
