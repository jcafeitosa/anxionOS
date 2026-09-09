# Template — bloco tooling para subagentes

Copie o bloco abaixo em **todo** prompt de Task, hire on-demand ou delegação com trabalho técnico no repositório.

---

## Bloco padrão (copiar/colar)

```markdown
## Gates e tooling obrigatórios

1. **Read AGENTS.md** integralmente antes de qualquer trabalho técnico.
2. **Taskboard:** `npm run taskboard:ensure` — falhou = ABORTAR.
3. **Issue:** trabalhar somente no escopo da issue `ANX-*` claimada em `in_progress`.
4. **graphify ANTES de exploração:** `graphify query "<pergunta>"` — não usar Grep/Glob/Read em massa sem graphify quando `.graphify/out/graph.json` existe. Se ausente: `npm run graphify:index`.
5. **serena (MCP)** para edições em nível de símbolo: `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`, `rename_symbol`.
6. **open-knowledge MCP** para qualquer leitura/escrita em `brain/` — nunca Read/Write/Grep nativos em `brain/`.
7. **archify** para entregas de arquitetura (P2) ou diagramas institucionais: `npm run archify:validate`, `npm run archify:build`.
8. **code-review-graph MCP** para análise de impacto em review G2 (se indexado).
9. **Após editar código:** `graphify update .` (AST-only).
10. **Incluir este bloco** em qualquer subagente filho que você despachar.

Docs: `.cursor/orchestration/TOOLING-INTEGRATION.md` · `.cursor/rules/tooling-mandatory.mdc`
```

---

## Variante curta (hire Level C)

```markdown
Read AGENTS.md. Use graphify before exploration. Use serena for symbol edits. Use open-knowledge MCP for brain/. Include this block in child agents. Issue: ANX-N only.
```

Ver [TOOLING-INTEGRATION.md](../TOOLING-INTEGRATION.md).
