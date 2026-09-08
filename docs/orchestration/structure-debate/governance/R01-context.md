---
type: debate
---

# R01 — Contexto: `modules/governance`

**Componente:** modules/governance  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P02  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Grants, delegação, mandatos e aprovações — autoridade institucional genérica e epochs de política.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Grants
- delegações
- mandatos
- aprovações
- ChangeProposal
- epochs

### Não possui (fronteiras ADR0002 / brain)

- RiskPolicy/RiskCheck/kill switch — risk (PolicyVersion kind=RISK)
- Execução de ordens — execution

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | identity, organizations, packages/contracts, packages/eventing |
| **Downstream** | graph (explicação), orchestration, connections, simulation, todos os comandos autenticados |

## Armazenamento

PG: grants, delegações, mandatos, aprovações. Neo4j: caminhos de autoridade temporal. SQLite: não guardar permissões offline.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.** Issue debate backlog ANX-40; impl ANX-30.

## Perguntas abertas para debate

- Contrato genérico PolicyVersion vs tipos específicos em risk/strategies?
- Como revalidar epoch entre leitura de grafo e efeito (ST03 storage map)?
- ChangeProposal vs simulation Snapshot — quem aprova promoção?
- Granularidade de grant: capability vs resource vs temporal window?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** (`R02-boundaries.md`) após consenso sobre inventário R1.
