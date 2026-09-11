---
type: debate
---

# R01 — Contexto: `modules/decisions`

**Componente:** modules/decisions  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P06  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42 · debate módulo: **ANX-97** · contrato P06: **ANX-58**

## In / Out (R1)

**In:** inventário Decision, TradeIntent, manifesto de evidências e hashes.

**Out:** Order/Fill (`execution`). RiskCheck (`risk`). Evidence storage (`knowledge`).

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Decision / TradeIntent / evidence manifesto | **decisions** |
| adapter-gateway | **KEEP** |

## Propósito

Decisões e intenções de investimento — manifesto de evidências e hashes.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Decision
- TradeIntent
- manifesto evidências
- hashes de decisão

### Não possui (fronteiras ADR0002 / brain)

- Order/Fill — execution
- RiskCheck — risk
- Evidence storage — knowledge

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | knowledge, agents, governance, portfolios, strategies |
| **Downstream** | execution, risk, audit, performance |

## Armazenamento

PG: Decision, TradeIntent. Neo4j: cadeia agente→evidência→decisão→intenção. SQLite: rascunho local sem efeito.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- TradeIntent imutável após submit?
- Revalidação risk/governance entre intent e order?
- Human-in-the-loop: mandato vs aprovação ad hoc?
- Evidência mínima obrigatória — schema contrato?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** ([R02-boundaries.md](./R02-boundaries.md)) — concluído ANX-97.
