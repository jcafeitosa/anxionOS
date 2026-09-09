# Instalação global — orquestração Cursor

Uma **única cópia** do framework serve todos os workspaces. Cada projeto mantém apenas config + dados de runtime.

## Arquitetura

```
~/.cursor/orchestration/          # GLOBAL — framework (cópia única)
  ├── agent-dialogue/
  ├── agent-compliance/
  ├── agent-config/
  ├── templates/
  ├── bin/orchestration.mjs
  └── VERSION

<workspace>/.cursor/
  ├── orchestration.config.json   # config do projeto
  └── orchestration-runtime/      # estado local (runtime)
      ├── dialogue/
      ├── hire/
      ├── workflows/
      ├── autonomy/
      └── proactive/
```

## Instalação (uma vez por máquina)

```bash
npm run orchestration:install-global
```

## Variáveis de ambiente

| Variável | Default | Efeito |
| --- | --- | --- |
| ORCHESTRATION_HOME | ~/.cursor/orchestration | Raiz do framework |
| ORCHESTRATION_CONFIG | .cursor/orchestration.config.json | Config do projeto |
| ORCHESTRATION_PREFER_GLOBAL | — | 1 força global mesmo com cópia local |
| ORCHESTRATION_ISSUE_PREFIX | do config | Override do prefixo |

## Novo projeto

```bash
npm run orchestration:global -- init
```

## Uso

```bash
npm run orchestration:global -- compliance --pre-work --issue ANX-N --persona orchestrator
npm run orchestration:global -- chat --new-only
```

## Verificação

```bash
npm run orchestration:test && npm run orchestration:verify
```

Ver [AGNOSTIC-DESIGN.md](./AGNOSTIC-DESIGN.md) e [templates/README-BOOTSTRAP.md](./templates/README-BOOTSTRAP.md).

## Tooling G0.14

Após instalar o framework global, copie por projeto: [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md), [SUBAGENT-PROMPT-TOOLING.md](./templates/SUBAGENT-PROMPT-TOOLING.md) e regra `tooling-mandatory.mdc`. Ver [AGNOSTIC-DESIGN.md](./AGNOSTIC-DESIGN.md).
