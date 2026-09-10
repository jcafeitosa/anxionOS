/**
 * Camada Slack — estado persistido (channels, reactions, pins, unread, presence).
 * Backward-compatible: arquivos JSON separados em orchestration-runtime.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";
import { getDialogueDir, readDialogueMessages } from "./dialogue-log.mjs";

const STORE_VERSION = 1;

function dialogueDir() {
  return getDialogueDir();
}

function storePath(name) {
  return join(dialogueDir(), name);
}

function ensureDialogueStoreDir() {
  const dir = dialogueDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJsonStore(filename, fallback) {
  ensureDialogueStoreDir();
  const path = storePath(filename);
  if (!existsSync(path)) return structuredClone(fallback);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return structuredClone(fallback);
  }
}

function writeJsonStore(filename, data) {
  ensureDialogueStoreDir();
  data.updatedAt = new Date().toISOString();
  writeFileSync(storePath(filename), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** @param {import("./protocol.mjs").DialogueMessage|null|undefined|string} messageOrIssueId */
export function resolveChannelId(messageOrIssueId) {
  if (typeof messageOrIssueId === "string") {
    return messageOrIssueId || "general";
  }
  const issueId = messageOrIssueId?.issueId;
  return issueId ?? "general";
}

function emptyChannelsStore() {
  return { version: STORE_VERSION, updatedAt: null, channels: {} };
}

function emptyReactionsStore() {
  return { version: STORE_VERSION, updatedAt: null, reactions: {} };
}

function emptyPinsStore() {
  return { version: STORE_VERSION, updatedAt: null, pins: {} };
}

function emptyReadsStore() {
  return { version: STORE_VERSION, updatedAt: null, reads: {} };
}

function emptyPresenceStore() {
  return { version: STORE_VERSION, updatedAt: null, personas: {} };
}

export function loadChannelsStore() {
  return readJsonStore("channels.json", emptyChannelsStore());
}

export function saveChannelsStore(store) {
  writeJsonStore("channels.json", store);
}

export function loadReactionsStore() {
  return readJsonStore("reactions.json", emptyReactionsStore());
}

export function saveReactionsStore(store) {
  writeJsonStore("reactions.json", store);
}

export function loadPinsStore() {
  return readJsonStore("pins.json", emptyPinsStore());
}

export function savePinsStore(store) {
  writeJsonStore("pins.json", store);
}

export function loadChannelReadsStore() {
  return readJsonStore("channel-reads.json", emptyReadsStore());
}

export function saveChannelReadsStore(store) {
  writeJsonStore("channel-reads.json", store);
}

export function loadPresenceStore() {
  const path = join(getOrchestrationPaths().paths.autonomy, "presence.json");
  if (!existsSync(path)) return emptyPresenceStore();
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return emptyPresenceStore();
  }
}

export function savePresenceStore(store) {
  const autonomyDir = getOrchestrationPaths().paths.autonomy;
  if (!existsSync(autonomyDir)) mkdirSync(autonomyDir, { recursive: true });
  store.updatedAt = new Date().toISOString();
  writeFileSync(
    join(autonomyDir, "presence.json"),
    `${JSON.stringify(store, null, 2)}\n`,
    "utf8",
  );
}

/**
 * @returns {Array<{ id: string, name: string, issueId: string|null, type: string, messageCount: number, unread: number, members: string[] }>}
 */
export function listChannels(opts = {}) {
  const store = loadChannelsStore();
  const messages = readDialogueMessages();
  const channelIds = new Set(Object.keys(store.channels));

  for (const msg of messages) {
    channelIds.add(resolveChannelId(msg));
  }

  if (!channelIds.has("general")) {
    channelIds.add("general");
  }

  const result = [];
  for (const id of [...channelIds].sort()) {
    const channelMessages = messages.filter((m) => resolveChannelId(m) === id);
    const persisted = store.channels[id];
    const issueId = id === "general" ? null : id;
    const unread = getUnreadCount(id);

    result.push({
      id,
      name: persisted?.name ?? id,
      issueId,
      type: id === "general" ? "general" : "issue",
      messageCount: channelMessages.length,
      unread,
      members: persisted?.members ?? [],
      createdAt: persisted?.createdAt ?? null,
    });
  }

  if (opts.issueId) {
    return result.filter((c) => c.id === opts.issueId || c.issueId === opts.issueId);
  }

  return result;
}

export function ensureChannel(channelId) {
  const store = loadChannelsStore();
  if (!store.channels[channelId]) {
    const issueId = channelId === "general" ? null : channelId;
    store.channels[channelId] = {
      id: channelId,
      name: channelId,
      issueId,
      type: channelId === "general" ? "general" : "issue",
      createdAt: new Date().toISOString(),
      members: [],
    };
    saveChannelsStore(store);
  }
  return store.channels[channelId];
}

export function joinChannel(channelId, persona) {
  ensureChannel(channelId);
  const store = loadChannelsStore();
  const channel = store.channels[channelId];
  if (!channel.members.includes(persona)) {
    channel.members.push(persona);
    saveChannelsStore(store);
  }
  return channel;
}

export function getChannelInfo(channelId) {
  const channels = listChannels();
  return channels.find((c) => c.id === channelId) ?? null;
}

export function getUnreadCount(channelId) {
  const reads = loadChannelReadsStore();
  const lastRead = reads.reads[channelId];
  const messages = readDialogueMessages({
    issueId: channelId === "general" ? undefined : channelId,
  });

  const channelMessages =
    channelId === "general"
      ? messages.filter((m) => !m.issueId)
      : messages.filter((m) => m.issueId === channelId);

  if (!lastRead?.timestamp) {
    return channelMessages.length;
  }

  const sinceMs = Date.parse(lastRead.timestamp);
  return channelMessages.filter((m) => Date.parse(m.timestamp) > sinceMs).length;
}

export function markChannelRead(channelId, messageId = null) {
  const messages =
    channelId === "general"
      ? readDialogueMessages().filter((m) => !m.issueId)
      : readDialogueMessages({ issueId: channelId });

  let target = null;
  if (messageId) {
    target = messages.find((m) => m.id === messageId);
  }
  if (!target && messages.length > 0) {
    target = messages[messages.length - 1];
  }

  const store = loadChannelReadsStore();
  store.reads[channelId] = {
    messageId: target?.id ?? null,
    timestamp: target?.timestamp ?? new Date().toISOString(),
    readAt: new Date().toISOString(),
  };
  saveChannelReadsStore(store);
  return store.reads[channelId];
}

export function addReaction(messageId, emoji, persona) {
  const store = loadReactionsStore();
  if (!store.reactions[messageId]) {
    store.reactions[messageId] = {};
  }
  if (!store.reactions[messageId][emoji]) {
    store.reactions[messageId][emoji] = [];
  }
  if (!store.reactions[messageId][emoji].includes(persona)) {
    store.reactions[messageId][emoji].push(persona);
  }
  saveReactionsStore(store);
  return store.reactions[messageId];
}

export function removeReaction(messageId, emoji, persona) {
  const store = loadReactionsStore();
  const bucket = store.reactions[messageId]?.[emoji];
  if (!bucket) return null;
  store.reactions[messageId][emoji] = bucket.filter((p) => p !== persona);
  if (store.reactions[messageId][emoji].length === 0) {
    delete store.reactions[messageId][emoji];
  }
  saveReactionsStore(store);
  return store.reactions[messageId] ?? {};
}

export function getReactionsForMessage(messageId) {
  const store = loadReactionsStore();
  return store.reactions[messageId] ?? {};
}

export function getAllReactions() {
  return loadReactionsStore().reactions;
}

export function pinMessage(channelId, messageId, persona, note = "") {
  ensureChannel(channelId);
  const messages = readDialogueMessages();
  const found = messages.find((m) => m.id === messageId);
  if (!found) {
    throw new Error(`Mensagem ${messageId} não encontrada no dialogue`);
  }

  const store = loadPinsStore();
  if (!store.pins[channelId]) {
    store.pins[channelId] = [];
  }

  const existing = store.pins[channelId].find((p) => p.messageId === messageId);
  if (existing) {
    return existing;
  }

  const pin = {
    messageId,
    pinnedAt: new Date().toISOString(),
    pinnedBy: persona,
    note: note || "",
  };
  store.pins[channelId].push(pin);
  savePinsStore(store);
  return pin;
}

export function unpinMessage(channelId, messageId) {
  const store = loadPinsStore();
  if (!store.pins[channelId]) return false;
  const before = store.pins[channelId].length;
  store.pins[channelId] = store.pins[channelId].filter((p) => p.messageId !== messageId);
  savePinsStore(store);
  return store.pins[channelId].length < before;
}

export function getPinnedMessages(channelId) {
  const store = loadPinsStore();
  const pins = store.pins[channelId] ?? [];
  const messages = readDialogueMessages();
  return pins
    .map((pin) => {
      const msg = messages.find((m) => m.id === pin.messageId);
      return msg ? { ...pin, message: msg } : null;
    })
    .filter(Boolean);
}

export function setPresence(persona, status, issueId = null) {
  const allowed = new Set(["active", "away", "offline"]);
  if (!allowed.has(status)) {
    throw new Error(`Status inválido: ${status}. Use: active, away, offline`);
  }
  const store = loadPresenceStore();
  store.personas[persona] = {
    status,
    issueId,
    updatedAt: new Date().toISOString(),
  };
  savePresenceStore(store);
  return store.personas[persona];
}

export function getPresence(persona = null) {
  const store = loadPresenceStore();
  if (persona) return store.personas[persona] ?? null;
  return store.personas;
}

export function searchDialogue(query, filters = {}) {
  const q = String(query ?? "").trim().toLowerCase();
  let messages = readDialogueMessages();

  if (filters.issueId) {
    messages = messages.filter((m) => m.issueId === filters.issueId);
  }
  if (filters.persona) {
    messages = messages.filter(
      (m) =>
        m.from?.persona?.role === filters.persona ||
        m.from?.agentId?.startsWith(`${filters.persona}-`),
    );
  }
  if (filters.type) {
    messages = messages.filter((m) => m.type === filters.type);
  }

  if (q) {
    messages = messages.filter((m) => {
      const haystack = [
        m.body,
        m.from?.name,
        m.from?.persona?.name,
        m.from?.persona?.role,
        m.issueId,
        m.type,
        m.to?.mention,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (filters.limit && filters.limit > 0) {
    messages = messages.slice(-filters.limit);
  }

  return messages;
}

export function highlightMentions(text) {
  return String(text).replace(
    /(^|[\s(])@([a-zA-Z0-9_-]+)/g,
    (_, prefix, name) => `${prefix}**@${name}**`,
  );
}

export function formatReactionsLine(reactions) {
  const entries = Object.entries(reactions ?? {});
  if (entries.length === 0) return "";
  return entries.map(([emoji, personas]) => `${emoji} ${personas.length}`).join("  ");
}

export function buildThreadTree(messages) {
  const byId = new Map(messages.map((m) => [m.id, { ...m, replies: [] }]));
  const roots = [];

  for (const msg of messages) {
    const node = byId.get(msg.id);
    if (msg.replyTo && byId.has(msg.replyTo)) {
      byId.get(msg.replyTo).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function touchChannelFromMessage(message) {
  const channelId = resolveChannelId(message);
  ensureChannel(channelId);
  return channelId;
}
