# anxionOS

anxionOS é uma plataforma multi-tenant de investimentos autônomos governados por um **grafo institucional**: agências, agentes, modelos, estratégias, capital e decisões conectados com autoridade, risco e auditoria explícitos. Humanos e agentes compartilham contratos de domínio; a apresentação varia por papel (Owner, operador, plataforma, parceiro).

O repositório inclui **backend** (P01–P02) e **frontend** (P07 shell Owner) (`backend/`) — workspace Bun/TypeScript com API health, packages compartilhados e boundaries documentados. Módulos de domínio (P02+) ainda não existem.

## Documentação canônica (local)

A knowledge base **Open Knowledge / OKF** vive em `brain/` no workspace local do mantenedor. Essa pasta **não** é versionada no GitHub (não clone nem commite `brain/` neste repositório remoto). ADRs, specs, PRD e notas de arquitetura permanecem locais; quem desenvolve com o time obtém `brain/` por canal acordado com o mantenedor.

Neste repositório público: [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), diagramas [Archify](https://github.com/tt-a1i/archify) em `.archify/`, grafo [Graphify](https://github.com/Graphify-Labs/graphify) em `.graphify/`, templates em `.github/` e, no futuro, `backend/`.

## Começar aqui

| Recurso | Descrição |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Guia operacional para humanos e agentes (fontes de verdade locais, gates, o que não fazer) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir com código e com o repositório público |
| [.archify/README.md](.archify/README.md) | Diagramas de arquitetura e workflow (Archify) |
| [.graphify/README.md](.graphify/README.md) | Grafo de conhecimento do corpus (Graphify) |

Com `brain/` local: abra `brain/index.md` como índice da knowledge base.

### Diagramas (Archify)

```bash
npm install
npm run archify:check    # doctor + validação das specs
npm run archify:build    # gera HTML em .archify/artifacts/
```

Artefatos versionados: abra `.archify/artifacts/*.html` no navegador (tema claro/escuro, export PNG).

### Grafo de conhecimento (Graphify)

```bash
npm install          # também prepara vendor/graphify + .graphify/.venv
npm run graphify:doctor
npm run graphify:index   # AST-only, sem API key
npm run graphify:check
```

Índice local em `.graphify/out/` (gitignored). Requer Python ≥ 3.10.

### Backend (P01 — tooling e boundaries)

```bash
cd backend
bun install
bun run dev          # http://localhost:3000
bun test
curl http://localhost:3000/health
```

Detalhes: [backend/README.md](backend/README.md). Infra local opcional: `docker compose -f backend/deploy/docker/docker-compose.yml up -d`.


### Frontend (P07 — Owner Console shell)

```bash
cd frontend && npm install
npm run frontend:dev    # http://localhost:4321 (raiz do repo)
npm run frontend:build
```

Design system: `frontend/design-system/MASTER.md`. Org chart: [docs/team/org-chart.md](docs/team/org-chart.md). Proxy `/api` → backend `:3000`.

### Taskboard (obrigatório — dev local)

**Todo agente (humano ou IA) deve usar o board em tempo real** antes, durante e após qualquer trabalho neste repositório. Issues no [Dashi/Codex Taskboard](https://github.com/chuspeeism/dashi-taskboard) em `http://127.0.0.1:47823/` (projeto **anxionOS**). Ferramenta **somente local** — o CI não depende dela.

```bash
cp .env.example .env   # opcional
npm run taskboard:ensure   # falha se offline — obrigatório antes de trabalhar
npm run taskboard:context
npm run taskboard:list
```

Regras completas: [AGENTS.md](AGENTS.md) (seção Dashi Taskboard). Wrapper: `scripts/taskboard.mjs`.

## Estrutura do repositório

```
anxionOS/
├── AGENTS.md          # Instruções para agentes e desenvolvedores
├── .archify/          # Specs JSON + artifacts HTML (Archify)
├── .graphify/          # Config + índice local Graphify (out/ gitignored)
├── brain/             # (local, gitignored) OKF — specs, ADRs, notas
├── .github/           # Templates de issue/PR e CI mínimo
├── package.json       # Scripts archify:*, graphify:*, taskboard:* e postinstall do vendor
├── scripts/taskboard.mjs  # Wrapper CLI/HTTP para o board local
├── .env.example       # TASKBOARD_URL, PROJECT_ID (dev local)
├── frontend/          # P07: Astro + React Owner Console
└── backend/           # P01–P02: apps/api, packages, tests, deploy
```

Organização modular completa (23 módulos), roadmap P02–P09 e decisões aceitas estão em `brain/` local (ex.: ADR0002, SDD institucional).

## Contribuir

1. Leia [AGENTS.md](AGENTS.md) e [CONTRIBUTING.md](CONTRIBUTING.md).
2. **Não** inclua `brain/` em commits deste repositório.
3. Comunicação em **português (PT-BR)**; identificadores técnicos podem seguir inglês.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
