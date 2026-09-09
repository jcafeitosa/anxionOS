# Hire delegado — Level B e Level C

Contratação on-demand **sem esperar CTO**, com evidência obrigatória e auditoria centralizada.

**Relacionados:** [HIERARCHY.md](./HIERARCHY.md) · [CTO-AUTHORITY.md](./CTO-AUTHORITY.md) · [PERSONAS.md](./PERSONAS.md)

---

## Princípio

- **B** contrata specialists/workers **do seu gate** (G2–G5, CI, docs).
- **C executor** contrata **crítico pareado** (se ainda não ativo) e **workers** para subtasks da issue.
- **C crítico** não contrata; faz `consult` ao B correspondente.
- **CTO (A)** pode contratar qualquer um, **rejeitar hire** ou **override dismiss**.

---

## Exemplos

### Lucas (C) contrata build-error-resolver — ANX-222

```bash
npm run orchestration:hire -- \
  --by-persona backend-executor \
  --persona build-error-resolver \
  --issue ANX-222 \
  --reason "12 erros TypeScript bloqueiam G1" \
  --evidence "bun run check-types exit 1" \
  --speak
```

**Esperado:** PASS · Level C worker · log em `hire-log.jsonl`.

### Lucas tenta contratar Fernanda (lead) — deve FALHAR

```bash
npm run orchestration:hire -- \
  --by-persona backend-executor \
  --persona code-review-lead \
  --issue ANX-222 \
  --reason "invalid" \
  --evidence "tentativa fora de escopo"
```

**Esperado:** `Level C executor só pode contratar workers e seu crítico pareado`

### Fernanda (B) contrata code-reviewer para G2

```bash
npm run orchestration:hire -- \
  --by-persona code-review-lead \
  --persona code-reviewer \
  --issue ANX-222 \
  --reason "G2 diff cross-module" \
  --evidence "handoff G1 PASS dialogue" \
  --speak
```

**Esperado:** PASS · specialist G2.

### Marina (C crítico) → Isa (B) contrata security-reviewer

1. Marina publica consult:

```bash
npm run orchestration:speak -- --persona backend-critic --issue ANX-222 --type consult \
  --body "@isa — challenge precisa security-reviewer antes do verdict."
```

2. Isa contrata:

```bash
npm run orchestration:hire -- \
  --by-persona security-lead \
  --persona security-reviewer \
  --issue ANX-222 \
  --reason "input G4 no challenge G1" \
  --evidence "consult Marina dialogue"
```

---

## Dismiss

| Quando | Quem dismiss | Evidência |
| --- | --- | --- |
| Subtask concluída | Executor C | comando/teste green |
| Gate PASS | Gate lead B | verdict G2–G5 |
| Handoff ao crítico | Executor C | diff + checklist |
| CTO override | Renata | rationale auditável |

```bash
npm run orchestration:dismiss -- \
  --by-persona backend-executor \
  --persona build-error-resolver \
  --issue ANX-222 \
  --evidence "bun test 42/42 green"
```

---

## CTO override

```bash
# Rejeitar hire ativo
npm run orchestration:cto-decide -- --issue ANX-222 --hire-reject <hire-id> --evidence "fora de escopo"

# Dismiss forçado (override)
npm run orchestration:cto-decide -- --issue ANX-222 --hire-override-dismiss <hire-id> --evidence "gate encerrado"
```

---

---

## Mapeamento hire → Cursor `subagent_type`

Workers e specialists on-demand registram `cursorSubagentType` opcional no hire (via `getCursorSubagentType()`).

| Slug contratado | `cursorSubagentType` | Uso Task após hire |
| --- | --- | --- |
| `build-error-resolver` | `build-error-resolver` | Fix build/types |
| `code-reviewer` | `code-reviewer` | G2 diff |
| `security-reviewer` | `security-review` | G4/G5 challenge |
| `e2e-runner` | `e2e-runner` | G3 E2E |
| `validation-review` | `validation-review` | Smoke/validação |
| `typescript-reviewer` | `typescript-reviewer` | Review TS |
| `docs-researcher` | `docs-researcher` | Spike/docs |
| `explore` | `explore` | Exploração only |
| `generalPurpose` | `generalPurpose` | Implementação |

Após hire aprovado, despachar `Task` com o `subagent_type` correspondente + [SUBAGENT-DELEGATION-PACKAGE.md](./templates/SUBAGENT-DELEGATION-PACKAGE.md).

Ver `PERSONA_CURSOR_SUBAGENT` e `ON_DEMAND_CURSOR_SUBAGENT` em `agent-hire/levels.mjs`.


## Limites

- Máx. **3** on-demand ativos por `ANX-N`
- Sem `--evidence` → comando rejeitado
- Hire duplicado (mesmo target ativo na issue) → rejeitado
