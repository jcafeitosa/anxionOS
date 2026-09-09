#!/usr/bin/env node
/**
 * Painel live do dialogue.jsonl — tail com fs.watch.
 *
 * Usage:
 *   node watch.mjs [--issue ANX-N] [--gate G1] [--type TYPE] [--limit N]
 */

import { existsSync, watch } from "node:fs";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { dirname } from "node:path";
import {
  formatDialogueMessages,
  getDialogueLogPath,
  readDialogueMessages,
} from "./dialogue-log.mjs";

function parseArgs(argv) {
  const opts = { issueId: null, gate: null, type: null, limit: 20 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--gate") opts.gate = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node watch.mjs [--issue ANX-N] [--gate G1] [--type TYPE] [--limit N]");
      process.exit(0);
    } else {
      throw new Error(`Opção desconhecida: ${a}`);
    }
  }
  return opts;
}

function render(opts, banner = "") {
  const messages = readDialogueMessages({
    issueId: opts.issueId ?? undefined,
    gate: opts.gate ?? undefined,
    type: opts.type ?? undefined,
    limit: opts.limit,
    newestFirst: false,
  });
  if (banner) console.log(`\n--- ${banner} ---`);
  console.log(formatDialogueMessages(messages, "text"));
  console.log(`\n(log: ${getDialogueLogPath()} · Ctrl+C para sair)`);
}

const opts = parseArgs(process.argv.slice(2));
const logPath = getDialogueLogPath();

console.log(`${getCliBrand()} — dialogue watch`);
render(opts, "snapshot inicial");

if (!existsSync(logPath)) {
  console.log("(aguardando criação do log…)");
}

let debounce = null;
try {
  watch(logPath, { persistent: true }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => render(opts, "atualização"), 120);
  });
} catch {
  watch(dirname(getDialogueLogPath()), { persistent: true }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => render(opts, "atualização"), 120);
  });
}

process.on("SIGINT", () => {
  console.log("\nwatch encerrado.");
  process.exit(0);
});
