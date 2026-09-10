#!/usr/bin/env node
/** CLI de pins estilo Slack. */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { formatDialogueMessage } from "./protocol.mjs";
import { getPinnedMessages, pinMessage, unpinMessage } from "./slack-store.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Slack pins

Commands:
  add --channel ID --message-id UUID --persona SLUG [--note TEXT]
  remove --channel ID --message-id UUID
  list --channel ID [--json]
  --help
`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = { cmd: null, channelId: null, messageId: null, persona: null, note: "", asJson: false };
  if (argv.length === 0) usage(1);
  opts.cmd = argv[0];
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--channel") opts.channelId = argv[++i];
    else if (a === "--message-id") opts.messageId = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--note") opts.note = argv[++i];
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
      if (!opts.channelId || !opts.messageId || !opts.persona) throw new Error("add requer --channel, --message-id, --persona");
      const pin = pinMessage(opts.channelId, opts.messageId, opts.persona, opts.note);
      console.log(opts.asJson ? JSON.stringify(pin, null, 2) : `pinned ${opts.messageId}`);
    } else if (opts.cmd === "remove") {
      if (!opts.channelId || !opts.messageId) throw new Error("remove requer --channel e --message-id");
      if (!unpinMessage(opts.channelId, opts.messageId)) throw new Error("Pin não encontrado");
      console.log("ok");
    } else if (opts.cmd === "list") {
      if (!opts.channelId) throw new Error("list requer --channel");
      const pins = getPinnedMessages(opts.channelId);
      if (opts.asJson) console.log(JSON.stringify(pins, null, 2));
      else if (pins.length === 0) console.log("(nenhum pin)");
      else pins.forEach((pin) => console.log(formatDialogueMessage(pin.message)));
    } else usage(1);
  } catch (err) {
    console.error(`pin error: ${err.message}`);
    process.exit(1);
  }
}
