#!/usr/bin/env node
/**
 * Formata mensagens de diálogo como markdown legível no chat do Cursor.
 */

import { readDialogueMessages } from "./dialogue-log.mjs";
import {
  buildThreadTree,
  formatReactionsLine,
  getAllReactions,
  getPinnedMessages,
  getUnreadCount,
  highlightMentions,
  resolveChannelId,
} from "./slack-store.mjs";

const TYPE_LABELS = {
  debate: "debate",
  collab: "colaboração",
  share: "compartilhamento",
  research: "pesquisa",
  consult: "consulta",
  vote: "votação",
  handoff: "handoff",
  challenge: "desafio",
  response: "resposta",
  verdict: "veredito",
  status: "status",
  question: "pergunta",
  ack: "confirmação",
  escalate: "escalação",
  pair: "pair",
  review: "revisão",
  approve: "aprovação",
  decision: "decisão CTO",
  hire: "contratação",
  dismiss: "dispensa",
  block: "bloqueio",
  unblock: "desbloqueio",
  plan: "plano",
  policy: "política",
};

const VERDICT_BADGES = {
  PASS: "PASS",
  CHANGES_REQUIRED: "ALTERAÇÕES",
  BLOCKED: "BLOQUEADO",
  NOT_APPLICABLE: "N/A",
};

function displayName(msg) {
  return msg.from.persona?.name ?? msg.from.name;
}

function roleSlug(msg) {
  return msg.from.persona?.role ?? msg.from.role;
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatMessageBlock(msg, opts = {}) {
  const { reactionsMap = {}, indent = "" } = opts;
  const mention = msg.to?.mention ? ` → ${highlightMentions(msg.to.mention)}` : "";
  const typeLabel = TYPE_LABELS[msg.type] ?? msg.type;
  const gatePart = msg.gate ? ` · ${msg.gate}` : "";
  const verdictPart = msg.verdict
    ? ` · **${VERDICT_BADGES[msg.verdict] ?? msg.verdict}**`
    : "";
  const threadPart = msg.replyTo ? " · ↩ thread" : msg.threadId ? ` · 🧵 ${msg.threadId}` : "";

  const meta = `**${typeLabel}**${gatePart}${verdictPart}${threadPart}`;
  const quotedBody = highlightMentions(msg.body)
    .split("\n")
    .map((line) => `${indent}> ${line}`)
    .join("\n");

  const evidence =
    msg.evidence?.length > 0
      ? `\n\n${indent}_Evidência:_ ${msg.evidence.map((e) => `\`${e.kind}:${e.ref}\``).join(", ")}`
      : "";

  const reactions = reactionsMap[msg.id] ?? {};
  const reactionsLine = formatReactionsLine(reactions);
  const reactionsPart = reactionsLine ? `\n\n${indent}_Reactions:_ ${reactionsLine}` : "";

  return `${indent}### ${formatTime(msg.timestamp)} · ${displayName(msg)} (${roleSlug(msg)})${mention}
${indent}${meta}
${quotedBody}${evidence}${reactionsPart}`;
}

function formatThreadNode(node, reactionsMap, depth = 0) {
  const indent = depth > 0 ? "  ".repeat(depth) : "";
  let block = formatMessageBlock(node, { reactionsMap, indent });
  for (const reply of node.replies ?? []) {
    block += `\n\n${formatThreadNode(reply, reactionsMap, depth + 1)}`;
  }
  return block;
}

function formatPinnedSection(channelId) {
  const pins = getPinnedMessages(channelId);
  if (pins.length === 0) return "";
  const lines = pins.map((pin) => {
    const preview = pin.message.body.split("\n")[0].slice(0, 80);
    return `- 📌 \`${pin.messageId.slice(0, 8)}…\` · ${preview}`;
  });
  return `### 📌 Fixados\n${lines.join("\n")}\n\n---\n\n`;
}

function groupKey(msg) {
  if (msg.issueId) return msg.issueId;
  if (msg.threadId) return `thread:${msg.threadId}`;
  return "geral";
}

function groupTitle(key) {
  if (key.startsWith("thread:")) {
    return `thread ${key.slice("thread:".length)}`;
  }
  if (key === "geral") return "Geral";
  return key;
}

export function formatConversationMarkdown(messages, opts = {}) {
  if (messages.length === 0) {
    return "Nenhuma mensagem no diálogo.";
  }

  const { issueId, threadId } = opts;
  const reactionsMap = getAllReactions();

  function buildChannelBody(channelMessages, channelId) {
    const unread = getUnreadCount(channelId);
    const unreadPart = unread > 0 ? ` · **${unread} não lidas**` : "";
    const pinned = formatPinnedSection(channelId);
    const tree = buildThreadTree(channelMessages);
    const blocks = tree.map((node) => formatThreadNode(node, reactionsMap)).join("\n\n");
    return { unreadPart, pinned, blocks };
  }

  if (issueId) {
    const { unreadPart, pinned, blocks } = buildChannelBody(messages, issueId);
    const title = `## 💬 Diálogo dos Agentes — #${issueId}${unreadPart}`;
    return `${title}\n\n${pinned}${blocks}`;
  }

  if (threadId) {
    const title = `## 💬 Diálogo dos Agentes — 🧵 ${threadId}`;
    const tree = buildThreadTree(messages);
    const blocks = tree.map((node) => formatThreadNode(node, reactionsMap)).join("\n\n");
    return `${title}\n\n${blocks}`;
  }

  const groups = new Map();
  for (const msg of messages) {
    const key = groupKey(msg);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(msg);
  }

  const sections = [];
  for (const [key, groupMessages] of groups) {
    const channelId = resolveChannelId(groupMessages[0]);
    const { unreadPart, pinned, blocks } = buildChannelBody(groupMessages, channelId);
    const title = `## 💬 Diálogo dos Agentes — #${groupTitle(key)}${unreadPart}`;
    sections.push(`${title}\n\n${pinned}${blocks}`);
  }

  return sections.join("\n\n---\n\n");
}

export function parseConversationArgs(argv) {
  const opts = {
    issueId: null,
    threadId: null,
    lines: 20,
    format: "markdown",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--thread") opts.threadId = argv[++i];
    else if (a === "--lines") opts.lines = Number(argv[++i]);
    else if (a === "--format") opts.format = argv[++i];
    else throw new Error(`Opção desconhecida: ${a}`);
  }

  if (!Number.isFinite(opts.lines) || opts.lines <= 0) {
    throw new Error("--lines deve ser um número positivo");
  }
  if (opts.format !== "markdown") {
    throw new Error(`Formato não suportado: ${opts.format}. Use: markdown`);
  }

  return opts;
}

export function cmdConversation(argv) {
  const opts = parseConversationArgs(argv);

  const messages = readDialogueMessages({
    issueId: opts.issueId ?? undefined,
    threadId: opts.threadId ?? undefined,
    limit: opts.lines,
    newestFirst: false,
  });

  const output = formatConversationMarkdown(messages, {
    issueId: opts.issueId,
    threadId: opts.threadId,
  });

  console.log(output);
  return output;
}

function usage(exitCode = 0) {
  console.log(`conversation — diálogo formatado para Cursor chat

Usage:
  node conversation.mjs [opts]
  npm run orchestration:show-dialogue -- [opts]
  npm run orchestration:dialogue -- conversation [opts]

Options:
  --issue ANX-N       Filtra por issue
  --thread ID         Filtra por threadId
  --lines N           Últimas N mensagens (default 20)
  --format markdown   Formato de saída (default markdown)
`);
  process.exit(exitCode);
}

import { fileURLToPath } from "node:url";

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) usage(0);

  try {
    cmdConversation(argv);
  } catch (err) {
    console.error(`conversation error: ${err.message}`);
    process.exit(1);
  }
}
