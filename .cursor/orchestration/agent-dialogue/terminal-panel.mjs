#!/usr/bin/env node
/**
 * Painel live do dialogue.jsonl — otimizado para terminal.
 *
 * Usage:
 *   npm run orchestration:terminal
 *   npm run orchestration:terminal -- --issue ANX-221
 *   npm run orchestration:terminal -- --clear --lines 20
 */

import { existsSync, watch } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDialogueLogPath, readDialogueMessages } from "./dialogue-log.mjs";
import {
  ANSI,
  formatDialogueTerminalFooter,
  formatDialogueTerminalHeader,
  formatDialogueTerminalMessage,
  formatDialogueTerminalPanel,
  parseTerminalArgs,
  printTerminalUsage,
} from "./terminal-format.mjs";

function readFiltered(opts) {
  return readDialogueMessages({
    issueId: opts.issueId ?? undefined,
    gate: opts.gate ?? undefined,
    type: opts.type ?? undefined,
    limit: opts.lines,
    newestFirst: false,
  });
}

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function renderFull(opts, messages) {
  if (opts.clear) clearScreen();
  console.log(
    formatDialogueTerminalPanel(messages, {
      issueId: opts.issueId,
      live: opts.follow,
    }),
  );
  console.log(
    `${ANSI.dim}(log: ${getDialogueLogPath()} · Ctrl+C para sair)${ANSI.reset}`,
  );
}

function renderIncremental(opts, newMessages) {
  if (newMessages.length === 0) return;
  for (const msg of newMessages) {
    console.log(formatDialogueTerminalMessage(msg));
  }
  console.log(formatDialogueTerminalFooter());
}

function usage() {
  printTerminalUsage("terminal-panel.mjs");
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
    console.error(`terminal-panel error: ${err.message}`);
    process.exit(1);
  }

  if (opts.help) usage();

  const logPath = getDialogueLogPath();
  let knownIds = new Set();

  function snapshot() {
    const messages = readFiltered(opts);
    if (opts.clear || knownIds.size === 0) {
      knownIds = new Set(messages.map((m) => m.id));
      renderFull(opts, messages);
      return;
    }

    const fresh = messages.filter((m) => !knownIds.has(m.id));
    for (const m of messages) knownIds.add(m.id);
    if (fresh.length > 0) {
      console.log(formatDialogueTerminalHeader({ issueId: opts.issueId, live: true }));
      renderIncremental(opts, fresh);
    }
  }

  snapshot();

  if (!opts.follow) {
    process.exit(0);
  }

  if (!existsSync(logPath)) {
    console.log(`${ANSI.dim}(aguardando criação do log…)${ANSI.reset}`);
  }

  let debounce = null;
  const onChange = () => {
    clearTimeout(debounce);
    debounce = setTimeout(snapshot, 120);
  };

  try {
    watch(logPath, { persistent: true }, onChange);
  } catch {
    watch(dirname(getDialogueLogPath()), { persistent: true }, onChange);
  }

  process.on("SIGINT", () => {
    console.log(`\n${ANSI.dim}terminal encerrado.${ANSI.reset}`);
    process.exit(0);
  });
}
