#!/usr/bin/env node
/**
 * Feed de diálogo otimizado para colar no chat do Cursor.
 * Reutiliza formatConversationMarkdown de conversation.mjs.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatConversationMarkdown } from "./conversation.mjs";
import { getDialogueDir, readDialogueMessages } from "./dialogue-log.mjs";
import { buildChatProgressBlock } from "../agent-workflow/progress-bar.mjs";

export const CURSOR_CHAT_MARKER =
  "<!-- CURSOR_CHAT_DIALOGUE: paste this block verbatim in assistant response -->";

const lastReadPath = () => join(getDialogueDir(), ".last-read");
const pendingPath = () => join(getDialogueDir(), ".pending-chat-display");

const DURATION_RE = /^(\d+)(s|m|h|d)$/i;

/**
 * @param {string} raw ex.: "30m", "1h", "2d"
 * @returns {string} ISO-8601
 */
export function parseSinceDuration(raw) {
  const match = DURATION_RE.exec(String(raw).trim());
  if (!match) {
    throw new Error(`--since inválido: ${raw}. Use ex.: 30m, 1h, 2d, 45s`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const ms = amount * multipliers[unit];
  return new Date(Date.now() - ms).toISOString();
}

function readLastRead() {
  const path = lastReadPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeLastReadFromMessages(messages) {
  if (messages.length === 0) return;
  const latest = messages[messages.length - 1];
  writeFileSync(
    lastReadPath(),
    `${JSON.stringify({
      messageId: latest.id,
      timestamp: latest.timestamp,
      readAt: new Date().toISOString(),
    })}\n`,
    "utf8"
  );
}

export function readPendingChatDisplay() {
  const path = pendingPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Marca issue para exibição no próximo turno do agente no chat Cursor.
 * @param {string|null|undefined} issueId
 * @param {string} [messageId]
 */
export function writePendingChatDisplay(issueId, messageId) {
  writeFileSync(
    pendingPath(),
    `${JSON.stringify({
      issueId: issueId ?? null,
      messageId: messageId ?? null,
      createdAt: new Date().toISOString(),
    })}\n`,
    "utf8"
  );
}

export function clearPendingChatDisplay() {
  const path = pendingPath();
  if (existsSync(path)) unlinkSync(path);
}

export function parseChatFeedArgs(argv) {
  const opts = {
    issueId: null,
    since: null,
    newOnly: false,
    checkPending: false,
    withProgress: null,
    lines: 10,
    markRead: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--since") opts.since = argv[++i];
    else if (a === "--new-only") opts.newOnly = true;
    else if (a === "--check-pending") opts.checkPending = true;
    else if (a === "--with-progress") opts.withProgress = true;
    else if (a === "--no-progress") opts.withProgress = false;
    else if (a === "--lines") opts.lines = Number(argv[++i]);
    else if (a === "--no-mark-read") opts.markRead = false;
    else throw new Error(`Opção desconhecida: ${a}`);
  }

  if (!Number.isFinite(opts.lines) || opts.lines <= 0) {
    throw new Error("--lines deve ser um número positivo");
  }

  return opts;
}

function filterNewOnly(messages) {
  const lastRead = readLastRead();
  if (!lastRead) return messages;

  const sinceMs = Date.parse(lastRead.timestamp);
  if (Number.isNaN(sinceMs)) return messages;

  return messages.filter((m) => Date.parse(m.timestamp) > sinceMs);
}

export async function buildChatFeedOutput(opts) {
  let issueId = opts.issueId ?? undefined;
  let since = opts.since ?? undefined;

  if (opts.checkPending) {
    const pending = readPendingChatDisplay();
    if (pending?.issueId) issueId = pending.issueId;
  }

  const includeProgress = opts.withProgress === true || (opts.withProgress !== false && Boolean(issueId));

  if (opts.since && !since?.includes("T")) {
    since = parseSinceDuration(opts.since);
  }

  let messages = readDialogueMessages({
    issueId,
    since,
    limit: opts.lines,
    newestFirst: false,
  });

  if (opts.newOnly) {
    messages = filterNewOnly(messages);
  }

  const body = formatConversationMarkdown(messages, { issueId: issueId ?? null });
  let progressBlock = "";
  if (includeProgress && issueId) {
    try {
      progressBlock = await buildChatProgressBlock(issueId);
    } catch {
      progressBlock = "";
    }
  }
  const output = progressBlock
    ? `${progressBlock}\n${CURSOR_CHAT_MARKER}\n\n${body}`
    : `${CURSOR_CHAT_MARKER}\n\n${body}`;

  if (opts.markRead && messages.length > 0) {
    writeLastReadFromMessages(messages);
  }

  if (opts.checkPending) {
    clearPendingChatDisplay();
  }

  return output;
}

export async function cmdChatFeed(argv) {
  const opts = parseChatFeedArgs(argv);
  const output = await buildChatFeedOutput(opts);
  console.log(output);
  return output;
}

function usage(exitCode = 0) {
  console.log(`chat-feed — diálogo para colar no chat Cursor

Usage:
  npm run orchestration:chat [-- opts]
  node chat-feed.mjs [opts]

Options:
  --issue ANX-N       Filtra por issue
  --since 30m         Mensagens dos últimos 30m (s|m|h|d)
  --new-only          Apenas desde .cursor/orchestration-runtime/dialogue/.last-read
  --check-pending     Lê .pending-chat-display e limpa após exibir
  --with-progress     Inclui barra G0–G7 (default quando --issue)
  --no-progress       Omite barra de progresso
  --lines N           Últimas N mensagens (default 10)
  --no-mark-read      Não atualiza .last-read
`);
  process.exit(exitCode);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) usage(0);

  (async () => {
    try {
      await cmdChatFeed(argv);
    } catch (err) {
      console.error(`chat-feed error: ${err.message}`);
      process.exit(1);
    }
  })();
}
