#!/usr/bin/env node
/**
 * orchestration:brain — lightweight OpenKnowledge brain loop CLI.
 * Staging reflections in brain-reflections.jsonl; promotion via open-knowledge MCP.
 */

import { appendReflection, listReflections, printSearchInstructions } from "./brain-reflection.mjs";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { formatIssueIdHint } from "../agent-config/load-config.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — OpenKnowledge brain loop

Commands:
  search --query "..."              OKF search pattern (MCP instructions)
  reflect --issue ANX-N --outcome pass|fail --lesson "..." [--persona SLUG] [--gate G1]
  lessons [--issue ANX-N] [--json]  List staging reflections

Staging: .cursor/orchestration-runtime/brain-reflections.jsonl
Promote material lessons to brain/ via open-knowledge MCP (write/edit).

Docs: .cursor/orchestration/OPENKNOWLEDGE-BRAIN.md`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const cmd = argv[0];
  const opts = {
    query: null,
    issue: null,
    outcome: null,
    lesson: null,
    persona: null,
    gate: null,
    json: false,
  };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--query") opts.query = argv[++i];
    else if (a === "--issue") opts.issue = argv[++i];
    else if (a === "--outcome") opts.outcome = argv[++i];
    else if (a === "--lesson") opts.lesson = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--gate") opts.gate = argv[++i];
    else if (a === "--json") opts.json = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return { cmd, opts };
}

function cmdSearch(opts) {
  if (!opts.query) {
    console.error("❌ --query obrigatorio");
    usage(1);
  }
  printSearchInstructions(opts.query);
}

function cmdReflect(opts) {
  if (!opts.issue) {
    console.error(`❌ --issue ${formatIssueIdHint()} obrigatorio`);
    process.exit(1);
  }
  if (!opts.outcome || !["pass", "fail"].includes(opts.outcome)) {
    console.error("❌ --outcome pass|fail obrigatorio");
    process.exit(1);
  }
  if (!opts.lesson?.trim()) {
    console.error("❌ --lesson obrigatorio");
    process.exit(1);
  }
  const record = appendReflection({
    issueId: opts.issue,
    outcome: opts.outcome,
    lesson: opts.lesson.trim(),
    persona: opts.persona,
    gate: opts.gate,
  });
  console.log("✅ Reflection staged");
  console.log(JSON.stringify(record, null, 2));
  console.log("\nNext: promover lição material via open-knowledge MCP em brain/notes/ ou checkpoint");
}

function cmdLessons(opts) {
  const rows = listReflections(opts.issue ? { issueId: opts.issue } : {});
  if (opts.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (!rows.length) {
    console.log("(nenhuma reflexao staged)");
    return;
  }
  for (const r of rows) {
    console.log(`${r.ts}\t${r.issueId}\t${r.outcome}\t${r.lesson.slice(0, 80)}`);
  }
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
  usage(0);
}

try {
  const { cmd, opts } = parseArgs(argv);
  switch (cmd) {
    case "search":
      cmdSearch(opts);
      break;
    case "reflect":
      cmdReflect(opts);
      break;
    case "lessons":
      cmdLessons(opts);
      break;
    default:
      console.error(`Subcomando desconhecido: ${cmd}`);
      usage(1);
  }
} catch (err) {
  console.error(`brain error: ${err.message}`);
  process.exit(1);
}
