# Graphify no anxionOS

[Graphify](https://github.com/Graphify-Labs/graphify) indexa código e documentação em um **grafo de conhecimento** local (`graph.json`), com extração AST (tree-sitter) e opcionalmente semântica via LLM. Complementa **Archify** (diagramas declarativos) e o MCP **code-review-graph** (relações estruturais no código quando indexado).

## Layout

| Caminho | Conteúdo |
| --- | --- |
| `.graphify/VERSION` | Commit fixo do upstream em `vendor/graphify` |
| `.graphify/.graphifyignore` | Exclusões de indexação (espelha `.gitignore` + `brain/`) |
| `.graphify/out/` | Índice local (`graph.json`, cache, manifest) — **gitignored** |
| `.graphify/.venv/` | Virtualenv Python com CLI graphify — **gitignored** |
| `vendor/graphify/` | Clone local (gitignored; `npm install` restaura) |

## Pré-requisitos

- Python ≥ 3.10
- `npm install` na raiz (executa `scripts/ensure-graphify.mjs`)

## Comandos (raiz do repo)

```bash
npm run graphify:doctor   # Python, venv e CLI graphify
npm run graphify:index    # reindex AST-only (sem API key)
npm run graphify:check    # doctor + index + valida graph.json
```

Variável de ambiente: `GRAPHIFY_OUT=.graphify/out` (padrão nos scripts npm).

## Outputs

Após `graphify:index`:

| Artefato | Descrição |
| --- | --- |
| `.graphify/out/graph.json` | Grafo persistente (NetworkX node-link JSON) |
| `.graphify/out/manifest.json` | Manifesto incremental |
| `.graphify/out/cache/` | Cache SHA256 por arquivo |

Com extração semântica (`graphify extract .` ou skill `/graphify` no assistente): também `GRAPH_REPORT.md`, `graph.html`, `wiki/`, etc.

## Para agentes

1. Leia [AGENTS.md](../../AGENTS.md) (seção Graphify) antes de explorar o repositório.
2. Com índice presente, consulte `.graphify/out/graph.json` ou use `graphify query` / `graphify god-nodes`.
3. Após alterar código, rode `npm run graphify:index` (AST-only, sem custo de API).
4. Para docs em `brain/` (local): indexe só na máquina do mantenedor; não commitar `brain/` nem `.graphify/out/`.

## Cursor / MCP

```bash
# Regra Cursor (opcional, uma vez por dev)
.graphify/.venv/bin/graphify cursor install

# Servidor MCP stdio (sessão local)
.graphify/.venv/bin/graphify extract . --code-only --mcp
```

## Três ferramentas de grafo

| Ferramenta | Papel |
| --- | --- |
| **Archify** | Diagramas de arquitetura/workflow a partir de JSON em `.archify/specs/` |
| **Graphify** | Grafo de conhecimento do corpus (código + docs indexados) |
| **code-review-graph** (MCP) | Callers/callees, impacto e review quando há código indexado no MCP |
