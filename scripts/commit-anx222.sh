#!/usr/bin/env bash
# commit-anx222.sh — Authorized commit for ANX-222 staged manifest
#
# Requires explicit Owner authorization via either:
#   - env ANXIONOS_AUTHORIZE_COMMIT=1
#   - first argument exactly "Autorizo commit"
#
# Does NOT stage files. Run ./scripts/stage-anx222.sh first if needed.
#
# Usage (from repo root):
#   ANXIONOS_AUTHORIZE_COMMIT=1 ./scripts/commit-anx222.sh
#   ./scripts/commit-anx222.sh "Autorizo commit"

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

authorized=0
if [[ "${ANXIONOS_AUTHORIZE_COMMIT:-}" == "1" ]]; then
	authorized=1
elif [[ "${1:-}" == "Autorizo commit" ]]; then
	authorized=1
fi

if [[ "$authorized" -ne 1 ]]; then
	echo "error: commit blocked — Owner must authorize with ANXIONOS_AUTHORIZE_COMMIT=1 or first arg \"Autorizo commit\"" >&2
	exit 1
fi

if [[ ! -f AGENTS.md || ! -f backend/package.json ]]; then
	echo "error: run from anxionOS repo root (AGENTS.md + backend/package.json required)" >&2
	exit 1
fi

staged_count="$(git diff --cached --name-only | wc -l | tr -d ' ')"
if [[ "$staged_count" -eq 0 ]]; then
	echo "error: nothing staged — run ./scripts/stage-anx222.sh first" >&2
	exit 1
fi

echo "==> Oracle gate (pre-commit)"
(
	cd backend
	npm run boundaries
	npm run test:boundary
	bun test --max-concurrency=1
)

echo "==> Committing ANX-222 manifest ($staged_count staged paths)"
git commit -m "$(cat <<'EOF'
ANX-222: version remaining module src + eventing/contracts drift

Follow-up to ANX-221 (ADR0002): commit staged backend modules source,
packages eventing/contracts drift, workers bootstrap, and boundary tests.
Owner authorization: explicit "Autorizo commit" phrase.

EOF
)"

echo "==> Post-commit oracle gate (HEAD)"
(
	cd backend
	npm run boundaries
	npm run test:boundary
	bun test --max-concurrency=1
)

echo
echo "Commit complete. Move ANX-222 to in_review via taskctl (G7 done requires explicit accept)."
