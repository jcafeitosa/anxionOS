# Capacidades obrigatórias dos agentes

Política do framework: **todo agente de orquestração Cursor opera com capacidades completas** — internet, shell e ecossistema Cursor (MCPs, subagentes, skills, rules). O ambiente **não é sandbox read-only** para trabalho técnico autorizado.

**Violação de uso:** descrever comandos sem executar, inventar comportamento sem RAG/fontes, ou ignorar MCPs disponíveis quando aplicáveis = trabalho inválido (warn `CAPABILITIES_UNDERUSED` + revisão G1).

Relacionados: [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) · [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) · [SUBAGENT-PROMPT-TOOLING.md](./templates/SUBAGENT-PROMPT-TOOLING.md) · [ZERO-POLICIES.md](./ZERO-POLICIES.md) (Z19) · regra [tooling-mandatory.mdc](../rules/tooling-mandatory.mdc)

---

## Mandatos

| Capacidade | Obrigatório | Evidência |
| --- | --- | --- |
| **Internet / RAG** | Pesquisar docs oficiais, release notes, APIs e fontes quando fato não está em `brain/` ou código local | `WebSearch` / `WebFetch` / context7 MCP; citar URL ou `command:` no dialogue |
| **Execução de comandos** | Rodar shell, npm scripts, testes, graphify, taskboard — **não** apenas descrever | `--evidence "command:…"` com exit code |
| **MCPs Cursor** | open-knowledge, serena, code-review-graph, supermemory, playwright/chrome-devtools, context7 conforme [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) | `mcp:` / `tool:` na evidência |
| **Subagentes Task** | Trabalho não trivial → `Task` com `subagent_type` + pacote delegação | delegate-monitor + handoff |
| **Skills** | Ler `SKILL.md` quando existir skill para a tarefa | path da skill no ack/status |
| **Rules** | Respeitar `.cursor/rules/` e AGENTS.md — não bypass | compliance pre-work exit 0 |

---

## Pilha de capacidades do agente

\`\`\`mermaid
flowchart TB
  subgraph Cursor["Recursos Cursor"]
    RULES[Rules .cursor/rules]
    SKILLS[Skills SKILL.md]
    TASK[Task subagentes]
    MCP[MCPs habilitados]
  end
  subgraph Exec["Execução"]
    SHELL[Shell / npm / testes]
    GF[graphify / taskboard CLI]
  end
  subgraph Research["Pesquisa e RAG"]
    NET[Internet WebSearch/Fetch]
    C7[context7 docs]
    OKF[open-knowledge brain/]
    SM[supermemory recall]
  end
  subgraph Gates["Governança — não relaxa capacidades"]
    TB[Taskboard claim ANX-*]
    COMP[orchestration:compliance]
    SEC[Secrets / sandbox G5 / no prod destrutivo]
  end
  RULES --> COMP
  SKILLS --> SHELL
  TASK --> SHELL
  MCP --> OKF
  MCP --> GF
  NET --> OKF
  C7 --> NET
  SM --> OKF
  SHELL --> COMP
  TB --> COMP
  SEC --> COMP
\`\`\`

---

## Internet e RAG

### Quando usar

- Versão de biblioteca, API ou flag não confirmada no lockfile/docs locais
- Comportamento de vendor (Better Auth, Drizzle, Elysia, Neo4j, etc.)
- Comparar alternativas ou validar breaking changes
- Pesquisa para `brain/` com fontes rastreáveis

### Ordem recomendada

1. `brain/` via **open-knowledge MCP** (fonte institucional local)
2. **supermemory_search** (`workspaceRoot` absoluto) em retomadas
3. **graphify** / **code-review-graph** para código indexado
4. **context7** ou **WebSearch** / **WebFetch** para docs oficiais externas
5. Registrar URL ou comando na issue/dialogue

### Proibido

- Afirmar versão/comportamento externo sem fonte citada
- Substituir `brain/` aceito por blog genérico sem registrar conflito
- Dizer "não tenho acesso à internet" quando o runtime Cursor permite rede

---

## Execução de comandos

Agentes **devem executar** para verificar — não entregar só instruções ao @Owner.

| Situação | Comando típico |
| --- | --- |
| Board | `npm run taskboard:ensure` |
| Compliance | `npm run orchestration:compliance -- --pre-work …` |
| Testes | `bun test`, `npm run orchestration:test` |
| Exploração | `graphify query "…"` |
| Verify framework | `npm run orchestration:verify` |

**BAD:** "Execute `npm test` para validar."

**GOOD:** Rodar o comando, reportar exit code e colar saída relevante em `--evidence "command:npm test → exit 0"`.

---

## MCPs e recursos Cursor

Descoberta: `GetDynamicTools` → invocação: `CallDynamicTool`.

| MCP | Uso obrigatório quando |
| --- | --- |
| open-knowledge | Qualquer path `brain/` |
| serena | Edição estrutural de símbolos |
| code-review-graph | Review G2 / impacto |
| supermemory | Turno substantivo / retomada |
| context7 | Docs de biblioteca atualizadas |
| chrome-devtools / playwright | Após mudança em `frontend/` |

Delegação: incluir [SUBAGENT-PROMPT-TOOLING.md](./templates/SUBAGENT-PROMPT-TOOLING.md) + bloco **capacidades completas** em todo `Task`.

---

## Limites de segurança (permanecem)

Capacidades completas **não** suspendem:

| Limite | Regra |
| --- | --- |
| Secrets | Nunca em git, events, DTOs — Z9 |
| Produção | Sem ops destrutivas sem autorização explícita |
| Red Team G5 | Somente sandbox/fixtures autorizados |
| Taskboard | Z0 — sem claim, sem código |
| `brain/` | Somente open-knowledge MCP para escrita OKF |

---

## Checklist — início de sessão (todo agente)

1. `AGENTS.md` + `npm run taskboard:ensure` + claim `ANX-*`
2. `orchestration:compliance --pre-work` + ack no dialogue
3. Ativar capacidades: graphify/supermemory/brain MCP; **internet** se fato externo; **executar** comandos de verificação (não descrever-only)

---

## Evidência no dialogue

\`\`\`bash
npm run orchestration:broadcast -- \
  --from-persona backend-executor --type status \
  --issue ANX-N --gate G1 \
  --body "Validado com comandos e docs oficiais." \
  --evidence "command:bun test exit 0,tool:WebFetch,url:https://elysiajs.com,mcp:open-knowledge,file:.cursor/orchestration/AGENT-CAPABILITIES.md"
\`\`\`

---

## Verificação

\`\`\`bash
npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG
npm run orchestration:zero-policies   # inclui Z19
npm run orchestration:verify
\`\`\`

**Última atualização:** 2026-09-09 · ANX-249
