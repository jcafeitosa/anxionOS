#!/usr/bin/env node
/**
 * CLI unificado de orquestração — funciona de qualquer repo com .cursor/orchestration.config.json
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initProject, printInitResult } from "../agent-config/init-project.mjs";
import { getOrchestrationPaths, resetOrchestrationPathsCache } from "../agent-config/load-config.mjs";

const SUBCOMMANDS = {
  init: null,
  compliance: "agent-compliance/compliance-check.mjs",
  workflow: "agent-workflow/monitor.mjs",
  progress: "agent-workflow/progress-bar.mjs",
  chat: "agent-dialogue/chat-feed.mjs",
  broadcast: "agent-dialogue/broadcast.mjs",
  dialogue: "agent-dialogue/broadcast.mjs",
  speak: "agent-dialogue/chat-participation.mjs",
  session: "agent-dialogue/session-tracker.mjs",
  hire: "agent-hire/hire.mjs",
  dismiss: "agent-hire/dismiss.mjs",
  roster: "agent-hire/roster.mjs",
  autonomy: "agent-autonomy/registry.mjs",
  cron: "agent-autonomy/cron-manager.mjs",
  goals: "agent-autonomy/goals-manager.mjs",
  hooks: "agent-autonomy/hooks-manager.mjs",
  loops: "agent-autonomy/loops-manager.mjs",
  proactive: "agent-proactive/initiative.mjs",
  monitor: "agent-proactive/monitor.mjs",
  "cto-accept": "agent-proactive/cto-accept.mjs",
  "cto-decide": "agent-proactive/cto-decide.mjs",
  personas: "agent-dialogue/personas.mjs",
  who: "agent-dialogue/roster-lookup.mjs",
  "diagram-check": "agent-workflow/diagram-check.mjs",
  watch: "agent-dialogue/watch.mjs",
  tail: "agent-dialogue/tail-formatted.mjs",
  terminal: "agent-dialogue/terminal-panel.mjs",
  "silence-watch": "agent-autonomy/scripts/silence-detector.mjs",
  "delegate-monitor": "agent-workflow/delegate-monitor.mjs",
  coordination: "agent-workflow/coordination.mjs",
  brain: "agent-brain/brain-cli.mjs",
  taskboard: "agent-config/agent-taskboard-cli.mjs",
  "self-healing": "agent-workflow/self-healing-cli.mjs",
};

function usage() {
  const names = Object.keys(SUBCOMMANDS).sort().join(", ");
  console.log(`orchestration — CLI global de orquestração\n\nUso:\n  orchestration <subcomando> [args...]\n  orchestration init [--force]\n\nSubcomandos: ${names}\n\nEnv:\n  ORCHESTRATION_HOME    Raiz do framework (default ~/.cursor/orchestration)\n  ORCHESTRATION_CONFIG  Config do projeto (default .cursor/orchestration.config.json)`);
}

function resolveScript(subcommand) {
  resetOrchestrationPathsCache();
  const paths = getOrchestrationPaths();
  const rel = SUBCOMMANDS[subcommand];
  if (!rel) return null;
  const script = join(paths.frameworkRoot, rel);
  if (!existsSync(script)) {
    throw new Error(`Script não encontrado: ${script}`);
  }
  return { script, projectRoot: paths.projectRoot, frameworkRoot: paths.frameworkRoot };
}

function runSubcommand(subcommand, args) {
  const resolved = resolveScript(subcommand);
  if (!resolved) throw new Error(`Subcomando desconhecido: ${subcommand}`);
  const result = spawnSync(process.execPath, [resolved.script, ...args], {
    cwd: resolved.projectRoot,
    stdio: "inherit",
    env: { ...process.env, ORCHESTRATION_HOME: resolved.frameworkRoot },
  });
  process.exit(result.status ?? 1);
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
  usage();
  process.exit(0);
}

const sub = argv[0];
const rest = argv.slice(1);

if (sub === "init") {
  try {
    printInitResult(initProject({ cwd: process.cwd(), force: rest.includes("--force") }));
    process.exit(0);
  } catch (err) {
    console.error(`init error: ${err.message}`);
    process.exit(1);
  }
}

if (!SUBCOMMANDS[sub]) {
  console.error(`Subcomando desconhecido: ${sub}`);
  usage();
  process.exit(1);
}

runSubcommand(sub, rest);
