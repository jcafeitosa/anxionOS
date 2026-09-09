#!/usr/bin/env bash
# launch-pipeline.sh — desbloqueia pipeline após decisão G7 do CTO (Renata) em ANX-221
#
# Usage: npm run orchestration:cto-decide -- --issue ANX-221 --apply
#   ./.cursor/orchestration/launch-pipeline.sh
#
# Prerequisites:
#   - Codex Taskboard online (npm run taskboard:ensure)
#   - taskctl installed + CURSOR_THREAD_ID (or CODEX_THREAD_ID) for board writes
#   - Decisão CTO: CTO_DECISION_ACCEPT=1 (pós cto-decide) — sem OWNER_ACCEPTED_* obrigatório

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ISSUE_DONE="ANX-221"
ISSUE_NEXT="ANX-222"
THREAD_ID="${CURSOR_THREAD_ID:-${CODEX_THREAD_ID:-${CLAUDE_CODE_SESSION_ID:-}}}"

log() { printf '\n▶ %s\n' "$*"; }
warn() { printf '\n⚠ %s\n' "$*" >&2; }
die() { printf '\n✖ %s\n' "$*" >&2; exit 1; }

# ── 0. Guard: decisão G7 CTO ───────────────────────────────────────────────────
if [[ "${CTO_DECISION_ACCEPT:-}" == "auto" ]]; then
  log "CTO_DECISION_ACCEPT=auto — avaliando via cto-decide"
  if ! npm run orchestration:cto-decide -- --issue "${ISSUE_DONE}"; then
    die "cto-decide não retornou ACCEPT para ${ISSUE_DONE}."
  fi
  export CTO_DECISION_ACCEPT=1
elif [[ "${CTO_DECISION_ACCEPT:-}" == "1" ]] || [[ "${CTO_EVIDENCE_ACCEPT:-}" == "1" ]]; then
  log "Decisão G7 CTO confirmada (CTO_DECISION_ACCEPT / CTO_EVIDENCE_ACCEPT)"
elif [[ "${OWNER_ACCEPTED_ANX221:-}" == "1" ]]; then
  warn "OWNER_ACCEPTED_ANX221 legado — preferir cto-decide (CTO-AUTHORITY.md)"
  log "Aceite Owner legado confirmado"
else
  warn "Nenhuma decisão G7 CTO detectada."
  warn "  npm run orchestration:cto-decide -- --issue ${ISSUE_DONE}"
  warn "  npm run orchestration:cto-decide -- --issue ${ISSUE_DONE} --apply"
  die "Abortado: Renata deve decidir G7 para ${ISSUE_DONE} (CTO-AUTHORITY.md)."
fi

# ── 1. Taskboard online ─────────────────────────────────────────────────────
log "1/8 — taskboard:ensure"
npm run taskboard:ensure

# ── 2. ANX-221 → done ───────────────────────────────────────────────────────
log "2/8 — mover ${ISSUE_DONE} → done"
if [[ -z "$THREAD_ID" ]]; then
  warn "CURSOR_THREAD_ID não definido. Passo manual obrigatório:"
  warn "  export CURSOR_THREAD_ID=\"cursor-anx221-\$(date +%Y%m%d)\""
  warn "  taskctl comment add ${ISSUE_DONE} --body \"G7 aceite — movendo para done\" --thread-id \"\$CURSOR_THREAD_ID\""
  warn "  node scripts/taskboard.mjs move ${ISSUE_DONE} done"
  die "Defina CURSOR_THREAD_ID e reexecute, ou complete o move manualmente."
fi

export CURSOR_THREAD_ID="$THREAD_ID"

CURRENT_VERSION="$(node -e "
  const { execSync } = require('child_process');
  const out = execSync('node scripts/taskboard.mjs get ${ISSUE_DONE}', { encoding: 'utf8' });
  const j = JSON.parse(out);
  const t = j.task ?? j;
  process.stdout.write(String(t.version ?? ''));
")"

if [[ -z "$CURRENT_VERSION" ]]; then
  die "Não foi possível ler version de ${ISSUE_DONE}."
fi

log "  version=${CURRENT_VERSION} thread=${THREAD_ID}"
node scripts/taskboard.mjs move "${ISSUE_DONE}" done || {
  warn "move via wrapper falhou. Comando taskctl direto:"
  warn "  taskctl issue move ${ISSUE_DONE} done --if-version ${CURRENT_VERSION} --thread-id \"${THREAD_ID}\""
  die "Falha ao mover ${ISSUE_DONE} para done."
}

log "  ✓ ${ISSUE_DONE} → done"

# ── 3. Verificar desbloqueio ANX-222 ────────────────────────────────────────
log "3/8 — verificar ${ISSUE_NEXT}"
ANX222_STATUS="$(node -e "
  const { execSync } = require('child_process');
  const out = execSync('node scripts/taskboard.mjs get ${ISSUE_NEXT}', { encoding: 'utf8' });
  const j = JSON.parse(out);
  const t = j.task ?? j;
  process.stdout.write(t.status ?? 'unknown');
")"
log "  ${ISSUE_NEXT} status=${ANX222_STATUS}"
if [[ "$ANX222_STATUS" == "blocked" ]]; then
  warn "${ISSUE_NEXT} ainda blocked — verifique dependência parent no board."
fi

# ── 4. Claim ANX-222 (Lucas) ────────────────────────────────────────────────
log "4/8 — claim ${ISSUE_NEXT} in_progress (Lucas)"
node scripts/taskboard.mjs move "${ISSUE_NEXT}" in_progress || {
  warn "Claim falhou. Manual:"
  warn "  node scripts/taskboard.mjs move ${ISSUE_NEXT} in_progress"
  die "Falha ao claimar ${ISSUE_NEXT}."
}
log "  ✓ ${ISSUE_NEXT} → in_progress"

# ── 5. Sessões de orquestração ──────────────────────────────────────────────
log "5/8 — orchestration:session start (backend-executor + backend-critic)"
npm run orchestration:session -- start --persona backend-executor --issue "${ISSUE_NEXT}"
npm run orchestration:session -- start --persona backend-critic --issue "${ISSUE_NEXT}"

# ── 6. Diálogo: Renata, Lucas, Marina ────────────────────────────────────────
log "6/8 — orchestration:speak (Renata → Lucas → Marina)"

npm run orchestration:speak -- \
  --persona orchestrator \
  --issue "${ISSUE_NEXT}" \
  --type handoff \
  --body "@lucas — ${ISSUE_DONE} aceita por decisão CTO (G7). Pipeline desbloqueada. Claim ${ISSUE_NEXT}; pacote: DELEGATION-PACKAGE-ANX-222.md"

npm run orchestration:speak -- \
  --persona backend-executor \
  --issue "${ISSUE_NEXT}" \
  --type ack \
  --body "@marina — claim ${ISSUE_NEXT}. Escopo: commit src restante + drift eventing/contracts. G0 em DELEGATION-PACKAGE-ANX-222.md"

npm run orchestration:speak -- \
  --persona backend-critic \
  --issue "${ISSUE_NEXT}" \
  --type ack \
  --body "@lucas — ack. Acompanho G1; zero tolerância a TODO/stub em produção."

# ── 7. Cron daemon (background) ───────────────────────────────────────────────
log "7/8 — orchestration:cron start (background)"
if pgrep -f "cron-manager.mjs start" >/dev/null 2>&1; then
  log "  cron daemon já em execução (pgrep)"
else
  nohup npm run orchestration:cron -- start >> .cursor/orchestration-runtime/autonomy/cron-daemon.log 2>&1 &
  sleep 1
  if pgrep -f "cron-manager.mjs start" >/dev/null 2>&1; then
    log "  ✓ cron daemon iniciado (PID $(pgrep -f 'cron-manager.mjs start' | head -1))"
  else
    warn "cron daemon pode não ter iniciado — verifique .cursor/orchestration-runtime/autonomy/cron-daemon.log"
  fi
fi

# ── 8. Proactive check ────────────────────────────────────────────────────────
log "8/8 — orchestration:proactive check"
npm run orchestration:proactive -- check --persona orchestrator

# ── Done ────────────────────────────────────────────────────────────────────
printf '\n✅ Pipeline lançada.\n'
printf '   %s → done | %s → in_progress\n' "${ISSUE_DONE}" "${ISSUE_NEXT}"
printf '   Próximo: Lucas implementa G1 com Marina; gates G2–G6 após PASS crítico.\n'
printf '   Diálogo: npm run orchestration:chat -- --issue %s\n\n' "${ISSUE_NEXT}"
