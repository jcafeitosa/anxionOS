---
type: debate
---

# R01 — Contexto: `modules/strategies`

**Componente:** modules/strategies  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42 · **debate módulo:** ANX-89

## Propósito

Estratégias, backtests e deployments — versões parametrizadas e estado de backtest.

## O que possui / não possui

### Possui (donos de estado ou composição)

- StrategyVersion
- parâmetros/hash
- Deployment
- estado backtest confirmado

### Não possui (fronteiras ADR0002 / brain)

- Promoção/certificação produção — evaluation
- Execução ordens — execution
- Jobs ML — research-python

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | market-data, agents, governance, evaluation (critérios) |
| **Downstream** | decisions, portfolios, performance, simulation |

## Armazenamento

PG: StrategyVersion, Deployment, backtest state. Neo4j: dependências ativo/modelo/skill. SQLite: experimentos locais não publicados.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Deployment vs StrategyVersion: ciclo de vida e rollback?
- research-python: protocolo job vs comando strategies?
- Hash de parâmetros imutável — reprodutibilidade?
- Fronteira strategy signal vs TradeIntent decisions?

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
