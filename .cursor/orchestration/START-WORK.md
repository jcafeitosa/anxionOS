# Como iniciar trabalho real

Guia único para o Owner e a equipe orquestrada desbloquearem o pipeline G0–G7 e claimar a próxima issue.

---

## Pré-requisitos (sempre)

```bash
npm run taskboard:ensure          # board online — falhou = PARAR
npm run taskboard:context         # projeto anxionOS
npm run taskboard:prework         # ensure + lembrete issue ANX-*
npm run orchestration:workflow -- sync   # sincroniza estado workflow com issue claimada
npm run orchestration:session -- start --persona orchestrator --issue ANX-N
npm run orchestration:compliance -- --pre-work --issue ANX-N --persona orchestrator
```

Leia [AGENTS.md](../../AGENTS.md), [COMPLIANCE.md](./COMPLIANCE.md), [MANDATORY-COMPLIANCE.md](./MANDATORY-COMPLIANCE.md) e [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) antes de qualquer alteração em `backend/`, `frontend/` ou `docs/`.

**Tooling G0.14:** `graphify query` antes de Grep/Glob/Read em massa · serena MCP para símbolos · open-knowledge para `brain/` · archify em P2.

**Enforcement:** `npm run orchestration:compliance -- --pre-work` exit 0 obrigatório antes de editar arquivos.

---

## Launch rápido (após aceite G7)

### Opção A — CTO (evidências completas) — preferida

```bash
npm run orchestration:cto-accept -- --issue ANX-221
# Se ACCEPT:
export CTO_EVIDENCE_ACCEPT=1
export CURSOR_THREAD_ID="${CURSOR_THREAD_ID:-cursor-anx222-$(date +%Y%m%d)}"
./.cursor/orchestration/launch-pipeline.sh

# Ou auto-avaliar no script:
export CTO_EVIDENCE_ACCEPT=auto
./.cursor/orchestration/launch-pipeline.sh
```

Protocolo: [CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md)

### Opção B — Owner (exceções ou preferência explícita)

```bash
export OWNER_ACCEPTED_ANX221=1
export CURSOR_THREAD_ID="${CURSOR_THREAD_ID:-cursor-anx222-$(date +%Y%m%d)}"
./.cursor/orchestration/launch-pipeline.sh
```

O script executa: `taskboard:ensure` → avalia aceite (CTO ou Owner) → ANX-221 `done` → claim ANX-222 → sessões Lucas/Marina → `orchestration:speak` → cron → `proactive check`.

| Etapa | O que faz |
| --- | --- |
| Guard | `CTO_EVIDENCE_ACCEPT=1/auto` **ou** `OWNER_ACCEPTED_ANX221=1` |
| cto-accept | Se `CTO_EVIDENCE_ACCEPT=auto`, avalia evidências antes de mover |
| ANX-221 → done | Requer `taskctl` + `CURSOR_THREAD_ID` |
| ANX-222 claim | `in_progress` para Lucas |
| Sessões | `backend-executor` + `backend-critic` em ANX-222 |
| Diálogo | Posts Renata (handoff), Lucas (ack), Marina (ack) |
| Cron | Inicia daemon em background se não estiver rodando |
| Proactive | `check --persona orchestrator` |

**Cron agora (antes do aceite):** iniciar monitoramento contínuo enquanto aguarda G7:

```bash
npm run orchestration:cron -- start   # foreground, ou nohup em background
```

---

## Passo 1 — G7: CTO ou Owner (desbloqueio da cadeia)

A pipeline está **bloqueada** enquanto ANX-221 permanece em `in_review` sem aceite G7.

| Campo | Valor |
| --- | --- |
| Issue | **ANX-221** — P01: versionar `backend/modules` source no git (ADR0002) |
| Status | `in_review` (aguardando G7) |
| Bloqueia | ANX-222 → ANX-134 → ANX-136 |

### Renata (CTO) — aceite por evidências

1. Avaliar pacote: `npm run orchestration:cto-accept -- --issue ANX-221`
2. Se **ACCEPT** → post `approve` + move `done` (`--apply` ou `launch-pipeline.sh`)
3. Se **CHANGES_REQUIRED** → delegar correções (G1/G2, commit, dialogue)
4. Se **ESCALATE_TO_OWNER** → @Owner decide (risco, ADR, escopo)

### Owner — apenas exceções ou preferência explícita

1. Revisar entrega quando CTO escalou ou solicitou veto.
2. Aceite explícito opcional: *"aceito ANX-221"* → `OWNER_ACCEPTED_ANX221=1`

Sem aceite G7 (CTO ou Owner), agentes **não** claimam ANX-222 nem commitam código Tier 1/2.

---

## Passo 2 — Orquestradora: desbloquear e delegar ANX-222

Após aceite G7 de ANX-221 (CTO ou Owner):

```bash
# Renata confirma desbloqueio
node scripts/taskboard.mjs get ANX-222    # status deve sair de blocked

npm run orchestration:broadcast -- \
  --from-persona orchestrator \
  --type handoff \
  --issue ANX-222 \
  --to-persona backend-executor \
  --body "@lucas — ANX-221 aceita. Claim ANX-222 com @marina. Pacote: DELEGATION-PACKAGE-ANX-222.md"
```

Pacote completo: [DELEGATION-PACKAGE-ANX-222.md](./DELEGATION-PACKAGE-ANX-222.md).

---

## Passo 3 — Lucas + Marina: claim ANX-222 (G0 → G1)

**Somente após aceite G7 na ANX-221 (CTO evidências ou Owner).**

```bash
npm run taskboard:ensure
npm run orchestration:session -- start --persona backend-executor --issue ANX-222

# Claim versionado (requer taskctl + CURSOR_THREAD_ID)
node scripts/taskboard.mjs move ANX-222 in_progress

npm run orchestration:speak -- \
  --persona backend-executor \
  --issue ANX-222 \
  --type ack \
  --body "@marina — claim ANX-222. Escopo: commit src restante + drift eventing/contracts. G0 pacote em DELEGATION-PACKAGE-ANX-222.md"

npm run orchestration:speak -- \
  --persona backend-critic \
  --issue ANX-222 \
  --type ack \
  --body "@lucas — ack. Acompanho G1; zero tolerância a TODO/stub em produção."
```

Fluxo G1: implementar → crítico aprova → `in_review` → gates G2–G6 → G7 CTO (evidências) ou Owner (exceções).

---

## Monitoramento contínuo (crons)

7 crons registrados para `orchestrator` (todos `[on]`). **Daemon não roda automaticamente** — iniciar manualmente:

```bash
# Listar crons registrados
npm run orchestration:cron -- list

# Executar todos os crons habilitados uma vez (smoke)
npm run orchestration:cron -- tick

# Iniciar daemon em background (monitoramento contínuo)
npm run orchestration:cron -- start
```

| Cron ID | Intervalo | Função |
| --- | --- | --- |
| `taskboard-health` | 5m | `taskboard:ensure` |
| `dialogue-sync` | 1m | Espelha dialogue → chat |
| `pipeline-stale-check` | 1d | Issues paradas |
| `proactive-board-scan` | 10m | Scan board |
| `proactive-mention-watch` | 2m | Menções no dialogue |
| `proactive-escalation` | 1d | Escalations G7 |
| `silence-watch` | 5m | >10min sem broadcast |

Proactive manual (escalations G7):

```bash
npm run orchestration:proactive -- check --persona orchestrator
npm run orchestration:proactive -- act --persona orchestrator   # NÃO dry-run em produção
```

Ver [agent-autonomy/README.md](./agent-autonomy/README.md) e [PROACTIVE-PLAYBOOK.md](./PROACTIVE-PLAYBOOK.md).

---

## Diálogo visível no chat

```bash
npm run orchestration:chat -- --issue ANX-221
npm run orchestration:chat -- --new-only
```

Regras: [CHAT-PARTICIPATION.md](./CHAT-PARTICIPATION.md) · [NO-SILENT-WORK.md](./NO-SILENT-WORK.md).

---

## Referências

- [GOAL-STATUS.md](./GOAL-STATUS.md) — veredito do goal de orquestração
- [CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md) — aceite G7 por evidências
- [PIPELINE.md](./PIPELINE.md) — gates G0–G7
- [DELEGATION.md](./DELEGATION.md) — matriz de delegação
- [RUNBOOK.md](./RUNBOOK.md) — operações do dia a dia
