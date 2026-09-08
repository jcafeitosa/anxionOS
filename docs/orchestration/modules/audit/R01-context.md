---
type: debate
---

# R01 — Contexto: `modules/audit`

**Componente:** modules/audit  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Flight Recorder, linhagem e replay governado — manifests e índices, não segundo ledger.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Manifests auditoria
- índices
- retenção
- replay governado
- Flight Recorder

### Não possui (fronteiras ADR0002 / brain)

- Journal domínio — cada módulo/eventing
- Ledger — accounting
- Logs app — observability

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | packages/eventing, todos os módulos (eventos), graph (linhagem) |
| **Downstream** | operations, governance (investigação), compliance export |

## Armazenamento

PG: manifests, índices, retenção. Neo4j: causalidade linhagem. SQLite: logs auxiliares, nunca audit trail único.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Replay governado: quem autoriza e escopo de mutação?
- Retenção vs GDPR/export — operations overlap?
- Flight Recorder volume — object storage vs PG?
- Deduplicação replay Neo4j alinhada audit index?

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
