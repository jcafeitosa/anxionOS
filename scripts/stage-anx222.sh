#!/usr/bin/env bash
# stage-anx222.sh — Stage ANX-222 drift manifest (120 paths, comment d342a3b1 + post-aa0646bf + ANX-136)
#
# Validates oracles, then `git add`s exactly the paths listed in ANX-222 comment
# d342a3b1-c415-4747-960d-b08dcafac8fc (excludes vendor/, dist/, node_modules/).
#
# Does NOT commit. Owner must send an explicit message containing "Autorizo commit"
# before running `git commit`.
#
# Usage (from repo root):
#   ./scripts/stage-anx222.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f AGENTS.md || ! -f backend/package.json ]]; then
	echo "error: run from anxionOS repo root (AGENTS.md + backend/package.json required)" >&2
	exit 1
fi

echo "==> Oracle gate (fail fast)"
(
	cd backend
	npm run boundaries
	npm run test:boundary
	bun test --max-concurrency=1
)

echo "==> Staging ANX-222 manifest (120 paths)"
git add \
	"backend/.env.example" \
	"backend/apps/api/package.json" \
	"backend/apps/api/src/auth/" \
	"backend/apps/api/src/index.ts" \
	"backend/apps/api/tsconfig.json" \
	"backend/apps/workers/" \
	"backend/modules/accounting/scripts/" \
	"backend/modules/accounting/src/" \
	"backend/modules/adapter-gateway/src/" \
	"backend/modules/audit/scripts/" \
	"backend/modules/audit/src/" \
	"backend/modules/billing/scripts/" \
	"backend/modules/billing/src/" \
	"backend/modules/capital/scripts/" \
	"backend/modules/capital/src/" \
	"backend/modules/connections/src/" \
	"backend/modules/decisions/scripts/" \
	"backend/modules/decisions/src/" \
	"backend/modules/evaluation/scripts/" \
	"backend/modules/evaluation/src/" \
	"backend/modules/execution/scripts/" \
	"backend/modules/execution/src/" \
	"backend/modules/governance/src/" \
	"backend/modules/graph/package.json" \
	"backend/modules/identity/src/application/commands/link-auth-user-id.ts" \
	"backend/modules/identity/src/application/commands/reactivate-principal.ts" \
	"backend/modules/identity/src/application/commands/suspend-principal.ts" \
	"backend/modules/identity/src/domain/events/identity-events.ts" \
	"backend/modules/identity/src/domain/ports/principal-repository.ts" \
	"backend/modules/identity/src/index.ts" \
	"backend/modules/identity/src/infrastructure/persistence/principal-repository.ts" \
	"backend/modules/knowledge/scripts/" \
	"backend/modules/knowledge/src/" \
	"backend/modules/market-data/scripts/" \
	"backend/modules/market-data/src/" \
	"backend/modules/operations/scripts/" \
	"backend/modules/operations/src/" \
	"backend/modules/orchestration/scripts/" \
	"backend/modules/orchestration/src/" \
	"backend/modules/organizations/src/index.ts" \
	"backend/modules/partners/src/" \
	"backend/modules/performance/scripts/" \
	"backend/modules/performance/src/" \
	"backend/modules/portfolios/scripts/" \
	"backend/modules/portfolios/src/" \
	"backend/modules/risk/scripts/" \
	"backend/modules/risk/src/" \
	"backend/modules/simulation/src/" \
	"backend/modules/strategies/scripts/" \
	"backend/modules/strategies/src/" \
	"backend/packages/contracts/package.json" \
	"backend/packages/contracts/src/accounting/" \
	"backend/packages/contracts/src/adapter-gateway/" \
	"backend/packages/contracts/src/audit/" \
	"backend/packages/contracts/src/billing/" \
	"backend/packages/contracts/src/capability-manifest/" \
	"backend/packages/contracts/src/capital/" \
	"backend/packages/contracts/src/connections/" \
	"backend/packages/contracts/src/decisions/" \
	"backend/packages/contracts/src/envelope-v02.ts" \
	"backend/packages/contracts/src/errors.ts" \
	"backend/packages/contracts/src/evaluation/" \
	"backend/packages/contracts/src/events.ts" \
	"backend/packages/contracts/src/execution/" \
	"backend/packages/contracts/src/governance/" \
	"backend/packages/contracts/src/graph/" \
	"backend/packages/contracts/src/inference/" \
	"backend/packages/contracts/src/knowledge/" \
	"backend/packages/contracts/src/market-data/" \
	"backend/packages/contracts/src/operations/" \
	"backend/packages/contracts/src/orchestration/" \
	"backend/packages/contracts/src/organizations/" \
	"backend/packages/contracts/src/partners/" \
	"backend/packages/contracts/src/performance/" \
	"backend/packages/contracts/src/portfolios/" \
	"backend/packages/contracts/src/realtime.ts" \
	"backend/packages/contracts/src/risk/" \
	"backend/packages/contracts/src/simulation/" \
	"backend/packages/contracts/src/strategies/" \
	"backend/packages/database/src/errors.ts" \
	"backend/packages/database/src/index.ts" \
	"backend/packages/database/src/migrate.ts" \
	"backend/packages/database/src/migrations/" \
	"backend/packages/database/src/rls-policy-helpers.ts" \
	"backend/packages/database/src/roles.ts" \
	"backend/packages/database/src/scoped-pool.ts" \
	"backend/packages/database/src/tenant-context.ts" \
	"backend/packages/eventing/package.json" \
	"backend/packages/eventing/src/index.ts" \
	"backend/packages/eventing/src/nats-publisher.ts" \
	"backend/packages/eventing/src/outbox-relay-worker.ts" \
	"backend/packages/eventing/src/postgres.ts" \
	"backend/packages/eventing/src/relay.ts" \
	"backend/packages/eventing/src/retention.ts" \
	"backend/packages/eventing/src/retry.ts" \
	"backend/packages/eventing/src/schema-upcast.ts" \
	"backend/packages/eventing/src/schema.ts" \
	"backend/packages/secrets/" \
	"backend/tests/api/" \
	"backend/tests/contracts/capability-manifest.test.ts" \
	"backend/tests/contracts/eventing-retry.test.ts" \
	"backend/tests/contracts/secrets.test.ts" \
	"backend/tests/contracts/smoke.test.ts" \
	"backend/tests/database/" \
	"backend/tests/eventing/" \
	"backend/tests/governance/" \
	"backend/tests/identity/link-auth-user-id.test.ts" \
	"backend/tests/identity/reactivate-principal.test.ts" \
	"backend/tests/identity/register-principal.test.ts" \
	"backend/tests/identity/suspend-principal.test.ts" \
	"backend/tests/identity/sync-principal-email.test.ts" \
	"backend/tests/identity/test-support.ts" \
	"backend/tests/organizations/accept-invite-by-token.test.ts" \
	"backend/tests/organizations/application-boundary.test.ts" \
	"backend/tests/organizations/invite-concurrency.test.ts" \
	"backend/tests/organizations/invite-member.test.ts" \
	"backend/tests/organizations/test-support.ts" \
	"backend/tests/workers/" \
	"scripts/commit-anx222.sh" \
	"scripts/stage-anx222.sh"

echo "==> Staged diff stat"
git diff --cached --stat

echo
echo "Staging complete. Commit NOT performed."
echo 'Owner must send "Autorizo commit" before: git commit -m "ANX-222: ..."'
