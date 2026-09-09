/**
 * Append/read de eventos proativos (.cursor/orchestration-runtime/proactive/proactive.jsonl).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { getOrchestrationPaths } from "../agent-config/load-config.mjs";

const proactiveDir = getOrchestrationPaths().paths.proactive;
const proactiveLogPath = join(proactiveDir, "proactive.jsonl");

export function getProactiveLogPath() {
  return proactiveLogPath;
}

export function ensureProactiveDir() {
  if (!existsSync(proactiveDir)) {
    mkdirSync(proactiveDir, { recursive: true });
  }
}

/**
 * @param {Object} entry
 * @param {string} entry.triggerId
 * @param {string} entry.action
 * @param {string} [entry.persona]
 * @param {string} [entry.issueId]
 * @param {string} [entry.severity] info|warn|escalate
 * @param {string} entry.summary
 * @param {Object} [entry.meta]
 */
export function appendProactiveLog(entry) {
  ensureProactiveDir();
  const record = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  appendFileSync(proactiveLogPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

/**
 * @param {Object} [filters]
 * @param {string} [filters.persona]
 * @param {string} [filters.triggerId]
 * @param {number} [filters.limit]
 * @param {string} [filters.since]
 */
export function readProactiveLog(filters = {}) {
  if (!existsSync(proactiveLogPath)) return [];

  const lines = readFileSync(proactiveLogPath, "utf8").split("\n").filter(Boolean);
  /** @type {Object[]} */
  let records = [];

  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      // linha corrompida
    }
  }

  if (filters.persona) {
    records = records.filter((r) => r.persona === filters.persona);
  }
  if (filters.triggerId) {
    records = records.filter((r) => r.triggerId === filters.triggerId);
  }
  if (filters.since) {
    const sinceMs = Date.parse(filters.since);
    records = records.filter((r) => Date.parse(r.timestamp) >= sinceMs);
  }
  if (typeof filters.limit === "number" && filters.limit > 0) {
    records = records.slice(-filters.limit);
  }

  return records;
}
