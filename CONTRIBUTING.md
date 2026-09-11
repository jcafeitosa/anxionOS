---
type: guide
---

# Contribuindo com o anxionOS

Obrigado por participar. Este repositório prioriza **documentação governada** (localmente) antes da implementação do backend.

## Antes de abrir PR ou issue

1. **Gate obrigatório:** leia [AGENTS.md](AGENTS.md) no início da sessão, antes de qualquer trabalho técnico. Agentes de IA e subagentes seguem a mesma regra; violação invalida o trabalho (ver seção *Gate obrigatório* em AGENTS.md).
2. Leia [AGENTS.md](AGENTS.md) — estado do projeto, fontes de verdade e restrições (sem scaffold massivo, sem inventar stack). **Tolerância zero** a código incompleto, `TODO`/`FIXME` sem issue `ANX-*`, hardcoded não documentado e mocks em caminhos de produção (seção *Tolerância zero* em AGENTS.md).
3. **Política zero-trabalho-fora-do-board:** humanos e agentes de IA **não podem** codar, commitar nem alterar docs públicas sem issue `ANX-*` em `in_progress` no [Dashi Taskboard](https://github.com/chuspeeism/dashi-taskboard) local. Fluxo: `npm run taskboard:prework` → claim → trabalho → `in_review`. Se `taskboard:ensure` falhar, **pare** e suba o board — não improvise.
4. **PR sem `ANX-*` será rejeitada.** O identificador deve aparecer no título ou corpo (ex.: `ANX-12`). A issue deve estar em `in_review` ao abrir o PR; `done` só após merge/aceite explícito.
5. Se você tem `brain/` no workspace local, consulte `brain/index.md` para specs, ADRs e notas. **Não commite arquivos em `brain/`** — a pasta está no `.gitignore` e não é publicada no GitHub.

## Documentação canônica (`brain/`, local)

- A knowledge base OKF fica em `brain/` **apenas na máquina do desenvolvedor** (ou cópia compartilhada fora deste remote).
- Decisões, specs e notas são editadas localmente (MCP **open-knowledge** quando disponível).
- Mudanças de contrato ou arquitetura aceita devem ser refletidas em `brain/` local e, quando aplicável, em ADRs/specs **fora** deste git — não via PR que adicione `brain/`.

Para PRs neste repositório: atualize [docs/](docs/index.md), README, AGENTS.md, CONTRIBUTING ou código em `backend/` e `frontend/` quando aplicável.

## Código (quando existir)

Implementação só após greenlight explícito do mantenedor, um pacote **P0x** por vez, conforme estrutura do backend e SDD documentados em `brain/` local.

- Validação de schema nos boundaries (ex.: Zod).
- Testes nos gates AR01–AR06 quando aplicável.
- PRs devem usar o [template de pull request](.github/pull_request_template.md).

## Idioma

Issues, discussões e documentação voltada a pessoas: **português (PT-BR)**. Commits e identificadores de código podem usar inglês quando já estabelecido.

## Segurança

Não commite `.env`, credenciais, chaves API, dumps sensíveis nem o diretório `brain/`. Reporte vulnerabilidades pelos canais que o mantenedor indicar (issue privada ou contato direto).
