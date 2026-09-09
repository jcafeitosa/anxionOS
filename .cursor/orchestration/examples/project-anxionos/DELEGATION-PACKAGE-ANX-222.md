# Pacote de Delegação — ANX-222

**Status:** 🔄 **`in_progress`** — G0 incompleto (pacote issue + ack dialogue)  
**Preparado por:** Renata Oliveira (orchestradora)  
**Atualizado:** 2026-09-09 (parent ANX-221 `done`; workflow: `complete-g0`)

---

## Issue

| Campo | Valor |
| --- | --- |
| **ID** | ANX-222 |
| **Título** | ANX-221 follow-up: commit remaining module src + eventing/contracts drift |
| **Status atual** | `in_progress` (thread `cursor-cto-g7-20260909`, v9) |
| **Parent** | ANX-221 → **`done`** (G7 CTO 2026-09-09) |
| **Prioridade** | high |
| **Labels** | `continuation`, `for-claude`, `phase-2` |
| **Bloqueia** | ANX-134 (identity integrity gate — `blocked` até ANX-222 `done`) |

### Escopo

Follow-up rastreável ao drift documentado em ANX-134. HEAD limpo (`ead6dee`) falha oráculos; working tree contém dependências não commitadas que os testes exigem.

**Entregas:**

1. Commitar `src/` restante dos módulos + drift em `eventing`/`contracts`.
2. Garantir HEAD limpo verde nos oráculos.
3. Não commitar sem autorização explícita do Owner (Tier 1/Tier 2).

### Pré-condição Owner

Autorização explícita para commits Tier 1 e/ou Tier 2. Sem autorização = prep/documentação apenas.

---

## Equipe designada

| Papel | Persona | Slug CLI |
| --- | --- | --- |
| **Executor** | Lucas Mendes | `backend-executor` |
| **Crítico 1:1** | Marina Ferreira | `backend-critic` |
| **Orquestradora** | Renata Oliveira | `orchestrator` |

### Skills obrigatórias

- `karpathy-guidelines` — diffs cirúrgicos, critérios verificáveis
- `manage-taskboard` — claim versionado
- `graphify query` — antes de exploração em massa
- Subagentes ECC: `typescript-reviewer`, `database-reviewer`, `build-error-resolver`

---

## Pacote G0 (contexto rastreável)

Registrar este bloco como comentário na issue ao claimar.

### Fontes `brain/`

| Documento | Seção / uso |
| --- | --- |
| `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` | ADR0002 — layout modular aceito |
| `brain/notes/anxionos-backend-structure.md` | Árvore dos 23 módulos, ownership |
| `brain/notes/anxionos-backend-conformance-2026-09-08.md` | Gap ANX-118, matriz conformidade |
| `brain/project-docs/specs/001-institutional-contract/spec.md` | SDD P01–P09 |

### Seções AGENTS.md

| Seção | Aplicação |
| --- | --- |
| [Política zero-trabalho-fora-do-board](../../AGENTS.md#dashi-taskboard-obrigatório--tempo-real) | Claim ANX-222 antes de qualquer alteração |
| [Tolerância zero](../../AGENTS.md#tolerância-zero--código-incompleto-e-débito-disfarçado) | Sem TODO sem issue, sem mocks em produção |
| [Layout ADR0002](../../AGENTS.md#layout-adr0002) | `application` → ports only |
| [Pipeline G0–G7](../../AGENTS.md#pipeline-obrigatório-de-desenvolvimento-e-revisão) | G1 com Marina antes de G2 |

### Capability / owner

| Campo | Valor |
| --- | --- |
| **Capability** | P01 tooling + P02 eventing/contracts drift |
| **Módulo dono** | `backend/packages/eventing`, `backend/packages/contracts`, módulos com `src/` pendente |
| **Camada** | infrastructure + application (conforme módulo) |
| **Armazenamento** | PostgreSQL journal/outbox (ADR0004) |

### Oráculos de aceite

```bash
cd backend && bun test          # meta: 40/0 (issue) ou 126/0 (baseline atual)
cd backend && bun run test:boundary  # meta: 22/0
npm run boundaries              # meta: 0 violations
```

**Critério issue:** HEAD limpo passa todos os oráculos acima.

### Evidências pré-existentes na issue

- Comentários thread `cursor-anxionos-20d6a526`: staging script, manifest 113 paths
- `VERIFY_INTEGRATION: PG=126/126 NATS=2/2 boundaries=0 bun=126`
- Tier 1 isolated oracle (thread `cursor-orchestrator-20260908`)

---

## Critérios de aceite

- [x] ANX-221 em `done` com aceite G7 (CTO 2026-09-09)
- [ ] Pacote G0 postado como comentário na issue ANX-222
- [ ] `ack` + `status` G0 no dialogue (Lucas)
- [ ] `backend/modules/<module>/src/**/*.ts` restante commitado (sem `dist/`)
- [ ] Drift `eventing`/`contracts` resolvido e versionado
- [ ] `cd backend && bun test` — 0 falhas em HEAD limpo
- [ ] `test:boundary` — 0 falhas
- [ ] `boundaries` — 0 violations
- [ ] Marina emite `verdict PASS` G1 no dialogue
- [ ] Gates G2–G5 com pareceres independentes
- [ ] Comentário na issue com evidências → `in_review` → aceite G7 ANX-222

---

## Comandos para claim e início de sessão

### 0. Próximo passo imediato (G0 — Lucas)

```bash
npm run orchestration:workflow -- next --persona backend-executor --issue ANX-222
# → complete-g0: AGENTS.md + taskboard:ensure + pacote issue

npm run taskboard:prework
# Postar pacote G0 (seção abaixo) como comentário na issue via taskctl

npm run orchestration:broadcast -- \
  --from-persona backend-executor --type status --gate G0 \
  --issue ANX-222 \
  --body "G0 em andamento — pacote rastreável em DELEGATION-PACKAGE-ANX-222.md. Próximo: oráculos baseline antes de commit (aguarda autorização Owner Tier 1/2)." \
  --evidence "file:.cursor/orchestration/DELEGATION-PACKAGE-ANX-222.md,skill:karpathy-guidelines,file:.cursor/orchestration/GUIDELINES-INTEGRATION.md"
```

### 1. Orquestradora — dispatch (parent já `done`)

```bash
npm run taskboard:ensure
node scripts/taskboard.mjs get ANX-221    # confirmar done ✅
node scripts/taskboard.mjs get ANX-222    # obter version

export CURSOR_THREAD_ID="${CURSOR_THREAD_ID:-cursor-anx222-$(date +%Y%m%d)}"

# Dispatch Lucas
npm run orchestration:broadcast -- \
  --from-persona orchestrator --to-mention @lucas \
  --issue ANX-222 --gate G0 --type handoff \
  --body "@lucas — ANX-221 aceita. Claim ANX-222: commit src restante + eventing/contracts drift. Pacote G0 em DELEGATION-PACKAGE-ANX-222.md. Crítico: @marina." \
  --evidence file:.cursor/orchestration/DELEGATION-PACKAGE-ANX-222.md,issue:ANX-222 \
  --mirror-taskboard
```

### 2. Lucas — claim e sessão

```bash
npm run taskboard:ensure
npm run taskboard:prework

# Postar pacote G0 na issue (comentário com fontes brain/ + oráculos)
node scripts/taskboard.mjs get ANX-222
node scripts/taskboard.mjs move ANX-222 in_progress  # --if-version V --thread-id "$CURSOR_THREAD_ID"

npm run orchestration:session -- start --persona backend-executor --issue ANX-222

npm run orchestration:broadcast -- \
  --from-persona backend-executor --type ack \
  --issue ANX-222 --body "Ack ANX-222 — iniciando commit src + drift fix." \
  --evidence file:.cursor/orchestration/DELEGATION-PACKAGE-ANX-222.md
```

### 3. Marina — sessão crítica

```bash
npm run orchestration:session -- start --persona backend-critic --issue ANX-222

# Após handoff de Lucas:
npm run orchestration:broadcast -- \
  --from-persona backend-critic --to-mention @lucas \
  --issue ANX-222 --gate G1 --type verdict \
  --verdict PASS \
  --body "PASS G1 — oráculos verdes, zero tolerância OK." \
  --evidence command:"cd backend && bun test"
```

### 4. Fim de sessão

```bash
npm run orchestration:session -- end --persona backend-executor
npm run orchestration:session -- end --persona backend-critic
node scripts/taskboard.mjs move ANX-222 in_review
```

---

## Cadeia downstream

Após ANX-222 `done`:

| Issue | Título | Dependência |
| --- | --- | --- |
| ANX-134 | Identity: lifecycle e dependências application | desbloqueada por ANX-222 |
| ANX-136 | Governance (downstream) | após ANX-134 |

---

## Riscos e limites

| Risco | Mitigação |
| --- | --- |
| Commit sem autorização Owner | Verificar comentário G7 em ANX-221 antes de `git commit` |
| HEAD limpo falha oráculos | Isolar Tier 1/Tier 2 conforme comentários na issue |
| ANX-223 (billing) em paralelo | Issue separada; não misturar escopo |

---

## Referências

- [DELEGATION.md](./DELEGATION.md) — algoritmo de seleção (cadeia ANX-221→222→134→136)
- [GOAL-STATUS.md](./GOAL-STATUS.md) — veredito PARTIAL do goal
- [GUIDELINES-INTEGRATION.md](./GUIDELINES-INTEGRATION.md) — karpathy + ECC + ui-ux-pro-max
- [PIPELINE.md](./PIPELINE.md) — gates G0–G7
- Parent: ANX-221 no taskboard
