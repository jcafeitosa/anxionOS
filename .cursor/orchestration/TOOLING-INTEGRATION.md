# Integração de ferramentas — orquestração anxionOS

Documento mestre: **quando** cada ferramenta habilitada no workspace é obrigatória, **quem** deve usá-la e **como** registrar evidência nos gates G0–G7.

> **Nota:** o Owner citou "anchfy" — o nome correto é **Archify** (diagramas de arquitetura). Este documento usa Archify em todo o texto.

**Relacionados:** [AGENT-CAPABILITIES.md](./AGENT-CAPABILITIES.md) · [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) · [SKILLS-TOOLS-MCP-REGISTRY.md](./SKILLS-TOOLS-MCP-REGISTRY.md) · [GUIDELINES-INTEGRATION.md](./GUIDELINES-INTEGRATION.md) · [COMPLIANCE.md](./COMPLIANCE.md) · [AGNOSTIC-DESIGN.md](./AGNOSTIC-DESIGN.md) · [MANDATORY-COMPLIANCE.md](./MANDATORY-COMPLIANCE.md) · regra [tooling-mandatory.mdc](../rules/tooling-mandatory.mdc) · template [SUBAGENT-PROMPT-TOOLING.md](./templates/SUBAGENT-PROMPT-TOOLING.md)

---

## Matriz ferramenta × quando × persona × gate × comando

| Ferramenta | Quando (obrigatório) | Persona(s) | Gate | Comando / MCP |
| --- | --- | --- | --- | --- |
| **graphify** | Antes de Grep/Glob/Read em massa no código; após editar código | Todos executores, críticos, G2 | G0.8, G0.14, G1 | `graphify query "…"`, `graphify path A B`, `graphify explain "…"`, `npm run graphify:index`, `graphify update .` |
| **serena** (MCP) | Edição em nível de símbolo, rename, find references | Executores, G2 | G0.14, G1–G2 | `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`, `rename_symbol` |
| **archify** | Comunicação de arquitetura, fase P2, handoffs visuais | Marcus, Renata, André | P2, G0.10 | `npm run archify:validate`, `npm run archify:build` |
| **open-knowledge** | Qualquer leitura/escrita em `brain/` | Todos; André, Helena, Marcus | G0.6, G0.14 | MCP `search`, `exec`, `write`, `edit` — **nunca** Read/Grep/Write nativos em `brain/` |
| **orchestration:brain** | Staging reflect + instruções OKF search | Executores, críticos | G0, G1, G7 | `npm run orchestration:brain -- search|reflect|lessons` · [OPENKNOWLEDGE-BRAIN.md](./OPENKNOWLEDGE-BRAIN.md) |
| **code-review-graph** | Análise de impacto, review G2 | Fernanda, críticos | G2 | `semantic_search_nodes_tool`, `get_impact_radius_tool`, `detect_changes_tool`, `get_review_context_tool` |
| **orchestration:compliance** | Antes de codar; fim de turno | Todos | G0.12 | `npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG` |
| **orchestration:who** | Antes de trabalho cross-domain | Todos | G0.11 | `npm run orchestration:who -- --persona SLUG --can-i "ação"` |
| **Supermemory** | Recall de contexto de sessões anteriores | Todos (início de turno substantivo) | G0 | `supermemory_search` com `workspaceRoot` absoluto |
| **Chrome DevTools MCP** | Após alteração em `frontend/` | Camila, Paulo, Edu | G1, G3 | MCP chrome-devtools |
| **agent-compatibility** (ECC) | Gate opcional de portabilidade do framework; antes de `install-global` ou release | Renata, André, Ju | G0 (opcional), CI | `npx -y agent-compatibility@latest --json <framework-root>` |
| **karpathy-guidelines** | Escrever/revisar código; diagramas com propósito (não decoração) | Todos executores, críticos, G2 | G0–G1, G2 | skill `karpathy-guidelines` · [GUIDELINES-INTEGRATION.md](./GUIDELINES-INTEGRATION.md) |
| **ui-ux-pro-max** | UI/UX em `frontend/` (consoles P07) | Camila, Paulo, Edu | G1, G3 | skill `ui-ux-pro-max` · [workflow-frontend-executor.md](./workflows/workflow-frontend-executor.md) |
| **Internet / RAG** | Fato externo (versão API, vendor, breaking change) não em `brain/` ou código | Todos | G0, G1 | `WebSearch`, `WebFetch`, context7 MCP — citar URL; ver [AGENT-CAPABILITIES.md](./AGENT-CAPABILITIES.md) |
| **Dashi Taskboard (Cursor)** | Claims, comentários e moves assinados por persona | Todos executores | G0.5, G1 | `npm run taskboard:cursor-start`, `orchestration:taskboard --persona` · [CURSOR-TASKBOARD-INTEGRATION.md](./CURSOR-TASKBOARD-INTEGRATION.md) |
| **Shell / CLI** | Verificação, testes, taskboard, graphify — **executar**, não describe-only | Todos executores | G0, G1 | `command:` em `--evidence`; warn `CAPABILITIES_UNDERUSED` |
| **9Router** | Endpoint OpenAI-compatible local para Cursor/CLI (LLM externo ao IDE) | Todos (quando Owner habilita) | G0 | `NINEROUTER_BASE_URL`, `OPENAI_API_KEY` · [9ROUTER-INTEGRATION.md](./9ROUTER-INTEGRATION.md) |

---

## Árvore de decisão — qual ferramenta usar?

```mermaid
flowchart TD
  START([Nova tarefa técnica]) --> BRAIN{Escopo em brain/?}
  BRAIN -->|sim| OKF[open-knowledge MCP]
  BRAIN -->|não| EXPLORE{Preciso explorar código?}
  EXPLORE -->|sim| GF[graphify query / path / explain]
  EXPLORE -->|não| STRUCT{Edição estrutural símbolo?}
  GF --> READ{Preciso linhas exatas?}
  READ -->|sim| RG[Read/Grep pontual após graphify]
  READ -->|não| DONE([Prosseguir com contexto])
  STRUCT -->|sim| SER[serena MCP find_symbol / replace]
  STRUCT -->|não| ARCH{Arquitetura / P2 / handoff visual?}
  ARCH -->|sim| AR[archify validate + build]
  ARCH -->|não| REVIEW{Review G2 / impacto?}
  REVIEW -->|sim| CRG[code-review-graph MCP]
  REVIEW -->|não| DONE
  OKF --> DONE
  SER --> GFUPD[graphify update . após diff]
  RG --> GFUPD
  GFUPD --> DONE
  AR --> DONE
  CRG --> DONE
```

**Regra de ouro:** se a pergunta é "onde está X no código?" ou "quem chama Y?" → **graphify primeiro**. Grep/Glob/Read em massa **sem** graphify = violação G0.14.

---

## Gate G0.14 — checklist tooling

| # | Item | Evidência |
| --- | --- | --- |
| 1 | `graphify query` antes de exploração em massa (se índice existe) | `command:graphify query "…"` |
| 2 | serena para edições estruturais (se MCP ativo) | `mcp:serena:find_symbol` ou nota de fallback |
| 3 | open-knowledge para `brain/` | path `brain/…` no pacote G0 |
| 4 | archify em entregas P2 / diagramas institucionais | `command:npm run archify:validate` |
| 5 | Subagentes recebem SUBAGENT-PROMPT-TOOLING.md | Prompt Task/delegation |
| 6 | `orchestration:compliance --pre-work` exit 0 | CLI |
| 7 | Supermemory em retomada de sessão | `supermemory_search` quando aplicável |
| 8 | Capacidades completas (internet, shell, MCPs) | [AGENT-CAPABILITIES.md](./AGENT-CAPABILITIES.md); evidência no dialogue |

Detalhes em [COMPLIANCE.md](./COMPLIANCE.md).

---

## Evidência no dialogue

```bash
npm run orchestration:broadcast -- \
  --from-persona backend-executor --type handoff \
  --issue ANX-N --gate G1 \
  --body "Handoff com tooling documentado." \
  --evidence "tool:graphify,command:graphify query \"checkout flow\",tool:serena,mcp:find_symbol,file:.cursor/orchestration/TOOLING-INTEGRATION.md"
```

---

## Gate opcional — ECC agent-compatibility (portabilidade)

Scan **agnóstico** do framework Cursor: mede quão bem outro agente consegue navegar, validar e documentar o repositório **sem** conhecimento prévio do projeto.

| Quando | Quem | Critério sugerido |
| --- | --- | --- |
| Antes de `npm run orchestration:install-global` | Renata / André | Score ≥ 70/100; top fixes documentados ou resolvidos |
| Release framework (`VERSION` bump) | Ju + André | Scan repetido; delta registrado no dialogue |
| Onboarding novo projeto (`orchestration init`) | Orquestrador | Comparar score framework vs overlay do projeto |

### Comando

```bash
# A partir da raiz do repo que contém .cursor/orchestration/
npx -y agent-compatibility@latest --json .cursor/orchestration

# Ou após install-global (framework em ~/.cursor/orchestration)
npx -y agent-compatibility@latest --json ~/.cursor/orchestration
```

### Interpretação

| Faixa | Ação |
| --- | --- |
| **≥ 80** | Portabilidade boa — prosseguir install-global |
| **70–79** | Aceitável com fricção — registrar top fixes em issue framework |
| **< 70** | Bloquear release até corrigir paths, docs de bootstrap ou scripts de verify |

O scan **não** substitui `npm run orchestration:verify` (testes determinísticos 73/73). Complementa: verify = contrato interno; ECC = experiência de agente externo.

Skill ECC: `check-agent-compatibility` (plugin agent-compatibility). Subagentes: `compatibility-scan-review`, `startup-review`, `validation-review`, `docs-reliability-review`.

Evidência no dialogue:

```bash
npm run orchestration:broadcast -- \
  --from-persona orchestrator --type share --issue ANX-N --gate G0 \
  --body "ECC scan framework — score e top fixes." \
  --evidence "command:npx -y agent-compatibility@latest --json .cursor/orchestration,skill:check-agent-compatibility"
```

---

## Verificação

```bash
npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG
npm run graphify:check
npm run archify:validate
npm run orchestration:test
# Opcional — portabilidade framework
npx -y agent-compatibility@latest --json .cursor/orchestration
```

Ver [AGNOSTIC-DESIGN.md](./AGNOSTIC-DESIGN.md) para instalação global do framework.

**Última atualização:** 2026-09-09 · ANX-249 · capacidades completas (internet, shell, MCPs)
