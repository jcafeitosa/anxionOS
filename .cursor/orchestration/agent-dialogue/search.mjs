#!/usr/bin/env node
/** CLI de busca no dialogue estilo Slack. */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { formatDialogueMessages } from "./dialogue-log.mjs";
import { searchDialogue } from "./slack-store.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Slack search

Usage:
  npm run orchestration:search -- "query" [--issue ANX-N] [--persona SLUG] [--type TYPE] [--limit N] [--json]
  --help
`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = { query: "", issueId: null, persona: null, type: null, limit: null, asJson: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--json") opts.asJson = true;
    else if (a.startsWith("--")) throw new Error(`Opção desconhecida: ${a}`);
    else positional.push(a);
  }
  opts.query = positional.join(" ").trim();
  return opts;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) usage(0);
  try {
    const opts = parseOpts(argv);
    const results = searchDialogue(opts.query, {
      issueId: opts.issueId ?? undefined,
      persona: opts.persona ?? undefined,
      type: opts.type ?? undefined,
      limit: opts.limit ?? undefined,
    });
    console.error(`${results.length} resultado(s)`);
    console.log(opts.asJson ? JSON.stringify(results, null, 2) : formatDialogueMessages(results, "text"));
  } catch (err) {
    console.error(`search error: ${err.message}`);
    process.exit(1);
  }
}
