#!/usr/bin/env node
/**
 * CLI shim for Cursor taskboard (CreateGoal + local registry).
 *
 * Native Cursor: CreateGoal / UpdateGoal / /goal
 * Shim registry: .cursor/orchestration-runtime/goals/registry.json
 */

import { fileURLToPath } from "node:url";
import {
  cursorGoalsEnsure,
  findActiveCursorGoal,
  loadGoalsRegistry,
  registerCursorGoal,
  saveGoalsRegistry,
} from "./taskboard-routing.mjs";
import { getCliBrand } from "./cli-brand.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Cursor taskboard (goals shim)

Commands:
  ensure [--json]                    Verify CURSOR_GOAL_ID or active registry goal
  list [--json] [--persona SLUG]
  register --id ID --objective TEXT --persona SLUG [--issue-ref ANX-N]
  complete --id ID [--persona SLUG]
  protocol                         Print CreateGoal invocation docs

Env:
  CURSOR_GOAL_ID / CURSOR_TASKBOARD_GOAL — native Cursor goal binding
  COMPLIANCE_CHANGED_PATHS — comma-separated paths for scope auto

Docs: .cursor/orchestration/TASKBOARD-ROUTING.md`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = { json: false, persona: null, id: null, objective: null, issueRef: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--objective") opts.objective = argv[++i];
    else if (a === "--issue-ref") opts.issueRef = argv[++i];
    else throw new Error(`Unknown: ${a}`);
  }
  return opts;
}

function cmdEnsure(opts) {
  const result = cursorGoalsEnsure();
  const payload = { ...result, nativeTool: "CreateGoal", shimPath: ".cursor/orchestration-runtime/goals/registry.json" };
  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (result.ok) {
    console.log(`✅ Cursor taskboard OK · goal=${result.binding.goalId} · source=${result.binding.source}`);
  } else {
    console.error(`❌ Cursor taskboard missing goal binding`);
    console.error(`   fix: ${result.fix}`);
    console.error(`   native: invoke CreateGoal or /goal in Cursor, then export CURSOR_GOAL_ID`);
  }
  process.exit(result.ok ? 0 : 1);
}

function cmdList(opts) {
  const registry = loadGoalsRegistry();
  let goals = registry.goals;
  if (opts.persona) goals = goals.filter((g) => g.persona === opts.persona);
  if (opts.json) {
    console.log(JSON.stringify(goals, null, 2));
    return;
  }
  if (!goals.length) {
    console.log("(nenhum goal Cursor registrado)");
    return;
  }
  for (const g of goals) {
    console.log(`${g.id}\t${g.persona}\t[${g.status}]\t${g.objective.slice(0, 70)}`);
  }
}

function cmdRegister(opts) {
  if (!opts.id || !opts.objective || !opts.persona) {
    throw new Error("register requires --id --objective --persona");
  }
  const goal = registerCursorGoal({
    id: opts.id,
    objective: opts.objective,
    persona: opts.persona,
    issueRef: opts.issueRef,
  });
  console.log(`Goal registered: ${goal.id}`);
  console.log(`Next: CreateGoal in Cursor with the same objective; export CURSOR_GOAL_ID=${goal.id}`);
}

function cmdComplete(opts) {
  if (!opts.id) throw new Error("complete requires --id");
  const registry = loadGoalsRegistry();
  const goal = registry.goals.find((g) => g.id === opts.id);
  if (!goal) throw new Error(`Goal not found: ${opts.id}`);
  if (opts.persona && goal.persona !== opts.persona) {
    throw new Error(`Goal owned by ${goal.persona}, not ${opts.persona}`);
  }
  if (!findActiveCursorGoal(opts.id)) {
    throw new Error(`Goal ${opts.id} is not active`);
  }
  goal.status = "complete";
  goal.updatedAt = new Date().toISOString();
  saveGoalsRegistry(registry);
  console.log(`Goal ${opts.id} → complete`);
  console.log(`Next: UpdateGoal status=complete in Cursor after verification`);
}

function cmdProtocol() {
  console.log(`Cursor Taskboard Protocol

Native (preferred when available):
  1. Classify scope → framework/non-project → board=cursor
  2. npm run orchestration:cursor-goals -- register --id <slug> --objective "..." --persona orchestrator
  3. In Cursor session: /goal "<objective>" or CreateGoal tool
  4. export CURSOR_GOAL_ID=<id>  (or rely on single active registry goal)
  5. npm run orchestration:cursor-goals -- ensure

Shim registry: .cursor/orchestration-runtime/goals/registry.json
Compliance: npm run orchestration:compliance -- --pre-work --scope framework --issue <dialogue-ref>

Never mix boards on the same unit of work.`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "--help") usage();

  try {
    const opts = parseArgs(rest);
    switch (cmd) {
      case "ensure":
        cmdEnsure(opts);
        break;
      case "list":
        cmdList(opts);
        break;
      case "register":
        cmdRegister(opts);
        break;
      case "complete":
        cmdComplete(opts);
        break;
      case "protocol":
        cmdProtocol();
        break;
      default:
        usage(1);
    }
  } catch (err) {
    console.error(`cursor-goals error: ${err.message}`);
    process.exit(1);
  }
}
