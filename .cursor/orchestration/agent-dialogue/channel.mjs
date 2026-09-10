#!/usr/bin/env node
/**
 * CLI de canais estilo Slack — list/join/info/mark-read.
 */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import {
  getChannelInfo,
  joinChannel,
  listChannels,
  markChannelRead,
} from "./slack-store.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — Slack channels

Commands:
  list [--issue ANX-N] [--json]     Lista canais (issue-scoped + general)
  join --channel ID --persona SLUG  Entra no canal
  info --channel ID [--json]        Detalhes do canal
  read --channel ID                 Marca canal como lido (atualiza unread)
  --help                            Esta ajuda
`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = { cmd: null, channelId: null, issueId: null, persona: null, asJson: false };
  if (argv.length === 0) usage(1);
  opts.cmd = argv[0];
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--channel") opts.channelId = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--json") opts.asJson = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function cmdList(opts) {
  const channels = listChannels({ issueId: opts.issueId ?? undefined });
  if (opts.asJson) {
    console.log(JSON.stringify(channels, null, 2));
    return;
  }
  if (channels.length === 0) {
    console.log("(nenhum canal)");
    return;
  }
  console.log("ID\tTYPE\tMSGS\tUNREAD\tMEMBERS");
  for (const c of channels) {
    console.log(
      `${c.id}\t${c.type}\t${c.messageCount}\t${c.unread}\t${c.members.length ? c.members.join(",") : "-"}`,
    );
  }
}

function cmdJoin(opts) {
  if (!opts.channelId || !opts.persona) throw new Error("join requer --channel e --persona");
  const channel = joinChannel(opts.channelId, opts.persona);
  console.log(`Entrou no canal ${channel.id} como ${opts.persona}`);
}

function cmdInfo(opts) {
  if (!opts.channelId) throw new Error("info requer --channel");
  const info = getChannelInfo(opts.channelId);
  if (!info) throw new Error(`Canal não encontrado: ${opts.channelId}`);
  if (opts.asJson) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }
  console.log(`Canal: ${info.id}\nTipo: ${info.type}\nMensagens: ${info.messageCount}\nNão lidas: ${info.unread}`);
}

function cmdRead(opts) {
  if (!opts.channelId) throw new Error("read requer --channel");
  const read = markChannelRead(opts.channelId);
  console.log(`Canal ${opts.channelId} marcado como lido até ${read.timestamp}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) usage(0);
  try {
    const opts = parseOpts(argv);
    switch (opts.cmd) {
      case "list": cmdList(opts); break;
      case "join": cmdJoin(opts); break;
      case "info": cmdInfo(opts); break;
      case "read": cmdRead(opts); break;
      default: usage(1);
    }
  } catch (err) {
    console.error(`channel error: ${err.message}`);
    process.exit(1);
  }
}
