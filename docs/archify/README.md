# Archify no anxionOS

[Archify](https://github.com/tt-a1i/archify) gera diagramas interativos (arquitetura, workflow, sequência, dataflow, lifecycle) a partir de JSON tipado. **Não** indexa código — complementa o **code-review-graph** MCP (exploração de código) com artefatos visuais para humanos e agentes.

## Layout

| Caminho | Conteúdo |
| --- | --- |
| `.archify/specs/` | Especificações JSON (fonte de verdade dos diagramas) |
| `.archify/artifacts/` | HTML gerados (`deliver`) — versionados no git |
| `.archify/VERSION` | Commit fixo do upstream em `vendor/archify` |
| `vendor/archify/` | Clone local (gitignored; `npm install` restaura) |

## Pré-requisitos

- Node.js ≥ 18 (recomendado ≥ 22)
- `npm install` na raiz (executa `scripts/ensure-archify.mjs`)

## Specs atuais

Fonte canônica: OpenKnowledge (`brain/notes/anxionos-backend-structure.md`, ADR0002, ADR0004, mapa de armazenamento). Diagramas são visão de plataforma, não 23 caixas por módulo (limite showcase).

| Spec | Tipo | Artefato |
| --- | --- | --- |
| `anxionos-platform.architecture.json` | architecture | `artifacts/anxionos-platform.architecture.html` |
| `anxionos-storage-authority.dataflow.json` | dataflow | `artifacts/anxionos-storage-authority.dataflow.html` |
| `anxionos-delivery-p01-p09.workflow.json` | workflow | `artifacts/anxionos-delivery-p01-p09.workflow.html` |
| `anxionos-connections-inference.workflow.json` | workflow | `artifacts/anxionos-connections-inference.workflow.html` |
| `anxionos-product-company.workflow.json` | workflow | `artifacts/anxionos-product-company.workflow.html` |

## Comandos (raiz do repo)

```bash
npm run archify:doctor          # saúde do toolchain
npm run archify:validate        # valida todas as specs (showcase)
npm run archify:build           # gera HTML em .archify/artifacts/
```

CLI direto:

```bash
node vendor/archify/archify/bin/archify.mjs validate architecture .archify/specs/anxionos-platform.architecture.json --quality showcase --json
node vendor/archify/archify/bin/archify.mjs deliver architecture .archify/specs/anxionos-platform.architecture.json .archify/artifacts/anxionos-platform.architecture.html --quality showcase --json
```

## Para agentes

1. Leia [AGENTS.md](../../AGENTS.md) (seção Archify) e as specs existentes antes de criar diagramas novos.
2. Use tipos: `architecture`, `workflow`, `sequence`, `dataflow`, `lifecycle`.
3. Valide com `npm run archify:validate` antes de commitar specs ou artifacts.
4. Com `backend/` implantado, atualize diagramas com evidência de repositório — não invente componentes.

## Próximo passo

- Diagramas por módulo ou fluxo (ex.: connections, ciclo de investimento).
- Comparar snapshots com `archify compare` em PRs de arquitetura.
- Integrar `archify:validate` ao job de build/test do backend.
