# anxionOS

anxionOS é uma plataforma multi-tenant de investimentos autônomos governados por um **grafo institucional**: agências, agentes, modelos, estratégias, capital e decisões conectados com autoridade, risco e auditoria explícitos. Humanos e agentes compartilham contratos de domínio; a apresentação varia por papel (Owner, operador, plataforma, parceiro).

O repositório está em **fase de especificação e planejamento**. Não há aplicação `backend/` implantada nem código de produto verificado neste momento.

## Documentação canônica (local)

A knowledge base **Open Knowledge / OKF** vive em `brain/` no workspace local do mantenedor. Essa pasta **não** é versionada no GitHub (não clone nem commite `brain/` neste repositório remoto). ADRs, specs, PRD e notas de arquitetura permanecem locais; quem desenvolve com o time obtém `brain/` por canal acordado com o mantenedor.

Neste repositório público: [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), diagramas [Archify](https://github.com/tt-a1i/archify) em `.archify/`, templates em `.github/` e, no futuro, `backend/`.

## Começar aqui

| Recurso | Descrição |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Guia operacional para humanos e agentes (fontes de verdade locais, gates, o que não fazer) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir com código e com o repositório público |
| [.archify/README.md](.archify/README.md) | Diagramas de arquitetura e workflow (Archify) |

Com `brain/` local: abra `brain/index.md` como índice da knowledge base.

### Diagramas (Archify)

```bash
npm install
npm run archify:check    # doctor + validação das specs
npm run archify:build    # gera HTML em .archify/artifacts/
```

Artefatos versionados: abra `.archify/artifacts/*.html` no navegador (tema claro/escuro, export PNG).

## Estrutura do repositório

```
anxionOS/
├── AGENTS.md          # Instruções para agentes e desenvolvedores
├── .archify/          # Specs JSON + artifacts HTML (Archify)
├── brain/             # (local, gitignored) OKF — specs, ADRs, notas
├── .github/           # Templates de issue/PR e CI mínimo
├── package.json       # Scripts archify:* e postinstall do vendor
└── backend/           # (futuro) apps, modules, packages
```

Organização modular do backend, roadmap P01–P09 e decisões aceitas estão documentados em `brain/` local (ex.: ADR0002, SDD institucional). Implementação somente após greenlight explícito.

## Contribuir

1. Leia [AGENTS.md](AGENTS.md) e [CONTRIBUTING.md](CONTRIBUTING.md).
2. **Não** inclua `brain/` em commits deste repositório.
3. Comunicação em **português (PT-BR)**; identificadores técnicos podem seguir inglês.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
