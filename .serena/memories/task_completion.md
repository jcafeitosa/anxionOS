# Task completion checklist

Before `in_review` on backend changes:
1. `cd backend && bun run lint`
2. `cd backend && bun run typecheck`
3. `cd backend && bun test` (or scoped test path for slice)
4. `cd backend && bun run boundaries` when module graph touched
5. `graphify update .` after material code edits
6. Issue comment with evidence (commands + results)

Frontend slice:
1. `cd frontend && npm run typecheck`
2. `npm run test:e2e` when UI flow affected
3. Chrome DevTools inspection for UI changes

Orchestration-only:
- `npm run orchestration:verify`

Always: `npm run orchestration:compliance -- --pre-commit --issue ANX-N --persona <slug>` if code edited under orchestration rules.