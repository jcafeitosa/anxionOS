# Owner Handoff — ANX-237 (framework only)

**Data:** 2026-09-09T16:40Z  
**Issue:** ANX-237 — *Framework: colaboração Google-style entre agentes*  
**Status board:** `in_review` · G0–G6 ✅ · G7 ⏳  
**Goal thread:** **~84%** (inalterado até G7 + greenlight produto)

---

## Resumo executivo

| Dimensão | Veredito |
| --- | --- |
| **Framework** | **READY** — `orchestration:verify` **73/73**; diagram **36/36**; **18** personas; G0–G6 exercidos em ANX-237 |
| **Produto** (`backend/`, `frontend/`, slices ANX-134+) | **BLOCKED** — aguarda greenlight explícito @Owner ([OWNER-GREENLIGHT.anxionos.md](./examples/project-anxionos/OWNER-GREENLIGHT.anxionos.md)) |
| **Próximo passo** | Autorização Owner → commit framework → G7 `--apply` → (opcional) greenlight produto |

O framework está entregue e verificado. **Nenhum commit, G7 `--apply` nem edição de produto foi executado** neste handoff — apenas documentação e broadcast.

---

## Comandos copy-paste (quando @Owner autorizar)

### a) Commit do framework (lista de stage — revisão G6 Ju / github-lead)

Revisar diff antes de commitar. **177 arquivos** stageáveis (runtime e `.codewhale/` excluídos).

```bash
cd /Users/jcafeitosa/Development/anxionOS

# Pré-voo
npm run taskboard:ensure
npm run orchestration:verify   # esperado: 73/73 + diagram 36/36 + 18 personas

# Stage (escopo framework — Ju G6)
git add \
  .cursor/orchestration/ \
  .cursor/rules/ \
  .cursor/hooks/ \
  .cursor/commands/ \
  .cursor/orchestration.config.json \
  .github/workflows/orchestration-verify.yml \
  .gitignore

# Confirmar exclusões (NÃO stagear)
git status --short | rg 'orchestration-runtime|\.codewhale' || true

# Commit (somente após frase explícita do Owner)
git commit -m "$(cat <<'EOF'
feat(orchestration): ANX-237 — framework Google-style G0-G6

Colaboração visível (standup, INTERACTIONS, CHAT-PARTICIPATION),
18 personas, verify 73/73, overlay examples/project-anxionos/.

EOF
)"
```

| Path | Qtd |
| --- | --- |
| `.cursor/orchestration/` | 151 |
| `.cursor/rules/` | 16 |
| `.cursor/hooks/` | 5 |
| `.cursor/commands/` | 2 |
| `.cursor/orchestration.config.json` | 1 |
| `.github/workflows/orchestration-verify.yml` | 1 |
| `.gitignore` (modificado) | 1 |
| **Total** | **177** |

**Excluir sempre:** `.cursor/orchestration-runtime/**`, `.codewhale/**`, `brain/`, segredos.

---

### b) G7 — aceite framework (CTO decide)

Somente **após** commit autorizado e `orchestration:verify` verde no HEAD candidato.

```bash
npm run taskboard:ensure
npm run orchestration:cto-decide -- --issue ANX-237 --dry-run   # revisar PASS
npm run orchestration:cto-decide -- --issue ANX-237 --apply     # move done + dialogue decision
```

Dry-run atual (2026-09-09): **Decision ACCEPT · Verdict PASS** — 11 checks CTO-ACCEPTANCE satisfeitos.

---

### c) Greenlight produto — desbloquear pipeline anxionOS

Após G7 ANX-237 (framework versionado). Ver [TEAM-ACTIVATION.md](./examples/project-anxionos/TEAM-ACTIVATION.md).

```bash
# 1. Owner registra na issue (ex. ANX-135 ou comentário global):
#    "autorizo anxionOS" ou equivalente inequívoco
#    → OWNER-GREENLIGHT.anxionos.md

npm run taskboard:ensure
npm run orchestration:compliance -- --pre-work --issue ANX-135 --persona orchestrator

# 2. Sessão orquestrador + ack
npm run orchestration:session -- start --persona orchestrator --issue ANX-135
npm run orchestration:broadcast -- \
  --from-persona orchestrator --type ack --issue ANX-135 \
  --body "@Owner greenlight recebido — ativando equipe G0→G7." \
  --evidence "file:examples/project-anxionos/OWNER-GREENLIGHT.anxionos.md"

# 3. Claim issue de produto
node scripts/taskboard.mjs move ANX-135 in_progress

# 4. Despacho Level C + gates G2–G5 conforme TEAM-ACTIVATION.md
npm run orchestration:standup -- --issue ANX-135 --post
npm run orchestration:progress -- --issue ANX-135
```

Fila produto imediata: **ANX-135** (`blocked` → desbloquear após greenlight); follow-ups **ANX-234/235/236** (identity, `todo`).

---

## Evidências de gates G0–G6

| Gate | Responsável | Veredito | Evidência / oráculo |
| --- | --- | --- | --- |
| **G0** Preparar | Renata + Cláudia | ✅ PASS | `taskboard:ensure` ok; compliance pre-work; escopo `.cursor/orchestration/` + rules; issue ANX-237 claimada |
| **G1** Desenvolver | Pares Level C + críticos | ✅ PASS | Entregas INTERACTIONS, standup CLI, workflows 36/36; crítico G1 PASS documentado no board |
| **G2** Code review | Fernanda | ✅ PASS | Comentário board ANX-237 (condições standup/session resolvidas) |
| **G3** QA | Eduardo | ✅ PASS | `orchestration:verify` **73/73**; `diagram-check` **36/36** |
| **G4** Security | Isa | ✅ PASS | Framework-only; sem paths `backend/`/`frontend/` no diff candidato |
| **G5** Red Team | Thiago | ✅ PASS | Escopo documental/CLI; sem capital real |
| **G6** Integrar | Renata + Ju + André | ✅ PASS | Agregação G2–G5; manifest commit 177 arquivos; `cto-decide --dry-run` PASS |

### Oráculos globais (snapshot handoff)

| Comando | Resultado |
| --- | --- |
| `npm run orchestration:verify` | ✅ **73/73** testes |
| `npm run orchestration:diagram-check` | ✅ **36/36** workflows · 64% cobertura global |
| `npm run orchestration:personas` | ✅ **18** personas |
| `npm run orchestration:progress -- --issue ANX-237` | ███████████░ **88%** · G7 ⏳ |
| `npm run orchestration:cto-decide -- --issue ANX-237 --dry-run` | ✅ ACCEPT / PASS |

---

## O que NÃO fazer sem autorização @Owner

| Proibido | Motivo |
| --- | --- |
| `git commit` / `git push` do framework | Owner não autorizou commit (ANX-237) |
| `orchestration:cto-decide --apply` | G7 requer autorização explícita ou aceite CTO após commit |
| Editar `backend/`, `frontend/`, docs públicas de produto | [PROJECT-GREENLIGHT.md](./PROJECT-GREENLIGHT.md) — produto BLOCKED |
| Claim / `in_progress` em ANX-135, ANX-164+ sem greenlight | Issue produto pausada |
| Inferir greenlight de contexto ou silêncio | Política Owner 2026-09-09 |
| Stagear `.cursor/orchestration-runtime/` ou `.codewhale/` | Runtime local; não versionar |
| Marcar goal thread 100% antes de G7 + produto | Goal permanece **~84%** |

---

## Housekeeping — sessões órfãs (opcional)

`npm run orchestration:session -- list` (2026-09-09): **18 sessões** ativas (ANX-134, ANX-135, ANX-237).

Encerrar **somente** após confirmar que nenhum agente está em turno ativo:

```bash
# Por persona/issue (preferido)
npm run orchestration:session -- end --persona <slug> --issue ANX-N

# Limpeza forçada (último recurso — documentar antes)
npm run orchestration:session -- end --force
```

**Não executado** neste handoff — sessões podem refletir trabalho G6 recente.

---

## Snapshot board — produto (blocked / todo / in_progress)

**`in_progress`:** *(nenhuma)*

**`blocked` (produto-relevante):**

| Issue | Título |
| --- | --- |
| **ANX-135** | Organizations: concluir onboarding, memberships e integração |

**`todo` (produto imediato — amostra):**

| Issue | Título |
| --- | --- |
| ANX-236 | Identity: reconciliação DeliverPolicy.New no consumer de sessão |
| ANX-235 | Identity: sync session revoke ou middleware fail-closed no suspend |
| ANX-234 | Identity: Better Auth beforeSignIn gate para principals suspensos |
| ANX-164 | P07: completar Owner Console por capacidades reais |
| ANX-165–168 | P07: consoles Operator / Platform / Partner / realtime |
| ANX-136 | Governance: autoridade temporal, aprovação e break-glass |

**Concluído recente:** ANX-134 (identity lifecycle) `done`; ANX-129–133 P02 `done`.

---

## Referências

- [GOAL-THREAD-STATUS.md](./GOAL-THREAD-STATUS.md) — completude ~84%
- [GOAL-STATUS.md](./GOAL-STATUS.md) — framework READY · produto BLOCKED
- [CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md) — protocolo G7
- [examples/project-anxionos/TEAM-ACTIVATION.md](./examples/project-anxionos/TEAM-ACTIVATION.md) — pós-greenlight
- [examples/project-anxionos/OWNER-GREENLIGHT.anxionos.md](./examples/project-anxionos/OWNER-GREENLIGHT.anxionos.md)

---

**Handoff preparado por:** Renata (orchestrator) · evidência `orchestration:verify` 73/73 · aguardando @Owner
