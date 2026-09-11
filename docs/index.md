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

## Ferramentas de grafo e diagramas

| Documento | Descrição |
| --- | --- |
| [Archify](archify/README.md) | Diagramas interativos a partir de `.archify/specs/` |
| [Graphify](graphify/README.md) | Grafo de conhecimento local (`.graphify/out/`) |

## Equipe e governança

| Documento | Descrição |
| --- | --- |
| [Org chart](team/org-chart.md) | Hierarquia circular de agentes (G0–G7) |

## Knowledge base local (`brain/`)

Specs, ADRs, PRD e notas de arquitetura vivem em `brain/` **somente no workspace local** (gitignored). Com `brain/` presente, comece por `brain/index.md`. Esta pasta não é publicada no GitHub.

## Templates GitHub

Issues e PRs: [.github/](../.github/)
