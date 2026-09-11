---
type: guide
---
# Documentação do projeto anxionOS

Índice central da documentação **versionada neste repositório**. Entradas de convenção GitHub permanecem na raiz; detalhes operacionais vivem aqui em `docs/`.

## Entradas na raiz (convenção GitHub)

| Documento | Descrição |
| --- | --- |
| [README.md](../README.md) | Visão geral, quick start, estrutura do repo |
| [AGENTS.md](../AGENTS.md) | Guia operacional para humanos e agentes — **leitura obrigatória** no início de cada sessão antes de trabalho técnico (ver *Gate obrigatório* no arquivo) |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Como contribuir |
| [LICENSE](../LICENSE) | Licença MIT |

## Plataforma

| Documento | Descrição |
| --- | --- |
| [Backend](backend/README.md) | Workspace Bun/TypeScript, API, Docker, boundaries |
| [Frontend](frontend/README.md) | Astro + React, proxy API, estrutura P07 |
| [Design system](design-system/README.md) | Tokens ui-ux-pro-max (implementação em `frontend/design-system/`) |
| [Inventário de bibliotecas](library-inventory.md) | Versões npm/Docker resolvidas nos lockfiles |
| [Backup e restore drill](backend/backup-restore-drill.md) | Drill isolado de backup/restore PostgreSQL |
| [Padrões do log viewer](frontend/log-viewer-patterns.md) | Padrões de UI para logs no console |

## Ferramentas de grafo e diagramas

| Documento | Descrição |
| --- | --- |
| [Archify](archify/README.md) | Diagramas interativos a partir de `.archify/specs/` |
| [Graphify](graphify/README.md) | Grafo de conhecimento local (`.graphify/out/`) |

## Orquestração e gates

Matrizes e playbooks da entrega G0–G7. Vários destes documentos são **fonte G0** citada pelas issues do board.

| Documento | Descrição |
| --- | --- |
| [Matriz de contratos dos 23 módulos](orchestration/module-contract-matrix-23.md) | Contrato por módulo e camada |
| [Fila de módulos](orchestration/module-queue.md) | Snapshot de sequenciamento (o board prevalece para status) |
| [Playbook de desenvolvimento de módulo](orchestration/module-development-playbook.md) | Rodadas R01–R10 e critérios por rodada |
| [Matriz de prontidão de gates](orchestration/gate-readiness-matrix.md) | Critérios de saída por gate |
| [Contrato de evidência e handoff](orchestration/gate-evidence-handoff-acceptance-contract.md) | Pacote de evidência aceito por gate |
| [Roadmap de execução](orchestration/execution-roadmap.md) | Sequência P01–P09 |
| [Contrato P09 — evolução e rollback](orchestration/p09-evolution-rollback-contract.md) | Canary, promoção e rollback |
| [Isolamento de fixtures de teste](orchestration/test-fixture-isolation-v1.md) | Regras de fixture/sandbox em testes |
| [Rodadas por módulo](orchestration/modules/) | `R01`–`R10` + `ROUNDS.md` por módulo |
| [Capacidades do sistema](orchestration/system-capabilities/CAPABILITY-MAP.md) | Mapa de capacidades e manifest |

## Operação e SLOs

| Documento | Descrição |
| --- | --- |
| [Observabilidade](observability/README.md) | Sinais, SLIs e SLOs da plataforma |
| [Snapshot de SLOs](observability/platform-slo-snapshot.md) | Snapshot corrente de SLO |

## Decisões (ADRs)

> **Precedência:** os ADRs canônicos vivem em `brain/project-docs/decisions/` (local, não versionado). Arquivos em `docs/decisions/` são **legado** e não prevalecem em conflito de numeração ou decisão. Saneamento rastreado em ANX-455.

| Documento | Descrição |
| --- | --- |
| [ADR0005 — Realtime gateway (Elysia + NATS)](decisions/0005-realtime-gateway-elysia-nats.md) | Legado / superseded — precedência em `brain/` (ANX-455) |
| [Registro de precedência ADR/spec](document-precedence.md) | Números duplicados: canônico vs legado |

## Pesquisa

| Documento | Descrição |
| --- | --- |
| [Estratégia de conexão realtime](research/realtime-connection-strategy.md) | Comparação de abordagens de conexão |

## Equipe e governança

| Documento | Descrição |
| --- | --- |
| [Org chart](team/org-chart.md) | Hierarquia circular de agentes (G0–G7) |

## Knowledge base local (`brain/`)

Specs, ADRs, PRD e notas de arquitetura vivem em `brain/` **somente no workspace local** (gitignored). Com `brain/` presente, comece por `brain/index.md`. Esta pasta não é publicada no GitHub.

**Precedência documental:** `brain/` é a fonte canônica. As pastas versionadas `notes/`, `project-docs/` e `docs/decisions/` contêm material **legado** publicado no GitHub; em conflito de numeração, status decisório ou conteúdo, **prevalece `brain/`**. Ver ANX-455.

## Templates GitHub

Issues e PRs: [.github/](../.github/)
