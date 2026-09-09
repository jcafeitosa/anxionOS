#!/usr/bin/env node
/**
 * CLI: list/create/enable/disable hooks por persona.
 * Wraps padrões create-hook (.cursor/hooks.json + scripts).
 */

import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { join } from "node:path";
import { appendAutonomyLog } from "./autonomy-log.mjs";
import {
  assertOwnership,
  assertPersona,
  baseResource,
  hooksDir,
  hooksJsonPath,
  loadRegistry,
  printJson,
  saveRegistry,
} from "./lib.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Agent Autonomy — hooks

Commands:
  list [--persona SLUG] [--json]
  create --persona SLUG --id ID --event EVENT --script PATH [--matcher REGEX] [--issue ANX-N]
  enable --persona SLUG --id ID [--as-orchestrator]
  disable --persona SLUG --id ID [--as-orchestrator]

Events: stop, subagentStop, afterFileEdit, postToolUse, beforeShellExecution, ...

Docs: .cursor/hooks/README.md · create-hook skill`);
  process.exit(exitCode);
}

function loadHooksJson() {
  if (!existsSync(hooksJsonPath)) return { version: 1, hooks: {} };
  return JSON.parse(readFileSync(hooksJsonPath, "utf8"));
}

function saveHooksJson(data) {
  writeFileSync(hooksJsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function cmdList(argv) {
  const opts = { persona: null, asJson: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--persona") opts.persona = argv[++i];
    else if (argv[i] === "--json") opts.asJson = true;
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  const registry = loadRegistry();
  let hooks = registry.resources.hooks;
  if (opts.persona) hooks = hooks.filter((h) => h.persona === opts.persona);
  if (opts.asJson) {
    printJson(hooks);
    return;
  }
  if (hooks.length === 0) {
    console.log("(nenhum hook registrado)");
    return;
  }
  for (const h of hooks) {
    const status = h.enabled ? "on" : "off";
    console.log(`${h.id}\t${h.persona}\t${h.event}\t${h.scriptPath}\t[${status}]`);
  }
}

function parseCreateArgs(argv) {
  const opts = { persona: null, id: null, event: null, script: null, matcher: null, issueId: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--event") opts.event = argv[++i];
    else if (a === "--script") opts.script = argv[++i];
    else if (a === "--matcher") opts.matcher = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else throw new Error(`Unknown: ${a}`);
  }
  if (!opts.persona || !opts.id || !opts.event || !opts.script) {
    throw new Error("create requires --persona --id --event --script");
  }
  return opts;
}

function cmdCreate(argv) {
  const opts = parseCreateArgs(argv);
  assertPersona(opts.persona);
  const registry = loadRegistry();
  if (registry.resources.hooks.some((h) => h.id === opts.id)) {
    throw new Error(`Hook id "${opts.id}" already exists`);
  }

  const scriptPath = opts.script.startsWith(".cursor/")
    ? opts.script
    : join(".cursor/hooks", opts.script);

  const hooksJson = loadHooksJson();
  if (!hooksJson.hooks[opts.event]) hooksJson.hooks[opts.event] = [];
  const entry = { command: scriptPath };
  if (opts.matcher) entry.matcher = opts.matcher;
  hooksJson.hooks[opts.event].push(entry);
  saveHooksJson(hooksJson);

  const resource = {
    ...baseResource({ id: opts.id, persona: opts.persona, issueId: opts.issueId }),
    event: opts.event,
    scriptPath,
    matcher: opts.matcher ?? null,
  };
  registry.resources.hooks.push(resource);
  saveRegistry(registry);

  appendAutonomyLog({
    action: "create",
    resourceType: "hooks",
    resourceId: opts.id,
    persona: opts.persona,
    issueId: opts.issueId,
    details: { event: opts.event, scriptPath },
  });

  console.log(`Hook registered: ${opts.id} → ${opts.event} → ${scriptPath}`);
}

function setEnabled(argv, enabled) {
  const opts = { persona: null, id: null, asOrchestrator: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--as-orchestrator") opts.asOrchestrator = true;
    else throw new Error(`Unknown: ${a}`);
  }
  assertPersona(opts.persona, opts.asOrchestrator);
  assertOwnership("hooks", opts.id, opts.persona, opts.asOrchestrator);
  const registry = loadRegistry();
  const hook = registry.resources.hooks.find((h) => h.id === opts.id);
  hook.enabled = enabled;
  hook.updatedAt = new Date().toISOString();
  saveRegistry(registry);
  appendAutonomyLog({
    action: enabled ? "enable" : "disable",
    resourceType: "hooks",
    resourceId: opts.id,
    persona: opts.persona,
  });
  console.log(`Hook ${opts.id} ${enabled ? "enabled" : "disabled"}`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help") usage();

try {
  switch (cmd) {
    case "list":
      cmdList(rest);
      break;
    case "create":
      cmdCreate(rest);
      break;
    case "enable":
      setEnabled(rest, true);
      break;
    case "disable":
      setEnabled(rest, false);
      break;
    default:
      usage(1);
  }
} catch (err) {
  console.error(`hooks error: ${err.message}`);
  process.exit(1);
}
