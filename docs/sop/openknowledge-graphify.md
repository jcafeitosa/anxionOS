---
type: guide
---

# SOP — Workflow OpenKnowledge + Graphify

**Mandato:** Rafael / Julio 2026-09-12  
**DRI (Publisher):** Marina Okonkwo  
**Aplicabilidade:** Todo agente humano e IA no projeto anxionOS

## Objetivo

Garantir que todo trabalho técnico no anxionOS comece com contexto institucional verificado e explore o código via grafo antes de busca em massa.

## Protocolo obrigatório

### 1. Começar pelo índice OpenKnowledge

Antes de qualquer trabalho técnico (exploração, código, docs):

```bash
# Ler o índice local (não versionado no git)
cat brain/index.md
```

- `brain/` é **local** (`.gitignore`): specs, ADRs, notas de arquitetura.
- Fontes de verdade institucional: `brain/notes/anxionos-backend-structure.md`, `brain/project-docs/specs/`, `brain/project-docs/decisions/`.
- **Nunca commitar** `brain/` no repositório.

### 2. Explorar via Graphify antes de busca em massa

Antes de `Grep`, `Glob` ou `Read` em massa:

```bash
# Verificar estado do grafo
npm run graphify:check

# Indexar se necessário (AST-only, sem custo de API)
npm run graphify:index

# Consultar relações
graphify query "<pergunta>"
graphify path "<A>" "<B>"
graphify explain "<conceito>"
```

- **Saída:** `.graphify/out/graph.json`, `.graphify/out/wiki/` (quando gerado).
- **Gitignored** — nunca commitar `.graphify/out/`.
- Prioridade: code-review-graph MCP (se ativo) → Graphify → documentação `brain/` → Grep/Glob.

### 3. Registrar conhecimento durável em `brain/`

Ao documentar decisões, pesquisa ou contratos:

- **Rascunhos e work-in-progress:** `brain/notes/`, `brain/research/`, `brain/project-docs/`.
- **Status OKF:** frontmatter `status: draft` | `proposed` | `accepted`.
- **Não publicar** material incompleto ou não revisado em `docs/`.

### 4. Publicação em `docs/` — single-writer

**Regra única:** apenas **Marina Okonkwo** publica arquivos versionados em `docs/` (e árvores relacionadas: `project-docs/`, `notes/`).

- **Outros agentes:** entregam draft packages para Marina revisar e publicar.
- **Rastreio:** claim `ANX-*` no Dashi antes de trabalho material em `docs/`.

### 5. Rastreamento obrigatório

Antes de editar `docs/` ou material versionado:

```bash
# Board online
npm run taskboard:ensure || exit 1

# Claim issue ANX-*
npm run taskboard:list
node scripts/taskboard.mjs move ANX-<N> in_progress

# Ao concluir: comentário + in_review
# done só com aceite explícito
```

- **Evidência:** SHA do commit, PR, issue do board, aprovação explícita.
- **Nunca:** trabalho documental material sem issue vinculada.

## Critérios de aceitação

- [ ] Página `docs/sop/openknowledge-graphify.md` publicada no repositório
- [ ] `docs/index.md` contém link para este SOP
- [ ] Nenhum arquivo `brain/` ou `.graphify/out/` commitado no PR

## Referências

- [AGENTS.md](../../AGENTS.md) — Gate obrigatório; seção OpenKnowledge e Graphify
- [docs/graphify/README.md](../graphify/README.md) — Detalhes do Graphify
- [docs/document-precedence.md](../document-precedence.md) — Precedência de documentação
- Framework de orquestração: `.cursor/orchestration/` — regras Cursor + políticas Zero Z0–Z21
