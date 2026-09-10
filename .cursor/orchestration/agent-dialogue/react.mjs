#!/usr/bin/env node
/** CLI de reactions estilo Slack. */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { addReaction, formatReactionsLine, getReactionsForMessage, removeReaction } from "./slack-store.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Slack reactions

Commands:
  add --message-id UUID --emoji EMOJI --persona SLUG
  remove --message-id UUID --emoji EMOJI --persona SLUG
  list --message-id UUID [--json]
  --help
`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = { cmd: null, messageId: null, emoji: null, persona: null, asJson: false };
  if (argv.length === 0) usage(1);
  opts.cmd = argv[0];
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--message-id") opts.messageId = argv[++i];
    else if (a === "--emoji") opts.emoji = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
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
    if (opts.cmd === "add") {
      if (!opts.messageId || !opts.emoji || !opts.persona) throw new Error("add requer --message-id, --emoji, --persona");
      const reactions = addReaction(opts.messageId, opts.emoji, opts.persona);
      console.log(formatReactionsLine(reactions));
    } else if (opts.cmd === "remove") {
      if (!opts.messageId || !opts.emoji || !opts.persona) throw new Error("remove requer --message-id, --emoji, --persona");
      removeReaction(opts.messageId, opts.emoji, opts.persona);
      console.log("ok");
    } else if (opts.cmd === "list") {
      if (!opts.messageId) throw new Error("list requer --message-id");
      const reactions = getReactionsForMessage(opts.messageId);
      console.log(opts.asJson ? JSON.stringify(reactions, null, 2) : formatReactionsLine(reactions) || "(sem reactions)");
    } else usage(1);
  } catch (err) {
    console.error(`react error: ${err.message}`);
    process.exit(1);
  }
}
