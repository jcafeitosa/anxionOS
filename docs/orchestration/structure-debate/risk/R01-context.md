---
type: debate
---

# R01 — Contexto: `modules/risk`

**Componente:** modules/risk  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Políticas/limites de risco, checks e kill switch — RiskPolicy como PolicyVersion(kind=RISK).

## O que possui / não possui

### Possui (donos de estado ou composição)

- RiskPolicy
- RiskCheck
- limites
- epochs risco
- kill switch

### Não possui (fronteiras ADR0002 / brain)

- Grants genéricos — governance (mantém contrato PolicyVersion)
- Execução — execution (revalida)

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | governance, portfolios, market-data, decisions |
| **Downstream** | execution, decisions, graph (explicação), operations (incidentes) |

## Armazenamento

PG: políticas, checks, kill switch. Neo4j: restrições, violações. SQLite: não validar risco com estado local antigo.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Kill switch: escopo global vs tenant vs strategy?
- RiskCheck síncrono na rota execution vs async worker?
- PolicyVersion kind=RISK: extensão governance ou tipo próprio?
- Limites pré-trade vs post-trade: dois agregados?

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
