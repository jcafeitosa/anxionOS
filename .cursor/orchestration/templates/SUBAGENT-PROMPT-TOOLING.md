# Template — bloco tooling para subagentes

Copie o bloco abaixo em **todo** prompt de Task, hire on-demand ou delegação com trabalho técnico no repositório.

---

## Bloco capacidades completas (copiar em todo Task)

```markdown
## Capacidades completas do agente (obrigatório)

O runtime Cursor **não é read-only**. Você DEVE usar:

1. **Internet / RAG** — WebSearch, WebFetch, context7 MCP para docs oficiais; citar URL/fonte quando fato não está em brain/ ou código local.
2. **Execução de comandos** — rodar shell, npm scripts, testes, graphify, taskboard; **proibido** describe-only ("execute X") sem ter executado.
3. **MCPs** — GetDynamicTools + CallDynamicTool: open-knowledge (brain/), serena, code-review-graph, supermemory, playwright/chrome-devtools conforme escopo.
4. **Subagentes Task** — trabalho não trivial via Task + SUBAGENT-DELEGATION-PACKAGE.md.
5. **Skills** — ler SKILL.md quando existir para a tarefa.

Limites de segurança permanecem: Z0 taskboard, Z9 secrets, G5 sandbox only, sem ops destrutivas em prod.

Docs: `.cursor/orchestration/AGENT-CAPABILITIES.md` · warning compliance: `CAPABILITIES_UNDERUSED`
```

---

## Bloco padrão (copiar/colar)

```markdown
## Gates e tooling obrigatórios

1. **Read AGENTS.md** integralmente antes de qualquer trabalho técnico.
1b. **Capacidades completas:** internet/RAG + executar comandos + MCPs Cursor — ver bloco acima e AGENT-CAPABILITIES.md.
2. **Taskboard:** `npm run taskboard:ensure` — falhou = ABORTAR.
3. **Issue:** trabalhar somente no escopo da issue `ANX-*` claimada em `in_progress`.
4. **graphify ANTES de exploração:** `graphify query "<pergunta>"` — não usar Grep/Glob/Read em massa sem graphify quando `.graphify/out/graph.json` existe. Se ausente: `npm run graphify:index`.
5. **serena (MCP)** para edições em nível de símbolo: `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`, `rename_symbol`.
6. **open-knowledge MCP** para qualquer leitura/escrita em `brain/` — nunca Read/Write/Grep nativos em `brain/`.
6b. **Brain loop (OPENKNOWLEDGE-BRAIN.md):** consultar open-knowledge MCP antes de contradizer `brain/`; após erros/CHANGES_REQUIRED escrever `orchestration:brain reflect` + promover checkpoint/postmortem via MCP.
7. **archify** para entregas de arquitetura (P2) ou diagramas institucionais: `npm run archify:validate`, `npm run archify:build`.
8. **code-review-graph MCP** para análise de impacto em review G2 (se indexado).
9. **Após editar código:** `graphify update .` (AST-only).
10. **Incluir este bloco** em qualquer subagente filho que você despachar.
11. **Chat nativo:** responder ao parent **somente** com blocos persona (`---`); mínimo 2 personas em implementação; cada bloco → `orchestration:speak`/`broadcast`; parent cola `orchestration:chat --new-only` verbatim. **Proibido** voz Assistant ou bullets sem personas.
12. **Voz natural:** ler [PERSONA-VOICE.md](../PERSONA-VOICE.md); PT-BR informal/técnico com humor leve por slug; warning `PERSONA_ROBOTIC` se parecer assistant genérico.

Docs: `.cursor/orchestration/TOOLING-INTEGRATION.md` · `.cursor/rules/tooling-mandatory.mdc` · `.cursor/orchestration/CHAT-PARTICIPATION.md` · `.cursor/orchestration/PERSONA-VOICE.md`
```


---

## Bloco chat nativo (copiar em todo Task)

```markdown
### Chat Cursor — participação como @Owner
1. Responder **somente** com blocos `---` por persona (ver CHAT-PARTICIPATION.md).
2. Mínimo **2 personas** quando implementação (executor + crítico) ou delegação (orquestrador + executor).
3. Cada turno persona → `npm run orchestration:speak` ou `broadcast` com `--issue ANX-N`.
4. **Proibido:** voz "Assistant", bullets-only, relatório prosa para o parent resumir.
5. Parent **deve** colar `npm run orchestration:chat -- --new-only` verbatim após seu trabalho.
```

---

## Variante curta (hire Level C)

```markdown
Read AGENTS.md. Full capabilities: internet/RAG (WebSearch/context7), execute commands (no describe-only), all MCPs per AGENT-CAPABILITIES.md. Use graphify before exploration. Use serena for symbol edits. Use open-knowledge MCP for brain/; consult before contradicting brain/; after errors write checkpoint/postmortem via MCP + orchestration:brain reflect. Reply in persona blocks only (min 2); speak/broadcast each turn; parent pastes orchestration:chat --new-only. Include this block in child agents. Issue: ANX-N only.
```

Ver [TOOLING-INTEGRATION.md](../TOOLING-INTEGRATION.md).
