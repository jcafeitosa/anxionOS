# Contribuindo com o anxionOS

Obrigado por participar. Este repositório prioriza **documentação governada** antes da implementação do backend.

## Antes de abrir PR ou issue

1. Leia [AGENTS.md](AGENTS.md) — estado do projeto, fontes de verdade e restrições (sem scaffold massivo, sem inventar stack).
2. Consulte [brain/index.md](brain/index.md) para localizar specs, ADRs e notas existentes.

## Documentação (`brain/`)

- Siga as convenções **Open Knowledge / OKF** (frontmatter, templates em `.ok/templates/`).
- Use o MCP **open-knowledge** quando disponível para buscar, editar e auditar documentos.
- **Decisões** arquiteturais ou de produto duradouras → ADR em `brain/project-docs/decisions/`.
- **Contratos e capacidades** → specs em `brain/project-docs/specs/`.
- **Contexto e planejamento** → notas em `brain/notes/` e pesquisa em `brain/research/`.

Não duplique documentação canônica: atualize a fonte e linke a partir de outros arquivos.

## Código (quando existir)

Implementação só após greenlight explícito do mantenedor, um pacote **P0x** por vez, conforme [estrutura do backend](brain/notes/anxionos-backend-structure.md) e SDD P01–P09.

- Validação de schema nos boundaries (ex.: Zod).
- Testes nos gates AR01–AR06 quando aplicável.
- PRs devem usar o [template de pull request](.github/pull_request_template.md).

## Idioma

Issues, discussões e documentação voltada a pessoas: **português (PT-BR)**. Commits e identificadores de código podem usar inglês quando já estabelecido.

## Segurança

Não commite `.env`, credenciais, chaves API ou dumps sensíveis. Reporte vulnerabilidades pelos canais que o mantenedor indicar (issue privada ou contato direto).
