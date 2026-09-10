#!/usr/bin/env node
/** CLI de presence estilo Slack. */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { getPresence, setPresence } from "./slack-store.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Slack presence

Commands:
  set --persona SLUG --status active|away|offline [--issue ANX-N]
  get [--persona SLUG] [--json]
  list [--json]
  --help
`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = { cmd: null, persona: null, status: null, issueId: null, asJson: false };
  if (argv.length === 0) usage(1);
  opts.cmd = argv[0];
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--status") opts.status = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--json") opts.asJson = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) usage(0);
  try {
    const opts = parseOpts(argv);
    if (opts.cmd === "set") {
      if (!opts.persona || !opts.status) throw new Error("set requer --persona e --status");
      const p = setPresence(opts.persona, opts.status, opts.issueId);
      console.log(opts.asJson ? JSON.stringify(p, null, 2) : `${opts.persona}: ${p.status}`);
    } else if (opts.cmd === "get" || opts.cmd === "list") {
      const data = opts.persona ? getPresence(opts.persona) : getPresence();
      console.log(opts.asJson ? JSON.stringify(data, null, 2) : JSON.stringify(data));
    } else usage(1);
  } catch (err) {
    console.error(`presence error: ${err.message}`);
    process.exit(1);
  }
}
