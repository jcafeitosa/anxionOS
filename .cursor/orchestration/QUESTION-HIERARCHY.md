---
type: orchestration-protocol
title: Protocolo hierárquico de Q&A
status: active
taskboard_issue: ANX-248
---

# QUESTION-HIERARCHY — Q&A hierárquico com evidência

Perguntas do @Owner **seguem a hierarquia da equipe**: quem responde é o **líder do domínio** ou a **persona @mentionada** — nunca o coordenador fazendo proxy técnico sem evidência.

**Relacionados:** [HIERARCHY.md](./HIERARCHY.md) · [INTER-AGENT-PROTOCOL.md](./INTER-AGENT-PROTOCOL.md) · [COMPETENCE-BOUNDARIES.md](./COMPETENCE-BOUNDARIES.md) · [CHAT-PARTICIPATION.md](./CHAT-PARTICIPATION.md) · [PERSONA-VOICE.md](./PERSONA-VOICE.md)

---

## Fluxo — @Owner pergunta → quem responde

```mermaid
flowchart TD
  Q["@Owner faz pergunta"] --> M{@mention<br/>de persona?}
  M -->|Sim| T["Persona citada responde<br/>em 1ª pessoa + evidência"]
  M -->|Não| D{Tipo da pergunta?}
  D -->|Governança / G7 / hire| N["Renata roteia + Cláudia<br/>cross-check se CTO"]
  D -->|Arquitetura ADR| A["Renata roteia → Marcus consult"]
  D -->|Gate G2–G5| B["Lead do gate responde<br/>Fernanda · Edu · Isa · Thiago"]
  D -->|CI / PR / GitHub| J["Ju responde"]
  D -->|Docs públicas| AD["André responde"]
  D -->|Implementação domínio| C["Executor Level C + crítico<br/>Lucas · Camila · Rafael · Diego"]
  T --> E{Evidência<br/>verificável?}
  B --> E
  C --> E
  J --> E
  AD --> E
  A --> E
  E -->|Sim| OK["Resposta com command:/file:/issue:"]
  E -->|Não| NV["Persona declara não verificado<br/>+ comando que provaria"]
  N --> R["Renata só roteia —<br/>não proxy técnico"]
  R --> T
  R --> B
  R --> C
```

---

## Regras obrigatórias

| # | Regra | Detalhe |
| --- | --- | --- |
| 1 | **@mention primeiro** | Persona citada responde em 1ª pessoa; Renata **não** resume técnico no lugar dela |
| 2 | **Level B — domínio de gate** | Fernanda=G2 · Edu=G3 · Isa=G4 · Thiago=G5 · Ju=GitHub/CI · André=docs |
| 3 | **Level C — par executor+critic** | Pergunta ao executor → executor responde; crítico pareado pode **cross-check** com evidência própria |
| 4 | **Renata roteia** | Coordena turno, @mention, handoff — **não** responde como expert sem delegar |
| 5 | **Cláudia — governança** | Exceções CTO, hires, bypass de gate, completude G6/G7 |
| 6 | **Evidência obrigatória** | Toda resposta inclui `--evidence` ou inline `command:` / `file:` / `issue:` |
| 7 | **Sem evidência** | Persona diz **"não verificado"** + qual comando/path provaria |
| 8 | **Proibido** | Monólogo do coordenador respondendo técnico sem handoff nem bloco de evidência |

---

## Mapa pergunta → respondente

| Tema | Respondente primário | Nível | Crítico / cross-check |
| --- | --- | --- | --- |
| Backend / módulos | Lucas (`backend-executor`) | C | Marina |
| Frontend / UI | Camila (`frontend-executor`) | C | Paulo |
| Infra / CI local | Rafael (`infra-executor`) | C | Bia |
| Adapters / connections | Diego (`adapters-executor`) | C | Gustavo |
| Code review G2 | Fernanda (`code-review-lead`) | B | — |
| QA / E2E G3 | Edu (`qa-lead`) | B | — |
| Security G4 | Isa (`security-lead`) | B | — |
| Red team G5 | Thiago (`red-team-lead`) | B | — |
| PR / GitHub policy | Ju (`github-lead`) | B | — |
| Docs públicas | André (`docs-lead`) | B | — |
| ADR / boundaries | Marcus (`architect`) consult | A | Renata decide conflito |
| Governança / G7 | Renata + Cláudia | Núcleo | @Owner exceção |
| Pesquisa / spike | Helena (`researcher`) → `share` | on-demand | — |

---

## Formato de evidência

### No dialogue (preferido)

```bash
npm run orchestration:speak -- \
  --persona backend-critic \
  --body "@Owner — 847 testes passando no slice backend." \
  --issue ANX-N \
  --type response \
  --evidence "command:cd backend && bun test modules/accounting 2>&1 | tail -3"
```

### Inline no bloco chat

```markdown
---
**Marina Ferreira** · crítica · [backend-critic] · qualidade
@Owner — contagem verificada agora.

evidence:
- command: `cd backend && bun test 2>&1 | tail -5`
- file: `.cursor/orchestration/tests/compliance-check.test.mjs`
- issue: ANX-248 comentário taskboard
---
```

### Sem evidência disponível

```markdown
---
**Lucas Mendes** · executor · [backend-executor] · execução
@Owner — **não verificado** neste turno. Para provar: `cd backend && bun test modules/organizations`.
---
```

---

## Escalation

```mermaid
flowchart LR
  Q[Pergunta sem owner claro] --> R[Renata identifica nível]
  R --> B{Level B<br/>aplica?}
  B -->|Sim| BL[Lead B responde]
  B -->|Não| C[Par C responde]
  BL --> E{Evidência?}
  C --> E
  E -->|Não| NV[não verificado + comando]
  E -->|Sim| OK[Resposta citada]
  NV --> O{@Owner<br/>precisa agora?}
  O -->|Sim| RUN[Executor roda comando]
  O -->|Não| TB[Registrar na issue]
```

---

## BAD vs GOOD (3 pares)

### Par 1 — contagem de testes

| ❌ BAD | ✅ GOOD |
| --- | --- |
| **Renata:** "Temos cerca de 800 testes no backend, tudo verde." | **Renata:** "@marina — @Owner quer contagem de testes backend." **Marina:** "@Owner — 847 pass / 0 fail. evidence: `command:cd backend && bun test 2>&1 | tail -3`" |

### Par 2 — status de migrate

| ❌ BAD | ✅ GOOD |
| --- | --- |
| **Renata:** "As migrations rodaram ok ontem." | **Lucas:** "@Owner — **não verificado** agora. evidence: `command:cd backend/modules/accounting && bun run migrate --dry-run`" |

### Par 3 — security header

| ❌ BAD | ✅ GOOD |
| --- | --- |
| **Renata:** "O auth header está correto no middleware." | **Renata:** "@isa — @Owner pergunta sobre auth header." **Isa:** "@Owner — HSTS + Bearer validado. evidence: `file:backend/apps/api/src/organizations/middleware/require-agency-membership.ts`" |

---

## Compliance

Warning suave **`HIERARCHY_PROXY_ANSWER`** quando `orchestrator` responde conteúdo técnico sem:

- `@mention` de handoff ao owner competente, **e**
- bloco de evidência (`--evidence`, `command:`, `file:`, `issue:`)

Ver `evaluateHierarchyProxyAnswerWarnings` em `agent-compliance/compliance-lib.mjs`.

Fix: [CHAT-PARTICIPATION.md](./CHAT-PARTICIPATION.md) · este documento · `npm run orchestration:who -- --persona orchestrator --can-i "answer technical question"`.

---

## Integração

| Artefato | Uso |
| --- | --- |
| `.cursor/rules/agents-in-chat.mdc` | Regra 14 — Q&A hierárquico |
| `templates/SUBAGENT-DELEGATION-PACKAGE.md` | @mention → persona responde com evidência |
| `workflows/workflow-orchestrator.md` | Owner question → route, não inline |
| `CHAT-PARTICIPATION.md` | Anti-padrão proxy técnico |
