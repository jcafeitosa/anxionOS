---
type: debate
---

# R01 — Contexto: `apps/workers`

**Componente:** apps/workers  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P01–P09  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Composition root dos workers TypeScript — seleciona quais workers de `modules/*/workers` executar por perfil de deploy.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Entrypoints de processo worker (outbox relay, projection consumers, schedulers registrados).
- Configuração de filas/subscriptions NATS e lifecycle de shutdown.
- Perfis de deploy (ex.: projection-only, connections-reconciler) sem duplicar código de domínio.

### Não possui (fronteiras ADR0002 / brain)

- Lógica de negócio dos workers — fica no módulo dono.
- Estado transacional ou migrações.
- Workers Go/Python — pertencem a `services/*` com protocolo distinto.

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | packages/eventing, packages/database, packages/observability, modules/*/workers |
| **Downstream** | NATS, projectors Neo4j, jobs internos de reconciliação |

## Armazenamento

**Nenhum estado autoritativo.** Checkpoints de consumidor podem ser PG auxiliar via eventing/graph, não em apps/workers.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.** Pasta `backend/apps/workers/` não existe.

## Perguntas abertas para debate

- Um binário único com flags de perfil ou múltiplos entrypoints por pacote P?
- Como garantir idempotência e lease entre réplicas sem estado local SQLite institucional?
- Ordem de bootstrap: workers antes ou depois de migrations de módulos?
- Relação com workers nomeados em connections (catalog-sync, quota-reconciler) — mesmo processo?

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
