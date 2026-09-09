#!/usr/bin/env node
/**
 * Pretty-print one-shot do dialogue.jsonl (sem watch).
 *
 * Usage:
 *   npm run orchestration:tail
 *   npm run orchestration:tail -- --issue ANX-VALIDATION --lines 20
 */

import { fileURLToPath } from "node:url";
import { getDialogueLogPath, readDialogueMessages } from "./dialogue-log.mjs";
import {
  ANSI,
  formatDialogueTerminalPanel,
  parseTerminalArgs,
  printTerminalUsage,
} from "./terminal-format.mjs";

function usage() {
  printTerminalUsage("tail-formatted.mjs");
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  let opts;
  try {
    opts = parseTerminalArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`tail-formatted error: ${err.message}`);
    process.exit(1);
  }

  if (opts.help) usage();

  const messages = readDialogueMessages({
    issueId: opts.issueId ?? undefined,
    gate: opts.gate ?? undefined,
    type: opts.type ?? undefined,
    limit: opts.lines,
    newestFirst: false,
  });

  console.log(
    formatDialogueTerminalPanel(messages, {
      issueId: opts.issueId,
      live: false,
    }),
  );
  console.log(`${ANSI.dim}(log: ${getDialogueLogPath()})${ANSI.reset}`);
}
