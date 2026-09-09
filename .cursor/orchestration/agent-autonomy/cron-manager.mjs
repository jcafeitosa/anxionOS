#!/usr/bin/env node
/**
 * CLI: register/list/run/start cron-like schedules (setInterval, sem node-cron).
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { appendAutonomyLog } from "./autonomy-log.mjs";
import {
  assertOwnership,
  assertPersona,
  assertSafeCommand,
  baseResource,
  cronStatePath,
  loadRegistry,
  parseIntervalMs,
  printJson,
  repoRoot,
  saveRegistry,
} from "./lib.mjs";

function usage(exitCode = 0) {
  console.log(`anxionOS Agent Autonomy — cron

Commands:
  list [--persona SLUG] [--json]
  register ID --every INTERVAL --command CMD [--persona SLUG] [--issue ANX-N] [--description TEXT]
  enable --persona SLUG --id ID [--as-orchestrator]
  disable --persona SLUG --id ID [--as-orchestrator]
  run --id ID                Executa uma vez
  start                      Daemon: executa todos os crons habilitados
  tick                       Executa todos os crons habilitados uma vez

Examples:
  npm run orchestration:cron -- register taskboard-health --every 5m --command "npm run taskboard:ensure" --persona orchestrator
  npm run orchestration:cron -- list

Docs: AUTONOMY.md`);
  process.exit(exitCode);
}

function loadCronState() {
  if (!existsSync(cronStatePath)) return { lastRun: {} };
  try {
    return JSON.parse(readFileSync(cronStatePath, "utf8"));
  } catch {
    return { lastRun: {} };
  }
}

function saveCronState(state) {
  writeFileSync(cronStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function cmdList(argv) {
  const opts = { persona: null, asJson: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--persona") opts.persona = argv[++i];
    else if (argv[i] === "--json") opts.asJson = true;
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  const registry = loadRegistry();
  const state = loadCronState();
  let crons = registry.resources.crons;
  if (opts.persona) crons = crons.filter((c) => c.persona === opts.persona);
  const enriched = crons.map((c) => ({
    ...c,
    lastRun: state.lastRun[c.id] ?? null,
  }));
  if (opts.asJson) {
    printJson(enriched);
    return;
  }
  if (enriched.length === 0) {
    console.log("(nenhum cron registrado)");
    return;
  }
  for (const c of enriched) {
    const status = c.enabled ? "on" : "off";
    const last = c.lastRun ? ` last=${c.lastRun}` : "";
    console.log(`${c.id}\t${c.persona}\t${c.every}\t[${status}]${last}`);
    console.log(`  ${c.command}`);
  }
}

function parseRegisterArgs(argv) {
  if (argv.length < 1) throw new Error("register requires ID");
  const opts = {
    id: argv[0],
    every: null,
    command: null,
    persona: "orchestrator",
    issueId: null,
    description: null,
  };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--every") opts.every = argv[++i];
    else if (a === "--command") opts.command = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--description") opts.description = argv[++i];
    else throw new Error(`Unknown: ${a}`);
  }
  if (!opts.every || !opts.command) {
    throw new Error("register requires --every and --command");
  }
  return opts;
}

function cmdRegister(argv) {
  const opts = parseRegisterArgs(argv);
  assertPersona(opts.persona);
  assertSafeCommand(opts.command);
  parseIntervalMs(opts.every);

  const registry = loadRegistry();
  const existing = registry.resources.crons.find((c) => c.id === opts.id);
  const resource = {
    ...baseResource({
      id: opts.id,
      persona: opts.persona,
      issueId: opts.issueId,
      description: opts.description,
      createdAt: existing?.createdAt,
    }),
    every: opts.every,
    everyMs: parseIntervalMs(opts.every),
    command: opts.command,
  };

  if (existing) {
    Object.assign(existing, resource);
  } else {
    registry.resources.crons.push(resource);
  }
  saveRegistry(registry);

  appendAutonomyLog({
    action: existing ? "update" : "register",
    resourceType: "crons",
    resourceId: opts.id,
    persona: opts.persona,
    issueId: opts.issueId,
    details: { every: opts.every, command: opts.command },
  });

  console.log(`Cron ${existing ? "updated" : "registered"}: ${opts.id} (${opts.every})`);
}

function runCron(cron, quiet = false) {
  if (!cron.enabled) return { skipped: true };
  const started = Date.now();
  try {
    const output = execSync(cron.command, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: quiet ? "pipe" : "inherit",
      timeout: Math.min(cron.everyMs ?? 300_000, 300_000),
    });
    const state = loadCronState();
    state.lastRun[cron.id] = new Date().toISOString();
    saveCronState(state);
    appendAutonomyLog({
      action: "run",
      resourceType: "crons",
      resourceId: cron.id,
      persona: cron.persona,
      issueId: cron.issueId,
      details: { durationMs: Date.now() - started, exit: 0 },
    });
    return { ok: true, output };
  } catch (err) {
    appendAutonomyLog({
      action: "run",
      resourceType: "crons",
      resourceId: cron.id,
      persona: cron.persona,
      issueId: cron.issueId,
      outcome: "failure",
      details: { error: err.message },
    });
    if (!quiet) throw err;
    return { ok: false, error: err.message };
  }
}

function cmdRun(argv) {
  let id = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--id") id = argv[++i];
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  if (!id) throw new Error("run requires --id");
  const registry = loadRegistry();
  const cron = registry.resources.crons.find((c) => c.id === id);
  if (!cron) throw new Error(`Cron "${id}" not found`);
  runCron(cron, false);
  console.log(`Cron ${id} completed`);
}

function cmdTick() {
  const registry = loadRegistry();
  const enabled = registry.resources.crons.filter((c) => c.enabled);
  for (const cron of enabled) {
    console.log(`[tick] ${cron.id}`);
    runCron(cron, true);
  }
  console.log(`Tick complete (${enabled.length} crons)`);
}

function cmdStart() {
  const registry = loadRegistry();
  const enabled = registry.resources.crons.filter((c) => c.enabled);
  if (enabled.length === 0) {
    console.log("No enabled crons");
    return;
  }

  console.log(`Starting cron daemon (${enabled.length} jobs)...`);
  const timers = [];

  for (const cron of enabled) {
    const ms = cron.everyMs ?? parseIntervalMs(cron.every);
    console.log(`  ${cron.id}: every ${cron.every} (${ms}ms)`);
    const timer = setInterval(() => {
      console.log(`[cron] ${cron.id} @ ${new Date().toISOString()}`);
      runCron(cron, true);
    }, ms);
    timers.push(timer);
    setTimeout(() => runCron(cron, true), 100);
  }

  process.on("SIGINT", () => {
    console.log("\nStopping cron daemon...");
    for (const t of timers) clearInterval(t);
    process.exit(0);
  });
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
  assertOwnership("crons", opts.id, opts.persona, opts.asOrchestrator);
  const registry = loadRegistry();
  const cron = registry.resources.crons.find((c) => c.id === opts.id);
  cron.enabled = enabled;
  cron.updatedAt = new Date().toISOString();
  saveRegistry(registry);
  appendAutonomyLog({
    action: enabled ? "enable" : "disable",
    resourceType: "crons",
    resourceId: opts.id,
    persona: opts.persona,
  });
  console.log(`Cron ${opts.id} ${enabled ? "enabled" : "disabled"}`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help") usage();

try {
  switch (cmd) {
    case "list":
      cmdList(rest);
      break;
    case "register":
      cmdRegister(rest);
      break;
    case "enable":
      setEnabled(rest, true);
      break;
    case "disable":
      setEnabled(rest, false);
      break;
    case "run":
      cmdRun(rest);
      break;
    case "start":
      cmdStart();
      break;
    case "tick":
      cmdTick();
      break;
    default:
      usage(1);
  }
} catch (err) {
  console.error(`cron error: ${err.message}`);
  process.exit(1);
}
