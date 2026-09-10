# Onboarding — primeiro dia do agente

Sequência obrigatória para qualquer persona nova na orquestração anxionOS. Complementa [COMPLIANCE.md](./COMPLIANCE.md) e [AGENTS.md](../../AGENTS.md).

---

## Quick start (5 min)

Fluxo mínimo antes do primeiro claim. Detalhes em [RUNBOOK.md](./RUNBOOK.md) e [START-WORK.md](./START-WORK.md).

| # | Passo | Comando / doc |
| --- | --- | --- |
| 1 | **Escopo** — equipe Cursor ≠ produto | Ler [SCOPE.md](./SCOPE.md) |
| 1b | **Boot framework** | `npm run orchestration:boot -- --persona <slug>` |
| 2 | **Prework** — board online + issue | `npm run taskboard:prework` |
| 3 | **Sessão** — binding persona + issue | `npm run orchestration:session -- start --persona <slug> --issue ANX-N` |
| 4 | **Sync** — estado do workflow | `npm run orchestration:workflow -- sync --persona <slug> --issue ANX-N` |
| 5 | **Compliance G0.12** | `npm run orchestration:compliance -- --pre-work --issue ANX-N --persona <slug>` |
| 6 | **Ack** — primeiro post no dialogue | `npm run orchestration:broadcast -- --from-persona <slug> --type ack --issue ANX-N --body "..." --evidence "cmd:..."` |
| 7 | **Lifecycle** — fase do projeto | `npm run orchestration:phase -- status --issue ANX-N` · [LIFECYCLE.md](./LIFECYCLE.md) |
| 8 | **Tooling G0.14** — graphify, serena, archify, MCPs | Ler [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md); `graphify query "…"` antes de explorar código |

**Level C (executores + críticos):** ao abrir sessão, rodar `npm run orchestration:workflow -- monitor --level C`.

**Próximo:** sequência completa do Dia 1 abaixo (AGENTS.md, brain/, claim com pacote G0).

---

## Dia 1 — ordem fixa (sem atalhos)

### 1. Ler AGENTS.md (arquivo inteiro)

- Caminho: [AGENTS.md](../../AGENTS.md)
- Objetivo: gates taskboard, graphify, `brain/`, zero-tolerância, pipeline G0–G7, MCP
- **Não** codar nem editar docs públicas antes deste passo

### 1b. Ler SCOPE.md — fronteira equipe Cursor vs produto

- Caminho: [SCOPE.md](./SCOPE.md)
- Objetivo: não confundir personas de orquestração (Renata, Lucas…) com agentes institucionais do produto (`backend/modules/agents/`, spec [002-agents-knowledge](../../brain/project-docs/specs/002-agents-knowledge/spec.md))
- **Equipe Cursor:** dialogue, hire, G0–G7, taskboard
- **Agentes do produto:** runtime, grafo Neo4j, registry em produção

### 2. Ler `brain/index.md` via OpenKnowledge MCP

```text
# Via MCP user-open-knowledge (não Read nativo em brain/)
search({ query: "índice anxionOS" })
exec("cat brain/index.md")
```

- Confirmar que `brain/` está disponível localmente (não versionado no GitHub)
- Se MCP indisponível: informar usuário; modo consulta apenas até OKF conectar

### 3. Ler runbook de orquestração

- [RUNBOOK.md](./RUNBOOK.md) — comandos dialogue, broadcast, espelhamento taskboard
- [TEAM.md](./TEAM.md) + [PERSONAS.md](./PERSONAS.md) — seu papel e par crítico
- [COMPLIANCE.md](./COMPLIANCE.md) — gates G0–G0.8 (inclui G0.1 escopo Cursor vs produto)
- [SCOPE.md](./SCOPE.md) — fronteira equipe Cursor vs agentes do produto
- [VISUAL-DOCUMENTATION.md](./VISUAL-DOCUMENTATION.md) — diagramas obrigatórios em planning/handoffs

### 4. Verificar taskboard

```bash
npm run taskboard:ensure    # falhou = PARAR
npm run taskboard:context
npm run taskboard:list
```

### 5. Claim de issue com pacote de rastreabilidade

Antes de qualquer alteração técnica:

1. Buscar duplicatas no board
2. Mover issue para `in_progress` com binding de thread (`manage-taskboard`)
3. Comentar **pacote de contexto** conforme AGENTS.md:

```yaml
issue: ANX-XXX
source: brain/project-docs/specs/... ou brain/project-docs/decisions/...
decisionStatus: accepted | proposed | draft
capability: nome-da-capability
owner: modulo-backend
layer: application | domain | infrastructure
filesPlanned: [caminhos previstos]
storage: PostgreSQL | Neo4j | ...
events: [eventos de domínio]
oracles: [comandos de verificação]
```

4. `graphify query "<pergunta sobre o escopo>"` — registrar na issue

---

## Dia 2+ — rotina de sessão

Ver checklist em [RUNBOOK.md](./RUNBOOK.md#checklist-de-abertura-de-sessão).

| Passo | Comando / ação |
| --- | --- |
| AGENTS.md | Releitura se sessão nova ou escopo mudou |
| Taskboard | `npm run taskboard:ensure` |
| Tooling | `graphify query "…"` antes de Grep/Glob/Read; serena para símbolos; [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) |
| Contexto issue | `node scripts/taskboard.mjs get ANX-N` |
| brain/ | OpenKnowledge `search` para spec/ADR da issue |
| Diálogo no chat | `npm run orchestration:chat -- --issue ANX-N` (colar saída completa) |
| Falar como persona | `npm run orchestration:speak -- --persona <slug> --body "..." --issue ANX-N` · [CHAT-PARTICIPATION.md](./CHAT-PARTICIPATION.md) |

---

## Papéis e leituras adicionais

| Papel | Ler também |
| --- | --- |
| Executor backend | `brain/notes/anxionos-backend-structure.md`, spec do domínio |
| Executor frontend | `docs/design-system/`, spec P07 |
| Crítico | [INTERACTIONS.md](./INTERACTIONS.md) — `challenge` → `response` → `verdict` |
| Orquestrador | [DELEGATION.md](./DELEGATION.md), [PIPELINE.md](./PIPELINE.md) |
| Docs / research | skill `open-knowledge`, `research-with-sources` |
| Architect | ADRs em `brain/project-docs/decisions/` |


## Ver diálogo no chat do Cursor

1. `npm run orchestration:chat` — últimas 10 mensagens formatadas para este chat.
2. O assistente **cola a saída inteira** (desde `<!-- CURSOR_CHAT_DIALOGUE:` até o fim).
3. Após broadcast ou speak: `npm run orchestration:chat -- --check-pending`.
4. Multi-agente: blocos por persona — regra `agents-in-chat.mdc`.
4. Regra: `.cursor/rules/dialogue-in-cursor-chat.mdc` (alwaysApply).

---
## Verificação de onboarding completo

- [ ] AGENTS.md lido
- [ ] [SCOPE.md](./SCOPE.md) lido — fronteira Cursor vs produto
- [ ] `brain/index.md` acessado via MCP
- [ ] RUNBOOK + COMPLIANCE lidos
- [ ] `taskboard:ensure` passou
- [ ] Issue `ANX-*` em `in_progress` com pacote G0 na issue
- [ ] Persona identificada no dialogue (`--from-persona`)
- [ ] Roster consultado (`orchestration:who`)
- [ ] `orchestration:compliance --pre-work` exit 0
- [ ] [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) lido — graphify, serena, archify, MCPs
- [ ] `graphify query` executado para escopo da issue (ou `npm run graphify:index` se índice ausente)

**Próximo passo:** executar escopo **somente** da issue claimada; handoff ao crítico com evidência.
