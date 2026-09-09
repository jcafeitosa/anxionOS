# Template — pacote de delegação Task (subagente Cursor)

Copie **integralmente** (adaptando `ANX-N`, persona e escopo) em todo prompt `Task` despachado por Renata, gate leads ou executores contratando workers.

Complementar com [SUBAGENT-PROMPT-TOOLING.md](./SUBAGENT-PROMPT-TOOLING.md).

---

## Pacote obrigatório

```markdown
## Pacote de delegação — ANX-N

### Gates documentais (ler antes de agir)
- Read AGENTS.md
- Read .cursor/orchestration/SCOPE.md
- Read .cursor/orchestration/MANDATORY-COMPLIANCE.md
- Read .cursor/orchestration/CURSOR-AGENTS-INTEGRATION.md (se orquestração)

### Taskboard e compliance
npm run taskboard:ensure
# claim ANX-N in_progress com thread binding
npm run orchestration:compliance -- --pre-work --issue ANX-N --persona <slug>

### Tooling (obrigatório)
- graphify query "<escopo>" ANTES de Grep/Glob/Read em massa
- serena MCP para edições em nível de símbolo
- open-knowledge MCP para qualquer path brain/
- GetDynamicTools + CallDynamicTool para MCPs do projeto
- graphify update . após editar código

### Skills (ler SKILL.md quando existir para a tarefa)
- manage-taskboard · orchestrate-work · karpathy-guidelines (sempre)
- [adicionar: write-a-spec | test-driven-development | open-knowledge | …]

### Dialogue (no silent work)
npm run orchestration:session -- start --persona <slug> --issue ANX-N
npm run orchestration:broadcast -- --from-persona <slug> --type ack --issue ANX-N --body "…" --evidence "…"
# status a cada ~10min · handoff/verdict nos marcos

### Escopo desta delegação
Issue: ANX-N
Persona: <slug>
subagent_type: <code-reviewer | generalPurpose | …>
Entregar: [critérios verificáveis]
Não fazer: [fora de escopo]

### Retorno ao parent (obrigatório)
- Resumo 3–5 bullets do que mudou
- Comandos executados + exit codes
- Paths de arquivos tocados
- Bloqueios ou CHANGES_REQUIRED pendentes
- Sugestão de próximo gate (G1/G2/…)
```

---

## Variante mínima (worker Level C)

```markdown
Read AGENTS.md + SCOPE.md + MANDATORY-COMPLIANCE.md
Use graphify before exploration; serena for symbol edits; open-knowledge for brain/
npm run taskboard:ensure; claim ANX-N; orchestration:compliance --pre-work
Broadcast via speak at milestones
Return evidence for parent
Issue ANX-N only · subagent_type: build-error-resolver
```

---

## Mapeamento rápido subagent_type

Ver tabela completa em [CURSOR-AGENTS-INTEGRATION.md](../CURSOR-AGENTS-INTEGRATION.md) · hire: `getCursorSubagentType()` em `agent-hire/levels.mjs`.
