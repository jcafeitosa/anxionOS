#!/usr/bin/env node
/**
 * CLI: protocolo de goals + registro de metadados locais.
 * CreateGoal/UpdateGoal são ferramentas Cursor — este CLI documenta e audita.
 */

import { appendAutonomyLog } from "./autonomy-log.mjs";
import {
  assertIssueClaim,
  assertOwnership,
  assertPersona,
  baseResource,
  loadRegistry,
  printJson,
  saveRegistry,
} from "./lib.mjs";

function usage(exitCode = 0) {
  console.log(`anxionOS Agent Autonomy — goals

Commands:
  protocol                   Imprime resumo do protocolo (ver GOALS-PROTOCOL.md)
  list [--persona SLUG] [--json]
  register --persona SLUG --id ID --issue ANX-N --objective TEXT [--status active|complete|paused]
  update --persona SLUG --id ID --status STATUS [--as-orchestrator]
  complete --persona SLUG --id ID   Marca complete (após verificação)

Cursor tools (na sessão do agente):
  CreateGoal — objetivo multi-turn dentro do escopo ANX-* claimada
  UpdateGoal — status complete somente com evidência verificada

Docs: .cursor/orchestration/GOALS-PROTOCOL.md`);
  process.exit(exitCode);
}

function cmdProtocol() {
  console.log(`Goals Protocol (resumo)

1. Sempre claim ANX-* no taskboard antes de CreateGoal
2. Goal deve estar contido no escopo da issue claimada
3. UpdateGoal complete apenas após auditoria item-a-item
4. Não usar goal para bypass da política zero-trabalho-fora-do-board

Leia: .cursor/orchestration/GOALS-PROTOCOL.md
Comando Cursor: /goal <objective>`);
}

function cmdList(argv) {
  const opts = { persona: null, asJson: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--persona") opts.persona = argv[++i];
    else if (argv[i] === "--json") opts.asJson = true;
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  const registry = loadRegistry();
  let goals = registry.resources.goals;
  if (opts.persona) goals = goals.filter((g) => g.persona === opts.persona);
  if (opts.asJson) {
    printJson(goals);
    return;
  }
  if (goals.length === 0) {
    console.log("(nenhum goal registrado)");
    return;
  }
  for (const g of goals) {
    console.log(`${g.id}\t${g.persona}\t${g.issueId}\t[${g.status}]\t${g.objective.slice(0, 60)}`);
  }
}

function cmdRegister(argv) {
  const opts = {
    persona: null,
    id: null,
    issueId: null,
    objective: null,
    status: "active",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--objective") opts.objective = argv[++i];
    else if (a === "--status") opts.status = argv[++i];
    else throw new Error(`Unknown: ${a}`);
  }
  assertPersona(opts.persona);
  assertIssueClaim(opts.issueId, "goal");
  if (!opts.id || !opts.objective) {
    throw new Error("register requires --id --objective --issue");
  }

  const registry = loadRegistry();
  if (registry.resources.goals.some((g) => g.id === opts.id)) {
    throw new Error(`Goal "${opts.id}" already exists`);
  }

  const resource = {
    ...baseResource({ id: opts.id, persona: opts.persona, issueId: opts.issueId }),
    objective: opts.objective,
    status: opts.status,
    cursorTool: "CreateGoal",
  };
  registry.resources.goals.push(resource);
  saveRegistry(registry);

  appendAutonomyLog({
    action: "register",
    resourceType: "goals",
    resourceId: opts.id,
    persona: opts.persona,
    issueId: opts.issueId,
    details: { objective: opts.objective },
  });

  console.log(`Goal registered: ${opts.id} (${opts.issueId})`);
  console.log(`Next: invoke CreateGoal in Cursor with the same objective`);
}

function cmdUpdateStatus(argv, status) {
  const opts = { persona: null, id: null, asOrchestrator: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--status") status = argv[++i];
    else if (a === "--as-orchestrator") opts.asOrchestrator = true;
    else throw new Error(`Unknown: ${a}`);
  }
  assertPersona(opts.persona, opts.asOrchestrator);
  assertOwnership("goals", opts.id, opts.persona, opts.asOrchestrator);
  const registry = loadRegistry();
  const goal = registry.resources.goals.find((g) => g.id === opts.id);
  goal.status = status;
  goal.updatedAt = new Date().toISOString();
  saveRegistry(registry);
  appendAutonomyLog({
    action: "update",
    resourceType: "goals",
    resourceId: opts.id,
    persona: opts.persona,
    issueId: goal.issueId,
    details: { status },
  });
  console.log(`Goal ${opts.id} → ${status}`);
  if (status === "complete") {
    console.log(`Next: invoke UpdateGoal status=complete in Cursor after verification`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help") usage();

try {
  switch (cmd) {
    case "protocol":
      cmdProtocol();
      break;
    case "list":
      cmdList(rest);
      break;
    case "register":
      cmdRegister(rest);
      break;
    case "update":
      cmdUpdateStatus(rest, null);
      break;
    case "complete":
      cmdUpdateStatus(rest, "complete");
      break;
    default:
      usage(1);
  }
} catch (err) {
  console.error(`goals error: ${err.message}`);
  process.exit(1);
}
