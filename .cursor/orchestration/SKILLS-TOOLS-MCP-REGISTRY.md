# Registro — skills, tools e MCP (workspace anxionOS)

Catálogo de capacidades disponíveis no Cursor para a equipe de orquestração. Atualizar quando novos plugins/skills forem adicionados.

**Relacionados:** [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) · [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) · [AGENTS.md](../../AGENTS.md)

---

## Skills locais (`.cursor/skills/`)

| Skill | Caminho | Quando invocar |
| --- | --- | --- |
| codebase-wiki | `.cursor/skills/codebase-wiki/` | Wiki / mapa do repositório |
| consolidate-notes | `.cursor/skills/consolidate-notes/` | Consolidar notas OKF |
| frame-a-proposal | `.cursor/skills/frame-a-proposal/` | P0 brainstorm, opções |
| knowledge-base | `.cursor/skills/knowledge-base/` | Estrutura OKF |
| note-taking | `.cursor/skills/note-taking/` | Notas operacionais |
| okf-knowledge-base | `.cursor/skills/okf-knowledge-base/` | Templates OKF |
| open-knowledge | `.cursor/skills/open-knowledge/` | **Obrigatório** para `brain/` |
| personal-crm | `.cursor/skills/personal-crm/` | CRM (fora escopo produto) |
| record-a-decision | `.cursor/skills/record-a-decision/` | ADRs P2 |
| research-with-sources | `.cursor/skills/research-with-sources/` | Pesquisa com fontes |
| review-a-design | `.cursor/skills/review-a-design/` | Review de design doc |
| software-lifecycle | `.cursor/skills/software-lifecycle/` | Fases P0–P7 |
| worldbuilding | `.cursor/skills/worldbuilding/` | Ficção / fora produto |
| write-a-postmortem | `.cursor/skills/write-a-postmortem/` | P7 pós-incidente |
| write-a-spec | `.cursor/skills/write-a-spec/` | Specs P1+ |
| writing-workflow | `.cursor/skills/writing-workflow/` | Fluxo de escrita OKF |

---

## Skills globais / plugins (referência AGENTS.md)

| Skill | Origem | Quando invocar |
| --- | --- | --- |
| manage-taskboard | `~/.claude/skills/` | **Obrigatório** — claims ANX-* |
| orchestrate-work | `~/.claude/skills/` | **Obrigatório** — dispatch multi-agente |
| karpathy-guidelines | plugin karpathy-skills | Simplicidade, diffs cirúrgicos |
| test-driven-development | superpowers | G1 implementação |
| systematic-debugging | superpowers | Debug estruturado |
| writing-plans / executing-plans | superpowers | Planos multi-step |
| dispatching-parallel-agents | superpowers | Paralelismo Task |
| verification-before-completion | cursor-team-kit | Antes de handoff G1/G3 |
| fix-ci / loop-on-ci | cursor-team-kit | CI vermelho |
| run-smoke-tests | cursor-team-kit | Smoke pós-change |
| requesting-code-review | superpowers | Handoff G2 |
| archify | `.agents/skills/archify/` | Diagramas P2 |
| context7-mcp | plugin context7 | Docs de libs |
| ui-ux-pro-max | plugin | **Somente** `frontend/` P07 |
| open-knowledge-discovery / write | AgentStores | OKF avançado |

---

## MCP namespaces (projeto)

| Namespace | Ferramentas principais | Obrigatório quando |
| --- | --- | --- |
| `user-open-knowledge` | exec, search, write, edit, lint | Qualquer `brain/` |
| `plugin-serena-serena` | find_symbol, replace_symbol_body, rename_symbol | Edição estrutural |
| `plugin-cursor-supermemory-supermemory` | supermemory_search, supermemory_add | Retomada sessão |
| `plugin-context7-context7` | resolve-library-id, query-docs | Docs API/libs |
| `plugin-playwright-playwright` | browser_* | E2E G3 |
| `plugin-chrome-devtools-mcp-chrome-devtools` | navigate_page, take_snapshot | UI frontend |
| `plugin-ecc-chrome-devtools` | *(alternativo DevTools)* | Fallback UI |
| `plugin-shadcn-shadcn` | search_items_in_registries | Componentes shadcn |
| `cursor` | GenerateImage | Assets quando autorizado |

Descoberta: `GetDynamicTools` · invocação: `CallDynamicTool`.

---

## CLI / tools nativas Cursor

| Tool / CLI | Gate | Persona |
| --- | --- | --- |
| `graphify query` | G0.8, G0.14 | Executores, críticos |
| `npm run taskboard:ensure` | G0.5 | Todos |
| `npm run orchestration:compliance` | G0.12, G0.15 | Todos |
| `npm run orchestration:hire` | Hire | B, C, A |
| `npm run orchestration:broadcast` | G0.9 | Todos |
| `npm run archify:validate` | P2, G0.10 | Marcus, André |
| code-review-graph MCP | G2 | Fernanda |

---

## Matriz capacidade × recurso × invocação

| Capacidade | Skill / MCP / subagent | Invocar quando |
| --- | --- | --- |
| Claim issue | skill `manage-taskboard` | Início de todo trabalho |
| Dispatch equipe | skill `orchestrate-work` | Renata G0/G6 |
| Explorar código | graphify CLI → `explore` subagent | Antes de Grep em massa |
| Implementar feature | `generalPurpose` + TDD skill | G1 executor |
| Revisar código G2 | `code-reviewer` subagent | Pós G1 PASS |
| Segurança G4 | `security-review` subagent | Auth, secrets, tenancy |
| QA / E2E G3 | `e2e-runner` + Playwright MCP | Oráculos da issue |
| Editar símbolo TS | serena MCP | Refactor localizado |
| Escrever ADR | open-knowledge MCP + `record-a-decision` | P2 |
| Build quebrado | `build-error-resolver` subagent | tsc/bun fail |
| Crítico G1 | `critic-reviewer` subagent | Handoff executor |
| Diagrama institucional | archify skill + CLI | Handoff P2/G0.10 |

---

## Manutenção deste registro

1. Novo skill em `.cursor/skills/` → adicionar linha na tabela local.
2. Novo plugin MCP → rodar `GetDynamicTools` e documentar namespace.
3. Cross-check com [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) — evitar duplicar política; este arquivo é **inventário**, TOOLING-INTEGRATION é **obrigatoriedade**.

**Gerado/atualizado:** 2026-09-09 · ANX-134
