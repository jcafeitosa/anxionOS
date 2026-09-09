# Compliance — AGENTS.md + OpenKnowledge

Gates obrigatórios para **toda** persona e agente da orquestração anxionOS. Este documento **estende** [AGENTS.md](../../AGENTS.md); não substitui nem relaxa regras canônicas.

**Relacionados:** [CTO-AUTHORITY.md](./CTO-AUTHORITY.md) · [VISUAL-DOCUMENTATION.md](./VISUAL-DOCUMENTATION.md) · [ONBOARDING.md](./ONBOARDING.md) · [RUNBOOK.md](./RUNBOOK.md) · [PIPELINE.md](./PIPELINE.md) · [DELEGATION.md](./DELEGATION.md) · [COLLECTIVE-WORKFLOW.md](./COLLECTIVE-WORKFLOW.md) · regra Cursor [workflow-compliance.mdc](../rules/workflow-compliance.mdc) · skill `open-knowledge`

---

## Escopo — equipe Cursor vs agentes do produto (G0.1)

**Obrigatório no G0:** distinguir documentação de orquestração Cursor da documentação de agentes do produto.

| Camada | Onde ler | Quando |
| --- | --- | --- |
| **Equipe Cursor** | [SCOPE.md](./SCOPE.md), [PERSONAS.md](./PERSONAS.md), [HIERARCHY.md](./HIERARCHY.md) | Hire, dialogue, pipeline G0–G7, claims `ANX-*` |
| **Agentes do produto** | [brain/project-docs/specs/002-agents-knowledge/spec.md](../../brain/project-docs/specs/002-agents-knowledge/spec.md), `backend/modules/agents/` | Runtime, grafo Neo4j, registry institucional |

Personas (Renata, Lucas, Marina…) **não** são agentes institucionais do anxionOS. Regras de `orchestration:hire` e `dialogue.jsonl` governam **desenvolvimento no repositório** — não execução em produção.

---

## Sequência de gates (antes de qualquer trabalho técnico)

| Gate | O quê | Quem | Evidência |
| --- | --- | --- | --- |
| **G0** | Ler [AGENTS.md](../../AGENTS.md) integralmente | Todos | Confirmação implícita ao iniciar sessão; orquestrador verifica em dispatch |
| **G0.1** | Ler [SCOPE.md](./SCOPE.md) — equipe Cursor ≠ agentes do produto | Todos | Não confundir personas com `backend/modules/agents/` nem registry runtime |
| **G0.5** | `npm run taskboard:ensure` + claim `ANX-*` em `in_progress` | Executores, orquestrador | Issue com `threadBinding`; `ensure` exit 0 |
| **G0.6** | OpenKnowledge: buscar contexto em `brain/` para a issue | Executores, research, docs, architect | `search` / `exec("cat …")` via MCP; paths citados |
| **G0.7** | Pacote de contexto rastreável (antes de código) | Executor | Comentário na issue com fonte, capability, owner, oráculos |
| **G0.8** | `graphify query` antes de exploração em massa | Executores | Comentário ou evidence `command:graphify query "…"` |
| **G0.12** | `npm run orchestration:compliance -- --pre-work` | Todos antes de codar | Exit 0; violações = abortar · [MANDATORY-COMPLIANCE.md](./MANDATORY-COMPLIANCE.md) |
| **G0.13** | Verificar fase lifecycle P0–P7 | Todos em projeto novo | `npm run orchestration:phase -- status --issue ANX-N`; P1+ exige spec em `brain/` antes de código · [LIFECYCLE.md](./LIFECYCLE.md) |
| **G0.15** | Agentes Cursor + skills/MCP | Orquestrador, executores, subagentes Task | Delegar via `Task` com `subagent_type`; ler skills aplicáveis; MCP via `GetDynamicTools` · [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) · regra `cursor-agents-orchestration.mdc` |

**Board offline:** abortar trabalho técnico; pedir ao usuário subir o taskboard. Sem exceção.

---

## OpenKnowledge — quando ler e quando escrever

### Ler (`brain/`)

| Momento | Ação MCP | Paths típicos |
| --- | --- | --- |
| Início de issue | `search({ query })` + `exec("cat …")` | `brain/index.md`, spec do domínio, ADR aplicável |
| Antes de implementar | Pacote G0 com links `brain/…` | `brain/notes/anxionos-backend-structure.md`, specs em `brain/project-docs/specs/` |
| Debate arquitetural | `consult` → busca OKF | ADRs em `brain/project-docs/decisions/` |
| Spike / pesquisa | `research` → ingest + `share` | `brain/research/`, notas com `status: provisional` |

**Regra:** fatos não documentados em `brain/` ou `docs/` → registrar lacuna na issue ou perguntar; **não inventar** stack, vendors ou comportamento.

### Escrever (`brain/`)

| Momento | Ferramenta | Requisitos |
| --- | --- | --- |
| ADR, spec, nota de decisão | `write` / `edit` via MCP `user-open-knowledge` | Frontmatter OKF (`title`, `description`, `tags`); `status: accepted` vs `proposed` vs `draft` |
| Handoff documental | André (docs) ou executor autorizado | Template da pasta; `summary` ≤80 chars em cada write |
| Pesquisa durável | `research-with-sources` skill | Fontes ingeridas; citação local, não URL inline no corpo |

**STOP:** nunca usar `Read`/`Grep`/`Write` nativos em `.md` dentro de `brain/` quando o MCP OpenKnowledge estiver disponível — ver skill [open-knowledge](../../.cursor/skills/open-knowledge/SKILL.md).

### Docs públicas vs `brain/`

| Destino | Ferramenta | Exemplo |
| --- | --- | --- |
| `brain/` (local, não versionado) | OpenKnowledge MCP | ADRs, specs, notas operacionais |
| `docs/`, `README`, `AGENTS.md` | Git + issue `ANX-*` | Documentação pública do repositório |

Não duplicar conteúdo canônico: linkar a fonte em `brain/` e atualizar a superfície pública só quando a issue autorizar.

---

## Mapeamento AGENTS.md → papéis da orquestração

| Seção AGENTS.md | Quem deve obedecer | Evidência obrigatória |
| --- | --- | --- |
| Gate leitura AGENTS.md | Todos | Dispatch inclui "Read AGENTS.md"; [ONBOARDING.md](./ONBOARDING.md) no primeiro dia |
| Dashi Taskboard (zero-trabalho-fora-do-board) | Orquestrador, executores | `taskboard:ensure`; claim versionado; status em tempo real |
| Graphify antes de explore | Todos os executores | `graphify query` em comentário da issue ou `--evidence command:graphify query "…"` |
| Rastreabilidade `brain/` | Executor antes de código | Pacote contexto no comentário G0 (fonte, status decisório, capability, módulo, oráculos) |
| Tolerância zero (código incompleto, TODO sem issue, mocks em prod) | Executor + crítico G1 | Grep no diff antes de `in_review`; crítico bloqueia sem disposição |
| Pipeline G0–G7 | Equipes especialistas G2–G5, orquestrador G6 | `verdict` no dialogue com `gate` e `evidence[]` |
| OpenKnowledge MCP | Docs (André), research (Helena), ADR/spec (Marcus) | Write com frontmatter; path `brain/…` em `share` ou handoff |
| Personas e colaboração | Todos no dialogue | Persona nomeada; tipos em [INTERACTIONS.md](./INTERACTIONS.md) |
| Armazenamento / ADR0004 | Backend executor | Citação de ADR em pacote G0 |
| Frontend stack | Frontend executor | Astro + islands; DevTools após alteração UI |

---

## Checklist por papel (resumo)

Cada papel em [TEAM.md](./TEAM.md) e [PERSONAS.md](./PERSONAS.md) carrega:

**Obrigatório:** AGENTS.md lido · taskboard online · issue claimada (executores) · OpenKnowledge quando o escopo tocar `brain/`.

| Papel | OKF obrigatório quando |
| --- | --- |
| Orquestrador (Renata) | Verificar G0/G0.5 em todo dispatch |
| Executores | Pacote G0 com paths `brain/` antes de código |
| Críticos | Validar zero-tolerância e rastreabilidade no handoff G1 |
| G2–G5 | Verdict com evidência rastreável ao digest da issue |
| André (docs) | Writes em `brain/` só via MCP; docs públicas via git |
| Helena (research) | Ingest + `share` com paths locais |
| Marcus (architect) | `consult`/`debate` citando ADR/spec em `brain/` |

---

## Proibido (violação = trabalho inválido)

1. Trabalho técnico sem ter lido AGENTS.md na sessão.
2. Código, commit ou docs públicas sem issue `ANX-*` claimada (`in_progress`).
3. Continuar com board offline (`taskboard:ensure` falhou).
4. Inventar fatos não presentes em `brain/`, `docs/` ou código verificável.
5. Exploração em massa com Grep/Glob/Read antes de `graphify query` (quando índice existe) — gate G0.14.
6. Edição estrutural sem serena MCP quando disponível (sem fallback documentado).
7. Escrever markdown em `brain/` com ferramentas nativas (bypass do CRDT OKF).
8. `in_review` sem evidência de comandos e sem revisão do crítico (G1).
9. `done` sem aceite G7 (CTO com evidências via [CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md) **ou** Owner em exceções).
10. PR sem `ANX-*` no título ou corpo.
11. Delegar subagente de código sem bloco [SUBAGENT-PROMPT-TOOLING.md](./templates/SUBAGENT-PROMPT-TOOLING.md).

---


## Competência e roster (G0.11)

| Requisito | Evidência |
| --- | --- |
| Conhecer roster | [AGENT-ROSTER.md](./AGENT-ROSTER.md) no onboarding |
| Verificar limite | `npm run orchestration:who -- --can-i "<ação>"` quando incerto |
| Sem invasão cross-domain | `consult` ao owner antes de editar módulo alheio (ADR0002) |
| @mention livre | [INTER-AGENT-PROTOCOL.md](./INTER-AGENT-PROTOCOL.md) |

Regra Cursor: `.cursor/rules/agent-boundaries.mdc`

## Documentação visual (G0.10)

| Requisito | Evidência |
| --- | --- |
| Planning G0 com flowchart | Comentário issue ou handoff com `diagram` |
| Handoff formal com sequenceDiagram | `--diagram` ou `<!-- diagram -->` no body |
| Verdict com stateDiagram | Campo `diagram` no broadcast |
| Política completa | [VISUAL-DOCUMENTATION.md](./VISUAL-DOCUMENTATION.md) |

Verificação: `npm run orchestration:diagram-check`

## No Silent Work (G0.9)

| Requisito | Evidência |
| --- | --- |
| Sessão registrada ao claimar issue | `npm run orchestration:session -- start --persona <slug> --issue ANX-N` |
| Broadcast nos marcos obrigatórios | Entradas em `.cursor/orchestration-runtime/dialogue/dialogue.jsonl` — 24 tipos em [INTERACTIONS.md](./INTERACTIONS.md) |
| Par crítico na thread | `criticSlug` em [PERSONAS.md](./PERSONAS.md) |
| Sem silêncio > 10 min | Cron `silence-watch` ou `status` manual |
| Fim de turno com código | `pending-broadcast.json` ou post antes de `stop` |

Detalhes: [NO-SILENT-WORK.md](./NO-SILENT-WORK.md) · regra Cursor `no-silent-work.mdc`.

## Compliance enforcement (G0.12)

| Requisito | Evidência |
| --- | --- |
| Pre-work gate | `npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG` exit 0 |
| Durante trabalho | `npm run orchestration:compliance -- --persona SLUG --issue ANX-N` |
| Fim de turno | `--pre-commit` pass **ou** `pending-broadcast.json` |
| Hook stop | `.cursor/hooks/agent-orchestration.mjs` |

Doc mestre: [MANDATORY-COMPLIANCE.md](./MANDATORY-COMPLIANCE.md) · regra `mandatory-orchestration.mdc`

**Violacoes → `npm run orchestration:compliance`**

---

## Integração com dialogue e taskboard

Handoffs (`handoff`, `verdict`, `share`) devem incluir `--evidence` referenciando:

- seção AGENTS.md aplicável (ex.: `file:AGENTS.md#tolerância-zero`), ou
- path `brain/…` (ex.: `file:brain/project-docs/decisions/0002-adopt-modular-backend-layout.md`), ou
- comando verificável (ex.: `command:npm run taskboard:ensure`).

O CLI `broadcast.mjs` emite **aviso suave** (stderr, não bloqueante) quando `handoff` ou `verdict` não traz evidence compatível — ver [RUNBOOK.md](./RUNBOOK.md).

---



## Cursor agents + skills/MCP (G0.15)

| Requisito | Evidência |
| --- | --- |
| Trabalho substancial via `Task` | Parent despacha com `subagent_type` de [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) |
| Pacote delegação | [templates/SUBAGENT-DELEGATION-PACKAGE.md](./templates/SUBAGENT-DELEGATION-PACKAGE.md) no prompt |
| Skills quando existirem | `manage-taskboard`, `orchestrate-work`, skill do gate (TDD, open-knowledge, …) |
| MCP discovery | `GetDynamicTools` + `CallDynamicTool`; open-knowledge para `brain/` |
| Hire → Task | Campo `cursorSubagentType` em hire on-demand · `getCursorSubagentType()` |

Registro: [SKILLS-TOOLS-MCP-REGISTRY.md](./SKILLS-TOOLS-MCP-REGISTRY.md)


## G7 — aceite delegado (CTO)

[AGENTS.md](../../AGENTS.md) exige aceite explícito para `done`. A orquestração **delega** ao CTO (Renata Oliveira) o G7 de slices de rotina quando:

1. `npm run orchestration:cto-accept -- --issue ANX-N` retorna **ACCEPT**
2. Pacote de evidências completo ([CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md))
3. Dialogue `approve` G7 + comentário taskboard + move `done` com thread binding

**Owner obrigatório** quando `cto-accept` retorna `ESCALATE_TO_OWNER` (Security/Red Team BLOCKED, conflito ADR, escopo, tolerância zero) ou quando o Owner revoga a delegação na sessão.

Não contradiz AGENTS.md: aceite explícito permanece — autoridade delegada ao CTO para evidências completas, registrada em dialogue e board.

## Relação com AGENTS.md

[AGENTS.md](../../AGENTS.md) é a **fonte canônica** do repositório. A pasta `.cursor/orchestration/` operacionaliza personas, dialogue, pipeline e runbooks **sem contradizer** AGENTS.md. Em conflito, AGENTS.md e ADRs `accepted` em `brain/` prevalecem; registrar divergência na issue antes de implementar.
