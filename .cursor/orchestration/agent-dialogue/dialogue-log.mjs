/**
 * Append/read de mensagens de diálogo em JSONL (.cursor/orchestration-runtime/dialogue/).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";
import { formatDialogueMessage, parseDialogueMessage } from "./protocol.mjs";

const dialogueDir = getOrchestrationPaths().paths.dialogue;
const dialogueLogPath = join(dialogueDir, "dialogue.jsonl");

export function getDialogueDir() {
  return dialogueDir;
}

export function getDialogueLogPath() {
  return dialogueLogPath;
}

export function ensureDialogueDir() {
  if (!existsSync(dialogueDir)) {
    mkdirSync(dialogueDir, { recursive: true });
  }
}

/**
 * @param {import("./protocol.mjs").DialogueMessage} message
 */
export function appendDialogueMessage(message) {
  const parsed = parseDialogueMessage(message);
  ensureDialogueDir();
  appendFileSync(dialogueLogPath, `${JSON.stringify(parsed)}\n`, "utf8");
  return parsed;
}

/**
 * @param {Object} [filters]
 * @param {string} [filters.issueId]
 * @param {string} [filters.gate]
 * @param {string} [filters.type]
 * @param {string} [filters.role]
 * @param {string} [filters.since] ISO timestamp inclusive
 * @param {string} [filters.threadId]
 * @param {number} [filters.limit]
 * @param {boolean} [filters.newestFirst]
 */
export function readDialogueMessages(filters = {}) {
  if (!existsSync(dialogueLogPath)) {
    return [];
  }

  const lines = readFileSync(dialogueLogPath, "utf8").split("\n").filter(Boolean);
  /** @type {import("./protocol.mjs").DialogueMessage[]} */
  const messages = [];

  for (const line of lines) {
    try {
      messages.push(parseDialogueMessage(JSON.parse(line)));
    } catch {
      // linha corrompida — ignorar para não quebrar leitura
    }
  }

  let filtered = messages;

  if (filters.issueId) {
    filtered = filtered.filter((m) => m.issueId === filters.issueId);
  }
  if (filters.gate) {
    filtered = filtered.filter((m) => m.gate === filters.gate);
  }
  if (filters.type) {
    filtered = filtered.filter((m) => m.type === filters.type);
  }
  if (filters.role) {
    filtered = filtered.filter((m) => m.from.role === filters.role);
  }
  if (filters.since) {
    const sinceMs = Date.parse(filters.since);
    filtered = filtered.filter((m) => Date.parse(m.timestamp) >= sinceMs);
  }
  if (filters.threadId) {
    filtered = filtered.filter((m) => m.threadId === filters.threadId);
  }

  if (filters.newestFirst) {
    filtered = [...filtered].reverse();
  }

  if (typeof filters.limit === "number" && filters.limit > 0) {
    if (filters.newestFirst) {
      filtered = filtered.slice(0, filters.limit);
    } else {
      filtered = filtered.slice(-filters.limit);
    }
  }

  return filtered;
}

/**
 * @param {import("./protocol.mjs").DialogueMessage[]} messages
 * @param {"json"|"text"} format
 */
export function formatDialogueMessages(messages, format = "text") {
  if (format === "json") {
    return JSON.stringify(messages, null, 2);
  }
  if (messages.length === 0) {
    return "(nenhuma mensagem)";
  }
  return messages.map((m) => formatDialogueMessage(m)).join("\n\n");
}

/**
 * Exporta snapshot filtrado para arquivo (útil para handoff).
 * @param {string} outPath
 * @param {Object} filters
 */
export function exportDialogueSnapshot(outPath, filters = {}) {
  const messages = readDialogueMessages(filters);
  writeFileSync(outPath, `${JSON.stringify(messages, null, 2)}\n`, "utf8");
  return messages.length;
}
