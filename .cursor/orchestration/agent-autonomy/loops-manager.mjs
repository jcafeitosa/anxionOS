#!/usr/bin/env node
/**
 * CLI: register/list/stop loops por persona (padrão /loop local).
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { appendAutonomyLog } from "./autonomy-log.mjs";
import {
  assertIssueClaim,
  assertOwnership,
  assertPersona,
  assertSafeCommand,
  baseResource,
  loadRegistry,
  loopsDir,
  parseIntervalMs,
  printJson,
  repoRoot,
  saveRegistry,
} from "./lib.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Agent Autonomy — loops

Commands:
  list [--persona SLUG] [--json]
  register --persona SLUG --id ID --every INTERVAL --prompt TEXT --issue ANX-N
  stop --persona SLUG --id ID [--as-orchestrator]
  status --id ID

Interval: 30s, 5m, 2h, 1d
Docs: loop skill · AUTONOMY.md`);
  process.exit(exitCode);
}

function pidPath(id) {
  return join(loopsDir, `${id}.pid`);
}

function payloadPath(id) {
  return join(loopsDir, `${id}.json`);
}

function cmdList(argv) {
  const opts = { persona: null, asJson: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--persona") opts.persona = argv[++i];
    else if (argv[i] === "--json") opts.asJson = true;
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  const registry = loadRegistry();
  let loops = registry.resources.loops;
  if (opts.persona) loops = loops.filter((l) => l.persona === opts.persona);
  const enriched = loops.map((l) => ({
    ...l,
    running: existsSync(pidPath(l.id)),
  }));
  if (opts.asJson) {
    printJson(enriched);
    return;
  }
  if (enriched.length === 0) {
    console.log("(nenhum loop registrado)");
    return;
  }
  for (const l of enriched) {
    const run = l.running ? "running" : "stopped";
    console.log(`${l.id}\t${l.persona}\t${l.every}\t${l.issueId}\t[${run}]`);
  }
}

function parseRegisterArgs(argv) {
  const opts = { persona: null, id: null, every: null, prompt: null, issueId: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--every") opts.every = argv[++i];
    else if (a === "--prompt") opts.prompt = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else throw new Error(`Unknown: ${a}`);
  }
  return opts;
}

function cmdRegister(argv) {
  const opts = parseRegisterArgs(argv);
  assertPersona(opts.persona);
  assertIssueClaim(opts.issueId, "loop");
  if (!opts.id || !opts.every || !opts.prompt) {
    throw new Error("register requires --id --every --prompt --issue");
  }
  parseIntervalMs(opts.every);

  const registry = loadRegistry();
  if (registry.resources.loops.some((l) => l.id === opts.id)) {
    throw new Error(`Loop "${opts.id}" already exists`);
  }

  const resource = {
    ...baseResource({ id: opts.id, persona: opts.persona, issueId: opts.issueId }),
    every: opts.every,
    prompt: opts.prompt,
    sentinel: `AGENT_LOOP_TICK_${opts.id.replace(/[^a-zA-Z0-9_]/g, "_")}`,
  };
  registry.resources.loops.push(resource);
  saveRegistry(registry);
  writeFileSync(payloadPath(opts.id), `${JSON.stringify(resource, null, 2)}\n`, "utf8");

  appendAutonomyLog({
    action: "register",
    resourceType: "loops",
    resourceId: opts.id,
    persona: opts.persona,
    issueId: opts.issueId,
    details: { every: opts.every },
  });

  console.log(`Loop registered: ${opts.id} (${opts.every}) for ${opts.issueId}`);
  console.log(`Start with: npm run orchestration:loops -- start --id ${opts.id}`);
}

function cmdStart(argv) {
  let id = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--id") id = argv[++i];
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  if (!id) throw new Error("start requires --id");

  const registry = loadRegistry();
  const loop = registry.resources.loops.find((l) => l.id === id);
  if (!loop) throw new Error(`Loop "${id}" not found`);
  if (existsSync(pidPath(id))) throw new Error(`Loop "${id}" already running`);

  const seconds = Math.round(parseIntervalMs(loop.every) / 1000);
  const sentinel = loop.sentinel;
  const prompt = loop.prompt.replace(/'/g, "'\\''");
  const shellScript = `while true; do sleep ${seconds}; echo '${sentinel} {"prompt":"${prompt}","issueId":"${loop.issueId}"}'; done`;

  const child = spawn("bash", ["-c", shellScript], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  writeFileSync(pidPath(id), String(child.pid), "utf8");

  appendAutonomyLog({
    action: "start",
    resourceType: "loops",
    resourceId: id,
    persona: loop.persona,
    issueId: loop.issueId,
    details: { pid: child.pid },
  });

  console.log(`Loop ${id} started (pid ${child.pid}, every ${loop.every})`);
}

function cmdStop(argv) {
  const opts = { persona: null, id: null, asOrchestrator: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--as-orchestrator") opts.asOrchestrator = true;
    else throw new Error(`Unknown: ${a}`);
  }
  assertPersona(opts.persona, opts.asOrchestrator);
  assertOwnership("loops", opts.id, opts.persona, opts.asOrchestrator);

  const pidFile = pidPath(opts.id);
  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, "utf8").trim());
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // processo já encerrado
    }
    unlinkSync(pidFile);
  }

  appendAutonomyLog({
    action: "stop",
    resourceType: "loops",
    resourceId: opts.id,
    persona: opts.persona,
  });
  console.log(`Loop ${opts.id} stopped`);
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
    case "start":
      cmdStart(rest);
      break;
    case "stop":
      cmdStop(rest);
      break;
    default:
      usage(1);
  }
} catch (err) {
  console.error(`loops error: ${err.message}`);
  process.exit(1);
}
